'use strict';

import './styles.css';
let messageForCopy = '';
import { parse } from 'node-html-parser';

var parsediff = require('parse-diff');

// Define constant for model selection option
const NO_MODEL_SELECTION = 'No model selection';

const spinner = `
        <svg aria-hidden="true" class="w-4 h-4 text-gray-200 animate-spin dark:text-slate-200 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
`;
const checkmark = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-green-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
`;
const xcircle = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-red-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
`;

function updateUIStatus(ongoing, failed = false, rerun = true) {
  if (ongoing) {
    document.getElementById('status-icon').innerHTML = spinner;
    document.getElementById('rerun-btn').classList.add('invisible');
  } else {
    if (failed) {
      document.getElementById('status-icon').innerHTML = xcircle;
    } else {
      document.getElementById('status-icon').innerHTML = checkmark;
    }
    if (rerun) {
      document.getElementById('rerun-btn').classList.remove('invisible');
    }
    else if( document.getElementById("model_name").value == NO_MODEL_SELECTION) {
      document.getElementById('rerun-btn').classList.add('invisible');
    }
  }
}

async function getOllamaModel() {
  let options = await new Promise((resolve) => {
    chrome.storage.sync.get('model_name', resolve);
  });
  console.log(options);
  if (!options || !options['model_name']) {
    return NO_MODEL_SELECTION;
  }
  return options['model_name'];
}

async function getSelectedModel() {
  let options = await new Promise((resolve) => {
    chrome.storage.sync.get('selected_model', resolve);
  });
  console.log('Selected model options:', options);
  if (!options || !options['selected_model']) {
    return NO_MODEL_SELECTION;
  }
  return options['selected_model'];
}

async function getOllamaServer() {
  let options = await new Promise((resolve) => {
    chrome.storage.sync.get('ollama_server', resolve);
  });
  console.log(options);
  if (!options || !options['ollama_server']) {
    return 'http://localhost:11434';
  }
  return options['ollama_server'];
}

async function getLMStudioServer() {
  let options = await new Promise((resolve) => {
    chrome.storage.sync.get('lmstudio_server', resolve);
  });
  console.log(options);
  if (!options || !options['lmstudio_server']) {
    return 'http://localhost:1234';
  }
  return options['lmstudio_server'];
}

function getStorageKey(diffPath, model) {
  return `${diffPath}|${model}`;
}

function saveResult(diffPath, model, result) {
  const key = getStorageKey(diffPath, model);
  chrome.storage.session.set({ [key]: result });
}

