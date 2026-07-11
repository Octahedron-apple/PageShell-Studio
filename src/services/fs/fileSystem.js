const fsWorker = new Worker(
  new URL('./fs.worker.js', import.meta.url),
  { type: 'module' }
);

const activeQueries = new Map();

fsWorker.onmessage = (event) => {
  const { txId, type, data, error } = event.data;
  const query = activeQueries.get(txId);
  if (!query) return;

  if (type === 'SUCCESS') {
    query.resolve(data);
  } else if (type === 'ERROR') {
    query.reject(new Error(error));
  }
  
  activeQueries.delete(txId);
};

function dispatchFsAction(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const txId = Math.random().toString(36).substring(2, 9);
    activeQueries.set(txId, { resolve, reject });
    fsWorker.postMessage({ txId, action, ...payload });
  });
}

export const fileSystemAPI = {
  writeFile: (path, content) => dispatchFsAction('WRITE_FILE', { filePath: path, fileContent: content }),
  readFile: (path) => dispatchFsAction('READ_FILE', { filePath: path }),
  getDirectoryTree: () => dispatchFsAction('GET_TREE'),
  getWorkspaceHandle: () => dispatchFsAction('GET_WORKSPACE_HANDLE')
};
