import { loadPyodide } from 'pyodide';

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
        indexURL: '/node_modules/pyodide/',
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

        // Mount OPFS directory handle into Pyodide filesystem using native Emscripten OPFS
        pyodide.FS.mount(pyodide.FS.filesystems.OPFS, { root: workspaceHandle }, '/workspace');

        // Change current directory so relative file operations target OPFS directly
        pyodide.FS.chdir('/workspace');

        // Load local packaging and micropip for 100% offline installs
        await pyodide.loadPackage('/vendor/pyodide/packaging-23.2-py3-none-any.whl');
        await pyodide.loadPackage('/vendor/pyodide/micropip-0.6.0-py3-none-any.whl');

        const micropip = pyodide.pyimport('micropip');
        await micropip.install([
          '/vendor/pyodide/numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl',
          '/vendor/pyodide/six-1.16.0-py2.py3-none-any.whl',
          '/vendor/pyodide/python_dateutil-2.9.0.post0-py2.py3-none-any.whl',
          '/vendor/pyodide/pytz-2024.1-py2.py3-none-any.whl',
          '/vendor/pyodide/pandas-2.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl',
          '/vendor/pyodide/et_xmlfile-1.1.0-py3-none-any.whl',
          '/vendor/pyodide/openpyxl-3.1.5-py2.py3-none-any.whl',
          '/vendor/pyodide/xlrd-2.0.1-py2.py3-none-any.whl'
        ]);

        console.log('Successfully pre-loaded offline wheels: numpy, pandas, openpyxl, xlrd');
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