async function callLLM(messages, callback, onDone) {
  let chatMessages = [
    {
      role: 'system',
      content:
        'I am a code change reviewer. I will provide feedback on the code changes given. Do not introduce yourselves. ',
    },
  ];

  for (const message of messages) {
    // append user message to chatMessages
    chatMessages.push({ role: 'user', content: message });
  }

  console.log('chatMessages', chatMessages);
  messages.forEach((message) => {
      messageForCopy += `\n${message}`;
  });
  console.log('messageForCopy', messageForCopy);
  
  try {
    const modelValue = document.getElementById('model_name').value;
    let modelType, modelName, server, response;

    // Get generation parameters from storage
    const generationParams = await new Promise((resolve) => {
      chrome.storage.sync.get([
        'temperature_enabled', 'temperature',
        'top_p_enabled', 'top_p',
        'top_k_enabled', 'top_k',
        'max_tokens_enabled', 'max_tokens'
      ], resolve);
    });

    console.log('Generation parameters:', generationParams);

    // Parse the model value to determine which service to use
    if (modelValue.startsWith('ollama:')) {
      modelType = 'ollama';
      modelName = modelValue.substring(7); // Remove 'ollama:' prefix
      server = await getOllamaServer();
      console.log('Using Ollama model:', modelName);

      // Build request body with optional generation parameters
      const requestBody = {
        model: modelName,
        messages: chatMessages,
        stream: true,
        options: {}
      };

      // Add enabled generation parameters to options object for Ollama
      if (generationParams.temperature_enabled) {
        requestBody.options.temperature = parseFloat(generationParams.temperature);
      }
      if (generationParams.top_p_enabled) {
        requestBody.options.top_p = parseFloat(generationParams.top_p);
      }
      // min_p is supported by Ollama. However, it is not supported by OpenAI and LMStudio
      // in order to maintain consistency, we will not use min_p.
      if (generationParams.top_k_enabled) {
        requestBody.options.top_k = parseInt(generationParams.top_k);
      }
      if (generationParams.max_tokens_enabled) {
        requestBody.options.max_tokens = parseInt(generationParams.max_tokens);
      }

      response = await fetch(`${server}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } else if (modelValue.startsWith('lmstudio:')) {
      modelType = 'lmstudio';
      modelName = modelValue.substring(9); // Remove 'lmstudio:' prefix
      server = await getLMStudioServer();
      console.log('Using LM Studio model:', modelName);

      // Build request body with optional generation parameters
      const requestBody = {
        model: modelName,
        messages: chatMessages,
        stream: true
      };

      // Add enabled generation parameters
      if (generationParams.temperature_enabled) {
        requestBody.temperature = parseFloat(generationParams.temperature);
      }
      if (generationParams.top_p_enabled) {
        requestBody.top_p = parseFloat(generationParams.top_p);
      }
      // Generation parameters for LM Studio
      if (generationParams.top_k_enabled) {
        requestBody.top_k = parseInt(generationParams.top_k);
      }
      if (generationParams.max_tokens_enabled) {
        requestBody.max_tokens = parseInt(generationParams.max_tokens);
        // "max_tokens" is deprecated in OpenAI API. Add "max_completion_tokens"
        // for future-proof
        requestBody.max_completion_tokens = requestBody.max_tokens;
      }

      response = await fetch(`${server}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } else {
      throw new Error('Unknown model type: ' + modelValue);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = ''; // Accumulate the final response here
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        // Decode the chunk of data
        const chunk = decoder.decode(value, { stream: !done });

        // Parse and process the chunk based on model type
        chunk.split('\n').forEach((line) => {
          if (line.trim()) {
            try {
              // Find the first JSON object in the line by looking for the opening brace
              let jsonStr = line;
              if (modelType === 'lmstudio') {
                // LM studio returns "data: " + JSON object. So we need to find the
                // first '{' in the line to locate the start of the JSON object
                const jsonStartIndex = line.indexOf('{');
                if (jsonStartIndex > 0) {
                  jsonStr = line.substring(jsonStartIndex);
                }
                else
                {
                  return;
                }
              }
              const json = JSON.parse(jsonStr);

              // Handle different response formats
              if (modelType === 'ollama') {
                // Ollama format
                if (json.message && json.message.content) {
                  result = result + json.message.content;
                  callback(result);
                }
              } else if (modelType === 'lmstudio') {
                // LM Studio follows OpenAI format
                if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
                  result = result + json.choices[0].delta.content;
                  callback(result);
                }
              }
            } catch (error) {
              console.error('Error parsing JSON:', error);
            }
          }
        });
      }
    }
    console.log(result);
  } catch (e) {
    callback(String(e));
  }
  onDone();
}

const showdown = require('showdown');
const converter = new showdown.Converter();

import { DEFAULT_GUIDELINES } from './config';

async function getSelectedGuidelines() {
  const result = await chrome.storage.sync.get(['selectedGuidelines', 'guidelines']);
  const guidelines = result.guidelines || [DEFAULT_GUIDELINES];
  const selected = result.selectedGuidelines || 0;
  return guidelines[selected];
}

