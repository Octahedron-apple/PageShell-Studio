# AI Context & Payload Structure

This document details exactly how the UI constructs the payload for the local AI engine and what data is being fed into the WebGPU/WASM model generation pipeline.

## Active Model

| Property | Value |
|----------|-------|
| **Model ID** | `onnx-community/Qwen2.5-Coder-1.5B-Instruct` |
| **Format** | ONNX (4-bit quantized, `dtype: 'q4'`) |
| **Size** | ~900MB (downloaded once, cached in browser IndexedDB) |
| **Tuning** | Code-focused instruction following (Qwen2.5-Coder series) |
| **Runtime** | `@huggingface/transformers` v3 — WebGPU with WASM CPU fallback |

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

## 3. The Exact JSON Payload Structure

The final array sent from the main thread to the Web Worker (`ai.worker.js`) — which is then passed directly into `Transformers.js` — follows the **ChatML instruction format** expected by the Qwen2.5 model family.

Here is the exact structure of the payload:

```json
[
  {
    "role": "system",
    "content": "You are an offline coding assistant. Here is the relevant file context:\n--- File: script.py ---\nimport pandas as pd\n# ... (up to 1500 chars of code) ...\n\n--- File: data.xlsx (Excel Schema Snapshot) ---\n{\n  \"schema\": {\n    \"Employee\": \"object\",\n    \"Salary\": \"int64\"\n  },\n  \"preview_rows\": [\n    {\n      \"Employee\": \"Alice Smith\",\n      \"Salary\": 85000\n    }\n  ]\n}\n\n"
  },
  {
    "role": "user",
    "content": "Can you analyze this file?"
  },
  {
    "role": "assistant",
    "content": "Sure, I can see it's a python script..."
  },
  {
    "role": "user",
    "content": "Write a python script to read it."
  }
]
```

## Troubleshooting "AI is not working"

If the AI fails to output text, the failure usually happens at one of these boundaries:

1. **Model Downloading (Silent Hang)**: The model weights (~900MB) are fetched from Hugging Face on the *first* query and cached permanently in IndexedDB. The UI may appear frozen during this time. Check the **Network** tab in DevTools — you should see large `.onnx` files downloading progressively.
2. **WebGPU Crash**: If the GPU doesn't have enough VRAM for the 1.5B model's context window + KV cache, the pipeline will crash. This appears in the **Console** as a `GPUValidationError` or `Device Lost`. The app will automatically fall back to WASM.
3. **WASM Fallback Slow**: The CPU WASM fallback works but is significantly slower (~5-10x) than WebGPU for a 1.5B model. Expect longer generation times on machines without a capable GPU.
4. **WASM Binary Missing**: If the WASM runtime files (`ort-wasm-simd-threaded.jsep.mjs`) cannot be fetched (404 error), pipeline initialization will abort entirely. Ensure the `vendor/onnx/` directory is deployed correctly.
