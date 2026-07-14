// Load Pyodide globally via importScripts from the public vendor folder
importScripts(`${import.meta.env.BASE_URL}vendor/pyodide/pyodide.js`);
let pyodidePromise = null;
let currentTxId = null;

let resolveWorkspaceHandle = null;
const workspaceHandlePromise = new Promise((resolve) => {
  resolveWorkspaceHandle = resolve;
});

function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const pyodide = await loadPyodide({
        indexURL: `${import.meta.env.BASE_URL}vendor/pyodide/`,
        stdout: (text) => {
          self.postMessage({ txId: currentTxId, type: 'STDOUT', data: text });
        },
        stderr: (text) => {
          self.postMessage({ txId: currentTxId, type: 'STDERR', data: text });
        }
      });

      try {
        // Wait for the workspace directory handle from the main thread handshake
        const workspaceHandle = await workspaceHandlePromise;

        // Ensure mount directory exists in Pyodide virtual FS
        try {
          pyodide.FS.mkdir('/workspace');
        } catch (e) {
          // Ignore if directory already exists
        }

        // Mount OPFS directory handle into Pyodide filesystem using native mountNativeFS
        await pyodide.mountNativeFS('/workspace', workspaceHandle);

        // Change current directory so relative file operations target OPFS directly
        pyodide.FS.chdir('/workspace');

        // 1. Load native C-extension packages directly via Pyodide so it handles .so dynamic linking
        await pyodide.loadPackage(['numpy', 'pandas']);

        // 2. Load pure-Python wheels via micropip
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        const base = import.meta.env.BASE_URL;
        await micropip.install([
          `${base}vendor/pyodide/et_xmlfile-1.1.0-py3-none-any.whl`,
          `${base}vendor/pyodide/openpyxl-3.1.5-py2.py3-none-any.whl`,
          `${base}vendor/pyodide/xlrd-2.0.1-py2.py3-none-any.whl`
        ]);

        console.log('Successfully pre-loaded packages: numpy, pandas, openpyxl, xlrd');
      } catch (err) {
        console.error('Failed to mount or load offline packages inside Pyodide worker:', err);
      }

      return pyodide;
    })();
  }
  return pyodidePromise;
}

self.onmessage = async (event) => {
  if (event.data && event.data.type === 'INIT') {
    resolveWorkspaceHandle(event.data.workspaceHandle);
    return;
  }

  const { txId, pythonCodeString, inputStringData } = event.data;

  try {
    const pyodide = await getPyodide();
    currentTxId = txId;

    // Create a sandboxed dictionary for execution to prevent memory leaks
    const namespace = pyodide.globals.get('dict')();
    namespace.set('INPUT_DATA', inputStringData || '');

    // Run the Python script string asynchronously inside the sandbox
    const result = await pyodide.runPythonAsync(pythonCodeString, { globals: namespace });

    // Safe conversion of Python proxy results back to native JavaScript structures
    let output = result;
    if (result && typeof result.toJs === 'function') {
      output = result.toJs();
    }
    
    // Explicitly release the Python memory space
    namespace.destroy();
    if (result && typeof result.destroy === 'function') {
      result.destroy();
    }

    self.postMessage({ txId, type: 'RESULT', data: output });
  } catch (err) {
    self.postMessage({ txId, type: 'ERROR', error: err.message });
  } finally {
    currentTxId = null;
  }
};
