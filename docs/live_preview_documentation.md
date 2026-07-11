# Live Web Preview Architecture

## Overview
PageShell Studio provides a seamless, secure, and instant web preview feature that renders HTML, CSS, and JS files natively within the application, completely bypassing the need for a local web server.

## 1. Web File Initialization
Upon first launch, if the application does not detect an `index.html` file in the OPFS workspace directory, the `initializeDefaultWebFiles` routine automatically bootstraps the project with default boilerplate files:
- `index.html`: A structural HTML5 layout.
- `styles.css`: A basic styling sheet containing layout utilities and theme colors.
- `script.js`: A simple interactive event listener to demonstrate scripting.

This guarantees a working preview is immediately available to users right out of the box.

## 2. Preview Router State
The main `App.jsx` implements a high-level view state router to toggle between workflows:
- `'editor'` State: Renders the standard IDE layout (Sidebar, Code Editor, AI Assistant).
- `'preview'` State: Unmounts the standard grid and swaps the layout for a full-page secure iframe viewer.

## 3. Sandboxed Compilation & Stitching
When the user clicks **"Launch Preview"**:
1. **Fetch from OPFS**: The application asynchronously reads the raw string contents of `index.html`, `styles.css`, and `script.js` directly from the local browser storage using the `fileSystemAPI`.
2. **In-Memory Stitching**: The three discrete file strings are injected into a unified `srcDoc` template inside the `Preview` component:
   - CSS is injected into `<style>` tags in the `<head>`.
   - HTML is injected into the `<body>`.
   - JavaScript is injected into a `<script>` tag at the bottom of the `<body>`.
3. **Secure Iframe Rendering**: The combined HTML payload is rendered inside a full-page `<iframe srcDoc="..." sandbox="allow-scripts">`. The `sandbox` attribute acts as a critical security boundary: it allows the user's custom JavaScript to execute, but aggressively prevents it from accessing or manipulating the main PageShell Studio parent DOM.