// In the reviewPR function, replace the existing guidelines with:
async function reviewPR(diffPath, context, title) {
  console.log('reviewPR', diffPath, context, title);
  updateUIStatus(true);
  document.getElementById('result').innerHTML = '';

  const selectedModel = document.getElementById('model_name').value;
  saveResult(diffPath, selectedModel, null);

  // Determine which server to use based on model type
  let server;
  if (selectedModel.startsWith('ollama:')) {
    server = await getOllamaServer();
  } else if (selectedModel.startsWith('lmstudio:')) {
    server = await getLMStudioServer();
  } else {
    console.error('Unknown model type:', selectedModel);
    return;
  }

  const maxProcessingLength = await getMaxProcessingLength(
    server,
    selectedModel
  );
  let promptArray = [];
  // Fetch the patch from our provider.
  let patch = await fetch(diffPath).then((r) => r.text());
  let warning = '';
  let patchParts = [];

  const guidelines = await getSelectedGuidelines();
  promptArray.push(`
Guidelines and purposes:
${guidelines.content}
`);

  promptArray.push(`The code change has the following title: ${title}`);
  if(context) {
    promptArray.push(`A description was given to help you assist in understand why these changes were made.
The description was provided in a markdown format.
\`\`\`
${context}
\`\`\`
You are provided with the code changes (diffs) in a unidiff format.
`);
  }

  // Remove binary files as those are not useful for ChatGPT to provide a review for.
  // TODO: Implement parse-diff library so that we can remove large lock files or binaries natively.
  const regex = /GIT\sbinary\spatch(.*)literal\s0/gims;
  patch = patch.replace(regex, '');

  var files = parsediff(patch);

  // Rebuild our patch as if it were different patches
  files.forEach(function (file) {
    // Ignore lockfiles
    if (file.from.includes('lock.json')) {
      return;
    }

    var patchPartArray = [];

    patchPartArray.push('```diff');
    if ('from' in file && 'to' in file) {
      patchPartArray.push('diff --git a' + file.from + ' b' + file.to);
    }
    if ('new' in file && file.new === true && 'newMode' in file) {
      patchPartArray.push('new file mode ' + file.newMode);
    }
    if ('from' in file) {
      patchPartArray.push('--- ' + file.from);
    }
    if ('to' in file) {
      patchPartArray.push('+++ ' + file.to);
    }
    if ('chunks' in file) {
      patchPartArray.push(
        file.chunks.map((c) => c.changes.map((t) => t.content).join('\n'))
      );
    }
    patchPartArray.push('```');

    var patchPart = patchPartArray.join('\n');
    if (patchPart.length >= maxProcessingLength) {
      patchPart = patchPart.slice(0, maxProcessingLength);
      warning =
        'Some parts of your patch were truncated as it was larger than ' +
        maxProcessingLength +
        ' characters. The review might not be as complete.';
    }
    patchParts.push(patchPart);
  });

  patchParts.forEach((part) => {
    promptArray.push(part);
  });

  // Send our prompts to ChatGPT.
  callLLM(
    promptArray,
    (answer) => {
      // Only process the answer if it starts with <think> tags
      let processedAnswer = answer;
      if (answer.startsWith('<think>')) {
        processedAnswer = answer.replace(/<think>(.*?)<\/think>/gs, (match, thinkContent) => {
          // Create a collapsible UI for the think content with HTML formatting
          return `
<details class="think-section bg-slate-100 p-2 rounded-md my-2">
  <summary class="cursor-pointer font-medium text-slate-700 hover:text-slate-900">Thinking process</summary>
  <div class="mt-2 text-slate-600">${converter.makeHtml(thinkContent)}</div>
</details>
`;
        });
      }

      document.getElementById('result').innerHTML = converter.makeHtml(
        processedAnswer + ' \n\n' + warning
      );
    },
    () => {
      const result = document.getElementById('result').innerHTML;
      saveResult(diffPath, selectedModel, result);
      updateUIStatus(false);
    }
  );
}

async function fetchOllamaModels(server) {
  try {
    const response = await fetch(`${server}/api/tags`);
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    document.getElementById('result').innerHTML =
      'Error fetching Ollama models:' + error;
    return [];
  }
}

async function fetchLMStudioModels(server) {
  try {
    const response = await fetch(`${server}/v1/models`);
    const data = await response.json();
    // Transform LM Studio model format to match Ollama format
    return data.data.map(model => ({
      name: model.id,
      // Add any other properties needed to match Ollama model format
    })) || [];
  } catch (error) {
    document.getElementById('result').innerHTML =
      'Error fetching LM Studio models:' + error;
    return [];
  }
}

