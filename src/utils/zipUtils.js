import JSZip from 'jszip';
import { fileSystemAPI } from '../services/fs/fileSystem.js';

/**
 * Traverses the OPFS file tree and adds files to the JSZip instance.
 */
async function addFilesToZip(zip, treeNodes) {
  for (const node of treeNodes) {
    if (node.type === 'directory') {
      const folderZip = zip.folder(node.name);
      if (node.children) {
        await addFilesToZip(folderZip, node.children);
      }
    } else {
      try {
        const bytes = await fileSystemAPI.readFileBinary(node.path);
        zip.file(node.name, bytes);
      } catch (err) {
        console.error(`Failed to read file for export: ${node.path}`, err);
      }
    }
  }
}

export async function exportWorkspaceToZip() {
  const zip = new JSZip();
  const tree = await fileSystemAPI.getDirectoryTree();
  
  // Find the workspace node
  let workspaceNode = tree.find(n => n.name === 'workspace');
  if (!workspaceNode || !workspaceNode.children) {
    throw new Error("Workspace is empty or not found.");
  }

  await addFilesToZip(zip, workspaceNode.children);

  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pageshell-workspace-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importWorkspaceFromZip(file) {
  const zip = await JSZip.loadAsync(file);
  
  const entries = [];
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      entries.push({ relativePath, zipEntry });
    }
  });

  // Process sequentially to prevent OPFS lock exhaustion and DOMException crashes
  for (const { relativePath, zipEntry } of entries) {
    const content = await zipEntry.async('uint8array');
    const fullPath = `workspace/${relativePath}`;
    await fileSystemAPI.writeFile(fullPath, content);
  }
}

export async function previewZip(file) {
  const zip = await JSZip.loadAsync(file);
  const entries = [];
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      entries.push(relativePath);
    }
  });
  return entries;
}

export async function exportFolderToZip(folderName, zipName) {
  const zip = new JSZip();
  const tree = await fileSystemAPI.getDirectoryTree();
  
  let targetNode = tree.find(n => n.name === folderName);
  if (!targetNode || !targetNode.children) {
    throw new Error("Folder is empty or not found.");
  }

  await addFilesToZip(zip, targetNode.children);

  const blob = await zip.generateAsync({ type: 'blob' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
