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
    <div className="flex flex-col w-screen h-screen bg-[#0f0f11] font-[Outfit,Inter,sans-serif]">
      {/* 7. Add a "Back to Editor" Interface */}
      <div className="flex items-center px-6 py-3 bg-[#16161a] border-b border-[#222228] h-[56px] box-border">
        <button onClick={onBack} className="bg-[#4facfe] bg-[linear-gradient(90deg,#4facfe_0%,#00f2fe_100%)] text-white border-none px-[18px] py-2 rounded-md cursor-pointer font-bold text-[13px] mr-5 shadow-[0_4px_12px_rgba(79,172,254,0.2)]">
          &larr; Back to Editor
        </button>
        <span className="text-[#e2e8f0] font-bold text-base">Live Web Preview</span>
      </div>
      
      {/* 6. Render the Secure Iframe */}
      <iframe
        title="preview"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="flex-1 w-full border-none bg-white"
      />
    </div>
  );
}

