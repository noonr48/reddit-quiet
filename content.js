// === Reddit Quiet — content.js ===
// Applies the user's popup-toggleable settings to the page:
//   1. Adds/removes html.rq-* classes based on chrome.storage.sync settings.
//   2. Strips the "(N) " unread count that Reddit prepends to document.title.
//
// Runs at document_start so the bell is hidden before it flashes on screen.

(() => {
  'use strict';

  const DEFAULTS = {
    hideBell: true,         // core feature, on by default
    hideTabCounter: true,   // core feature, on by default
    hideChat: false,
    hideInbox: false,
    hideCreatePost: false,
  };

  const CLASS_MAP = {
    hideBell: 'rq-hide-bell',
    hideChat: 'rq-hide-chat',
    hideInbox: 'rq-hide-inbox',
    hideCreatePost: 'rq-hide-create-post',
    // hideTabCounter has no CSS class — it's handled by the title-stripper below.
  };

  // ---- Apply html.rq-* classes from settings ----
  function applyClasses(settings) {
    const html = document.documentElement;
    for (const [key, cls] of Object.entries(CLASS_MAP)) {
      html.classList.toggle(cls, !!settings[key]);
    }
  }

  // ---- Strip "(N) " from document.title ----
  const TITLE_RE = /^\((\d+\+?)\)\s*/;
  function cleanTitle() {
    if (TITLE_RE.test(document.title)) {
      document.title = document.title.replace(TITLE_RE, '');
    }
  }

  // ---- Load settings, then keep them in sync ----
  function init() {
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      applyClasses(settings);
      if (settings.hideTabCounter) cleanTitle();
    });

    // Live-apply changes from the popup without a page reload.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      chrome.storage.sync.get(DEFAULTS, applyClasses);
      // For hideTabCounter changes mid-session, the title observer keeps working
      // unconditionally — see below — so a toggle-on takes effect on the next
      // Reddit title write, and a toggle-off just means we stop stripping.
    });
  }

  init();

  // ---- Title observer: always running; only STRIPS when hideTabCounter is true ----
  // (Cheap enough to leave on; the gate is one storage read per title mutation.)
  function watchTitle(titleEl) {
    new MutationObserver(() => {
      chrome.storage.sync.get(DEFAULTS, (s) => {
        if (s.hideTabCounter) cleanTitle();
      });
    }).observe(titleEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  const existing = document.querySelector('title');
  if (existing) {
    watchTitle(existing);
  } else {
    const headObs = new MutationObserver(() => {
      const t = document.querySelector('title');
      if (t) {
        watchTitle(t);
        headObs.disconnect();
      }
    });
    headObs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
