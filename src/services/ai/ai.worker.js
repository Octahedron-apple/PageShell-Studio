import { env, pipeline, TextStreamer } from '@huggingface/transformers';

// Load model from HuggingFace Hub — downloaded once and cached in IndexedDB.
// Model: onnx-community/Qwen2.5-Coder-1.5B-Instruct (q4, ~900MB on first load)
// This avoids bundling weights into the deployment artifact, keeping CI fast.
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = false;   // Disabled due to browser Cache API .clone() out-of-memory bug

// Implement a custom OPFS cache fetcher to bypass Cache API entirely
env.customFetch = async (request, options) => {
  const urlStr = typeof request === 'string' ? request : request.url;
  
  // Only intercept .onnx weight files
  if (!urlStr.includes('huggingface.co') || !urlStr.endsWith('.onnx')) {
    return fetch(request, options);
  }

  const filename = urlStr.split('/').pop();
  let root;
  try {
    root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(filename);
    const file = await fileHandle.getFile();
    if (file.size > 0) {
      self.postMessage({ type: 'STATUS', message: `Loaded ${filename} from local OPFS cache.` });
      return new Response(file);
    }
  } catch (e) {
    // File not found in OPFS, proceed to fetch
  }

  const response = await fetch(request, options);
  if (!response.ok || !root) return response;

  // Stream directly to OPFS while serving to transformers.js
  const reader = response.body.getReader();
  const fileHandle = await root.getFileHandle(filename, { create: true });
  const accessHandle = await fileHandle.createSyncAccessHandle();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            accessHandle.flush();
            accessHandle.close();
            controller.close();
            break;
          }
          accessHandle.write(value);
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
    statusText: response.statusText
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
