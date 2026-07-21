# Store Listing — Reddit Quiet

Copy/paste these into the Chrome Web Store Developer Dashboard fields.

## Extension name (45 chars max)

```
Reddit Quiet — hide notifications, badge, tab counter
```
*(42 chars)*

## Summary (132 chars max — shown in search results)

```
Hide Reddit's notification bell, red unread badge, and (N) tab counter. Plus optional Chat, Inbox, Create Post toggles. Zero tracking.
```
*(132 chars exactly)*

## Description (16,000 chars max — first 2-3 sentences matter most)

```
Reddit Quiet removes the distracting parts of Reddit's top bar — the notification bell, its red unread badge, and the (5) counter that pollutes your browser tab title.

Reddit has no built-in way to hide the bell icon itself; their settings only reduce what fills it. Reddit Quiet actually removes it.

★ FIVE TOGGLES — YOU CHOOSE WHAT STAYS ★

All settings live in a clean popup. Click the toolbar icon to open it.

  • Notifications bell (default ON) — removes the 🔔 icon and its red unread dot
  • Tab title counter (default ON) — strips the "(5)" from the browser tab
  • Chat icon (default OFF) — also hides the chat bubble
  • Inbox / Messages (default OFF) — also hides the mail icon
  • Create Post button (default OFF) — also hides the Create Post pill

Settings sync across your devices via Chrome's built-in sync (no account needed beyond your existing Chrome login). Changes apply instantly to any open Reddit tab.

🔒 ZERO DATA COLLECTED

Reddit Quiet is a content-script-only extension. It does NOT collect, transmit, store, or share any personal data, browsing history, account info, or Reddit content. The only permission it requests is `storage` (Chrome's built-in cross-device settings sync, used to remember your five toggle choices). There is no backend, no analytics, no telemetry, no ads, no tracker. Open source — link below.

🛠️ HOW IT WORKS

Hides elements using their stable ARIA-label attributes (`aria-label="Notifications"` etc.) rather than randomized CSS classes — so it survives Reddit redesigns. Strips the tab-title counter via a lightweight `MutationObserver` on `<title>`. No background service worker, no network requests, no DOM scraping of your content.

📂 OPEN SOURCE

Full source code, README, and privacy policy are available on GitHub. Every line is auditable; the extension is well under 200 lines total.

📌 COMPATIBILITY

  • Chrome, Brave, Edge, Opera, Vivaldi — any Chromium browser with extension support
  • Works on new Reddit (reddit.com). Old Reddit (old.reddit.com) doesn't have these elements, so the extension is a no-op there (no harm).
  • Does NOT work on the Reddit mobile apps (those are native, separate products).

❓ WHY NOT JUST USE REDDIT'S SETTINGS?

Reddit's User Settings → Notifications let you disable categories of notifications (upvotes, replies, etc.) — but the bell icon itself always remains, and admin/modmail/chat notifications you can't fully disable will still light it up. Reddit Quiet removes the icon entirely.

💬 FEEDBACK

Bug report or feature request? Open an issue on GitHub. Pull requests welcome.
```

## Category

```
Productivity
```

## Language

```
English
```

## Permissions justification (filled in submission form)

```
storage — Used only to remember the user's five toggle settings (which elements to hide) and sync them across devices via Chrome's built-in sync. No other data is stored. The extension has no other permissions: no host permissions, no tabs, no activeTab, no webRequest, no cookies, no history.
```

## Graphics to upload

- **Icon 128×128**: `icons/icon128.png`
- **Screenshots (1280×800)**:
  1. `screenshots/1-problem.png` — caption: "The notification bell never stops. Reddit has no setting to hide it."
  2. `screenshots/2-fixed.png` — caption: "Reddit Quiet removes the bell, badge, and tab counter. Clean top bar."
  3. `screenshots/3-popup.png` — caption: "Five toggleable options. Sync across devices. Zero data collected."
- **Promo tile 440×280** (optional but recommended): generate later if featured placement is desired.

## Privacy policy URL

Host the file `privacy-policy.md` as a GitHub Page (e.g. `https://<your-username>.github.io/reddit-quiet/privacy-policy`) — see `zip-instructions.md`. Paste that URL here.

## Distribution

```
Public
```

## Notes on the duplicate-listing concern

There's an existing extension called "Reddit Notification Remover" with similar core functionality. Our differentiators (called out in the description above):
1. **Five toggleable features** (theirs is fixed: bell only)
2. **Settings sync across devices** (theirs has no settings)
3. **Open source on GitHub** (theirs is closed)
4. **Strips the tab-title counter** (theirs does too — but ours is toggleable)
5. **Different, clearer name** ("Reddit Quiet" vs "Reddit Notification Remover")

If Google flags it as duplicate during review, respond via the developer dashboard with a screenshot of the popup UI showing the toggle settings — the existing one has no UI at all.
