import { loadPyodide } from 'pyodide';

let pyodidePromise = null;
let currentTxId = null;

function getPyodide() {
  if (!pyodidePromise) {
    // Specify indexURL pointing directly to local node_modules served by Vite
    pyodidePromise = (async () => {
      const pyodide = await loadPyodide({
        indexURL: '/node_modules/pyodide/',
        stdout: (text) => {
          self.postMessage({ txId: currentTxId, type: 'STDOUT', data: text });
        },
        stderr: (text) => {
          self.postMessage({ txId: currentTxId, type: 'STDERR', data: text });
        }
      });

      try {
        // Access browser's OPFS root
        const root = await navigator.storage.getDirectory();

        // Create virtual directory path if it doesn't exist
        try {
          pyodide.FS.mkdir('/workspace');
        } catch (e) {
          // Ignore if directory already exists
        }

        // Mount OPFS directory handle into Pyodide filesystem
        await pyodide.mountNativeFS('/workspace', root);

        // Change current directory so relative file operations target OPFS directly
        pyodide.FS.chdir('/workspace');
      } catch (err) {
        console.error('Failed to mount OPFS inside Pyodide worker:', err);
      }

      return pyodide;
    })();
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
