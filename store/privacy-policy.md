# Privacy Policy — Reddit Quiet

**Last updated: July 21, 2026**

Reddit Quiet ("the extension") does not collect, transmit, store, or share any personal data. This policy explains exactly what the extension does and does not touch.

## What data we collect

**None.**

- No personal information
- No browsing history
- No Reddit account information or credentials
- No Reddit content (posts, comments, messages)
- No analytics or telemetry
- No advertising identifiers
- No IP address

## The one permission the extension requests

**`storage`** — Chrome's built-in settings-sync API. Used exclusively to remember your five toggle preferences (which Reddit elements to hide) and sync those preferences across devices signed in to the same Chrome profile.

The data stored is:

```json
{
  "hideBell": true,
  "hideTabCounter": true,
  "hideChat": false,
  "hideInbox": false,
  "hideCreatePost": false
}
```

That's it. Five booleans. No content, no identifiers, no URLs.

## Where the data is stored

In Chrome's local browser profile and (if you're signed in to Chrome) in your Google account's Chrome Sync storage, governed by [Google's Chrome Privacy Policy](https://support.google.com/chrome/answer/9280952). The extension author has no access to this data at any point.

## What the extension does on reddit.com pages

A small content script runs on `*.reddit.com` pages and does three things:

1. Adds CSS classes to the page's `<html>` element based on your toggle settings (e.g. `<html class="rq-hide-bell">`)
2. A matching CSS file uses those classes to hide selected elements (the notification bell, etc.) via `display: none`
3. A `MutationObserver` watches `document.title` and strips the `(5)` unread count if you've enabled the "Tab title counter" toggle

**The extension does not read, modify, transmit, or store any Reddit page content.** It only toggles the visibility of specific UI elements (the bell, the badge, the chat icon, etc.) and adjusts the tab title.

## No third parties

The extension does not communicate with any third-party service. There is no backend, no API, no analytics provider, no advertising network, no CDN. All code runs locally in your browser.

## No remote code

The extension contains no remotely-hosted JavaScript. Everything that runs is in the package you install — auditable in the GitHub source.

## Children's privacy

The extension does not knowingly collect any data from anyone, including children under 13. It is not directed at children.

## Changes to this policy

If the extension ever adds functionality that touches user data, this policy will be updated and the version date above will change. The extension's source code on GitHub is the source of truth.

## Contact

Open an issue on the GitHub repository (link from the Chrome Web Store listing, or in the extension's popup) to ask any question about this policy.

## Source code

The complete, auditable source is available on GitHub. The extension is small enough to read end-to-end in a single sitting — content script, popup, and CSS together total around 500 lines including comments and blank lines.
