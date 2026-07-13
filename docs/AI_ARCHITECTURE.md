# AI Context & Payload Structure

This document details exactly how the UI constructs the payload for the local AI engine and what data is being fed into the WebGPU/WASM model generation pipeline.

## Active Model

| Property | Value |
|----------|-------|
| **Model ID** | `Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC` |
| **Format** | WebLLM MLC compiled format (`q4f16_1`) |
| **Size** | ~900MB (downloaded once, cached in browser IndexedDB) |
| **Tuning** | Code-focused instruction following (Qwen2.5-Coder series) |
| **Runtime** | `@mlc-ai/web-llm` — WebGPU native with `@huggingface/transformers` CPU fallback |

## 1. How Context is Built (The Sliding Window)

When a user submits a query via the `AIAssistant` component, the system dynamically builds a context string from the files selected in the Workspace file manager.

### Text Files (Code, JSON, Markdown)
For plain text files, the system reads the file content from the Origin Private File System (OPFS). To prevent overflowing the context window (which would crash the local WebGPU model by running out of VRAM), it implements a **sliding window constraint**:
- If the file is **larger than 1500 characters**, it only extracts and injects the **last 1500 characters** (using `content.slice(-1500)`).
- If it's smaller, the whole file is injected.

### Excel Files (.xlsx, .xls)
When an Excel spreadsheet is selected, the application intercepts the file and spins up a micro **Python script** inside the background Pyodide sandbox. 
1. It uses `pandas.read_excel(..., nrows=5)` to perform a bounded read directly from the OPFS storage, preventing massive enterprise sheets from crashing the browser.
2. It extracts the structural dimensions (column names and their data types).
3. It formats a preview bundle consisting of the schema and the first 2 rows of data.
4. It returns this structural payload as a JSON string and injects it into the prompt under an `(Excel Schema Snapshot)` header.

### Other Binary Files
If a file is another unknown binary format that fails to read, the system falls back and injects a placeholder metadata string: `[Context Extraction Failed: error message]`.

The concatenated file strings are then injected into the overarching **System Prompt**.

## 2. Conversation History Capping

To allow the AI to maintain context of the conversation without overflowing the prompt limit, the `handleQuery` function takes the array of previous UI chat logs and converts them into standard `role`/`content` objects.

- **Sender 'user'** becomes `role: 'user'`
- **Sender 'ai'** becomes `role: 'assistant'`

It then strictly caps this array to the **last 6 messages** (`historyMessages.slice(-6)`). Older messages are pruned from the prompt.

## 3. Tool Protocols & Interception Mechanism

The system now supports **Tool Calling**, allowing the AI to break out of the chat UI and execute actions within the local PageShell Studio environment.

### Defined Protocols
The AI is provided with a standard OpenAI-compatible JSON schema array for local capabilities:
- **`write_file`**: Instructs the `fileSystemAPI` worker to write string content to a specified path in the Origin Private File System (OPFS).
- **`run_python`**: Instructs the `Pyodide` worker to evaluate a python script directly within the client-side WebAssembly sandbox.

### The Managed Execution Loop
The system utilizes WebLLM's native OpenAI-compatible `tools` parameter support:
1. It requests the AI to generate a response, passing the array of schemas via `request.tools`.
2. The WebLLM worker streams back standard chunk deltas. It natively accumulates `chunk.choices[0].delta.tool_calls`.
3. **If detected**, the loop receives the `tool_calls` array in the `COMPLETE` event, blocks UI output, parses the JSON arguments, and executes the designated JavaScript function.
4. The result of the function execution is appended to the message array with `role: "tool"`, and the generation is re-triggered automatically.
5. **If no tool calls are detected**, the loop breaks, and the final response is displayed to the user.

## 4. The Exact JSON Payload Structure

The final request sent to the WebLLM engine (`ai.worker.js`) strictly mirrors the **OpenAI Chat Completions API** format.

Here is the exact structure of the payload:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an offline coding assistant. Here is the relevant file context:\n--- File: script.py ---\nimport pandas as pd\n# ... (up to 1500 chars of code) ..."
    },
    {
      "role": "user",
      "content": "Write a hello world script to hello.py"
    },
    {
      "role": "assistant",
      "content": "",
      "tool_calls": [
        {
          "id": "call_123",
          "type": "function",
          "function": {
            "name": "write_file",
            "arguments": "{\"path\": \"hello.py\", \"content\": \"print('Hello World')\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_123",
      "content": "Successfully wrote to hello.py"
    },
    {
      "role": "assistant",
      "content": "I have created the script for you!"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "write_file",
        "description": "Write content to a file in the workspace",
        "parameters": {
          "type": "object",
          "properties": {
            "path": {"type": "string"},
            "content": {"type": "string"}
          }
        }
      }
    }
  ]
}
```

## 5. Main-Thread to Worker Messaging Protocol

To prevent cross-contamination of streams (e.g., if a user spams "Generate", or if a bulk process runs simultaneously with an autocomplete request), `models.js` and `ai.worker.js` communicate using a strict Request-ID protocol.

### Outgoing Payload (Main to Worker)
When requesting generation, the main thread assigns a unique `requestId` and passes it along with a `stream` flag:
```json
{
  "action": "GENERATE",
  "prompt": [...messages],
  "tools": [...tools],
  "stream": true,
  "requestId": "req_1"
}
```
- **`stream: true`**: Used for chat UI. Yields `TOKEN` events progressively.
- **`stream: false`**: Used for the Bulk AI Action pipeline to prevent UI blocking. Skips `TOKEN` events and only returns `COMPLETE`.

### Incoming Payload (Worker to Main)
The Web Worker echoes the `requestId` back in every lifecycle event (`TOKEN`, `COMPLETE`, `ERROR`). `models.js` uses a dictionary map (`activeRequests`) to safely route incoming tokens to the correct callback function:
```json
{
  "type": "TOKEN",
  "token": "Hello",
  "requestId": "req_1"
}
```
This architecture guarantees that simultaneous LLM tasks safely manage their own state buffers without overwriting global variables.

## Troubleshooting "AI is not working"

If the AI fails to output text, the failure usually happens at one of these boundaries:

1. **Model Downloading (Silent Hang)**: The model weights (~900MB) are fetched from Hugging Face on the *first* query and cached permanently in IndexedDB. The UI may appear frozen during this time. Check the **Network** tab in DevTools — you should see large `.onnx` files downloading progressively.
2. **WebGPU Crash**: If the GPU doesn't have enough VRAM for the 1.5B model's context window + KV cache, the pipeline will crash. This appears in the **Console** as a `GPUValidationError` or `Device Lost`. The app will automatically fall back to WASM.
3. **WASM Fallback Slow**: The CPU WASM fallback works but is significantly slower (~5-10x) than WebGPU for a 1.5B model. Expect longer generation times on machines without a capable GPU.
4. **WASM Binary Missing**: If the WASM runtime files (`ort-wasm-simd-threaded.jsep.mjs`) cannot be fetched (404 error), pipeline initialization will abort entirely. Ensure the `vendor/onnx/` directory is deployed correctly.
