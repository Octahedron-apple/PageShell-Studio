# AI Autocomplete in CodeMirror

PageShell Studio integrates an offline AI model with the CodeMirror editor to provide real-time, privacy-preserving code completions.

## Architecture Overview

The autocomplete functionality relies on three primary components:
1. **The CodeMirror Extension (`@codemirror/autocomplete`)**: Intercepts user requests for completions within the editor.
2. **The AppContext State Manager (`AppContext.jsx`)**: Acts as a bridge, wrapping the prefix text into a strict prompt.
3. **The Local Web Worker (`models.js` & `transformers.js`)**: Executes the inference natively inside the browser.

### 1. The CodeMirror Extension
In `Editor.jsx`, we initialize the `autocompletion` extension.
To prevent the local model from continuously running on every keystroke (which would freeze the main thread and drain battery), we enforce **explicit triggering**:
```javascript
const aiAutocompleteSource = async (context) => {
  // Only trigger on explicit request (Ctrl + Space)
  if (!context.explicit) return null;
  // ... fetch prefix ...
}
```

### 2. The Prompt Helper
The `handleAutocomplete` function in `AppContext.jsx` wraps the text preceding the cursor with a strict system prompt.
The prompt strictly instructs the model to act as a continuation engine:
> "You are a code completion engine. Output ONLY raw code to complete the given prefix. Do NOT wrap the code in markdown... Your response must be the exact raw string continuation of the user's code."

If the model still hallucinates markdown formatting (e.g., ` ```javascript `), the helper strips it via post-processing before returning the raw string back to the CodeMirror UI.

### 3. Usage
To invoke autocomplete while coding in PageShell Studio:
1. Position your cursor at the end of a line or statement.
2. Press `Ctrl + Space`.
3. Wait for the local model to process the context; a dropdown will appear with the suggested code completion.
4. Press `Enter` to accept the suggestion.
