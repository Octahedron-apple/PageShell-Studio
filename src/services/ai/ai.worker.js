import { env, pipeline, TextStreamer } from '@huggingface/transformers';

// Load model from HuggingFace Hub — downloaded once and cached in IndexedDB.
// Model: onnx-community/Qwen2.5-Coder-1.5B-Instruct (q4, ~900MB on first load)
// This avoids bundling weights into the deployment artifact, keeping CI fast.
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = false;   // Disabled due to browser Cache API .clone() out-of-memory bug

// Custom OPFS cache: bypasses Cache API (which crashes on large files due to OOM clone bug).
// Uses a .meta sidecar file to mark downloads as complete — prevents serving partial files on refresh.
env.customFetch = async (request, options) => {
  const urlStr = typeof request === 'string' ? request : request.url;

  // Intercept all HuggingFace model files including weights, configs, and tokenizers
  const isModelFile = urlStr.match(/\.(onnx|bin|json|txt|msgpack)(\?|$)/i);
  if (!isModelFile) {
    return fetch(request, options);
  }

  // Derive a stable cache key from the URL path, stripping query strings
  const filename = urlStr.split('/').pop().split('?')[0];
  const metaKey  = filename + '.meta';

  let cacheDir;
  try {
    const root = await navigator.storage.getDirectory();
    cacheDir = await root.getDirectoryHandle('ai_model_cache', { create: true });

    // Validate cache: only serve if the .meta file says download is complete
    try {
      const metaHandle = await cacheDir.getFileHandle(metaKey);
      const metaFile   = await metaHandle.getFile();
      const meta       = JSON.parse(await metaFile.text());

      if (meta.complete) {
        const fileHandle = await cacheDir.getFileHandle(filename);
        const file       = await fileHandle.getFile();
        if (file.size === meta.size) {
          self.postMessage({ type: 'STATUS', message: `Cache hit: ${filename} (${(meta.size / 1e6).toFixed(0)} MB)` });
          return new Response(file, { headers: { 'Content-Type': 'application/octet-stream' } });
        }
        // Size mismatch — stale/corrupt entry, fall through to re-download
        console.warn(`[AI Cache] Stale cache for ${filename}, re-downloading...`);
      }
    } catch (_) {
      // .meta not found — first download
    }
  } catch (_) {
    // OPFS unavailable — fall through to plain fetch
    return fetch(request, options);
  }

  // --- Network fetch + simultaneous OPFS stream write ---
  const response = await fetch(request, options);
  if (!response.ok) return response;

  const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
  const reader        = response.body.getReader();

  // Pre-create the OPFS handle before the stream starts
  const fileHandle   = await cacheDir.getFileHandle(filename, { create: true });
  const accessHandle = await fileHandle.createSyncAccessHandle();
  accessHandle.truncate(0); // clear any partial content from a previous failed attempt

  let bytesWritten = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            accessHandle.flush();
            accessHandle.close();

            // Only write .meta when we received the full file
            const isComplete = contentLength === 0 || bytesWritten >= contentLength;
            if (isComplete) {
              try {
                const metaHandle   = await cacheDir.getFileHandle(metaKey, { create: true });
                const metaAccess   = await metaHandle.createSyncAccessHandle();
                const metaPayload  = new TextEncoder().encode(JSON.stringify({ size: bytesWritten, complete: true }));
                metaAccess.truncate(0);
                metaAccess.write(metaPayload, { at: 0 });
                metaAccess.flush();
                metaAccess.close();
                self.postMessage({ type: 'STATUS', message: `Cached ${filename} to OPFS (${(bytesWritten / 1e6).toFixed(0)} MB).` });
              } catch (metaErr) {
                console.warn('[AI Cache] Failed to write .meta:', metaErr);
              }
            }
            controller.close();
            break;
          }
          accessHandle.write(value);
          bytesWritten += value.byteLength;
          controller.enqueue(value);
        }
      } catch (err) {
        accessHandle.close();
        controller.error(err);
      }
    }
  });

  return new Response(stream, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
};


// Disable nested proxy workers — we are already running inside a Web Worker
env.backends.onnx.wasm.proxy = false;

