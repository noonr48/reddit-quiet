# Reddit Quiet

> A tiny Chrome extension that hides Reddit's notification bell, red unread badge, and `(N)` tab counter. Plus toggleable Chat, Inbox, Create Post, ad posts, thread comments, Recent Posts, vote scores, and comment-count hiding — and YouTube Shorts. Zero tracking, zero data.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)
![Permissions](https://img.shields.io/badge/Permissions-storage%20only-green)

## Why

Reddit's notification bell in the top-right has a red unread dot that never goes away. Reddit's built-in settings (User Settings → Notifications) only let you disable *categories* of notifications — they don't hide the bell itself. Admin messages, modmail, and chat invites still light it up regardless.

**Reddit Quiet removes the bell entirely.** And the badge. And the `(5)` count in your browser tab title.

## Features

Twelve toggleable options in a clean popup:

| Toggle | Default | What it removes |
|---|---|---|
| **Notifications bell** | ON | The 🔔 icon + its red unread badge |
| **Tab title counter** | ON | The `(5)` prefix on the browser tab |
| Chat icon | OFF | The 💬 icon |
| Inbox / Messages | OFF | The ✉️ mail icon |
| Create Post button | OFF | The "Create Post" pill |
| **Ad posts** | ON | Promoted posts in the feed (`<shreddit-ad-post>`) |
| **Comments on posts** | ON | The whole comment section on threads (`<shreddit-comment>` tree) |
| **Recent posts sidebar** | ON | The "Recent Posts" rail on Home (`<recent-posts>`) |
| **Vote scores** | ON | The score between the vote arrows (arrows stay — voting works) |
| **Comment counts** | ON | "N comments" links under posts |
| YouTube Shorts | ON | Shorts shelves, sidebar link & search results |
| YouTube bell | OFF | The 🔔 icon in YouTube's top bar |

Settings sync across your devices via Chrome's built-in sync. Changes apply instantly to any open Reddit or YouTube tab — toggling a feature off restores the elements it hid without a reload.

The three **Feed & threads** toggles plus **Vote scores** / **Comment counts** work by exact custom-element tag match, vote-button attributes, or full-text match — stable against Reddit's randomized CSS-class churn. Comment hiding is scoped to thread pages — profile comment history (`<shreddit-profile-comment>`) and the generic composer (`<shreddit-composer>`, reused by the /submit post form) are deliberately untouched. Vote *buttons* stay visible so voting still works; only the numbers vanish.

## Install (load unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder
5. Visit https://www.reddit.com — the bell is gone

## How it works

Reddit renders its top bar inside `<shreddit-*>` custom elements with **shadow DOM**. CSS selectors from the document root can't pierce the shadow boundary, so a pure-CSS approach won't work.

Reddit Quiet uses a hybrid strategy:

1. **content.css** — broad unscoped selectors for any bell-related elements that live at the document root (some badge variants are hoisted out of shadow DOM)
2. **content.js** — walks every element AND its `shadowRoot` recursively, applying inline `display: none` to matches. Identifies elements by `id`, `class`, `aria-label`, `href`, `data-testid`, and `icon-name` attributes (stable across redesigns, unlike the randomized CSS class hashes)
3. **Red-badge nuking** — detects small red/orange circles at the top of the page (the unread count) by size + color, since they have no stable attributes
4. **Re-runs every 2s + on DOM mutations + on SPA navigation** — Reddit re-renders the top bar constantly; a one-shot hide wouldn't survive 30 seconds

The tab-title `(N)` counter is stripped via a `MutationObserver` on `<title>`.

The extension is **small enough to read end-to-end in a single sitting** — about 1000 lines including comments and blank lines across 6 files. Read every line — there's nothing to hide.

| File | Job |
|---|---|
| `manifest.json` | MV3 manifest; only `storage` permission |
| `content.css` | Broad unscoped selectors for document-root elements |
| `content.js` | Shadow-root walker + inline display:none + red-badge detection + title stripper |
| `popup/popup.html` | Toggle UI structure |
| `popup/popup.css` | Popup styling with light/dark mode |
| `popup/popup.js` | Wires toggles to `chrome.storage.sync` |

## Privacy

**Zero data collected.** No analytics, no backend, no network requests, no tracking. The only permission is `storage`, used solely to remember your twelve toggle preferences via Chrome's built-in sync (which rides your existing Chrome login — no separate account, no server).

## Compatibility

- Chrome, Brave, Edge, Opera, Vivaldi — any Chromium browser with extension support
- New Reddit (`reddit.com`) — fully supported
- Old Reddit (`old.reddit.com`) — mostly a no-op (no bell to hide there). The comment-count labels ("N comments" links) are plain text and may hide there too; nothing else matches old Reddit's DOM.
- Edge case: text whose entire content is exactly "N comments" (rare user posts/comments worded that way) also hides while Comment counts is ON — toggle it off if you ever hit it.
- Reddit mobile apps — not affected (those are separate native products)

## If the bell reappears after a Reddit redesign

Reddit changed their markup. Right-click the bell → Inspect → look at the element's `id`, `class`, `aria-label`, and any inner `<svg icon-name="...">` → add the new pattern to the relevant feature in [`content.js`](content.js) (`PATTERNS` object near the top).

## Development

```bash
# Make changes
$ vim content.js

# Reload: chrome://extensions → click the reload ↻ icon on Reddit Quiet's card
# Or: just refresh any reddit.com tab — content_scripts re-inject on navigation
```

## License

MIT — see [LICENSE](LICENSE).

## Contributing

PRs welcome. Especially: pattern updates when Reddit redesigns, additional toggle options, and translations.
