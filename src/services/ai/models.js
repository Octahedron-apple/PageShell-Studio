let aiWorker = null;
let currentOnToken = null;
let currentOnComplete = null;
let accumulatedOutput = '';

function getWorker() {
  if (!aiWorker) {
    aiWorker = new Worker(
      new URL('./ai.worker.js', import.meta.url),
      { type: 'module' }
    );

    aiWorker.onmessage = (event) => {
      const { type, token, output, error, message } = event.data;
      
      if (type === 'STATUS') {
        if (statusSubscriber) statusSubscriber(message);
        console.log(`[AI Worker Status]: ${message}`);
      } else if (type === 'TOKEN') {
        accumulatedOutput += token;
        if (currentOnToken) {
          currentOnToken(token);
        }
      } else if (type === 'COMPLETE') {
        const { output, tool_calls } = event.data;
        if (currentOnComplete) {
          currentOnComplete(accumulatedOutput || output, tool_calls);
        }
        currentOnToken = null;
        currentOnComplete = null;
      } else if (type === 'ERROR') {
        console.error('Error from AI Worker:', error);
        if (currentOnComplete) {
          currentOnComplete(`Error: ${error}`);
        }
        currentOnToken = null;
        currentOnComplete = null;
      }
    };
  }
  return aiWorker;
}

export function generateCode(prompt, onToken, onComplete, tools) {
  const worker = getWorker();
  currentOnToken = onToken;
  currentOnComplete = onComplete;
  accumulatedOutput = '';
  worker.postMessage({ action: 'GENERATE', prompt, tools });
}

let statusSubscriber = null;
export function subscribeAIStatus(callback) {
  statusSubscriber = callback;
}
