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
  const { action, prompt, tools } = e.data;

  if (action === 'GENERATE') {
    try {
      const eng = await getEngine();

      const messages = Array.isArray(prompt) ? prompt : [
        { role: 'user', content: prompt }
      ];

      const request = {
        messages,
        temperature: 0.3,
        stream: true,
      };
      
      if (tools && tools.length > 0) {
        request.tools = tools;
      }

      const chunks = await eng.chat.completions.create(request);

      let finalOutput = '';
      let toolCalls = [];

      for await (const chunk of chunks) {
        const token = chunk.choices[0]?.delta?.content || '';
        finalOutput += token;
        
        // Accumulate tool calls natively
        if (chunk.choices[0]?.delta?.tool_calls) {
          for (const tcDelta of chunk.choices[0].delta.tool_calls) {
            const index = tcDelta.index;
            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: tcDelta.id || '',
                type: 'function',
                function: { name: tcDelta.function?.name || '', arguments: tcDelta.function?.arguments || '' }
              };
            } else {
              if (tcDelta.function?.name) toolCalls[index].function.name += tcDelta.function.name;
              if (tcDelta.function?.arguments) toolCalls[index].function.arguments += tcDelta.function.arguments;
            }
          }
        }

        // Stream token to main thread
        if (token) {
          self.postMessage({ type: 'TOKEN', token });
        }
      }

      // Clean up tool calls array
      const finalToolCalls = toolCalls.filter(tc => tc && tc.function && tc.function.name);

      // Signal completion
      self.postMessage({ 
        type: 'COMPLETE', 
        output: finalOutput,
        tool_calls: finalToolCalls.length > 0 ? finalToolCalls : undefined 
      });

    } catch (err) {
      console.error('Error during generation:', err);
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }
};
