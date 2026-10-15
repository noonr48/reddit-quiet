// === Reddit Quiet — offscreen/mux.js ===
// Runs inside the chrome.offscreen document: owns the v.redd.it fetches,
// the remux and the blob hand-off to the service worker (which calls
// chrome.downloads). Stays alive until the SW closes the document.
import { parseMpd } from "../src/resolve.mjs";
import { remuxVideoAudio } from "../src/remux-core.mjs";

const MAX_INPUT_BYTES = 1.5 * 1024 * 1024 * 1024;
let busy = false;

const send = (msg) => chrome.runtime.sendMessage(msg).catch(() => {});
const progress = (pct, label) => send({ type: "rq-dl-progress", pct, label });

async function fetchWithProgress(url, fromPct, toPct, label) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch " + res.status + " (" + label + ")");
  const total = parseInt(res.headers.get("Content-Length") || "0", 10);
  if (!res.body) return await res.blob();
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total > 0) {
      progress(fromPct + (toPct - fromPct) * Math.min(1, received / total), label + " " + Math.round((100 * received) / total) + "%");
    }
  }
  const out = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return new Blob([out]);
}

async function runJob(job) {
  // 1. Resolve renditions from the DASH manifest — the authoritative source
  //    (the legacy DASH_*.mp4 URLs now 403; current naming is CMAF_*.mp4).
  let videoUrl = null;
  let audioUrl = null;
  if (job.dashUrl) {
    try {
      const res = await fetch(job.dashUrl);
      if (res.ok) {
        const picked = parseMpd(await res.text(), job.dashUrl);
        if (picked.video) videoUrl = picked.video.url;
        if (picked.audio && !job.isGif) audioUrl = picked.audio.url;
      }
    } catch (e) { /* fall through to fallback_url */ }
  }
  if (!videoUrl && job.fallbackUrl) videoUrl = job.fallbackUrl;
  if (!videoUrl) throw new Error("no playable video rendition found");
  if (job.isGif) audioUrl = null;

  // 2. Fetch the streams (video dominates the budget).
  const videoBlob = await fetchWithProgress(videoUrl, 0, 55, "video");
  let audioBlob = null;
  if (audioUrl) {
    try {
      audioBlob = await fetchWithProgress(audioUrl, 55, 70, "audio");
    } catch (e) {
      audioBlob = null; // some posts have no real audio track
    }
  }
  if (videoBlob.size + (audioBlob ? audioBlob.size : 0) > MAX_INPUT_BYTES) {
    throw new Error("video too large (>1.5 GB)");
  }

  // 3. Remux — or pass the video straight through when there is no audio.
  let blob = videoBlob;
  if (audioBlob) {
    progress(72, "muxing");
    blob = await remuxVideoAudio(videoBlob, audioBlob, (p) => progress(72 + 23 * p, "muxing"));
  }

  // 4. Hand off to the service worker for chrome.downloads.
  const url = URL.createObjectURL(blob);
  send({
    type: "rq-dl-complete",
    blobUrl: url,
    filename: job.filename,
    bytes: blob.size,
    hasAudio: !!audioBlob,
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "rq-dl-job") return;
  if (busy) {
    sendResponse({ ok: false, error: "busy" });
    return;
  }
  busy = true;
  runJob(msg.job)
    .catch((err) => send({ type: "rq-dl-error", error: String((err && err.message) || err) }))
    .finally(() => {
      busy = false;
    });
  sendResponse({ ok: true });
});
