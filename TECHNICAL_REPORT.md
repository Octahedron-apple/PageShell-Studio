# PageShell Studio — Technical Report

## 1. Problem Statement

Most AI coding assistants require a persistent internet connection, send user code and documents to remote servers, and cannot run without cloud infrastructure. This creates friction in privacy-sensitive or connectivity-constrained environments.

PageShell Studio solves this by running the complete AI and execution pipeline inside the browser using WebAssembly and WebGPU — no server, no API keys, no data exfiltration.

---

## 2. Model & Runtime

### Primary AI Model — WebGPU Path

| Property | Value |
|---|---|
| Model | Qwen2.5-Coder-1.5B-Instruct |
| Quantization | 4-bit (q4f16_1) |
| Format | MLC (Machine Learning Compilation) |
| Runtime | WebLLM (`@mlc-ai/web-llm` v0.2.84) |
| Inference backend | WebGPU (GPU compute shaders) |
| Model size (quantized) | ~786 MB (cached in IndexedDB after first load) |
| Context window | 2048 tokens (configured) |
| Typical first-token latency | ~800 ms – 1.5 s (GPU-dependent) |
| Typical throughput | 15–35 tokens/sec (WebGPU, mid-range GPU) |

### Fallback AI Model — CPU/WASM Path

| Property | Value |
|---|---|
| Model | Xenova/Qwen1.5-0.5B-Chat |
| Quantization | 8-bit (q8) via ONNX |
| Format | ONNX |
| Runtime | Transformers.js (`@xenova/transformers` v2.17.2) |
| Inference backend | ONNX Runtime Web (WASM + SIMD) |
| Model size | ~500 MB |
| Typical throughput | 2–6 tokens/sec (CPU, mid-range laptop) |

The worker automatically falls back to the CPU path if:
- WebGPU is not supported by the browser
- `CreateMLCEngine()` throws during initialization
- A GPU out-of-memory error occurs mid-generation

A singleton Promise lock prevents duplicate WebGPU context creation on rapid concurrent requests.

---

## 3. Python Runtime

| Property | Value |
|---|---|
| Runtime | Pyodide v0.26.1 |
| Python version | CPython 3.12 (compiled to WebAssembly) |
| Execution context | Dedicated Web Worker |
| File system mount | OPFS workspace mounted at `/workspace` |
| Offline packages | numpy 1.26.4, pandas 2.2.0, openpyxl 3.1.5, xlrd 2.0.1, python-dateutil 2.9.0, pytz 2024.1, micropip 0.6.0 |
| Package source | Local `.whl` files in `/public/vendor/pyodide/` (no PyPI network requests) |

---

## 4. JavaScript Runtime

| Property | Value |
|---|---|
| Runtime | QuickJS (via quickjs-emscripten v0.29.2) |
| Execution context | Dedicated Web Worker |
| Memory management | Manual: all `JSValue` handles explicitly `.dispose()`d inside `try/finally` |
| Isolation | Linear WASM heap — no access to browser APIs or main thread |

---

## 5. Speech-to-Text (Voice Input)

| Property | Value |
|---|---|
| Engine | Whisper.cpp (compiled to WASM) |
| Model | Whisper base (multilingual) |
| Execution | Dedicated Web Worker (`whisper.worker.js`) |
| Audio preprocessing | Resampled to 16 kHz mono Float32Array before dispatch |
| Model caching | IndexedDB (persists across sessions) |
| **Internet required** | **Yes — model download on first use. Transcription itself is on-device.** |

---

## 6. Document Processing

All document parsing runs entirely client-side with no network calls:

| Format | Library | Method |
|---|---|---|
| PDF | pdfjs-dist v6.1.200 | In-memory worker (no external fetch). Text extracted page-by-page. |
| DOCX | mammoth v1.12.0 | `convertToHtml({ arrayBuffer })` |
| XLSX / XLS | xlsx (SheetJS) v0.18.5 | Binary array buffer parsing |
| CSV | xlsx | Parsed as spreadsheet |

---

## 7. File System

| Property | Value |
|---|---|
| Storage API | Origin Private File System (OPFS) |
| Access pattern | `FileSystemSyncAccessHandle` inside a dedicated Web Worker (`fs.worker.js`) |
| Persistence | Survives page refreshes and browser restarts |
| Binary support | `readFileBinary()` returns raw `Uint8Array` — no UTF-8 decode corruption |
| Locking | Each handle is flushed and closed immediately after every operation |

---

## 8. Hardware Requirements & Tested Configurations

### Minimum (CPU fallback mode)
- Any modern browser (Chrome 80+, Firefox 90+, Edge 80+)
- 4 GB RAM
- No GPU required

### Recommended (WebGPU mode)
- Chrome 113+ or Edge 113+
- 8 GB RAM
- Dedicated GPU with WebGPU support (NVIDIA, AMD, Apple Silicon)
- 4 GB VRAM (for model weight caching)

### Tested Devices

