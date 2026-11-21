// Camera + MediaPipe Hand Landmarker.
// getHands() returns landmarks in camera-normalized coordinates, NOT mirrored.

const MP_VERSION = "0.10.14";
const MP_BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const STALE_MS = 300;

/** Drop hands when no detection has completed recently (stalled or lost camera). */
export function freshHands(hands, lastDetectAt, now, staleMs = STALE_MS) {
  return now - lastDetectAt > staleMs ? [] : hands;
}

/** Download fraction 0–1, or null when the size is unknown (or the body was compressed). */
export function downloadFraction(loaded, total) {
  if (!total || loaded > total) return null;
  return loaded / total;
}

/** Fetch a file whole, reporting progress as it streams in. */
async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(downloadFraction(loaded, total));
  }
  const buf = new Uint8Array(loaded);
  let at = 0;
  for (const c of chunks) {
    buf.set(c, at);
    at += c.length;
  }
  return buf;
}

export function createTracker() {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;

  let landmarker = null;
  let hands = [];
  let lastDetectAt = 0;
  let lastVideoTime = -1;
  let count = 0;
  let windowStart = performance.now();

  let run = 0;          // bumps on every start/stop so a stale start gives up
  let looping = false;
  let model = null;     // Promise of the landmarker; shared by every start, cleared if it fails

  /** What "loading" is waiting on, for the page to show. */
  const load = {
    waitingCamera: false,  // the browser is asking for camera permission
    phase: "download",     // download | init (the model is in, the tracker is starting up)
    progress: 0,           // model download 0–1, null when unknown
  };

  const tracker = {
    status: "loading",   // loading | ready | no-camera | error | off
    load,
    video,
    fps: 0,
    getHands: () => freshHands(hands, lastDetectAt, performance.now()),
    start,
    stop,
  };

  function releaseCamera() {
    const stream = video.srcObject;
    if (stream) for (const t of stream.getTracks()) t.stop();
    video.srcObject = null;
    hands = [];
  }

  /** Turn the camera off. The hand model stays loaded for the next start. */
  function stop() {
    run++;
    releaseCamera();
    tracker.status = "off";
  }

  /**
   * Download the model ourselves so its progress can be shown, warm the wasm
   * into the HTTP cache alongside it, then start the landmarker.
   */
  function loadModel() {
    model ??= (async () => {
      Object.assign(load, { phase: "download", progress: 0 });
      const bundle = import(MP_BUNDLE);
      const fileset = bundle.then(({ FilesetResolver }) => FilesetResolver.forVisionTasks(MP_WASM));
      const wasm = fileset
        .then((fs) => fs?.wasmBinaryPath && fetch(fs.wasmBinaryPath).then((r) => r.arrayBuffer()))
        .catch(() => {});   // only a head start; the loader fetches it again if this failed
      const buf = await fetchWithProgress(HAND_MODEL, (f) => (load.progress = f));
      load.progress = 1;
      await wasm;
      load.phase = "init";
      const { HandLandmarker } = await bundle;
      const fs = await fileset;
      const create = (delegate) =>
        HandLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetBuffer: buf, delegate },
          runningMode: "VIDEO",
          numHands: 2,
        });
      try {
        return await create("GPU");
      } catch (gpuErr) {
        console.warn("GPU delegate unavailable, falling back to CPU", gpuErr);
        return await create("CPU");
      }
    })();
    model.catch(() => (model = null));   // a later start tries again
    return model;
  }

  async function start() {
    const me = ++run;
    tracker.status = "loading";
    // the model downloads while the browser is still asking about the camera
    if (!landmarker) loadModel().catch(() => {});
    load.waitingCamera = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      if (me !== run) {
        for (const t of stream.getTracks()) t.stop();
        return;
      }
      video.srcObject = stream;
      await video.play();
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (me !== run) return;
        hands = [];
        tracker.status = "no-camera";
      });
    } catch (err) {
      if (me === run) tracker.status = "no-camera";
      return;
    } finally {
      if (me === run) load.waitingCamera = false;
    }

    if (!landmarker) {
      try {
        landmarker ??= await loadModel();
      } catch (err) {
        console.error("Hand tracking failed to start", err);
        if (me === run) tracker.status = "error";
        return;
      }
    }

    if (me !== run) return;   // stopped while the model was loading
    lastVideoTime = -1;
    tracker.status = "ready";
    if (!looping) {
      looping = true;
      requestAnimationFrame(loop);
    }
  }

  function loop() {
    if (tracker.status !== "ready") {
      looping = false;
      return;
    }
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      try {
        const res = landmarker.detectForVideo(video, performance.now());
        const labels = res.handedness ?? res.handednesses ?? [];
        hands = (res.landmarks ?? []).map((lm, i) => ({
          handedness: labels[i]?.[0]?.categoryName ?? "Right",
          landmarks: lm.map((p) => ({ x: p.x, y: p.y })),
        }));
        lastDetectAt = performance.now();
        count++;
      } catch (err) {
        console.warn("hand detection failed on a frame", err);
      }
    }
    const now = performance.now();
    if (now - windowStart >= 1000) {
      tracker.fps = Math.round((count * 1000) / (now - windowStart));
      count = 0;
      windowStart = now;
    }
    requestAnimationFrame(loop);
  }

  return tracker;
}
