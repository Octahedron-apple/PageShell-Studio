import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/PageShell-Studio/',
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.whl'],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Exclude onnxruntime-web, pyodide, and quickjs-emscripten from Vite's pre-bundler so they stay in node_modules.
    // This allows relative WASM/asset resolving via import.meta.url to work.
    exclude: ['onnxruntime-web', 'pyodide', 'quickjs-emscripten', 'pdfjs-dist'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
