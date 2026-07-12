import React, { useState } from 'react';
import { fileSystemAPI } from '../services/fs/fileSystem.js';

export default function PreviewPage() {
  const [srcDoc, setSrcDoc] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    try {
      const html = await fileSystemAPI.readFile('workspace/index.html').catch(() => '');
      let css  = await fileSystemAPI.readFile('workspace/styles.css').catch(() => '');
      let js   = await fileSystemAPI.readFile('workspace/script.js').catch(() => '');

      // Strip source map comments to suppress devtools warnings in about:srcdoc
      css = css.replace(/\/\*# sourceMappingURL=.* \*\//g, '');
      js = js.replace(/\/\/# sourceMappingURL=.*/g, '');

      setSrcDoc(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>${css}</style>
  </head>
  <body>
    ${html}
    <script type="module">${js}</script>
  </body>
</html>`);
      setLoaded(true);
    } catch (e) {
      console.error('Preview load failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <span style={styles.toolbarTitle}>🌐 Live Web Preview</span>
        <button
          style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}
          onClick={handleLoad}
          disabled={loading}
        >
          {loading ? 'Loading...' : loaded ? '↺ Refresh Preview' : 'Launch Preview'}
        </button>
      </div>

      {loaded ? (
        <iframe
          title="preview"
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          style={styles.iframe}
        />
      ) : (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🌐</div>
          <p style={styles.emptyTitle}>No preview loaded</p>
          <p style={styles.emptySubtext}>
            Edit your HTML, CSS & JS in the Editor, then click <strong>Launch Preview</strong> to see it rendered here.
          </p>
          <button style={styles.btn} onClick={handleLoad} disabled={loading}>
            {loading ? 'Loading...' : 'Launch Preview'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#0f0f11',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 24px',
    backgroundColor: '#121215',
    borderBottom: '1px solid #222228',
    height: '52px',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  toolbarTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  btn: {
    background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    color: '#fff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    boxShadow: '0 4px 12px rgba(79, 172, 254, 0.25)',
  },
  iframe: {
    flex: 1,
    width: '100%',
    border: 'none',
    backgroundColor: '#fff',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: '#e2e8f0',
  },
  emptyIcon: {
    fontSize: '64px',
  },
  emptyTitle: {
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
    color: '#cbd5e0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#718096',
    textAlign: 'center',
    maxWidth: '400px',
    lineHeight: 1.6,
    margin: 0,
  },
};
