import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

let engine = null;
let useFallback = false;
let fallbackGenerator = null;

// Using a lightweight coder model available in WebLLM's prebuilt registry.
const modelId = "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC";

let enginePromise = null;
async function getEngine() {
  if (useFallback) return null;
  if (engine) return engine;
  
  if (!enginePromise) {
    enginePromise = (async () => {
      self.postMessage({ type: 'STATUS', message: 'Initializing WebLLM WebGPU Engine...' });
      
      const initProgressCallback = (progress) => {
        const pct = Math.round(progress.progress * 100);
        self.postMessage({ type: 'STATUS', message: `Loading WebGPU model: ${pct}% - ${progress.text}` });
      };

      try {
        const eng = await CreateMLCEngine(modelId, { initProgressCallback });
        self.postMessage({ type: 'STATUS', message: 'Model ready with WebGPU acceleration!' });
        engine = eng;
        return eng;
      } catch (e) {
        console.warn("Failed to initialize WebLLM with WebGPU:", e);
        useFallback = true;
        self.postMessage({ type: 'STATUS', message: 'WebGPU not supported or initialization failed. Switching to CPU/WASM fallback...' });
        return null;
      }
    })();
  }
  return enginePromise;
}

let fallbackGeneratorPromise = null;
async function getFallbackGenerator() {
  if (fallbackGenerator) return fallbackGenerator;
  
  if (!fallbackGeneratorPromise) {
    fallbackGeneratorPromise = (async () => {
      self.postMessage({ type: 'STATUS', message: 'Initializing CPU fallback (Transformers.js)...' });

      const progress_callback = (progress) => {
        if (progress.status === 'progress') {
          const pct = Math.round(progress.progress);
          self.postMessage({ type: 'STATUS', message: `Loading fallback model (${progress.file}): ${pct}%` });
        }
      };

      try {
        const gen = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', { progress_callback });
        self.postMessage({ type: 'STATUS', message: 'Fallback model ready (CPU/WASM)!' });
        fallbackGenerator = gen;
        return gen;
      } catch (err) {
        console.error("Failed to initialize Transformers.js fallback:", err);
        self.postMessage({ type: 'ERROR', error: `CPU fallback failed to initialize: ${err.message}` });
        throw err;
      }
    })();
  }
  return fallbackGeneratorPromise;
}

self.onmessage = async (e) => {
  const { action, prompt, tools, stream = true, requestId } = e.data;

  if (action === 'INTERRUPT') {
    if (engine && typeof engine.interruptGenerate === 'function') {
      try {
        engine.interruptGenerate();
      } catch (err) {
        console.warn("Could not interrupt WebLLM engine:", err);
      }
    }
    return;
  }

  if (action === 'GENERATE') {
    try {
      const messages = Array.isArray(prompt) ? prompt : [
        { role: 'user', content: prompt }
      ];

      if (tools && tools.length > 0) {
        // Inject tool schema into the system prompt.
        // IMPORTANT: instruct the model to ONLY use tools when explicitly asked,
        // never proactively. Regular conversation should never trigger a tool call.
        const toolsPrompt = `\n\nYou have access to the following tools, but ONLY use them when the user explicitly asks you to create files or run code. For all other questions, answer conversationally with plain text.\n\nAvailable tools:\n${JSON.stringify(tools, null, 2)}\n\nTo invoke a tool, output ONLY a valid JSON object with "name" and "args" keys and nothing else. Do NOT use a tool unless the user's message clearly and directly requests file creation or code execution.`;
        
        if (messages[0] && messages[0].role === 'system') {
          messages[0].content += toolsPrompt;
        } else {
          messages.unshift({ role: 'system', content: toolsPrompt });
        }
      }

      let eng = null;
      try {
        eng = await getEngine();
      } catch (e) {
        console.warn("getEngine failed:", e);
        useFallback = true;
        engine = null;
      }

      let generationSuccessful = false;

      if (eng && !useFallback) {
        try {
          const request = {
            messages,
            temperature: 0.3,
            stream: stream,
            max_tokens: 2048,
          };

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

            // Stream token to main thread if streaming is enabled
            if (token && stream) {
              self.postMessage({ type: 'TOKEN', token, requestId });
            }
          }

          // Clean up tool calls array
          const finalToolCalls = toolCalls.filter(tc => tc && tc.function && tc.function.name);

          // Signal completion
          self.postMessage({ 
            type: 'COMPLETE', 
            output: finalOutput,
            tool_calls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
            requestId
          });

          generationSuccessful = true;
        } catch (err) {
          console.warn("WebLLM generation failed mid-flight, resetting engine and falling back to CPU:", err);
          engine = null;
          useFallback = true;
          self.postMessage({ type: 'STATUS', message: 'WebLLM error encountered. Falling back to CPU/WASM...' });
          if (eng && typeof eng.unload === 'function') {
            try { await eng.unload(); } catch(_) {}
          }
        }
      }

      if (!generationSuccessful) {
        // CPU fallback generation via Transformers.js
        const gen = await getFallbackGenerator();

        const formattedPrompt = gen.tokenizer.apply_chat_template(messages, {
          tokenize: false,
          add_generation_prompt: true,
        });

        let finalOutput = '';
        let lastLength = 0;

        const output = await gen(formattedPrompt, {
          max_new_tokens: 512,
          temperature: 0.3,
          do_sample: true,
          callback_function: (beams) => {
            const token_ids = beams[0].output_token_ids;
            const fullText = gen.tokenizer.decode(token_ids, { skip_special_tokens: true });
            const token = fullText.slice(lastLength);
            lastLength = fullText.length;
            if (token) {
              if (stream) {
                self.postMessage({ type: 'TOKEN', token, requestId });
              }
              finalOutput += token;
            }
          }
        });

        const outputText = Array.isArray(output) ? output[0].generated_text : output.generated_text;
        const finalGeneratedText = outputText.substring(formattedPrompt.length);

        self.postMessage({ 
          type: 'COMPLETE', 
          output: finalGeneratedText,
          requestId
        });
      }

    } catch (err) {
      console.error('Error during generation:', err);
      self.postMessage({ type: 'ERROR', error: err.message, requestId });
    }
  }
};
