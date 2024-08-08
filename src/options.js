// Saves options to chrome.storage
const saveOptions = () => {
    const ollama_model = document.getElementById('ollama_model').value;
    chrome.storage.sync.set(
      { ollama_model: ollama_model },
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
      { ollama_model: "llama3.1:8b" },
      (items) => {
        console.log(items)
        document.getElementById('ollama_model').value = items.ollama_model;
      }
    );
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);