| Device | OS | Browser | Mode | Notes |
|---|---|---|---|---|
| MacBook Pro M2 | macOS 14 | Chrome 124 | WebGPU | ~25 tok/s |
| Windows 11 laptop (Intel i7, RTX 3060) | Windows 11 | Edge 123 | WebGPU | ~30 tok/s |
| Ubuntu desktop (no dGPU) | Ubuntu 22.04 | Chrome 124 | CPU fallback | ~4 tok/s |
| Android phone (Pixel 7) | Android 14 | Chrome | CPU fallback | ~1–2 tok/s |

---

## 9. Performance Summary

| Metric | WebGPU | CPU/WASM |
|---|---|---|
| First-token latency | 800 ms – 1.5 s | 5 – 15 s |
| Generation throughput | 15 – 35 tok/s | 2 – 6 tok/s |
| Peak VRAM (WebGPU) | ~900 MB | N/A |
| Peak RAM (WASM) | ~1.5 GB | ~600 MB |
| Pyodide cold start | ~3 – 5 s | ~3 – 5 s |
| Python execution (simple script) | < 100 ms | < 100 ms |

---

## 10. Local AI Verification

| Component | On-Device? | Notes |
|---|---|---|
| LLM inference (WebGPU) | ✅ Yes | After one-time model download to IndexedDB |
| LLM inference (CPU fallback) | ✅ Yes | After one-time model download |
| Python execution | ✅ Yes | Pyodide + all wheels bundled locally |
| JavaScript execution | ✅ Yes | QuickJS WASM bundled locally |
| Document parsing (PDF/DOCX/XLSX) | ✅ Yes | All client-side libraries |
| File search | ✅ Yes | MiniSearch in-browser |
| Voice transcription | ✅ Yes (after model download) | Whisper WASM runs locally |
| **Voice model download** | ❌ Internet required | First use only |
| **WebLLM model download** | ❌ Internet required | First use only (~786 MB) |
| **User data to servers** | ❌ Never | Zero exfiltration |

---

## 11. Evaluation

### AI Response Quality
The primary model (Qwen2.5-Coder-1.5B-Instruct) is a code-specialized model. Qualitative evaluation:

| Task | Quality |
|---|---|
| Simple code generation (Python, JS) | Good |
| File creation via tool call | Good |
| Targeted file editing | Good |
| Explaining uploaded documents | Good |
| Complex multi-step reasoning | Limited (1.5B parameter constraint) |
| Long context retention (>2K tokens) | Degrades |

### Known Failure Cases
- **Context window overflow**: Very large files injected as context cause truncation artifacts
- **Tool call hallucination**: The model occasionally describes a tool call in prose instead of emitting JSON (mitigated by JSON block extractor + markdown fence stripper)
- **CPU mode coherence**: The 0.5B fallback model is significantly less capable and may produce lower-quality responses
- **VRAM exhaustion**: Devices with <4 GB VRAM may trigger GPU device loss mid-generation (mitigated by automatic CPU fallback on error)

---

## 12. Privacy & Safety

### Data Handling
- **No data leaves the device.** All processing happens in-browser WASM/WebGPU workers.
- Files stored in OPFS are sandboxed to the origin (`octahedron-apple.github.io`) and inaccessible to other sites.
- Chat history is stored in `localStorage` only.
- No analytics, no telemetry, no crash reporting.

### Permissions Required
| Permission | Purpose |
|---|---|
| `storage` (OPFS) | Persistent workspace file system |
| `microphone` | Voice input (only when user initiates recording) |
| `service-worker` | Cross-origin isolation headers (COI-SW) |

### Limitations & Risks
- The AI can write and modify files in the OPFS workspace — users must confirm all tool calls before execution
- The Python sandbox (Pyodide) runs in a Web Worker but has access to OPFS-mounted files; malicious code could corrupt workspace files
- No authentication layer — any user with access to the browser profile can access the workspace

---

## 13. Attribution

### Pretrained Models
| Model | Author | License |
|---|---|---|
| Qwen2.5-Coder-1.5B-Instruct (MLC quantized) | Alibaba Cloud / MLC-AI | Apache 2.0 |
| Xenova/Qwen1.5-0.5B-Chat | Alibaba Cloud / Xenova | Apache 2.0 |
| Whisper base | OpenAI | MIT |

### Key Libraries & Runtimes
| Library | Author | License |
|---|---|---|
| WebLLM (`@mlc-ai/web-llm`) | MLC-AI | Apache 2.0 |
| Transformers.js (`@xenova/transformers`) | Xenova / HuggingFace | Apache 2.0 |
| Pyodide | Mozilla / Pyodide contributors | MPL 2.0 |
| quickjs-emscripten | justjake | MIT |
| pdfjs-dist | Mozilla | Apache 2.0 |
| mammoth | Michael Williamson | BSD 2-Clause |
| SheetJS (xlsx) | SheetJS contributors | Apache 2.0 |
| CodeMirror 6 | Marijn Haverbeke | MIT |
| MiniSearch | Luca Ongaro | MIT |
| JSZip | Stuart Knightley | MIT / GPLv3 |
| React | Meta | MIT |
| Vite | Evan You | MIT |
| Tailwind CSS | Tailwind Labs | MIT |
| coi-serviceworker | gzuidhof | MIT |

### Datasets
No training was performed. All models are used as-is from their pretrained checkpoints.
