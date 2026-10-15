// === Reddit Quiet — src/resolve.mjs ===
// Pure helpers for the video-download feature. No chrome.* APIs — loadable
// from the offscreen document, the service worker and node tests.

// Extract the reddit-hosted video info from a post object
// ([0].data.children[0].data of a <permalink>.json response). Handles
// crossposts (the video lives on the parent post) and preview-only embeds.
export function extractRedditVideo(postData) {
  if (!postData || typeof postData !== "object") return null;
  const candidates = [
    postData.secure_media && postData.secure_media.reddit_video,
    postData.media && postData.media.reddit_video,
    postData.preview && postData.preview.reddit_video,
  ];
  const xpost = Array.isArray(postData.crosspost_parent_list) && postData.crosspost_parent_list[0];
  if (xpost) {
    candidates.push(xpost.secure_media && xpost.secure_media.reddit_video);
    candidates.push(xpost.media && xpost.media.reddit_video);
    candidates.push(xpost.preview && xpost.preview.reddit_video);
  }
  const rv = candidates.find((v) => v && (v.dash_url || v.fallback_url));
  if (!rv) return null;
  return {
    dashUrl: rv.dash_url || null,
    fallbackUrl: rv.fallback_url || null,
    hlsUrl: rv.hls_url || null,
    isGif: !!rv.is_gif,
    duration: rv.duration || null,
    title: postData.title || "reddit-video",
  };
}

// Parse a v.redd.it DASHPlaylist.mpd and pick the best video + audio
// renditions. MPD BaseURLs are relative to the MPD URL itself. Uses
// DOMParser when available (offscreen document / harness) and falls back to
// a regex parse (service worker context, node tests).
export function parseMpd(mpdText, mpdUrl) {
  const base = mpdUrl.replace(/\/[^\/]*$/, "/");
  const reps = [];

  let parsed = null;
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(mpdText, "text/xml");
      if (doc && !doc.querySelector("parsererror")) parsed = doc;
    } catch (e) { /* fall through to regex */ }
  }

  if (parsed) {
    for (const rep of parsed.querySelectorAll("Representation")) {
      const baseURL = rep.querySelector("BaseURL");
      const url = baseURL ? baseURL.textContent.trim() : null;
      if (!url) continue;
      const adapt = rep.closest("AdaptationSet");
      const type = adapt ? adapt.getAttribute("contentType") || "" : "";
      reps.push({
        url: new URL(url, base).href,
        type,
        height: parseInt(rep.getAttribute("height") || "0", 10),
        bandwidth: parseInt(rep.getAttribute("bandwidth") || "0", 10),
      });
    }
  }

  if (reps.length === 0) {
    // Tempered pattern: the match may not cross another Representation tag, so a
// Representation without its own BaseURL cannot steal the next one.
const re = /<Representation\b([^>]*)>(?:(?!<\/?Representation)[\s\S])*?<BaseURL>([^<]+)<\/BaseURL>/g;
    let m;
    while ((m = re.exec(mpdText)) !== null) {
      const attrs = m[1];
      const url = m[2].trim();
      const get = (name) => {
        const a = attrs.match(new RegExp(name + "=\"([^\"]*)\""));
        return a ? a[1] : "";
      };
      const before = mpdText.slice(0, m.index);
      const lastAdapt = before.lastIndexOf("<AdaptationSet");
      const adaptAttrs = lastAdapt === -1 ? "" : mpdText.slice(lastAdapt, lastAdapt + 480);
      const type = /contentType="audio"/.test(adaptAttrs)
        ? "audio"
        : /contentType="video"/.test(adaptAttrs)
          ? "video"
          : "";
      reps.push({
        url: new URL(url, base).href,
        type,
        height: parseInt(get("height") || "0", 10),
        bandwidth: parseInt(get("bandwidth") || "0", 10),
      });
    }
  }

  const videos = reps.filter((r) => r.type === "video").sort((a, b) => b.height - a.height);
  const audios = reps.filter((r) => r.type === "audio").sort((a, b) => b.bandwidth - a.bandwidth);
  return { video: videos[0] || null, audio: audios[0] || null };
}

// Make a safe filename body from a post title.
export function sanitizeFilename(title) {
  const s = String(title || "reddit-video")
    .replace(/[\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .replace(/[. ]+$/, "");
  return s || "reddit-video";
}
