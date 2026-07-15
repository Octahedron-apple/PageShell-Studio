# 🐚 PageShell Studio

> **A fully offline, browser-native AI coding & data assistant** — runs entirely on your device with no backend server, no cloud API calls, and zero data leaving your machine (except optional voice input).

---

## 🎥 Demo Video

> _Demo video coming soon — 2–3 minutes showing the problem, the solution, and on-device AI working live._

---

## ✨ Features

- **On-Device AI Assistant** — Powered by [WebLLM](https://github.com/mlc-ai/web-llm) (WebGPU) with automatic CPU/WASM fallback via [Transformers.js](https://github.com/xenova/transformers.js)
- **Python Sandbox** — Full CPython 3.12 runtime via [Pyodide](https://pyodide.org) with `numpy`, `pandas`, `openpyxl`, `xlrd` preloaded offline
- **JavaScript Sandbox** — Isolated QuickJS WASM runtime via [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten)
- **Code Editor** — Syntax-highlighted editor (CodeMirror 6) with AI autocomplete for Python, JS, HTML, CSS
- **Document Viewer** — Read and export PDF, DOCX, XLSX, CSV files; all parsing is on-device
- **AI Tool Calling** — The AI can `write_files`, `edit_file`, and `run_python` autonomously with user confirmation
- **OPFS Workspace** — Persistent file system using the browser's Origin Private File System
- **Speech-to-Text** — Optional voice input via Whisper.cpp (requires internet for model download on first use only)
- **Global Search** — Full-text search across all workspace files using MiniSearch
- **Import / Export** — ZIP-based workspace backup and restore
- **Installable PWA** — Install directly from your browser to desktop or mobile home screen

---

## 🚀 Setup & Run

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Browser | Chrome 113+ or Edge 113+ (WebGPU support recommended) |

### 1. Clone the repository

```bash
git clone https://github.com/Octahedron-apple/PageShell-Studio.git
cd PageShell-Studio
```

### 2. Install dependencies

```bash
npm install
```

### 3. (Optional) Download offline Python wheels

The offline Python packages (`numpy`, `pandas`, etc.) are pre-bundled in `public/vendor/pyodide/`. If you need to refresh them, run:

```bash
python scripts/download_wheels.py
```

### 4. Run the dev server

```bash
npm run dev
```

Open `http://localhost:5173/PageShell-Studio/` in Chrome or Edge.

> **Note:** The dev server injects `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers required by `SharedArrayBuffer` (used by Pyodide and WebLLM). Do not use a plain static file server.

### 5. Build for production (GitHub Pages)

```bash
npm run build
```

Output goes to `dist/`. The live deployment is at **https://octahedron-apple.github.io/PageShell-Studio/**.

---

## 📲 Install as a Web App (PWA)

PageShell Studio is a Progressive Web App and can be installed directly to your desktop or Android home screen for a native-app experience — no app store required.

### Desktop (Chrome / Edge)
1. Open the site in Chrome or Edge
2. Click the **install icon** (⊕) in the address bar (right side)
3. Click **Install** in the prompt
4. PageShell Studio opens in its own window, offline-capable after first load

### Android
1. Open the site in Chrome
2. Tap the browser menu **⋮** → **Add to Home screen**
3. Confirm — the app icon appears on your home screen

### iOS (Safari)
1. Open the site in Safari
2. Tap the **Share** button → **Add to Home Screen**
3. Confirm — the app icon appears on your home screen

> **Note:** Full offline capability (no internet at all) requires the AI model to have been downloaded at least once on that device.

---

## 🧪 Sample Inputs & Expected Outputs

### Python Execution

**Input (via Run tab or AI):**
```python
import pandas as pd
df = pd.DataFrame({'x': [1,2,3], 'y': [4,5,6]})
print(df.describe())
```

**Expected Output (Terminal):**
```
         x    y
count  3.0  3.0
mean   2.0  5.0
std    1.0  1.0
min    1.0  4.0
...
```

### AI Tool Call — Write File

**User message:** `"Write a hello world Python script"`

**AI invokes:**
```json
{"name": "write_files", "args": {"files": [{"path": "hello.py", "content": "print('Hello, World!')"}]}}
```

**Result:** `hello.py` appears in the OPFS workspace file tree.

### AI Tool Call — Edit File

**User message:** `"Change the print statement to say 'Hello, PageShell!'"`

**AI invokes:**
```json
{
  "name": "edit_file",
  "args": {
    "path": "hello.py",
    "old_content": "print('Hello, World!')",
    "new_content": "print('Hello, PageShell!')"
  }
}
```

### Document Ingestion

1. Go to **FS tab** → drag & drop a `.xlsx`, `.pdf`, or `.docx` file
2. Select the file as AI context (checkbox in file tree)
3. Ask the AI: `"Summarize the contents of this document"`

---

## 📁 Project Structure

```
PageShell-Studio/
├── public/
│   ├── assets/             # App icons and static images
│   ├── vendor/
│   │   ├── pyodide/        # Offline Pyodide runtime + .whl packages
│   │   ├── whisper/        # Whisper.cpp WASM binary
│   │   ├── quickjs/        # QuickJS WASM binary
│   │   └── onnx/           # ONNX runtime (embeddings)
│   ├── manifest.webmanifest  # PWA manifest
│   └── coi-serviceworker.js  # Cross-Origin Isolation + PWA install SW
├── scripts/
│   └── download_wheels.py  # Helper to refresh offline Python packages
├── src/
│   ├── components/         # React UI components
│   ├── context/
│   │   └── AppContext.jsx  # Global state, AI orchestration, tool calling
│   ├── pages/              # Route-level page components
│   └── services/
│       ├── ai/             # WebLLM worker, RAG, embeddings
│       ├── fs/             # OPFS file system broker, search index
│       └── runtimes/       # Pyodide and QuickJS worker bridges
├── ARCHITECTURE.md
├── TECHNICAL_REPORT.md
├── vite.config.js
└── package.json
```

---

## 🌐 Internet Requirements

| Feature | Requires Internet? |
|---|---|
| AI chat & code generation | ❌ No — model cached locally after first load |
| Python execution | ❌ No — Pyodide + wheels bundled in `/public/vendor/` |
| JavaScript execution | ❌ No — QuickJS WASM bundled locally |
| Document parsing (PDF/DOCX/XLSX) | ❌ No — all client-side |
| File search | ❌ No — MiniSearch runs in-browser |
| **Voice / Speech-to-Text** | ⚠️ **Yes — Whisper model download on first use only** |
| WebLLM model (first load) | ⚠️ **Yes — one-time download (~1 GB), then cached in IndexedDB** |

---

## 🛠️ Key Dependencies

| Package | Purpose |
|---|---|
| `@mlc-ai/web-llm` | WebGPU-accelerated on-device LLM inference |
| `@xenova/transformers` | CPU/WASM fallback LLM inference |
| `pyodide` | CPython 3.12 in WebAssembly |
| `quickjs-emscripten` | Sandboxed JavaScript execution (QuickJS WASM) |
| `pdfjs-dist` | Client-side PDF text extraction |
| `mammoth` | Client-side DOCX text extraction |
| `xlsx` | Client-side Excel/CSV parsing |
| `minisearch` | Full-text file search index |
| `codemirror` | Code editor with syntax highlighting |
| `jszip` | Workspace ZIP import/export |
| `localforage` | Persistent settings via IndexedDB |
| `react-resizable-panels` | Flexible panel layout |

---

## 📜 License

MIT © Bhavya Singh
