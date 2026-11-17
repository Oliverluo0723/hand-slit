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

  const tracker = {
    status: "loading",
    video,
    fps: 0,
    getHands: () => freshHands(hands, lastDetectAt, performance.now()),
    start,
  };

  async function start() {
    try {
      video.srcObject = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      await video.play();
      video.srcObject.getVideoTracks()[0]?.addEventListener("ended", () => {
        hands = [];
        tracker.status = "no-camera";
      });
    } catch (err) {
      tracker.status = "no-camera";
      return;
    }

    try {
      const { FilesetResolver, HandLandmarker } = await import(MP_BUNDLE);
      const fileset = await FilesetResolver.forVisionTasks(MP_WASM);
      const create = (delegate) =>
        HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate },
          runningMode: "VIDEO",
          numHands: 2,
        });
      try {
        landmarker = await create("GPU");
      } catch (gpuErr) {
        console.warn("GPU delegate unavailable, falling back to CPU", gpuErr);
        landmarker = await create("CPU");
      }
    } catch (err) {
      console.error("Hand tracking failed to start", err);
      tracker.status = "error";
      return;
    }

    tracker.status = "ready";
    requestAnimationFrame(loop);
  }

  function loop() {
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
