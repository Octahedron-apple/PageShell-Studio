# PageShell Studio — Architecture

## Overview

PageShell Studio is a browser-native, offline-first AI coding and data assistant. Every computation — from LLM inference to Python execution — runs inside the user's browser tab as WebAssembly or WebGPU kernels. There is no backend server. The only optional network dependency is the one-time download of model weights and the Whisper speech recognition model.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Tab                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React UI (Main Thread)                │   │
│  │                                                         │   │
│  │  Editor │ Terminal │ AI Chat │ Documents │ File Tree    │   │
│  │                         │                               │   │
│  │              AppContext.jsx (State + Orchestration)      │   │
│  └──────────┬──────────────┬───────────────┬───────────────┘   │
│             │              │               │                    │
│    postMessage         postMessage     postMessage              │
│             │              │               │                    │
│  ┌──────────▼──┐  ┌────────▼───┐  ┌───────▼────────┐          │
│  │ ai.worker.js│  │pyodide     │  │ quickjs        │          │
│  │             │  │.worker.js  │  │ .worker.js     │          │
│  │ WebLLM      │  │            │  │                │          │
│  │ (WebGPU)    │  │ Pyodide    │  │ QuickJS        │          │
│  │     or      │  │ CPython    │  │ WASM           │          │
│  │ Transformers│  │ 3.12 WASM  │  │                │          │
│  │ .js (WASM)  │  │            │  │                │          │
│  └─────────────┘  └────────────┘  └────────────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  fs.worker.js (OPFS Broker)              │   │
│  │   READ / WRITE / LIST / DELETE files via                 │   │
│  │   Origin Private File System (SyncAccessHandle)          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────┐   ┌────────────────────────────────┐  │
│  │  IndexedDB           │   │  LocalStorage                  │  │
│  │  - WebLLM model      │   │  - System prompt               │  │
│  │    weight cache      │   │  - Chat session history        │  │
│  │  - Whisper model     │   │  - Theme / settings            │  │
│  └─────────────────────┘   └────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Origin Private File System (OPFS)            │  │
│  │              /workspace/  (user files, persistent)        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    (network, first load only)
                              │
              ┌───────────────┴──────────────┐
              │  HuggingFace / MLC CDN        │
              │  - Qwen2.5-Coder-1.5B-MLC    │
              │  - Xenova/Qwen1.5-0.5B-Chat  │
              │  - Whisper model weights      │
              └──────────────────────────────┘
```

---

## Component Descriptions

### Main Thread — React UI (`src/`)

| File | Role |
|---|---|
| `AppContext.jsx` | Central state store. Orchestrates AI generation loop, tool calling pipeline, file context injection, chat history. |
| `pages/AIPage.jsx` | AI assistant UI — message list, input box, tool confirmation dialog |
| `pages/EditorPage.jsx` | CodeMirror 6 editor with AI autocomplete |
| `pages/RunPage.jsx` | Code execution UI — sends code to Python or JS runtime |
| `pages/DocumentsPage.jsx` | Document viewer and exporter (PDF, DOCX, XLSX) |
| `pages/FSPage.jsx` | File tree browser backed by OPFS |
| `components/Terminal.jsx` | Live stdout/stderr log panel |

### AI Service Layer (`src/services/ai/`)

| File | Role |
|---|---|
| `ai.worker.js` | Dedicated Web Worker. Initialises WebLLM (WebGPU) or Transformers.js (CPU fallback). Injects tool schema into system prompt. Streams tokens back to main thread. |
| `models.js` | Main-thread bridge to `ai.worker.js`. Manages request queue and streaming callbacks. |
| `rag.js` | Retrieval-Augmented Generation helpers. Extracts text from PDF (via pdfjs-dist) and DOCX (via mammoth) for AI context injection. |
| `embeddings.worker.js` | Optional semantic embedding worker for future RAG upgrades. |

### File System Layer (`src/services/fs/`)

| File | Role |
|---|---|
| `fs.worker.js` | OPFS broker worker. All file I/O (read, write, delete, list) is serialised through this worker to avoid main-thread locking. Supports both text and binary (`Uint8Array`) operations. |
| `fileSystem.js` | Main-thread API over `fs.worker.js`. Exposes `readFile`, `readFileBinary`, `writeFile`, `deleteFile`, `listFiles`, `getWorkspaceHandle`. |
| `search.js` | MiniSearch-based full-text index. `buildGlobalIndex`, `updateFileInIndex`, `removeFileFromIndex`. |
| `bundler.js` | Bundles HTML/CSS/JS files for live preview in an `<iframe>`. |

### Runtime Layer (`src/services/runtimes/`)

| File | Role |
|---|---|
| `pyodide.worker.js` | Loads Pyodide from `/public/vendor/pyodide/`. Mounts OPFS workspace at `/workspace`. Installs offline `.whl` packages. Redirects stdout/stderr to main thread. |
| `pyodide.js` | Main-thread bridge. Singleton worker, pending task queue, log subscriber. |
| `quickjs.worker.js` | Loads QuickJS WASM. Runs JS code in an isolated linear heap. Disposes all handles to prevent memory leaks. |
| `quickjs.js` | Main-thread bridge to `quickjs.worker.js`. |

---

## Model Pipeline

```
User Message
     │
     ▼
