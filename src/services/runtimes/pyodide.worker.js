import { loadPyodide } from 'pyodide';

let pyodidePromise = null;
let currentTxId = null;

function getPyodide() {
  if (!pyodidePromise) {
    // Specify indexURL pointing directly to local node_modules served by Vite
    pyodidePromise = loadPyodide({
      indexURL: '/node_modules/pyodide/',
      stdout: (text) => {
        self.postMessage({ txId: currentTxId, type: 'STDOUT', data: text });
      },
      stderr: (text) => {
        self.postMessage({ txId: currentTxId, type: 'STDERR', data: text });
      }
    });
  }
  return pyodidePromise;
}

self.onmessage = async (event) => {
  const { txId, pythonCodeString, inputStringData } = event.data;

  try {
    const pyodide = await getPyodide();
    currentTxId = txId;

    // Inject raw input string securely into Python global scope
    pyodide.globals.set('INPUT_DATA', inputStringData || '');

    // Run the Python script string asynchronously
    const result = await pyodide.runPythonAsync(pythonCodeString);

    // Safe conversion of Python proxy results back to native JavaScript structures
    let output = result;
    if (result && typeof result.toJs === 'function') {
      output = result.toJs();
    }

    self.postMessage({ txId, type: 'RESULT', data: output });
  } catch (err) {
    self.postMessage({ txId, type: 'ERROR', error: err.message });
  } finally {
    currentTxId = null;
  }
};
