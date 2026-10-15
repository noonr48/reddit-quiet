// Unit tests for the pure resolution helpers (node; no browser APIs needed —
// parseMpd falls back to its regex path here, the DOMParser path is covered
// by test/browser/mux-test.html).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseMpd, extractRedditVideo, sanitizeFilename } from "../src/resolve.mjs";

const mpd = readFileSync(new URL("./fixtures/playlist.mpd", import.meta.url), "utf8");
const MPD_URL = "https://v.redd.it/2bhlz6qjnfuh1/DASHPlaylist.mpd";

test("parseMpd picks the best video and audio renditions", () => {
  const r = parseMpd(mpd, MPD_URL);
  assert.equal(r.video.url, "https://v.redd.it/2bhlz6qjnfuh1/CMAF_720.mp4");
  assert.equal(r.video.height, 1280);
  assert.equal(r.audio.url, "https://v.redd.it/2bhlz6qjnfuh1/CMAF_AUDIO_128.mp4");
});

test("parseMpd returns audio null when no audio adaptation set", () => {
  const noAudio = mpd.replace(/<AdaptationSet contentType="audio"[\s\S]*?<\/AdaptationSet>/, "");
  const r = parseMpd(noAudio, MPD_URL);
  assert.ok(r.video, "video still present");
  assert.equal(r.audio, null);
});

const title = "My [Cool] Video: part 2";

test("extractRedditVideo: secure_media", () => {
  const post = { title, secure_media: { reddit_video: { dash_url: "d", fallback_url: "f", is_gif: false } } };
  const v = extractRedditVideo(post);
  assert.equal(v.dashUrl, "d");
  assert.equal(v.fallbackUrl, "f");
  assert.equal(v.isGif, false);
  assert.equal(v.title, title);
});

test("extractRedditVideo: media + gif flag", () => {
  const post = { title, media: { reddit_video: { dash_url: "d", is_gif: true } } };
  assert.equal(extractRedditVideo(post).isGif, true);
});

test("extractRedditVideo: crosspost parent", () => {
  const post = { title, crosspost_parent_list: [{ media: { reddit_video: { dash_url: "d2", fallback_url: "f2" } } }] };
  assert.equal(extractRedditVideo(post).dashUrl, "d2");
});

test("extractRedditVideo: none for text/external posts", () => {
  assert.equal(extractRedditVideo({ title, selftext: "hi" }), null);
  assert.equal(extractRedditVideo(null), null);
});

test("sanitizeFilename", () => {
  assert.equal(sanitizeFilename("a/b\c:d*e?f\"g<h>i|j"), "abcdefghij");
  assert.equal(sanitizeFilename("   "), "reddit-video");
  assert.ok(sanitizeFilename("x".repeat(200)).length <= 80);
  assert.equal(sanitizeFilename("trailing dots... "), "trailing dots");
});
