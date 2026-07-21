# Reddit Quiet

> A tiny Chrome extension that hides Reddit's notification bell, red unread badge, and `(N)` tab counter. Plus toggleable Chat, Inbox, and Create Post hiding. Zero tracking, zero data.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)
![Permissions](https://img.shields.io/badge/Permissions-storage%20only-green)

## Why

Reddit's notification bell in the top-right has a red unread dot that never goes away. Reddit's built-in settings (User Settings → Notifications) only let you disable *categories* of notifications — they don't hide the bell itself. Admin messages, modmail, and chat invites still light it up regardless.

**Reddit Quiet removes the bell entirely.** And the badge. And the `(5)` count in your browser tab title.

## Features

Five toggleable options in a clean popup:

| Toggle | Default | What it removes |
|---|---|---|
| **Notifications bell** | ON | The 🔔 icon + its red unread badge |
| **Tab title counter** | ON | The `(5)` prefix on the browser tab |
| Chat icon | OFF | The 💬 icon |
| Inbox / Messages | OFF | The ✉️ mail icon |
| Create Post button | OFF | The "Create Post" pill |

Settings sync across your devices via Chrome's built-in sync. Changes apply instantly to any open Reddit tab.

## Install

### From the Chrome Web Store *(once published)*

Search for "Reddit Quiet" or visit the listing URL.

### From source (developer / load-unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder
5. Visit https://www.reddit.com — the bell is gone

## How it works

Reddit Quiet uses **stable ARIA-label selectors** (`[aria-label="Notifications"]`) scoped to the top navigation bar (`[role="banner"]`, `[data-testid="top-nav-bar"]`), rather than randomized CSS classes. This way it survives Reddit redesigns that change the underlying class hashes, and it doesn't accidentally hide sidebar links, footer links, or Settings tabs that happen to mention "notification".

The tab-title counter is stripped via a lightweight `MutationObserver` on `<title>`. The observer automatically re-attaches if Reddit replaces `<title>` during SPA navigation.

The extension is **small enough to read end-to-end in a single sitting** — about 500 lines including comments and blank lines across 6 files. Read every line — there's nothing to hide.

| File | Job |
|---|---|
| `manifest.json` | MV3 manifest; only `storage` permission |
| `content.css` | Hides elements via html-class-gated rules, scoped to the top bar |
| `content.js` | Loads settings, applies html classes, title observer, listens for live changes |
| `popup/popup.html` | Toggle UI structure |
| `popup/popup.css` | Popup styling with light/dark mode |
| `popup/popup.js` | Wires toggles to `chrome.storage.sync` |

## Privacy

**Zero data collected.** No analytics, no backend, no network requests, no tracking. The only permission is `storage`, used solely to remember your five toggle preferences. See [privacy-policy.md](store/privacy-policy.md).

## Compatibility

- Chrome, Brave, Edge, Opera, Vivaldi — any Chromium browser with extension support
- New Reddit (`reddit.com`) — fully supported
- Old Reddit (`old.reddit.com`) — no-op (no bell to hide there, no harm done)
- Reddit mobile apps — not affected (those are separate native products)

## If the bell reappears after a Reddit redesign

Reddit changed their aria-label. Right-click the bell → Inspect → look at its `aria-label` attribute → update the selector in [`content.css`](content.css).

## Development

```bash
# Make changes
$ vim content.css

# Reload: chrome://extensions → click the reload arrow on Reddit Quiet's card
# Or: just refresh any reddit.com tab — content_scripts re-inject on navigation
```

To publish a new version to the Web Store:

1. Bump `version` in `manifest.json`
2. Rebuild the zip (see `store/zip-instructions.md`)
3. Upload via the [Developer Dashboard](https://chrome.google.com/webstore/devconsole)

## License

MIT — see [LICENSE](LICENSE).

## Contributing

PRs welcome. Especially: aria-label updates when Reddit redesigns, additional toggle options, and translations.
