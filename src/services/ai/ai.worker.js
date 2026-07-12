import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { fileSystemAPI } from '../fs/fileSystem.js';

let generator = null;
let modelLoading = false;
const MODEL_ID = 'Qwen/Qwen2.5-Coder-0.5B-Instruct';

env.useBrowserCache = false;

// Custom OPFS Fetcher to bypass Cache API clone memory issues
env.customFetch = async function(url, options) {
  const opfsPath = `workspace/.cache/${new URL(url).pathname.replace(/^\/+/, '').replace(/\//g, '_')}`;
  const metaPath = `${opfsPath}.meta`;
  
  try {
    try {
      const metaStr = await fileSystemAPI.readFile(metaPath);
      const meta = JSON.parse(metaStr);
      const content = await fileSystemAPI.readFile(opfsPath, true); // read binary
      if (content && content.length === meta.size) {
        return new Response(content, {
          status: 200,
          headers: {
            'Content-Type': meta.type || 'application/octet-stream',
            'Content-Length': meta.size.toString()
          }
        });
      }
    } catch(e) { }

    const res = await fetch(url, options);
    if (!res.ok) return res;

    const resClone = res.clone();
    const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = res.headers.get('Content-Length') || '0';

    try {
      const encoder = new TextEncoder();
      const metaStr = JSON.stringify({ type: contentType, size: parseInt(contentLength, 10) });
      await fileSystemAPI.writeFile(metaPath, encoder.encode(metaStr));

      const arrayBuffer = await resClone.arrayBuffer();
      await fileSystemAPI.writeFile(opfsPath, new Uint8Array(arrayBuffer));
    } catch(e) {
      console.warn("Failed to cache model file in OPFS:", e);
    }
    
    return res;
  } catch (error) {
    console.error(`Custom fetch failed for ${url}`, error);
    throw error;
  }
};

async function getGenerator() {
  if (generator) return generator;
  if (modelLoading) {
    while (modelLoading) await new Promise(r => setTimeout(r, 100));
    return generator;
  }

  modelLoading = true;
  self.postMessage({ type: 'STATUS', message: 'Initializing transformers.js pipeline...' });

  const progressCallback = (info) => {
    if (info.status === 'progress') {
      self.postMessage({ type: 'STATUS', message: `Loading: ${info.file} - ${Math.round(info.progress)}%` });
    }
  };

  try {
    let device = 'wasm';
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) device = 'webgpu';
      } catch (e) { }
    }
    
    if (device === 'wasm') {
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.numThreads = 1;
      self.postMessage({ type: 'STATUS', message: 'WebGPU not supported. Using WASM fallback (CPU)...' });
    } else {
      self.postMessage({ type: 'STATUS', message: 'WebGPU supported! Initializing hardware acceleration...' });
    }

    generator = await pipeline('text-generation', MODEL_ID, {
      device: device,
      progress_callback: progressCallback,
      dtype: 'q4',
    });

    self.postMessage({ type: 'STATUS', message: `Model loaded on ${device.toUpperCase()}!` });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error.message });
    throw error;
  } finally {
    modelLoading = false;
  }
  return generator;
}

self.onmessage = async (e) => {
  const { action, prompt } = e.data;
  if (action === 'GENERATE') {
    try {
      const gen = await getGenerator();
      const messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
      
      const text = gen.tokenizer.apply_chat_template(messages, {
        tokenize: false,
        add_generation_prompt: true,
      });

      const streamer = new TextStreamer(gen.tokenizer, {
        skip_prompt: true,
        callback_function: (output) => {
          self.postMessage({ type: 'TOKEN', token: output });
        }
      });

      const result = await gen(text, {
        max_new_tokens: 512,
        temperature: 0.3,
        streamer: streamer,
      });

      // Result[0].generated_text already has the prompt included sometimes,
      // but the streamer handles the clean delta sending.
      self.postMessage({ type: 'COMPLETE', output: "Generation finished." });
      
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }
};