async function getMaxProcessingLength(server, modelValue) {
  try {
    // Parse the model value to determine which service to use
    let modelType, modelName;

    if (modelValue.startsWith('ollama:')) {
      modelType = 'ollama';
      modelName = modelValue.substring(7); // Remove 'ollama:' prefix

      const response = await fetch(`${server}/api/show`, {
        method: 'POST',
        body: JSON.stringify({
          model: modelName,
        }),
      });
      const jsonResponse = await response.json();
      console.log('context length query response: ', jsonResponse);
      const modelInfo = jsonResponse['model_info'];
      // Search if there is a field containing context_length as a substring
      for (const key in modelInfo) {
        if (key.endsWith('.context_length')) {
          // We will use the guidance of 1 token ~= 4 chars in English, minus 1000 chars to be sure.
          const maxProcessingLength = modelInfo[key] * 4 - 1000;
          console.log(
            'model token size',
            key,
            ': ',
            modelInfo[key],
            ', maxProcessingLength: ',
            maxProcessingLength
          );
          return maxProcessingLength;
        }
      }
    } else if (modelValue.startsWith('lmstudio:')) {
      modelType = 'lmstudio';
      modelName = modelValue.substring(9); // Remove 'lmstudio:' prefix

      try {
        // Query the LM Studio API for model information
        const response = await fetch(`${server}/api/v0/models/${modelName}`);
        const jsonResponse = await response.json();
        console.log('LM Studio context length query response: ', jsonResponse);

        if (jsonResponse.max_context_length) {
          // We will use the guidance of 1 token ~= 4 chars in English, minus 1000 chars to be sure.
          const maxProcessingLength = jsonResponse.max_context_length * 4 - 1000;
          console.log(
            'LM Studio model context length: ',
            jsonResponse.max_context_length,
            ', maxProcessingLength: ',
            maxProcessingLength
          );
          return maxProcessingLength;
        }
      } catch (innerError) {
        console.error('Error fetching LM Studio model info:', innerError);
        // Fall back to default value if API call fails
      }
    }
  } catch (error) {
    document.getElementById('result').innerHTML =
      'Error fetching context length:' + error;
  }
  return 16384 * 4 - 1000; // Assuming default context size is 16k tokens
}

async function populateModelDropdown() {
  const modelSelect = document.getElementById('model_name');

  // Clear the dropdown
  modelSelect.innerHTML = '';

  // Add special "No model selection" option
  const noModelOption = document.createElement('option');
  noModelOption.value = NO_MODEL_SELECTION;
  noModelOption.textContent = NO_MODEL_SELECTION;
  modelSelect.appendChild(noModelOption);

  // Fetch models from Ollama
  const ollamaServer = await getOllamaServer();
  const ollamaModels = await fetchOllamaModels(ollamaServer);
  
  // Add Ollama models with prefix
  ollamaModels.forEach((model) => {
    // Skip models containing 'embed' in their name
    if (model.name.toLowerCase().includes('embed')) {
      return;
    }
    const option = document.createElement('option');
    option.value = `ollama:${model.name}`;
    option.textContent = `Ollama: ${model.name}`;
    modelSelect.appendChild(option);
  });

  // Fetch models from LM Studio
  const lmStudioServer = await getLMStudioServer();
  const lmStudioModels = await fetchLMStudioModels(lmStudioServer);

  // Add LM Studio models with prefix
  lmStudioModels.forEach((model) => {
    // Skip models containing 'embed' in their name
    if (model.name.toLowerCase().includes('embed')) {
      return;
    }
    const option = document.createElement('option');
    option.value = `lmstudio:${model.name}`;
    option.textContent = `LM Studio: ${model.name}`;
    modelSelect.appendChild(option);
  });

  // Check if any models were found
  if (ollamaModels.length === 0 && lmStudioModels.length === 0) {
    document.getElementById('result').innerHTML = 'No models found';
  }

  // Set the current model using the stored value
  const currentModel = await getSelectedModel();
  console.log('currentModel: ', currentModel);

  // Try to set the selected model
  if (currentModel && currentModel !== NO_MODEL_SELECTION) {
    // Check if the model exists in the dropdown
    const modelExists = Array.from(modelSelect.options)
      .some(option => option.value === currentModel);
    if (modelExists) {
      modelSelect.value = currentModel;
    } else if (ollamaModels.length > 0) {
      // Default to first Ollama model if stored model not found
      modelSelect.value = `ollama:${ollamaModels[0].name}`;
    } else if (lmStudioModels.length > 0) {
      // Or first LM Studio model if no Ollama models
      modelSelect.value = `lmstudio:${lmStudioModels[0].name}`;
    }
  }
}

function getCodeReviewFromCacheOrLLM(diffPath, context, title) {
  const selectedModel = document.getElementById('model_name').value;

  // If no model is selected, show an message and return.
  if (selectedModel == NO_MODEL_SELECTION) {
    document.getElementById('result').innerHTML =
      'No model selected. Please select a model in the dropdown, or copy the'
      + ' generated prompt and paste in other AI chat apps.';
    updateUIStatus(false/*not ongoing*/, false/*not a failure*/,
      false/*hide rerun button*/);
    return;
  }

  const storageKey = getStorageKey(diffPath, selectedModel);
  chrome.storage.session.get([storageKey]).then(async (result) => {
    if (result[storageKey]) {
      document.getElementById('result').innerHTML = result[storageKey];
      updateUIStatus(false);
    } else {
      reviewPR(diffPath, context, title);
    }
  });
}

