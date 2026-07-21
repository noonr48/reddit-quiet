// === Reddit Quiet — content.js ===
// Applies the user's popup-toggleable settings to the page:
//   1. Adds/removes html.rq-* classes based on chrome.storage.sync settings.
//   2. Strips the "(N) " unread count that Reddit prepends to document.title.
//
// Runs at document_start so html classes land on <html> before the bell paints.
// The actual CSS hide is then declarative (see content.css).
//
// Note on flash-of-bell: classes are applied in the async storage.sync.get
// callback. In practice the storage read is sub-millisecond and the bell paints
// much later, so flash is imperceptible — but it is not strictly zero. The
// synchronous fallback below applies html.rq-hide-bell + html.rq-hide-tab-counter
// immediately at script load (matching the defaults); the callback then
// removes them if the user has turned those features off.

(() => {
  'use strict';

  const DEFAULTS = {
    hideBell: true,
    hideTabCounter: true,
    hideChat: false,
    hideInbox: false,
    hideCreatePost: false,
  };

  const CLASS_MAP = {
    hideBell: 'rq-hide-bell',
    hideChat: 'rq-hide-chat',
    hideInbox: 'rq-hide-inbox',
    hideCreatePost: 'rq-hide-create-post',
    // hideTabCounter has no CSS class — handled by the title-stripper below.
  };

  // ---- Synchronous default-class application (zero-flash for the default case) ----
  // The classes for DEFAULTS=true features go on <html> RIGHT NOW. If the user has
  // turned any of them off, the storage.sync.get callback below will remove them.
  const html = document.documentElement;
  for (const key of Object.keys(CLASS_MAP)) {
    if (DEFAULTS[key]) html.classList.add(CLASS_MAP[key]);
  }
  // Module-scope cache of the tab-counter setting, so the title observer doesn't
  // have to fire a storage.sync.get IPC on every title mutation.
  let hideTabCounter = DEFAULTS.hideTabCounter;

  // ---- Apply html.rq-* classes from a settings object ----
  function applyClasses(settings) {
    hideTabCounter = !!settings.hideTabCounter;
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
  chrome.storage.sync.get(DEFAULTS, applyClasses);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    chrome.storage.sync.get(DEFAULTS, applyClasses);
    // NOTE on hideTabCounter OFF-toggle: we don't restore the (N) prefix here.
    // Reddit's own JS will re-write document.title on its next notification poll
    // (typically within seconds), restoring the counter naturally. Forcing a
    // restore ourselves would require knowing the original count, which we
    // deliberately don't track.
  });

  // ---- Title observer: re-attaches if Reddit replaces <title> ----
  // We watch document.documentElement (which is stable) for subtree mutations
  // and (re)attach a characterData observer to whichever <title> exists.
  let currentTitle = null;
  let titleObs = null;

  function watchTitle(titleEl) {
    if (titleEl === currentTitle) return;
    if (titleObs) titleObs.disconnect();
    titleObs = new MutationObserver(() => {
      if (hideTabCounter) cleanTitle();
    });
    titleObs.observe(titleEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    currentTitle = titleEl;
    if (hideTabCounter) cleanTitle();
  }

  function findAndWatchTitle() {
    const t = document.querySelector('title');
    if (t) watchTitle(t);
  }

  // Watch for <title> appearing OR being replaced (SPA route changes can do this).
  const docObs = new MutationObserver(findAndWatchTitle);
  docObs.observe(document.documentElement, { childList: true, subtree: true });

  // Initial attempt (title may already exist at document_start in some flows).
  findAndWatchTitle();
})();
