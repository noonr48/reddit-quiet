// === Reddit Quiet — src/remux-core.mjs ===
// Sample-copy remux of Reddit's separate CMAF video/audio renditions into
// one MP4, using mediabunny (MPL-2.0, vendored in vendor/). No transcoding —
// streams are copied 1:1, so it is fast and lossless. Pure module: no
// chrome.* APIs (used by the offscreen document and the browser harness).
import {
  ALL_FORMATS,
  BlobSource,
  Input,
  Output,
  Mp4OutputFormat,
  BufferTarget,
  Conversion,
} from "../vendor/mediabunny.min.mjs";

export async function remuxVideoAudio(videoBlob, audioBlob, onProgress) {
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  const videoIn = new Input({ source: new BlobSource(videoBlob), formats: ALL_FORMATS });
  const convV = await Conversion.init({
    input: videoIn,
    output,
    audio: { discard: true },
    composable: true,
  });

  let convA = null;
  if (audioBlob) {
    const audioIn = new Input({ source: new BlobSource(audioBlob), formats: ALL_FORMATS });
    convA = await Conversion.init({
      input: audioIn,
      output,
      video: { discard: true },
      composable: true,
    });
  }

  if (!convV.isValid || (convA && !convA.isValid)) {
    const reasons = [...convV.discardedTracks, ...(convA ? convA.discardedTracks : [])]
      .map((t) => String((t && t.reason) || t))
      .join(", ");
    throw new Error("Remux not possible (" + reasons + ")");
  }

  if (onProgress && convV.onProgress !== undefined) convV.onProgress = (p) => onProgress(p);

  await output.start();

  if (!convA) {
    await convV.execute();
  } else {
    // Lockstep stepping (mediabunny-documented pattern) keeps packet
    // buffering low while both tracks feed one output.
    for (let until = 1; ; until += 1) {
      await Promise.all([convV.execute({ until }), convA.execute({ until })]);
      if (convV.state === "done" && convA.state === "done") break;
      if (until > 36000) throw new Error("Remux ran away");
    }
  }

  await output.finalize();
  const buf = output.target.buffer;
  if (!buf) throw new Error("Remux produced no output");
  return new Blob([buf], { type: "video/mp4" });
}