async function run() {
  // Get current tab
  let tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  let prUrl = document.getElementById('pr-url');
  prUrl.textContent = tab.url;

  await populateModelDropdown();

  let diffPath;
  let provider = '';
  let error = null;
  let tokens = tab.url.split('/');
  let context = '';
  let title = tab.title;

  // Simple verification if it would be a self-hosted GitLab instance.
  // We verify if there is a meta tag present with the content "GitLab".
  let isGitLabResult = (
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        return document.querySelectorAll('meta[content="GitLab"]').length;
      },
    })
  )[0];

  if (tokens[2] === 'github.com') {
    provider = 'GitHub';
  } else if ('result' in isGitLabResult && isGitLabResult.result == 1) {
    provider = 'GitLab';
  }

  if (provider === 'GitHub' && tokens[5] === 'pull') {

    const matchTitle = title.match(/^(.*?)\s+by\s+.+?\s+·\s+Pull Request/);
    title = matchTitle ? matchTitle[1] : title;

    // The path towards the patch file of this change
    diffPath = `https://patch-diff.githubusercontent.com/raw/${tokens[3]}/${tokens[4]}/pull/${tokens[6]}.diff`;
    // The description of the author of the change
    // Fetch it by running a querySelector script specific to GitHub on the active tab
    const contextExternalResult = (
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          return document.querySelector('.markdown-body').textContent;
        },
      })
    )[0];

    if ('result' in contextExternalResult) {
      context = contextExternalResult.result;
    }
  } else if (provider === 'GitLab' && tab.url.includes('/-/merge_requests/')) {
    // strip the part after /-/merge_requests/[number]
    const pattern = /\/merge_requests\/\d+/;

    // Find the pattern in the URL
    const match = tab.url.match(pattern);

    // If the pattern is found, strip the part after it
    const strippedUrl = match
      ? tab.url.slice(0, match.index + match[0].length)
      : tab.url;

    const matchTitle = title.match(/^(.*)\s+\(!\d+\)\s+·\s+/);
    title = matchTitle ? matchTitle[1] : title;

    // The path towards the patch file of this change
    diffPath = strippedUrl + '.diff';
    // The description of the author of the change
    // Fetch it by running a querySelector script specific to GitLab on the active tab
    const contextExternalResult = (
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          return document
            .querySelector('.description textarea')
            .getAttribute('data-value');
        },
      })
    )[0];

    if ('result' in contextExternalResult) {
      context = contextExternalResult.result;
    }
  } else {
    if (provider) {
      error =
        'Please open a specific Pull Request or Merge Request on ' + provider;
    } else {
      error = 'Only GitHub or GitLab (SaaS & self-hosted) are supported.';
    }
  }

  if (error != null) {
    document.getElementById('result').innerHTML = error;
    updateUIStatus(false, true, false);
    await new Promise((r) => setTimeout(r, 4000));
    window.close();
    return; // not a pr
  }

  updateUIStatus(true);

  title = '"' + title + '"';

  // Handle rerun button. Ingore caching and just run the LLM query again
  document.getElementById('rerun-btn').onclick = () => {
    reviewPR(diffPath, context, title);
  };

  // Handle copy prompt button
  const copyPromptBtn = document.getElementById('copy-prompt-btn');
  copyPromptBtn.onclick = async () => {
    if (!messageForCopy) return;
    try {
      await navigator.clipboard.writeText(messageForCopy);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Update copy button state based on messageForCopy
  const updateCopyButtonState = () => {
    copyPromptBtn.classList.toggle('disabled', !messageForCopy);
  };
  updateCopyButtonState();

  // Handle model switches
  document
    .getElementById('model_name')
    .addEventListener('change', (event) => {
      getCodeReviewFromCacheOrLLM(diffPath, context, title);
      // Update the cached model so that it's used for the future run of the extension  
      chrome.storage.sync.set({ selected_model: event.target.value });
    });

  getCodeReviewFromCacheOrLLM(diffPath, context, title);
}

run();
