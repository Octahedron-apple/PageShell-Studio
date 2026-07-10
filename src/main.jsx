import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { generateCode } from './services/ai/models.js';

console.log("Testing local WebGPU inference engine...");

generateCode(
  "Write a JavaScript function to reverse a string.",
  (token) => {
    console.log("Token received ──►", token);
  },
  (finalOutput) => {
    console.log("🎉 Complete Local Generation Output:", finalOutput);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
