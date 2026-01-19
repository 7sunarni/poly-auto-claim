// content.js
console.info('%c Polymarket Auto Claim extension loaded.', 'background: #222; color: #bada55; font-size: 14px');

let intervalId = null;
let currentIntervalMinutes = 1;

// Initialize
chrome.storage.local.get(['fetchInterval'], (result) => {
  if (result.fetchInterval) {
    currentIntervalMinutes = result.fetchInterval;
  }
  startTimer();
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    let shouldRestart = false;

    if (changes.fetchInterval) {
      currentIntervalMinutes = parseFloat(changes.fetchInterval.newValue);
      const displayInterval = currentIntervalMinutes < 1 ? Math.round(currentIntervalMinutes * 60) + " seconds" : currentIntervalMinutes + " minutes";
      console.log(`Interval changed to ${displayInterval}.`);
      addLog(`Interval changed to ${displayInterval}.`);
      shouldRestart = true;
    }

    if (shouldRestart) {
      restartTimer();
    }
  }
});

// Listen for tab visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('Tab became visible, reloading...');
    addLog('Tab active: Reloading...');
    reloadPage();
  }
});

function startTimer() {
  if (intervalId) clearInterval(intervalId);
  
  const displayInterval = currentIntervalMinutes < 1 ? Math.round(currentIntervalMinutes * 60) + " seconds" : currentIntervalMinutes + " minutes";
  console.log(`Starting timer with ${displayInterval} interval.`);
  
  // Try to claim after 5 seconds delay to ensure page is fully loaded
  setTimeout(() => {
    attemptClaim();
  }, 5000);
  
  // Schedule reload
  intervalId = setInterval(() => {
    reloadPage();
  }, currentIntervalMinutes * 60 * 1000);
}

function restartTimer() {
  startTimer();
}

function reloadPage() {
  if (document.hidden) {
    console.log('Tab is hidden, skipping reload.');
    return;
  }
  
  if (!window.location.href.includes('polymarket.com/portfolio')) {
    console.log('Not on portfolio page, skipping reload.');
    return;
  }

  console.log('Reloading page...');
  addLog('Reloading page...');
  window.location.reload();
}

async function attemptClaim() {
  // Check if tab is active/visible
  if (document.hidden) {
    console.log('Tab is hidden, skipping check.');
    // Optional: Log this? Might spam logs. Let's skip logging "skip" events to keep logs clean.
    return;
  }

  // Only run on portfolio pages
  if (!window.location.href.includes('polymarket.com/portfolio')) {
    console.log('Not on portfolio page, skipping check.');
    return;
  }

  console.log('Tab is active and on portfolio page, attempting to find buttons...');
  addLog('Checking for Claim buttons...');

  // Helper to find button by text content (recursive/deep search might be needed if text is nested, but usually innerText works)
  const findButtonByText = (text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.innerText.trim() === text);
  };

  const claimButton = findButtonByText('Claim');
  
  if (claimButton) {
    console.log('Found "Claim" button. Clicking...');
    addLog('Found "Claim" button. Clicking...');
    claimButton.click();

    // Wait for the second button to appear
    setTimeout(() => {
      // Check for error popup first
      if (checkAndCloseErrorPopup()) {
        console.log('Error popup detected and closed. Aborting claim flow.');
        addLog('Error popup detected/closed.');
        return;
      }

      const claimProceedsButton = findButtonByText('Claim proceeds');
      if (claimProceedsButton) {
        console.log('Found "Claim proceeds" button. Clicking...');
        addLog('Found "Claim proceeds" button. Clicking...');
        claimProceedsButton.click();

        // Wait for the "Done" button to appear (giving it a bit more time for transaction/processing)
        setTimeout(() => {
          // Check for error popup again
          if (checkAndCloseErrorPopup()) {
             console.log('Error popup detected and closed during processing.');
             addLog('Error popup detected/closed.');
             return;
          }

          const doneButton = findButtonByText('Done');
          if (doneButton) {
            console.log('Found "Done" button. Clicking...');
            addLog('Found "Done" button. Clicking...');
            doneButton.click();
          } else {
            console.log('"Done" button not found after waiting.');
            addLog('"Done" button not found.');
          }
        }, 20000); // Wait 20 seconds for the Done button
      } else {
        console.log('"Claim proceeds" button not found after waiting.');
        addLog('"Claim proceeds" button not found.');
      }
    }, 1000); // Wait 1 second for the modal/button to appear
  } else {
    console.log('"Claim" button not found.');
    addLog('"Claim" button not found.');
  }
}

function checkAndCloseErrorPopup() {
  const errorText = "Something went wrong! Please try again, or contact us on Discord or Intercom for assistance.";
  
  // Find all elements that might contain this text
  // Since it's likely in a div or p, let's search broadly
  const allElements = document.querySelectorAll('div, p, span');
  
  for (const el of allElements) {
    if (el.innerText && el.innerText.includes(errorText)) {
      console.log('Found error popup text.');
      
      // Try to find a close button within the same container or parent
      // Assuming it's a modal, we look for a "Close" button or an "X" icon/button nearby
      // Often these modals have a "Close" button at the bottom
      
      // Strategy 1: Look for a "Close" button globally (simplest)
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeButton = buttons.find(b => b.innerText.trim() === 'Close');
      
      if (closeButton) {
        console.log('Found "Close" button. Clicking...');
        closeButton.click();
        return true;
      }
      
      // Strategy 2: Look for an SVG icon button (often "X") if "Close" text button doesn't exist
      // This is harder to target generically. 
      // Let's assume there's a button nearby.
      
      return true; // We found the text, assuming we handled it or at least identified it
    }
  }
  return false;
}

function addLog(message) {
  const timestamp = Date.now();
  const logEntry = { timestamp, message };

  chrome.storage.local.get(['logs'], (result) => {
    let logs = result.logs || [];
    logs.push(logEntry);
    
    // Keep last 50 logs to save space
    if (logs.length > 50) {
      logs = logs.slice(logs.length - 50);
    }
    
    chrome.storage.local.set({ logs });
  });
}
