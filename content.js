// === Reddit Quiet — content.js ===
// Hides distracting UI on Reddit AND YouTube.
//
// Reddit:  notification bell, unread badge, chat, inbox, Create Post, (N) title,
//          ad/promoted posts, thread comments, Recent-Posts rail (v1.4.0),
//          vote scores + comment counts (v1.4.1 engagement quieting).
// YouTube: Shorts shelves, sidebar link, search results, filter chips, tab —
//          plus optional notification bell.
//
// CRITICAL ARCHITECTURE NOTE:
// Both Reddit and YouTube render UI inside custom elements with SHADOW DOM
// (<shreddit-*> on Reddit, <ytd-*> on YouTube). CSS from the document root
// CANNOT pierce shadow boundaries. This file:
//   1. Walks every element AND its shadowRoot recursively
//   2. Matches elements by aria-label, href, data-testid, className, id, title
//   3. Applies inline display:none (which works inside shadow roots)
//   4. Nukes small red circles at the top of the page (unread badges)
//   5. Re-runs every 2s + on DOM mutations + on SPA navigation
//
// content.css provides a "fast first pass" for elements at the document root.
// The JS catches everything inside shadow roots.

(() => {
  'use strict';

  const DEFAULTS = {
    // Reddit
    hideBell: true,
    hideTabCounter: true,
    hideChat: false,
    hideInbox: false,
    hideCreatePost: false,
    hideAds: true,
    hideComments: true,
    hideRecentPosts: true,
    hideScores: true,
    hideCommentCount: true,
    // YouTube
    hideYtShorts: true,
    hideYtNotifications: false,
  };

  const CLASS_MAP = {
    // Reddit
    hideBell: 'rq-hide-bell',
    hideChat: 'rq-hide-chat',
    hideInbox: 'rq-hide-inbox',
    hideCreatePost: 'rq-hide-create-post',
    hideAds: 'rq-hide-ads',
    hideComments: 'rq-hide-comments',
    hideRecentPosts: 'rq-hide-recent-posts',
    hideScores: 'rq-hide-scores',
    hideCommentCount: 'rq-hide-comment-counts',
    // YouTube
    hideYtShorts: 'rq-hide-yt-shorts',
    hideYtNotifications: 'rq-hide-yt-notifs',
  };

  let settings = { ...DEFAULTS };
  const html = document.documentElement;
  const isYouTube = location.hostname.includes('youtube.com');

  // ---- Patterns: how to identify each feature's elements ----
  // Multiple axes per feature — any one match hides the element.
  //   ariaLabel : aria-label attribute substring (case-insensitive)
  //   href      : href attribute substring
  //   testid    : data-testid attribute substring
  //   className : class attribute substring
  //   id        : id attribute substring
  //   title     : title attribute substring  ← catches YouTube sidebar "Shorts" link
  //   iconName  : icon-name attribute on <svg> children
  //   tagName   : EXACT custom-element tag match (uppercase) ← shreddit-ad-post,
  //               shreddit-comment, recent-posts (v1.4.0 feed/thread quieting)
  //   attr      : element HAS the named attribute ← button[upvote]/button[downvote]
  //   textRegex : element's ENTIRE (trimmed) text matches ← leaf elements only;
  //               catches the "32 comments" action-bar labels (v1.4.1)
  //   linkText  : ANCHOR whose href contains a substring AND whose entire text
  //               matches a regex ← catches split-label comment-count links
  //               ("32" + "comments" in separate children)
  //   onlyTags  : restrict the whole feature to these tag names ← keeps the
  //               vote-button axes off non-button elements that might carry
  //               upvote/downvote attributes
  // Feature flag hideScoreSibling: matching elements are vote BUTTONS — hide
  // their adjacent score element (<span> or <faceplate-number>), NOT the
  // button, so voting still works.
  const REDDIT_PATTERNS = {
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
    // ---- v1.4.0: feed & thread quieting (tagName = exact custom-element match) ----
    // shreddit-ad-post   = a promoted/ad post card in the feed (incl. its "Ad" label)
    // recent-posts       = the "Recent Posts" rail on the home page
    // shreddit-comment   = one comment (wraps body + nested replies + its reply box)
    // shreddit-comment-tree = the entire comment section under a post
    // shreddit-comment-tree-stats / shreddit-comments-sort-dropdown = section header
    // NOTE: shreddit-composer (the "Add a comment" box) is deliberately NOT
    // matched — Reddit reuses that generic composer for the /submit post-creation
    // form, so hiding it would break posting. Ditto profile pages, which render
    // comment history as <shreddit-profile-comment> — not matched, staying
    // scoped to thread pages.
    hideAds: {
      tagName: ['SHREDDIT-AD-POST'],
    },
    hideComments: {
      tagName: [
        'SHREDDIT-COMMENT',
        'SHREDDIT-COMMENT-TREE',
        'SHREDDIT-COMMENT-TREE-STATS',
        'SHREDDIT-COMMENTS-SORT-DROPDOWN',
      ],
    },
    hideRecentPosts: {
      tagName: ['RECENT-POSTS'],
    },
    // ---- v1.4.1: engagement quieting ----
    // Vote buttons carry the verb in aria-label ("upvote"/"downvote") and/or a
    // bare upvote/downvote attribute, inside shreddit-post's shadow root. The
    // SCORE is the <span> between the arrows (button[upvote] + span) — we hide
    // the span, keep the arrows, so voting still works.
    hideScores: {
      onlyTags: ['BUTTON'],
      ariaLabel: ['upvote', 'downvote'],
      attr: ['upvote', 'downvote'],
      hideScoreSibling: true,
    },
    // Comment-count links render as plain text "32 comments" / "1.2k comments"
    // with no stable testid — exact full-text match on leaf elements only, plus
    // an anchor form for split labels ("32" + "comments" as separate children).
    // Rare false positive: a user post/comment whose entire text is exactly
    // "N comments" also hides — acceptable for a quiet extension, documented
    // in the README.
    hideCommentCount: {
      textRegex: /^\d[\d.,]*\s*[km]?\s*comments?$/i,
      linkText: [{ hrefSub: '/comments/', textRegex: /^\d[\d.,]*\s*[km]?\s*comments?$/i }],
    },
  };

  const YT_PATTERNS = {
    // Shorts sidebar/mini-guide link lives inside shadow root of
    // ytd-guide-entry-renderer / ytd-mini-guide-entry-renderer.
    // The inner <a> has title="Shorts" and href="/shorts".
    hideYtShorts: {
      title: ['Shorts'],
      href: ['/shorts'],
    },
    hideYtNotifications: {
      ariaLabel: ['notification'],
    },
  };

  // Pick the right pattern set for the current site
  const PATTERNS = isYouTube ? YT_PATTERNS : REDDIT_PATTERNS;

  // ---- Match an element against any enabled feature ----
  function featureForElement(el) {
    if (!el || !el.getAttribute) return null;
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    const tag = String(el.tagName || '').toUpperCase();
    const isLeaf = el.children.length === 0;
    const href = (el.getAttribute('href') || '').toLowerCase();
    const testid = (el.getAttribute('data-testid') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const title = (el.getAttribute('title') || '').toLowerCase();
    const iconName = (el.getAttribute && el.getAttribute('icon-name') || '').toLowerCase();
    let clsStr = '';
    try {
      const c = el.className;
      clsStr = (typeof c === 'string' ? c : (c && c.baseVal) || '').toLowerCase();
    } catch (e) {}

    for (const [feature, pats] of Object.entries(PATTERNS)) {
      if (!settings[feature]) continue;
      if (pats.onlyTags && !pats.onlyTags.includes(tag)) continue;
      if (pats.tagName && pats.tagName.some(t => tag === t)) return feature;
      if (pats.attr && pats.attr.some(a => el.hasAttribute(a))) return feature;
      if (pats.textRegex && isLeaf && (el.textContent || '').length <= 24 && pats.textRegex.test((el.textContent || '').trim())) return feature;
      if (pats.linkText && pats.linkText.some(lt => tag === 'A' && (el.getAttribute('href') || '').toLowerCase().includes(lt.hrefSub) && lt.textRegex.test((el.textContent || '').trim()))) return feature;
      if (pats.ariaLabel && pats.ariaLabel.some(p => label.includes(p))) return feature;
      if (pats.href && pats.href.some(p => href.includes(p))) return feature;
      if (pats.testid && pats.testid.some(t => testid.includes(t))) return feature;
      if (pats.className && pats.className.some(c => clsStr.includes(c))) return feature;
      if (pats.id && pats.id.some(x => id.includes(x))) return feature;
      if (pats.title && pats.title.some(t => title.includes(t))) return feature;
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

  // ---- Unhide path (v1.4.0) ----
  // Inline display:none is otherwise permanent until reload: toggling a feature
  // OFF mid-session would leave its elements invisible (only the CSS-gated
  // html.rq-* rules self-unhide via the class toggle). So we record which
  // elements each feature hid and clear the inline style when it turns off.
  // Best-effort: on overflow the record is dropped (long sessions on huge
  // threads); still-matching elements are re-hidden by the next cleanup pass,
  // and detached nodes are harmless to touch.
  const HIDDEN_CAP = 5000;
  const hiddenByFeature = new Map(); // feature -> Set<Element>

  function hideTracked(el, feature) {
    hide(el);
    let s = hiddenByFeature.get(feature);
    if (!s) {
      s = new Set();
      hiddenByFeature.set(feature, s);
    }
    s.add(el);
    if (s.size > HIDDEN_CAP) {
      // Prune detached nodes first (long SPA sessions accumulate them);
      // only clear outright if live elements still exceed the cap.
      for (const tracked of s) {
        if (!tracked.isConnected) s.delete(tracked);
      }
      if (s.size > HIDDEN_CAP) s.clear();
    }
  }

  function unhideFeature(feature) {
    const s = hiddenByFeature.get(feature);
    if (!s) return;
    for (const el of s) {
      try { el.style.removeProperty('display'); } catch (e) { /* detached node */ }
    }
    hiddenByFeature.delete(feature);
  }

  // ---- Detect & hide small red/orange badge dots near the top of the page ----
  // Heuristic: ≤32px square, in the top 100px of viewport, with red/orange bg.
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

  // ---- v1.4.1: hide the score element next to a vote button (not the button) ----
  // The score renders as a <span> between the arrows, or (per Reddit's number
  // component) as a <faceplate-number> — hide either; the arrows stay.
  function hideScoreSiblings(el, feature) {
    for (const sib of [el.previousElementSibling, el.nextElementSibling]) {
      if (sib && (sib.tagName === 'SPAN' || sib.tagName === 'FACEPLATE-NUMBER')) {
        hideTracked(sib, feature);
      }
    }
  }

  // ---- Main cleanup pass ----
  function cleanup() {
    // Only toggle classes relevant to the current site (prevents cross-site
    // CSS interference — e.g. Reddit's bell CSS accidentally hiding YouTube's bell)
    for (const [key, cls] of Object.entries(CLASS_MAP)) {
      const isYtKey = key.startsWith('hideYt');
      if (isYtKey !== isYouTube) continue;
      html.classList.toggle(cls, !!settings[key]);
    }

    // Walk all elements + shadow roots, hide matches (tracked for unhide).
    // hideScoreSibling features hide the <span> beside the vote button instead
    // of the button itself, so voting still works.
    for (const el of allElements(document)) {
      const f = featureForElement(el);
      if (!f) continue;
      if (PATTERNS[f].hideScoreSibling) {
        hideScoreSiblings(el, f);
      } else {
        hideTracked(el, f);
      }
    }

    // Nuke red badge dots if any icon-hiding feature is on
    const badgeFeatureOn = isYouTube
      ? settings.hideYtNotifications
      : (settings.hideBell || settings.hideChat || settings.hideInbox);
    if (badgeFeatureOn) {
      nukeBadgeDots(document);
    }

    // Strip (N) from title (Reddit only — YouTube doesn't use this pattern)
    if (!isYouTube && settings.hideTabCounter) {
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
      // Clear inline hides for any feature now OFF, then re-run — anything
      // still matched by another enabled feature gets re-hidden by cleanup().
      for (const key of Object.keys(settings)) {
        if (!settings[key]) unhideFeature(key);
      }
      cleanup();
    });
  });

  // Re-run on any DOM mutation (both Reddit and YouTube are SPAs)
  const obs = new MutationObserver(() => scheduleCleanup());
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
