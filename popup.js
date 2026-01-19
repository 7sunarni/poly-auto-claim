document.addEventListener('DOMContentLoaded', async () => {
  const intervalSelect = document.getElementById('interval');
  const logsDiv = document.getElementById('logs');
  const statusSpan = document.getElementById('status');

  // Load saved settings
  chrome.storage.local.get(['fetchInterval', 'logs'], (result) => {
    if (result.fetchInterval) {
      intervalSelect.value = result.fetchInterval;
    } else {
      // Default to 1 minute
      chrome.storage.local.set({ fetchInterval: 1 });
      intervalSelect.value = 1;
    }

    if (result.logs) {
      renderLogs(result.logs);
    }
  });

  // Save interval on change
  intervalSelect.addEventListener('change', () => {
    const interval = parseFloat(intervalSelect.value);
    chrome.storage.local.set({ fetchInterval: interval }, () => {
      console.log('Interval saved:', interval);
    });
  });

  // Listen for storage changes to update logs in real-time
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.logs) {
      renderLogs(changes.logs.newValue);
    }
  });

  function renderLogs(logs) {
    logsDiv.innerHTML = '';
    if (!logs || logs.length === 0) {
      logsDiv.innerHTML = '<div>No logs yet.</div>';
      return;
    }

    // Show latest logs first
    [...logs].reverse().forEach(log => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      
      const time = document.createElement('div');
      time.className = 'log-time';
      time.textContent = new Date(log.timestamp).toLocaleTimeString();
      
      const message = document.createElement('div');
      message.textContent = log.message;
      
      entry.appendChild(time);
      entry.appendChild(message);
      logsDiv.appendChild(entry);
    });
  }
});
