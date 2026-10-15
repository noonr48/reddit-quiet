// === Reddit Quiet — download.js ===
// The floating "⬇ Video" pill on reddit.com (only). Hover a video post in
// the feed (or open one) -> the pill appears -> click it: the post own JSON
// is fetched same-origin right here in the page context, handed to the
// service worker, which fetches the v.redd.it streams and remuxes them in
// an offscreen document. Progress/status shows as a toast.
(() => {
  "use strict";
  if (window.__rqDownloadLoaded) return;
  window.__rqDownloadLoaded = true;

  const DEFAULTS = { videoDownload: true };
  let enabled = true;
  chrome.storage.sync.get(DEFAULTS, (s) => {
    enabled = s.videoDownload !== false;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.videoDownload) return;
    enabled = !!changes.videoDownload.newValue;
    if (!enabled) hidePill();
  });

  // ---------- pill ----------
  const PILL_ID = "rq-dl-pill";
  let pill = null;
  let hideTimer = null;
  let targetPost = null;

  function ensurePill() {
    if (pill) return pill;
    pill = document.createElement("button");
    pill.id = PILL_ID;
    pill.type = "button";
    pill.textContent = "\u2b07 Video";
    pill.title = "Download this video (Reddit Quiet)";
    Object.assign(pill.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483646",
      padding: "10px 16px",
      border: "none",
      borderRadius: "999px",
      background: "rgba(30,30,30,0.85)",
      color: "#fff",
      font: "600 13px system-ui, sans-serif",
      cursor: "pointer",
      boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
      display: "none",
    });
    pill.addEventListener("mouseenter", showPill);
    pill.addEventListener("mouseleave", scheduleHide);
    pill.addEventListener("click", onClick);
    document.documentElement.appendChild(pill);
    return pill;
  }

  function showPill() {
    if (!enabled) return;
    clearTimeout(hideTimer);
    ensurePill().style.display = "block";
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hidePill, 450);
  }

  function hidePill() {
    clearTimeout(hideTimer);
    if (pill) pill.style.display = "none";
    targetPost = null;
  }

  // ---------- video detection (post-local walk incl. shadow roots) ----------
  const videoPosts = new WeakSet();

  function deepHasVideo(root) {
    if (!root) return false;
    const tag = String(root.tagName || "");
    if (tag === "VIDEO") return true;
    if (tag.startsWith("SHREDDIT-") && /VIDEO|PLAYER/.test(tag)) return true;
    if (root.shadowRoot && deepHasVideo(root.shadowRoot)) return true;
    if (root.querySelectorAll) {
      if (root.querySelectorAll("video").length > 0) return true;
      for (const el of root.querySelectorAll("*")) {
        if (el.shadowRoot && deepHasVideo(el.shadowRoot)) return true;
      }
    }
    return false;
  }

  function hasVideo(post) {
    if (videoPosts.has(post)) return true;
    let found = false;
    try {
      found = deepHasVideo(post);
    } catch (e) { /* walk issue — treat as no video */ }
    if (found) videoPosts.add(post);
    return found;
  }

  document.addEventListener(
    "mouseover",
    (e) => {
      if (!enabled) return;
      const t = e.target;
      if (!t || t.id === PILL_ID) return;
      const card = t.closest ? t.closest("shreddit-post") : null;
      if (card && hasVideo(card)) {
        targetPost = card;
        showPill();
        scheduleHide();
      } else if (!card) {
        scheduleHide();
      }
    },
    { passive: true }
  );

  // Clear stale targets on SPA navigation
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      hidePill();
    }
  }, 500);

  // ---------- which post / permalink ----------
  function permalinkFor(card) {
    const attrs = ["content-href", "permalink", "href"];
    for (const a of attrs) {
      const v = card.getAttribute && card.getAttribute(a);
      if (v) {
        try {
          const u = new URL(v, location.origin);
          if (u.pathname.includes("/comments/")) return u.pathname.replace(/\/+$/, "");
        } catch (err) { /* ignore bad attr */ }
      }
    }
    const link = card.querySelector ? card.querySelector("a[href*=\"/comments/\"]") : null;
    if (link) {
      try {
        const u = new URL(link.getAttribute("href"), location.origin);
        return u.pathname.replace(/\/+$/, "");
      } catch (err) { /* ignore */ }
    }
    if (location.pathname.includes("/comments/")) {
      return location.pathname.replace(/\/+$/, "");
    }
    return null;
  }

  // ---------- toast + status ----------
  let toastEl = null;
  let toastTimer = null;

  function toast(text, isError, autohideMs) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      Object.assign(toastEl.style, {
        position: "fixed",
        left: "50%",
        bottom: "24px",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        padding: "10px 18px",
        borderRadius: "999px",
        background: "rgba(20,20,20,0.9)",
        color: "#fff",
        font: "500 13px system-ui, sans-serif",
        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        maxWidth: "70vw",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none",
      });
      document.documentElement.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.style.color = isError ? "#ff8a8a" : "#fff";
    toastEl.style.display = "block";
    clearTimeout(toastTimer);
    if (autohideMs) toastTimer = setTimeout(() => { toastEl.style.display = "none"; }, autohideMs);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== "rq-dl-status") return;
    if (msg.error) {
      toast(String(msg.error), true, 6000);
    } else if (msg.label === "done") {
      toast("\u2713 saved Reddit/" + (msg.filename || ""), false, 6000);
    } else if (msg.label) {
      toast(msg.label + (Number.isFinite(msg.pct) ? " " + Math.round(msg.pct) + "%" : ""), false, 0);
    }
  });

  // ---------- click -> resolve -> start ----------
  async function onClick() {
    const card = targetPost;
    if (!card) return;
    const path = permalinkFor(card);
    if (!path) {
      toast("could not find the post link", true, 5000);
      return;
    }
    toast("resolving\u2026", false, 0);
    try {
      const res = await fetch(path + ".json?raw_json=1&limit=1", { credentials: "same-origin" });
      if (!res.ok) throw new Error("post JSON " + res.status);
      const data = await res.json();
      const post =
        data && data[0] && data[0].data && data[0].data.children &&
        data[0].data.children[0] && data[0].data.children[0].data;
      if (!post) throw new Error("unexpected post JSON");
      const reply = await chrome.runtime.sendMessage({ type: "rq-dl-start", postData: post });
      if (!reply || !reply.ok) throw new Error((reply && reply.error) || "download failed to start");
      toast("downloading\u2026", false, 0);
    } catch (err) {
      toast(String((err && err.message) || err), true, 6000);
    }
  }
})();