AppContext.handleQuery()
     │
     ├─ Inject file context (PDF/DOCX text, file contents)
     ├─ Inject tool schema into system prompt
     └─ Build message array [system, history, user]
                │
                ▼
         ai.worker.js
                │
         ┌──────┴──────┐
         │             │
    WebGPU OK?     WebGPU Failed
         │             │
    WebLLM        Transformers.js
    (Qwen2.5-     (Qwen1.5-0.5B
    Coder-1.5B)    CPU/WASM)
         │             │
         └──────┬──────┘
                │
         Stream tokens → main thread
                │
                ▼
     AppContext parses output:
       ├─ Native tool_calls? → execute tool
       └─ Raw JSON in text? → extractJSONBlocks() → execute tool
                │
         Tool confirmation UI
         (Allow / Reject)
                │
         Execute tool:
           write_files → OPFS
           edit_file   → OPFS
           run_python  → pyodide.worker.js
                │
         Append tool_response → currentMessages
         Loop back → ai.worker.js for follow-up
```

---

## Data Flow — File Context Injection

```
selectedFiles (checkboxes in UI)
     │
     ▼
AppContext.handleQuery()
     │
     ├─ .pdf  → fileSystemAPI.readFileBinary() → rag.extractPdfText()
     ├─ .docx → fileSystemAPI.readFileBinary() → rag.extractDocxText()
     ├─ .xlsx → runPython(pandas schema preview)
     └─ text  → fileSystemAPI.readFile()
     │
     ▼
contextText string appended to system prompt
     │
     ▼
Sent as messages[0].content to ai.worker.js
```

---

## Cross-Origin Isolation

The app requires `SharedArrayBuffer` (used by Pyodide and WebLLM). This requires the page to be cross-origin isolated.

| Environment | Method |
|---|---|
| Local dev (`npm run dev`) | Vite server sends `COOP: same-origin` + `COEP: require-corp` headers |
| GitHub Pages (production) | `coi-serviceworker.js` intercepts same-origin fetches and injects `COOP`/`COEP` headers on responses |

`blob:` and `data:` URLs are explicitly skipped by the service worker to prevent crashes during Pyodide WASM loading.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **WebGPU-first with CPU fallback** | WebGPU delivers 5–10× lower latency than WASM. CPU fallback ensures the app works on all modern browsers. |
| **Singleton Promise locks for engine init** | Prevents concurrent WebGPU context creation which exhausts VRAM on rapid first requests. |
| **OPFS for file persistence** | Origin Private File System is sandboxed, fast, and survives page refreshes — no server needed. |
| **All WASM runtimes excluded from Vite pre-bundling** | `pyodide`, `quickjs-emscripten`, `onnxruntime-web` use `import.meta.url`-relative WASM paths that break if Vite copies them into `.vite/deps/`. |
| **Tool calling via JSON fallback** | Smaller quantized models rarely emit native `tool_calls` structs. A character-level brace-balanced JSON extractor + markdown fence stripper reliably captures tool intent from plain text output. |
| **Offline Python wheels in `/public/vendor/`** | numpy, pandas, openpyxl etc. served locally. Zero network needed for Python data science workloads after first page load. |
