// Saves options to chrome.storage
const saveOptions = () => {
  const ollama_server = document.getElementById('ollama_server').value;

  chrome.storage.sync.set(
    {
      ollama_server: ollama_server,
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 750);
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    {
      ollama_server: 'http://localhost:11434',
    },
    (items) => {
      console.log(items);
      document.getElementById('ollama_server').value = items.ollama_server;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
