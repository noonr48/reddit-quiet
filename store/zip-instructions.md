# Upload Instructions — Reddit Quiet → Chrome Web Store

Time: ~10 minutes (plus 1–3 business days for Google's review).

## Before you start

You need:

1. A Google account (any — doesn't have to be your main one)
2. $5 (one-time, lifetime fee, non-refundable, unlimited extensions on that account)
3. The files in this folder

## Step 1 — Register as a developer (one-time)

1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Pay the $5 registration fee
4. Accept the developer agreement

You only do this once. Future extensions on the same account skip this step.

## Step 2 — Build the upload zip

The zip is already built for you at:

```
/home/<user>/Desktop/reddit-quiet/reddit-quiet-v1.1.0.zip
```

If you've changed files since I built it, rebuild:

```bash
cd /home/<user>/Desktop/reddit-quiet
rm -f reddit-quiet-v1.1.0.zip
zip -r reddit-quiet-v1.1.0.zip manifest.json content.css content.js popup/ icons/
# Do NOT include: store/, screenshots/, README.md, LICENSE, .git/, .gitignore
```

The zip must contain the files at the root, NOT a parent folder.

## Step 3 — Create the listing

1. In the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), click **"New Item"**
2. Upload `reddit-quiet-v1.1.0.zip`
3. Fill in the listing fields using `store/listing.md` (copy-paste each section)

## Step 4 — Host the privacy policy

Google requires a publicly-accessible privacy policy URL. Three options:

**Option A — GitHub Pages (free, recommended)**

1. Create a new public GitHub repo named `reddit-quiet`
2. Push the contents of this folder to it (Steps 6–8 below cover this)
3. In the repo, go to **Settings → Pages**
4. Source: **Deploy from a branch**, Branch: `main`, Folder: `/store`
5. Wait ~1 min for the URL to activate
6. Your privacy policy URL becomes: `https://<your-username>.github.io/reddit-quiet/privacy-policy`

**Option B — gist** (quicker, less polished)

1. Create a public GitHub gist containing `store/privacy-policy.md`
2. Use the raw URL (e.g. `https://gist.github.com/.../raw/privacy-policy.md`)

**Option C — your own website**

Upload `privacy-policy.md` somewhere on a domain you own.

## Step 5 — Upload screenshots

In the "Screenshots" section of the listing, upload these three from `screenshots/`:

1. `1-problem.png` — caption: "The notification bell never stops. Reddit has no setting to hide it."
2. `2-fixed.png` — caption: "Reddit Quiet removes the bell, badge, and tab counter. Clean top bar."
3. `3-popup.png` — caption: "Five toggleable options. Sync across devices. Zero data collected."

Add a brief description of the extension to the screenshots (under 100 chars each).

## Step 6 — Submit for review

- Distribution: **Public**
- Visibility: **Public** (or "Unlisted" if you just want a direct install link to share)
- Click **"Submit for Review"**

## Step 7 — Wait

- Initial review: typically **1–3 business days**
- Our extension has minimal permissions (`storage` only) and tiny code — should be on the fast end
- You'll get an email when approved (or if rejected, with the reason)

## Step 8 — After approval

- Test that the install from the Web Store actually works (don't just trust the dev load)
- Share the listing URL
- Optional: enable the "Promo tile" (440×280) for featured placement

## Common rejection reasons we should dodge

| Risk | Why we're fine |
|---|---|
| "Too many permissions" | We only request `storage` |
| "Privacy policy not found" | We host it on GitHub Pages |
| "Deceptive functionality" | Listing matches what it actually does |
| "Duplicate" | We have 5 toggleable features vs the existing one's zero — popup UI screenshot is our proof |
| "Code readability" | Code is hand-written, no minification |

If Google flags as duplicate, reply in the developer dashboard with: *"Our extension includes a popup UI with 5 toggleable features (Notifications bell, Tab title counter, Chat, Inbox, Create Post) plus cross-device settings sync via chrome.storage.sync. The similar extension [hhfbdablfninhimbgcchodfocfnmpame] has no UI and no settings — it is hardcoded to one behavior. Attached screenshot shows our popup."* — attach `screenshots/3-popup.png`.

## Updating later

To push an update (e.g. after Reddit redesigns and changes the aria-label):

1. Bump `version` in `manifest.json` (e.g. `1.1.0` → `1.1.1`)
2. Rebuild the zip
3. In the Developer Dashboard, go to the item → "Package" tab → upload new zip
4. Submit for review (updates are usually faster, 1–2 days)
