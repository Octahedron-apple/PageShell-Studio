import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { generateCode } from './services/ai/models.js';
import { runJS } from './services/runtimes/quickjs.js';
import { runPython } from './services/runtimes/pyodide.js';

console.log("Testing local WebGPU inference engine...");

generateCode(
  "Write a JavaScript function to reverse a string.",
  (token) => {
    console.log("Token received ──►", token);
  },
  (finalOutput) => {
    console.log("🎉 Complete Local Generation Output:", finalOutput);
  }
);

console.log("Testing QuickJS WASM Sandbox Core...");

runJS(`
  const numbers = [1, 2, 3, 4, 5];
  const doubled = numbers.map(n => n * 2);
  console.log("Hello from inside the WASM Sandbox!");
  doubled.reduce((a, b) => a + b, 0);
`)
.then(output => console.log("🎉 Sandbox Return Value:", output))
.catch(err => console.error("❌ Sandbox Crash:", err));

console.log("Testing Pyodide Python WASM Sandbox Core...");

runPython(`
print("Hello from Python inside the Pyodide WASM Sandbox!")
print("Received INPUT_DATA length:", len(INPUT_DATA))
parsed_values = [int(x) * 3 for x in INPUT_DATA.split(',') if x.strip()]
print("Computed values in Python:", parsed_values)
sum(parsed_values)
`, "10,20,30,40,50")
.then(output => console.log("🎉 Python Sandbox Return Value:", output))
.catch(err => console.error("❌ Python Sandbox Crash:", err));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
