// === Reddit Quiet — popup.js ===
// Loads saved settings, wires up the toggle checkboxes, persists on every change.
// The content script on reddit.com listens for storage changes and applies them live.

(() => {
  'use strict';

  const DEFAULTS = {
    hideBell: true,
    hideTabCounter: true,
    hideChat: false,
    hideInbox: false,
    hideCreatePost: false,
  };

  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-setting]');

  // Load current settings into the UI.
  chrome.storage.sync.get(DEFAULTS, (settings) => {
    for (const cb of checkboxes) {
      const key = cb.dataset.setting;
      cb.checked = !!settings[key];
    }
  });

  // Persist on every toggle. chrome.storage.sync propagates to content scripts via
  // the onChanged listener — no message-passing needed.
  for (const cb of checkboxes) {
    cb.addEventListener('change', () => {
      const key = cb.dataset.setting;
      chrome.storage.sync.set({ [key]: cb.checked });
    });
  }
})();
