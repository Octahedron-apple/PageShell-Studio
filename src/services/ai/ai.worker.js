import { CreateMLCEngine } from '@mlc-ai/web-llm';

let engine = null;

// Using a lightweight coder model available in WebLLM's prebuilt registry.
const modelId = "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC";

async function getEngine() {
  if (!engine) {
    self.postMessage({ type: 'STATUS', message: 'Initializing WebLLM WebGPU Engine...' });

    const initProgressCallback = (progress) => {
      // progress.progress is a float from 0 to 1
      const pct = Math.round(progress.progress * 100);
      self.postMessage({
        type: 'STATUS',
        message: `Loading model: ${pct}% - ${progress.text}`
      });
    };

    try {
      engine = await CreateMLCEngine(
        modelId,
        { initProgressCallback }
      );
      self.postMessage({ type: 'STATUS', message: 'Model ready with WebGPU acceleration!' });
    } catch (e) {
      console.error("Failed to initialize WebLLM:", e);
      self.postMessage({ type: 'ERROR', error: `WebGPU Initialization failed: ${e.message}` });
      throw e;
    }
  }
  return engine;
}

self.onmessage = async (e) => {
  const { action, prompt } = e.data;

  if (action === 'GENERATE') {
    try {
      const eng = await getEngine();

      const messages = Array.isArray(prompt) ? prompt : [
        { role: 'user', content: prompt }
      ];

      const chunks = await eng.chat.completions.create({
        messages,
        temperature: 0.3,
        stream: true,
      });

      let finalOutput = '';
      for await (const chunk of chunks) {
        const token = chunk.choices[0]?.delta?.content || '';
        finalOutput += token;
        // Stream token to main thread
        self.postMessage({ type: 'TOKEN', token });
      }

      // Signal completion
      self.postMessage({ type: 'COMPLETE', output: finalOutput });

    } catch (err) {
      console.error('Error during generation:', err);
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }
};
