import { env, pipeline, TextStreamer } from '@huggingface/transformers';

// Configure Local Offline Flags
// allowLocalModels set to false ensures that if the model is not found in the browser cache,
// it will pull from Hugging Face Hub. Once fetched, the browser cache will serve it.
env.allowLocalModels = false;
env.useBrowserCache = true;

// Disable nested proxy workers — we are already running inside a Web Worker
env.backends.onnx.wasm.proxy = false;

// Force single-threaded WASM: prevents ort-wasm-simd-threaded.jsep.mjs from
// spawning further nested workers (which Vite's dev server intercepts and breaks)
env.backends.onnx.wasm.numThreads = 1;

// Point WASM binary fetches at the local node_modules path served by Vite.
// When onnxruntime-web is excluded from Vite's optimizeDeps, it's served directly
// from /node_modules/onnxruntime-web/dist/ — same origin, no COEP issues.
env.backends.onnx.wasm.wasmPaths = '/node_modules/onnxruntime-web/dist/';

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
    // Target the lightweight, powerful local LLM model converted for ONNX
    const modelId = 'onnx-community/Qwen2.5-Coder-0.5B-Instruct';
    const isWebGPUSupported = await checkWebGPUSupport();

    if (isWebGPUSupported) {
      try {
        self.postMessage({ type: 'STATUS', message: 'Initializing pipeline with WebGPU acceleration...' });
        tgPipeline = await pipeline('text-generation', modelId, {
          device: 'webgpu',          // Force WebGPU acceleration
          dtype: 'q4',               // Load the highly efficient 4-bit quantized version
        });
        self.postMessage({ type: 'STATUS', message: 'Model loaded successfully using WebGPU!' });
        return tgPipeline;
      } catch (gpuError) {
        console.warn('WebGPU failed to initialize despite API support. Falling back to WASM:', gpuError);
      }
    } else {
      self.postMessage({ type: 'STATUS', message: 'WebGPU is not supported in this browser environment. Using WASM fallback...' });
    }

    self.postMessage({ type: 'STATUS', message: 'Initializing pipeline with WASM (CPU) execution...' });
    tgPipeline = await pipeline('text-generation', modelId, {
      device: 'wasm',            // Fallback to WASM execution
      dtype: 'q4',               // Load the 4-bit quantized version
    });
    self.postMessage({ type: 'STATUS', message: 'Model loaded successfully using WASM (CPU fallback).' });
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
      const messages = [
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
