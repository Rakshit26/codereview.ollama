import { DEFAULT_GUIDELINES } from './config';

// Saves options to chrome.storage
const saveOptions = () => {
  const ollama_server = document.getElementById('ollama_server').value;
  const lmstudio_server = document.getElementById('lmstudio_server').value;

  chrome.storage.sync.set(
    {
      ollama_server: ollama_server,
      lmstudio_server: lmstudio_server,
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.hidden = false;
      setTimeout(() => {
        status.hidden = true;
      }, 1500);
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    {
      ollama_server: 'http://localhost:11434',
      lmstudio_server: 'http://localhost:1234',
    },
    (items) => {
      console.log(items);
      document.getElementById('ollama_server').value = items.ollama_server;
      document.getElementById('lmstudio_server').value = items.lmstudio_server;
    }
  );
};

async function loadGuidelines() {
  const result = await chrome.storage.sync.get(['guidelines', 'selectedGuidelines']);
  const guidelines = result.guidelines || [DEFAULT_GUIDELINES];
  const selected = result.selectedGuidelines || 0;

  const guidelinesList = document.getElementById('guidelines-list');
  guidelinesList.innerHTML = '';
  
  guidelines.forEach((guideline, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = guideline.name;
    option.selected = index === selected;
    guidelinesList.appendChild(option);
  });

  document.getElementById('guideline-name').value = guidelines[selected].name;
  document.getElementById('guideline-content').value = guidelines[selected].content;
}

function setupGuidelinesEventListeners() {
  document.getElementById('guidelines-list').addEventListener('change', async (e) => {
    const index = parseInt(e.target.value);
    await chrome.storage.sync.set({ selectedGuidelines: index });
    await loadGuidelines();
  });

  document.getElementById('save-guideline').addEventListener('click', async () => {
    const result = await chrome.storage.sync.get(['guidelines', 'selectedGuidelines']);
    const guidelines = result.guidelines || [DEFAULT_GUIDELINES];
    const selected = result.selectedGuidelines || 0;

    guidelines[selected] = {
      name: document.getElementById('guideline-name').value,
      content: document.getElementById('guideline-content').value
    };

    await chrome.storage.sync.set({ guidelines });
    await loadGuidelines();
  });

  document.getElementById('add-guideline').addEventListener('click', async () => {
    const result = await chrome.storage.sync.get('guidelines');
    const guidelines = result.guidelines || [DEFAULT_GUIDELINES];
    
    guidelines.push({
      name: 'New Guidelines',
      content: 'Enter your guidelines here'
    });

    await chrome.storage.sync.set({ 
      guidelines,
      selectedGuidelines: guidelines.length - 1
    });
    await loadGuidelines();
  });

  document.getElementById('delete-guideline').addEventListener('click', async () => {
    const result = await chrome.storage.sync.get(['guidelines', 'selectedGuidelines']);
    const guidelines = result.guidelines || [DEFAULT_GUIDELINES];
    const selected = result.selectedGuidelines || 0;

    if (guidelines.length <= 1) {
      alert('Cannot delete the last guideline');
      return;
    }

    guidelines.splice(selected, 1);
    await chrome.storage.sync.set({
      guidelines,
      selectedGuidelines: Math.min(selected, guidelines.length - 1)
    });
    await loadGuidelines();
  });

  document.getElementById('export-guidelines').addEventListener('click', () => {
    chrome.storage.sync.get('guidelines', (result) => {
      const guidelines = result.guidelines || [DEFAULT_GUIDELINES];
      const blob = new Blob([JSON.stringify(guidelines, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'code-review-guidelines.json';
      a.click();
      
      URL.revokeObjectURL(url);
    });
  });

  const importButton = document.getElementById('import-button');
  const importInput = document.getElementById('import-guidelines');
  importButton.addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const guidelines = JSON.parse(e.target.result);
        await chrome.storage.sync.set({ 
          guidelines,
          selectedGuidelines: 0
        });
        await loadGuidelines();
      } catch (error) {
        console.error('Error importing guidelines:', error);
      }
    };
    reader.readAsText(file);
  });
}

// Setup tooltip functionality
function setupTooltip() {
  const infoIcon = document.getElementById('info-icon');
  const tooltip = document.getElementById('tooltip');

  if (infoIcon && tooltip) {
    // Toggle tooltip on click
    infoIcon.addEventListener('click', function(e) {
      e.stopPropagation();

      if (tooltip.style.display === 'none') {
        // Position the tooltip near the icon
        const rect = infoIcon.getBoundingClientRect();
        tooltip.style.top = (rect.bottom + 5) + 'px';
        tooltip.style.left = rect.left + 'px';
        tooltip.style.display = 'block';
      } else {
        tooltip.style.display = 'none';
      }
    });

    // Hide tooltip when clicking elsewhere
    document.addEventListener('click', function() {
      tooltip.style.display = 'none';
    });
  }
}

// Add this to your existing DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', async () => {
  await loadGuidelines();
  await restoreOptions();
  setupGuidelinesEventListeners();
  setupTooltip();
  document.getElementById('status').hidden = true;
});
document.getElementById('save').addEventListener('click', saveOptions);
