// Wires the pipeline: tracker/pointer → interpreter → scanner → output → view.
// One sheet per image: pinch to scan, no undo, the sheet ends when it is full.
import { createTracker } from "./tracker.js";
import { createPointer } from "./pointer.js";
import { createInterpreter, createSmoother, smoothingToK } from "./interpreter.js";
import { sampleLine } from "./scanner.js";
import { createOutput, stampText } from "./output.js";
import { createTestSource, loadUrlSource } from "./source.js";
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
  live: false,       // a strip was written this frame
  startedAt: null,   // performance.now() of the first strip on this sheet
  lastAt: 0,         // … and of the latest one
  done: false,       // the sheet is full and stamped; it can be taken
  stamp: "",
  leaving: false,    // taken, sliding off the page
};

let strip = new Uint8ClampedArray(0);
let imageIndex = 0;
let taking = false;

function resetOutput() {
  state.output = createOutput({ ...PIECE.paper, direction: DIRECTION });
  strip = new Uint8ClampedArray(state.output.stripLength * 4);
  Object.assign(state, { startedAt: null, lastAt: 0, done: false, stamp: "", leaving: false });
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
  if (!state.done || taking) return;
  taking = true;
  try {
    save(await state.output.toSheetBlob(state.stamp));
  } catch (err) {
    console.warn("the sheet could not be saved", err);
    taking = false;
    return;   // the sheet stays; clicking again retries
  }
  state.leaving = true;
  imageIndex = (imageIndex + 1) % PIECE.images.length;
  const [next] = await Promise.all([loadImage(imageIndex), wait(LEAVE_MS)]);
  setSource(next);
  taking = false;
}

const tracker = createTracker();
const smoother = createSmoother();
const interpreter = createInterpreter();
window.handSlit = { state, tracker };   // for debugging in the console

function trackingNotice() {
  if (tracker.status === "no-camera") return "沒有鏡頭，用滑鼠拖曳";
  if (tracker.status === "loading") return "載入手部模型中…";
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
    if (!state.source) return;   // the first image is still loading

    const hands = tracker.getHands();
    const { slit: target, engaged, pinched } = interpreter.update({ hands, pointerSlit: pointer.getSlit() });
    const slit = smoother.update(target, SMOOTHING);

    const out = state.output;
    const scanning = Boolean(engaged && slit && !out.full);
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
    view.draw({ ...state, slit, hands, tracker, pinched });
  };
});
