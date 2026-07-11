import React from 'react';

export default function Preview({ htmlContent, cssContent, jsContent, onBack }) {
  // 5. Construct and Inject the Web Page
  const srcDoc = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      ${cssContent}
    </style>
  </head>
  <body>
    ${htmlContent}
    <script>
      ${jsContent}
    </script>
  </body>
</html>
  `;

  return (
    <div style={styles.container}>
      {/* 7. Add a "Back to Editor" Interface */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          &larr; Back to Editor
        </button>
        <span style={styles.title}>Live Web Preview</span>
      </div>
      
      {/* 6. Render the Secure Iframe */}
      <iframe
        title="preview"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        style={styles.iframe}
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0f0f11',
    fontFamily: "'Outfit', 'Inter', sans-serif"
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#16161a',
    borderBottom: '1px solid #222228',
    height: '56px',
    boxSizing: 'border-box'
  },
  backButton: {
    backgroundColor: '#4facfe',
    backgroundImage: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    marginRight: '20px',
    boxShadow: '0 4px 12px rgba(79, 172, 254, 0.2)',
  },
  title: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: '16px'
  },
  iframe: {
    flex: 1,
    width: '100%',
    border: 'none',
    backgroundColor: '#ffffff'
  }
};
