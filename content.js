// === Reddit Quiet — content.js ===
// Hides Reddit's notification bell, unread badge, chat, inbox, and/or Create Post.
//
// CRITICAL ARCHITECTURE NOTE:
// Reddit renders most of its top bar inside <shreddit-*> custom elements with
// SHADOW DOM. CSS selectors from the document root CANNOT pierce shadow
// boundaries. So content.css alone WILL NOT hide the bell. This file does the
// heavy lifting:
//   1. Walks every element AND its shadowRoot recursively
//   2. Matches elements by aria-label, href, data-testid, className
//   3. Applies inline display:none (which works inside shadow roots)
//   4. Nukes small red circles at the top of the page (the unread badge),
//      detected by size + color (this is how the existing "Reddit Notification
//      Remover" extension does it — proven approach)
//   5. Re-runs every 2s + on DOM mutations + on SPA navigation
//
// Tab-title (N) counter is also stripped here.

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
  };

  let settings = { ...DEFAULTS };
  const html = document.documentElement;

  // ---- Patterns: how to identify each feature's elements ----
  // Multiple axes per feature — any one match hides the element.
  //   ariaLabel : aria-label attribute substring (case-insensitive)
  //   href      : href attribute substring
  //   testid    : data-testid attribute substring
  //   className : class attribute substring
  //   id        : id attribute substring  ← catches Reddit's canonical "header-action-item-<x>-button" pattern
  //   iconName  : icon-name attribute on <svg> children ← catches icon-name="chat" etc.
  const PATTERNS = {
    hideBell: {
      ariaLabel: ['notification', 'benachrichtigung', 'bell'],
      href: ['/notifications', '/notification/', '/activity'],
      testid: ['notification', 'inbox-count'],
      className: ['notification-count', 'notification-dot', 'notification-badge'],
      id: ['header-action-item-notifications-button', 'notification-bell', 'header-action-item-activity-button'],
      iconName: ['notification', 'bell'],
    },
    hideChat: {
      ariaLabel: ['chat'],
      href: ['/chat/'],
      testid: ['chat', 'open-chat'],
      className: ['chat-badge', 'chat-unread'],
      id: ['header-action-item-chat-button', 'chat-button'],
      iconName: ['chat'],
    },
    hideInbox: {
      ariaLabel: ['inbox', 'messages', 'mail'],
      href: ['/message/inbox', '/message/unread', '/message/messages'],
      testid: ['inbox', 'messages'],
      className: ['inbox-badge', 'mail-badge'],
      id: ['header-action-item-inbox-button', 'header-action-item-messages-button', 'inbox-button', 'message-button'],
      iconName: ['inbox', 'mail', 'message'],
    },
    hideCreatePost: {
      ariaLabel: ['create post', 'create submission'],
      href: ['/submit/'],
      testid: ['create-post', 'create-submission'],
      className: [],
      id: ['header-action-item-create-button', 'header-action-item-submit-button', 'create-post-button'],
      iconName: ['create', 'submit', 'add'],
    },
  };

  // ---- Match an element against any enabled feature ----
  function featureForElement(el) {
    if (!el || !el.getAttribute) return null;
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    const href = (el.getAttribute('href') || '').toLowerCase();
    const testid = (el.getAttribute('data-testid') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const iconName = (el.getAttribute && el.getAttribute('icon-name') || '').toLowerCase();
    let clsStr = '';
    try {
      const c = el.className;
      clsStr = (typeof c === 'string' ? c : (c && c.baseVal) || '').toLowerCase();
    } catch (e) {}

    for (const [feature, pats] of Object.entries(PATTERNS)) {
      if (!settings[feature]) continue;
      if (pats.ariaLabel && pats.ariaLabel.some(p => label.includes(p))) return feature;
      if (pats.href && pats.href.some(p => href.includes(p))) return feature;
      if (pats.testid && pats.testid.some(t => testid.includes(t))) return feature;
      if (pats.className && pats.className.some(c => clsStr.includes(c))) return feature;
      if (pats.id && pats.id.some(x => id.includes(x))) return feature;
      if (pats.iconName && pats.iconName.some(n => iconName.includes(n))) return feature;
    }
    return null;
  }

  // ---- Walk every element + their shadow roots recursively ----
  function* allElements(root) {
    if (!root || !root.querySelectorAll) return;
    for (const el of root.querySelectorAll('*')) {
      yield el;
      if (el.shadowRoot) {
        yield* allElements(el.shadowRoot);
      }
    }
  }

  // ---- Hide one element via inline style ----
  function hide(el) {
    if (el.style) {
      el.style.setProperty('display', 'none', 'important');
    }
  }

  // ---- Detect & hide small red/orange badge dots near the top of the page ----
  // Heuristic: ≤32px square, in the top 100px of viewport, with red/orange bg.
  // This is the "1" unread counter the user sees. Mirrors the proven approach
  // from the existing "Reddit Notification Remover" extension.
  function isBadgeDot(el) {
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.width > 32) return false;
      if (rect.height <= 0 || rect.height > 32) return false;
      if (rect.top > 100) return false;
      const bg = getComputedStyle(el).backgroundColor;
      // Match red/orange-ish: rgb(180-255, 0-90, 0-90)
      return /^rgb\(\s*(1[89][0-9]|2[0-5][0-9])\s*,\s*[0-9]?\d\s*,\s*[0-9]?\d\s*\)$/.test(bg);
    } catch (e) {
      return false;
    }
  }

  function nukeBadgeDots(root) {
    for (const el of allElements(root)) {
      if (isBadgeDot(el)) hide(el);
    }
  }

  // ---- Main cleanup pass ----
  function cleanup() {
    // Apply html.rq-* classes (so content.css's document-root rules also fire)
    for (const [key, cls] of Object.entries(CLASS_MAP)) {
      html.classList.toggle(cls, !!settings[key]);
    }

    // Walk all elements + shadow roots, hide matches
    for (const el of allElements(document)) {
      if (featureForElement(el)) hide(el);
    }

    // Nuke red badge dots if any of the icon-hiding features are on
    if (settings.hideBell || settings.hideChat || settings.hideInbox) {
      nukeBadgeDots(document);
    }

    // Strip (N) from title
    if (settings.hideTabCounter) {
      const TITLE_RE = /^\((\d+\+?)\)\s*/;
      if (TITLE_RE.test(document.title)) {
        document.title = document.title.replace(TITLE_RE, '');
      }
    }
  }

  // ---- Schedule helpers ----
  let pending = false;
  function scheduleCleanup() {
    if (pending) return;
    pending = true;
    // Use requestAnimationFrame for visual changes; fallback to microtask
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => { pending = false; cleanup(); });
    } else {
      Promise.resolve().then(() => { pending = false; cleanup(); });
    }
  }

  // ---- Init: load settings + wire listeners ----
  chrome.storage.sync.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };

    // Initial + staggered runs (catch SPA render waves)
    cleanup();
    setTimeout(cleanup, 100);
    setTimeout(cleanup, 500);
    setTimeout(cleanup, 1500);
    setTimeout(cleanup, 3000);

    // Ongoing schedule — catches re-renders, notification polls, etc.
    setInterval(cleanup, 2000);
  });

  // Live-apply popup changes (storage sync propagates across tabs)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    chrome.storage.sync.get(DEFAULTS, (s) => {
      settings = { ...DEFAULTS, ...s };
      cleanup();
    });
  });

  // Re-run on any DOM mutation (Reddit SPA re-renders constantly)
  const obs = new MutationObserver(() => scheduleCleanup());
  // Defer observation until document.documentElement exists (should already at document_start)
  const startObs = () => {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.documentElement) {
    startObs();
  } else {
    new MutationObserver((_, o) => {
      if (document.documentElement) { startObs(); o.disconnect(); }
    }).observe(document, { childList: true });
  }

  // Re-run on SPA navigation (URL change without page reload)
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(cleanup, 200);
      setTimeout(cleanup, 1000);
    }
  }, 500);
})();
