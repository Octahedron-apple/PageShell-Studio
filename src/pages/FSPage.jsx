import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import FileManager from '../components/FileManager.jsx';

export default function FSPage() {
  const { files, handleUpload, selectedFiles, handleToggleFileSelect, handleOpenFile } = useApp();

  return (
    <div style={styles.container}>
      <FileManager
        files={files}
        onUpload={handleUpload}
        selectedFiles={selectedFiles}
        onToggleSelect={handleToggleFileSelect}
        onOpenFile={handleOpenFile}
        mode="editor"
      />
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#121215',
    overflow: 'hidden',
  }
};