// Force single-threaded WASM: prevents ort-wasm-simd-threaded.jsep.mjs from
// spawning further nested workers (which Vite's dev server intercepts and breaks)
env.backends.onnx.wasm.numThreads = 1;

// Point WASM binary fetches at the local vendor folder (ort-*.wasm files).
// These are small enough to bundle with the deployment.
env.backends.onnx.wasm.wasmPaths = import.meta.env.BASE_URL + 'vendor/onnx/';

let tgPipeline = null;

async function checkWebGPUSupport() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

async function getPipeline() {
  if (!tgPipeline) {
    // Qwen2.5-Coder-0.5B-Instruct — code-tuned, ONNX q4, ~350MB cached after first load.
    const modelId = 'onnx-community/Qwen2.5-Coder-0.5B-Instruct';
    const isWebGPUSupported = await checkWebGPUSupport();

    // Forward HuggingFace download progress to the UI status bar
    const progress_callback = (progressEvent) => {
      if (progressEvent.status === 'progress' || progressEvent.status === 'downloading' || progressEvent.status === 'initiate') {
        const pct = progressEvent.progress != null
          ? `${Math.round(progressEvent.progress)}%`
          : '...';
        const fileName = progressEvent.file ? progressEvent.file.split('/').pop() : 'weights';
        self.postMessage({
          type: 'STATUS',
          message: `Downloading ${fileName}: ${pct}`
        });
      } else if (progressEvent.status === 'loading') {
        self.postMessage({ type: 'STATUS', message: `Loading model into memory...` });
      } else if (progressEvent.status === 'ready') {
        self.postMessage({ type: 'STATUS', message: 'Model ready!' });
      }
    };

    if (isWebGPUSupported) {
      try {
        self.postMessage({ type: 'STATUS', message: 'Initializing Qwen2.5-Coder with WebGPU acceleration...' });
        tgPipeline = await pipeline('text-generation', modelId, {
          device: 'webgpu',
          dtype: 'q4',
          progress_callback,
        });
        self.postMessage({ type: 'STATUS', message: 'Qwen2.5-Coder loaded with WebGPU!' });
        return tgPipeline;
      } catch (gpuError) {
        console.warn('WebGPU failed to initialize despite API support. Falling back to WASM:', gpuError);
      }
    } else {
      self.postMessage({ type: 'STATUS', message: 'WebGPU not supported. Using WASM fallback...' });
    }

    self.postMessage({ type: 'STATUS', message: 'Initializing Qwen2.5-Coder with WASM (CPU)...' });
    tgPipeline = await pipeline('text-generation', modelId, {
      device: 'wasm',
      dtype: 'q4',
      progress_callback,
    });
    self.postMessage({ type: 'STATUS', message: 'Qwen2.5-Coder loaded with WASM (CPU fallback).' });
  }
  return tgPipeline;
}

self.onmessage = async (e) => {
  const { action, prompt } = e.data;
  if (action === 'GENERATE') {
    try {
      const generator = await getPipeline();
      
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token) => {
          self.postMessage({ type: 'TOKEN', token });
        },
      });

      // Prepare standard chat template or send raw string
      // Let's format the prompt using a chat template if preferred, or run it directly.
      // Since Qwen2.5-Coder-0.5B-Instruct expects assistant template, let's do a simple formatting
      const messages = Array.isArray(prompt) ? prompt : [
        { role: 'user', content: prompt }
      ];

      // In transformers.js v3, generator can take messages directly
      const output = await generator(messages, {
        max_new_tokens: 256,
        streamer,
      });

      const finalOutput = output[0].generated_text;
      
      // Send completion message back with the final assistant response content
      // Note: with chat templates, output[0].generated_text might contain the history or just the assistant message depending on setup.
      // Let's extract the last message from the array if it returns the full dialogue array,
      // or post the raw result. In transformers.js, if you pass array of messages,
      // the output[0].generated_text might be the string content of the generated reply, or the full dialogue string.
      // Let's post it directly.
      self.postMessage({ type: 'COMPLETE', output: finalOutput });
      
    } catch (err) {
      console.error('Error during generation:', err);
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }
};
