// Wires the pipeline: tracker/pointer → interpreter → scanner → output → view.
// One sheet per image: pinch to scan, no undo, the sheet ends when it is full.
import { createTracker } from "./tracker.js";
import { createPointer } from "./pointer.js";
import { createInterpreter, createSmoother, smoothingToK } from "./interpreter.js";
import { sampleLine } from "./scanner.js";
import { createOutput, stampText } from "./output.js";
import { createTestSource, loadImageSource, loadUrlSource } from "./source.js";
import { createView } from "./view.js";
import { initUI } from "./ui.js";
import { PIECE } from "./piece.js";

const DIRECTION = "bt";   // the print leaves the slot downward, first strip = leading (bottom) edge
const LEAVE_MS = 950;     // a taken sheet slides off the page (style.css .sheet.leaving)
const SMOOTHING = smoothingToK(PIECE.smoothing);

export const state = {
  source: null,
  output: null,
  notice: "",        // tracking status shown under the instructions, "" when fine
  loading: null,     // tracker.load while the camera / hand model is coming up
  live: false,       // a strip was written this frame
  startedAt: null,   // performance.now() of the first strip on this sheet
  lastAt: 0,         // … and of the latest one
  done: false,       // the sheet is full and stamped
  stamp: "",         // set when the sheet is full, or when it is taken unfinished
  taking: false,     // being saved; scanning is held
  leaving: false,    // taken, sliding off the page
};

let strip = new Uint8ClampedArray(0);
let imageIndex = 0;

function resetOutput() {
  state.output = createOutput({ ...PIECE.paper, direction: DIRECTION });
  strip = new Uint8ClampedArray(state.output.stripLength * 4);
  Object.assign(state, { startedAt: null, lastAt: 0, done: false, stamp: "", taking: false, leaving: false });
}

/** The image can be swapped only before anything has been scanned. */
export const canChangeImage = () => Boolean(state.source && state.output.pos === 0 && !state.leaving);

/** Only a full, stamped sheet can be taken. */
export const canTake = () => Boolean(state.done && !state.taking && !state.leaving);

/** Swap in the viewer's own image. Throws if the file can't be read. */
export async function changeImage(file) {
  if (!file || !canChangeImage()) return;
  const src = await loadImageSource(file);
  if (canChangeImage()) setSource(src);   // still blank: nothing was scanned while it loaded
}

function setSource(src) {
  state.source = src;
  resetOutput();
}

/** The author's image at index i; the drawn test pattern if it can't be read. */
function loadImage(i) {
  const url = PIECE.images[i % PIECE.images.length];
  return loadUrlSource(url).catch((err) => {
    console.warn(`${url} unavailable, using the test pattern`, err);
    return createTestSource();
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function save(blob) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const name = `hand-slit-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Take the finished sheet: download it, let it slide away, start the next image. */
export async function takeSheet() {
  if (!canTake()) return;
  state.taking = true;
  try {
    save(await state.output.toSheetBlob(state.stamp));
  } catch (err) {
    console.warn("the sheet could not be saved", err);
    state.taking = false;
    return;   // the sheet stays; taking again retries
  }
  state.leaving = true;
  imageIndex = (imageIndex + 1) % PIECE.images.length;
  const [next] = await Promise.all([loadImage(imageIndex), wait(LEAVE_MS)]);
  setSource(next);
}

const tracker = createTracker();
const smoother = createSmoother();
const interpreter = createInterpreter();
window.handSlit = { state, tracker };   // for debugging in the console

function loadingNotice({ waitingCamera, phase, progress }) {
  if (waitingCamera) return "請允許瀏覽器使用鏡頭";
  if (phase === "init") return "啟動手部追蹤…";
  return progress == null ? "下載手部模型…" : `下載手部模型 ${Math.floor(progress * 100)}%`;
}

function trackingNotice() {
  if (tracker.status === "no-camera") return "沒有鏡頭，用滑鼠拖曳";
  if (tracker.status === "loading") return loadingNotice(tracker.load);
  if (tracker.status === "error") return "手部追蹤無法啟動，用滑鼠拖曳";
  if (tracker.status === "off") return "鏡頭已關閉，用滑鼠拖曳";
  return "";
}

new p5((p) => {
  let view;
  let pointer;
  p.setup = () => {
    p.createCanvas(1, 1).parent(document.getElementById("figSource"));
    loadImage(0).then(setSource);
    view = createView(p);
    pointer = createPointer(p.canvas, view.toSource);
    initUI(tracker);
    window.dispatchEvent(new Event("handslit:ready"));
  };

  p.draw = () => {
    state.notice = trackingNotice();
    state.loading = tracker.status === "loading" ? tracker.load : null;
    if (!state.source) return;   // the first image is still loading

    const hands = tracker.getHands();
    const { slit: target, engaged, pinched } = interpreter.update({ hands, pointerSlit: pointer.getSlit() });
    const slit = smoother.update(target, SMOOTHING);

    const out = state.output;
    const scanning = Boolean(engaged && slit && !out.full && !state.taking && !state.leaving);
    if (scanning) {
      sampleLine(state.source, slit, out.stripLength, strip);
      out.write(strip, PIECE.thickness);
      const now = performance.now();
      state.startedAt ??= now;
      state.lastAt = now;
      if (out.full) {
        state.done = true;
        state.stamp = stampText(new Date(), state.lastAt - state.startedAt);
      }
    }

    state.live = scanning;
    view.draw({ ...state, takeable: canTake(), slit, hands, tracker, pinched });
  };
});
