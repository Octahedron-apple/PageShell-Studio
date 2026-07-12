import { env, pipeline, TextStreamer } from '@huggingface/transformers';

// Load model from HuggingFace Hub — downloaded once and cached in IndexedDB.
// Model: onnx-community/Qwen2.5-Coder-1.5B-Instruct (q4, ~900MB on first load)
// This avoids bundling weights into the deployment artifact, keeping CI fast.
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;   // Caches weights in IndexedDB after first download

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
    // Qwen2.5-Coder-1.5B-Instruct — code-tuned, ONNX q4, ~900MB cached after first load.
    const modelId = 'onnx-community/Qwen2.5-Coder-1.5B-Instruct';
    const isWebGPUSupported = await checkWebGPUSupport();

    if (isWebGPUSupported) {
      try {
        self.postMessage({ type: 'STATUS', message: 'Initializing Qwen2.5-Coder with WebGPU acceleration...' });
        tgPipeline = await pipeline('text-generation', modelId, {
          device: 'webgpu',
          dtype: 'q4',
        });
        self.postMessage({ type: 'STATUS', message: 'Qwen2.5-Coder loaded with WebGPU!' });
        return tgPipeline;
      } catch (gpuError) {
        console.warn('WebGPU failed to initialize despite API support. Falling back to WASM:', gpuError);
      }
    } else {
      self.postMessage({ type: 'STATUS', message: 'WebGPU is not supported in this browser environment. Using WASM fallback...' });
    }

    self.postMessage({ type: 'STATUS', message: 'Initializing Qwen2.5-Coder with WASM (CPU)...' });
    tgPipeline = await pipeline('text-generation', modelId, {
      device: 'wasm',
      dtype: 'q4',
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
