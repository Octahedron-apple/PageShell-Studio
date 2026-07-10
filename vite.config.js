import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Exclude onnxruntime-web, pyodide, and quickjs-emscripten from Vite's pre-bundler so they stay in node_modules.
    // This allows relative WASM/asset resolving via import.meta.url to work.
    exclude: ['onnxruntime-web', 'pyodide', 'quickjs-emscripten'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
