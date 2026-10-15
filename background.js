// === Reddit Quiet — background.js (service worker, module) ===
// Orchestrates the video download: receives the post JSON from the content
// script (fetched same-origin inside the page), resolves the v.redd.it
// streams, runs the offscreen muxer and saves the result via
// chrome.downloads. One job at a time.
import { extractRedditVideo, sanitizeFilename } from "./src/resolve.mjs";

const OFFSCREEN_URL = "offscreen/mux.html";
let active = null; // { tabId, filename, downloadId }

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["BLOBS"],
    justification: "Combine Reddit video and audio streams into one MP4",
  });
}

async function closeOffscreen() {
  try {
    await chrome.offscreen.closeDocument();
  } catch (e) { /* already closed */ }
}

async function statusToTab(payload) {
  if (!active || !active.tabId) return;
  try {
    await chrome.tabs.sendMessage(active.tabId, payload);
  } catch (e) { /* tab closed mid-download */ }
}

async function handleStart(msg, sender) {
  if (active) return { ok: false, error: "A download is already in progress" };
  const video = extractRedditVideo(msg.postData);
  if (!video) return { ok: false, error: "No Reddit-hosted video on this post" };
  if (!video.dashUrl && !video.fallbackUrl) return { ok: false, error: "No video stream URL found" };
  const filename = sanitizeFilename(video.title) + ".mp4";
  active = { tabId: sender && sender.tab ? sender.tab.id : null, filename };
  await ensureOffscreen();
  const resp = await chrome.runtime.sendMessage({
    type: "rq-dl-job",
    job: { dashUrl: video.dashUrl, fallbackUrl: video.fallbackUrl, isGif: video.isGif, filename },
  });
  if (!resp || !resp.ok) {
    const busy = resp && resp.error === "busy";
    if (!busy) {
      active = null;
      await closeOffscreen();
    }
    return { ok: false, error: busy ? "A download is already in progress" : "Muxer did not start" };
  }
  return { ok: true };
}

async function handleComplete(msg) {
  if (!active) {
    await closeOffscreen();
    return;
  }
  try {
    const downloadId = await chrome.downloads.download({
      url: msg.blobUrl,
      filename: "Reddit/" + msg.filename,
      conflictAction: "uniquify",
      saveAs: false,
    });
    active.downloadId = downloadId;
    statusToTab({ type: "rq-dl-status", pct: 98, label: "saving" });
  } catch (e) {
    statusToTab({ type: "rq-dl-status", error: "Could not save file: " + e.message });
    active = null;
    await closeOffscreen();
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  switch (msg.type) {
    case "rq-dl-start":
      handleStart(msg, sender)
        .then((r) => sendResponse(r))
        .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
      return true; // async response
    case "rq-dl-progress":
      statusToTab({ type: "rq-dl-status", pct: msg.pct, label: msg.label });
      return;
    case "rq-dl-complete":
      handleComplete(msg).catch(() => {});
      return;
    case "rq-dl-error":
      statusToTab({ type: "rq-dl-status", error: msg.error });
      active = null;
      closeOffscreen();
      return;
  }
});

chrome.downloads.onChanged.addListener(async (delta) => {
  if (!active || delta.id !== active.downloadId) return;
  const state = delta.state && delta.state.current;
  if (state === "complete") {
    statusToTab({ type: "rq-dl-status", pct: 100, label: "done", filename: active.filename });
    active = null;
    await closeOffscreen();
  } else if (state === "interrupted") {
    statusToTab({ type: "rq-dl-status", error: "Download interrupted" });
    active = null;
    await closeOffscreen();
  }
});
