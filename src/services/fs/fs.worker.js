// Central event loop for file system actions
self.onmessage = async (event) => {
  const { txId, action, filePath, fileContent } = event.data;

  try {
    // Access the root directory of the browser's native OPFS
    const root = await navigator.storage.getDirectory();

    if (action === 'WRITE_FILE') {
      // Resolve directories recursively and get/create file handle
      const fileHandle = await getFileHandleRecursive(root, filePath, { create: true });
      
      // Open a high-speed synchronous access handle to write raw contents
      const accessHandle = await fileHandle.createSyncAccessHandle();
      
      try {
        let writeBuffer;
        if (fileContent instanceof Uint8Array) {
          writeBuffer = fileContent;
        } else {
          const encoder = new TextEncoder();
          writeBuffer = encoder.encode(fileContent || '');
        }
        
        accessHandle.truncate(0); // Clear old content
        accessHandle.write(writeBuffer, { at: 0 });
        accessHandle.flush(); // Commit data changes to system disk
      } finally {
        accessHandle.close(); // Release file lock
      }

      self.postMessage({ txId, type: 'SUCCESS' });
    }

    if (action === 'READ_FILE') {
      const fileHandle = await getFileHandleRecursive(root, filePath);
      const accessHandle = await fileHandle.createSyncAccessHandle();
      
      let textContent = '';
      try {
        const fileSize = accessHandle.getSize();
        const readBuffer = new Uint8Array(fileSize);
        accessHandle.read(readBuffer, { at: 0 });
        const decoder = new TextDecoder();
        textContent = decoder.decode(readBuffer);
      } finally {
        accessHandle.close();
      }

      self.postMessage({ txId, type: 'SUCCESS', data: textContent });
    }
    
    if (action === 'GET_TREE') {
      // Utility loop to map out the current directory layout tree for the UI
      const fileTree = await generateVisualTreeArray(root);
      self.postMessage({ txId, type: 'SUCCESS', data: fileTree });
    }

    if (action === 'GET_WORKSPACE_HANDLE') {
      // Resolve/create the dedicated workspace directory handle
      const workspaceHandle = await root.getDirectoryHandle('workspace', { create: true });
      self.postMessage({ txId, type: 'SUCCESS', data: workspaceHandle });
    }

  } catch (err) {
    self.postMessage({ txId, type: 'ERROR', error: err.message });
  }
};

// Helper to traverse and retrieve directory handles inside directory structures recursively
async function getDirectoryHandleRecursive(rootHandle, dirPath, options = {}) {
  const parts = dirPath.split('/');
  let currentHandle = rootHandle;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || part === '.' || part === '..') continue;
    currentHandle = await currentHandle.getDirectoryHandle(part, options);
  }
  return currentHandle;
}

// Helper to traverse and retrieve file handles inside directory structures recursively
async function getFileHandleRecursive(rootHandle, filePath, options = {}) {
  const parts = filePath.split('/');
  let currentHandle = rootHandle;

  // Walk intermediate directories
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part || part === '.') continue;
    currentHandle = await currentHandle.getDirectoryHandle(part, { create: options.create });
  }

  // Get final file handle
  const fileName = parts[parts.length - 1];
  return await currentHandle.getFileHandle(fileName, options);
}

// Recursive helper to map OPFS directory hierarchies into visual tree elements
async function generateVisualTreeArray(dirHandle, currentPath = '') {
  const results = [];
  for await (const entry of dirHandle.values()) {
    const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      results.push({ name: entry.name, path: entryPath, type: 'file' });
    } else if (entry.kind === 'directory') {
      results.push({
        name: entry.name,
        path: entryPath,
        type: 'directory',
        children: await generateVisualTreeArray(entry, entryPath)
      });
    }
  }
  return results;
}
