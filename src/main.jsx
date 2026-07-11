import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { generateCode } from './services/ai/models.js';
import { runJS } from './services/runtimes/quickjs.js';
import { runPython } from './services/runtimes/pyodide.js';
import { fileSystemAPI } from './services/fs/fileSystem.js';
import { executePython } from './services/runtimes/pyodide.js';



async function testIntegratedPipeline() {
  // 1. Write a data file directly into your local OPFS disk space via central fileSystemAPI
  const dataPath = "data.txt";
  const rawTextData = "Hello from local OPFS storage mesh!";
  await fileSystemAPI.writeFile(dataPath, rawTextData);
  console.log(`💾 Synchronized ${dataPath} to client OPFS.`);

  // 2. Write an AI-style python script directly into your local OPFS disk space
  const scriptPath = "process_data.py";
  const pythonScriptText = `
print("Hello from the file-mesh engine!")
with open("data.txt", "r") as f:
    content = f.read()
print(f"Python natively read data.txt from OPFS workspace: '{content}'")
`;
  await fileSystemAPI.writeFile(scriptPath, pythonScriptText);
  console.log(`💾 Synchronized ${scriptPath} to client OPFS.`);

  // 3. Read it back out to verify storage persistence
  const loadedScriptCode = await fileSystemAPI.readFile(scriptPath);
  
  // 4. Route the code directly into the Pyodide interpreter context
  console.log("🚀 Pushing stored code directly to Python sandbox...");
  await executePython(loadedScriptCode);
  
  // 5. Print the current file structural array tree
  const structuralTree = await fileSystemAPI.getDirectoryTree();
  console.log("🌳 Active File Tree State Array:", structuralTree);
}

async function runTests() {
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
  try {
    const jsResult = await runJS(`
      const numbers = [1, 2, 3, 4, 5];
      const doubled = numbers.map(n => n * 2);
      console.log("Hello from inside the WASM Sandbox!");
      doubled.reduce((a, b) => a + b, 0);
    `);
    console.log("🎉 Sandbox Return Value:", jsResult);
  } catch (err) {
    console.error("❌ Sandbox Crash:", err);
  }

  console.log("Testing Pyodide Python WASM Sandbox Core...");
  try {
    const pyResult = await runPython(`
print("Hello from Python inside the Pyodide WASM Sandbox!")
print("Received INPUT_DATA length:", len(INPUT_DATA))
parsed_values = [int(x) * 3 for x in INPUT_DATA.split(',') if x.strip()]
print("Computed values in Python:", parsed_values)
sum(parsed_values)
`, "10,20,30,40,50");
    console.log("🎉 Python Sandbox Return Value:", pyResult);
  } catch (err) {
    console.error("❌ Python Sandbox Crash:", err);
  }

  console.log("Testing central file mesh and data routing pipeline...");
  try {
    await testIntegratedPipeline();
  } catch (err) {
    console.error("❌ Pipeline Failure:", err);
  }
}

// runTests();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
