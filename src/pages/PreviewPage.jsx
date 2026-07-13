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
    <div className="flex flex-col w-full h-full overflow-hidden bg-[var(--bg-app)]">
      <div className="flex items-center justify-between px-6 py-2.5 bg-[var(--bg-panel)] border-b border-[var(--border-color)] h-[52px] box-border shrink-0">
        <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">🌐 Live Web Preview</span>
        <button
          className={`bg-[var(--accent-gradient)] text-[var(--accent-text)] border-none px-5 py-2 rounded-md cursor-pointer font-bold text-[13px] shadow-[0_4px_12px_rgba(79,172,254,0.25)] ${loading ? 'opacity-60' : 'opacity-100'}`}
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
          className="flex-1 w-full border-none bg-white"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--text-primary)]">
          <div className="text-[64px]">🌐</div>
          <p className="text-[22px] font-bold m-0 text-[var(--text-secondary)]">No preview loaded</p>
          <p className="text-sm text-[var(--text-muted)] text-center max-w-[400px] leading-relaxed m-0">
            Edit your HTML, CSS & JS in the Editor, then click <strong>Launch Preview</strong> to see it rendered here.
          </p>
          <button className="bg-[var(--accent-gradient)] text-[var(--accent-text)] border-none px-5 py-2 rounded-md cursor-pointer font-bold text-[13px] shadow-[0_4px_12px_rgba(79,172,254,0.25)]" onClick={handleLoad} disabled={loading}>
            {loading ? 'Loading...' : 'Launch Preview'}
          </button>
        </div>
      )}
    </div>
  );
}

