# AI Context & Payload Structure

This document details exactly how the UI constructs the payload for the local AI engine and what data is being fed into the WebGPU model generation pipeline.

## 1. How Context is Built (The Sliding Window)

When a user submits a query via the `AIAssistant` component, the system dynamically builds a context string from the files selected in the Workspace file manager.

### Text Files (Code, JSON, Markdown)
For plain text files, the system reads the file content from the Origin Private File System (OPFS). To prevent overflowing the context window (which would crash the local WebGPU model by running out of VRAM), it implements a **sliding window constraint**:
- If the file is **larger than 1500 characters**, it only extracts and injects the **last 1500 characters** (using `content.slice(-1500)`).
- If it's smaller, the whole file is injected.

### Binary Files (Spreadsheets, Images)
If a file cannot be read as plain text (e.g., it throws an error when trying to read a binary `.xlsx` file as UTF-8), the system falls back and injects a placeholder metadata string instead: `[Binary / Spreadsheet File Context]`.

The concatenated file strings are then injected into the overarching **System Prompt**.

## 2. Conversation History Capping

To allow the AI to maintain context of the conversation without overflowing the prompt limit, the `handleQuery` function takes the array of previous UI chat logs and converts them into standard `role`/`content` objects.

- **Sender 'user'** becomes `role: 'user'`
- **Sender 'ai'** becomes `role: 'assistant'`

It then strictly caps this array to the **last 6 messages** (`historyMessages.slice(-6)`). Older messages are pruned from the prompt.

## 3. The Exact JSON Payload Structure

The final array sent from the main thread (`App.jsx`) to the Web Worker (`ai.worker.js`) — which is then passed directly into `Transformers.js` — follows the ChatML instruction format. 

Here is the exact structure of the payload:

```json
[
  {
    "role": "system",
    "content": "You are an offline coding assistant. Here is the relevant file context:\n--- File: script.py ---\nimport pandas as pd\n# ... (up to 1500 chars of code) ...\n\n--- File: data.xlsx ---\n[Binary / Spreadsheet File Context]\n\n"
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

1. **Model Downloading (Silent Hang)**: Since the model weights (~70MB) are fetched from Hugging Face on the *first* query, the UI might appear frozen or non-responsive while the download happens in the background. Check the **Network** tab in DevTools to see if `.onnx` files are downloading.
2. **WebGPU Crash**: If the user's GPU doesn't have enough VRAM to allocate the context window + KV cache for the model, the pipeline will crash. This will show up in the **Console** as a `GPUValidationError` or `Device Lost`.
3. **WASM Fallback Module Missing**: If WebGPU fails, it falls back to WASM execution (`device: 'wasm'`). If the WASM files (`ort-wasm-simd-threaded.jsep.mjs`) cannot be fetched (e.g. 404 error), the pipeline initialization will abort.
