import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Exclude onnxruntime-web from Vite's pre-bundler so it stays in node_modules.
    // When pre-bundled, import.meta.url inside onnxruntime-web resolves to .vite/deps/,
    // causing new URL('ort-wasm-simd-threaded.jsep.mjs', import.meta.url) to point nowhere.
    // Excluded → served directly from /node_modules/onnxruntime-web/dist/ → URLs resolve correctly.
    exclude: ['onnxruntime-web'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
