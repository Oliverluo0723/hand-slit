// Wires the pipeline: tracker/pointer → interpreter → scanner → output → view.
import { createTracker } from "./tracker.js";
import { createPointer } from "./pointer.js";
import { interpret, createSmoother } from "./interpreter.js";
import { sampleLine } from "./scanner.js";
import { createOutput } from "./output.js";
import { createTestSource } from "./source.js";
import { createView } from "./view.js";
import { initUI } from "./ui.js";

const PORTRAIT = { width: 1790, height: 2560 };
const LANDSCAPE = { width: 2560, height: 1790 };

export const state = {
  recording: true,
  thickness: 4,
  smoothing: 0.35,
  direction: "lr",
  portrait: true,
  source: null,
  output: null,
  message: "",
};

let strip = new Uint8ClampedArray(0);

export function resetOutput() {
  const size = state.portrait ? PORTRAIT : LANDSCAPE;
  state.output = createOutput({ ...size, direction: state.direction });
  strip = new Uint8ClampedArray(state.output.stripLength * 4);
}

export function setSource(src) {
  state.source = src;
  resetOutput();
}

const tracker = createTracker();
const smoother = createSmoother();
window.handSlit = { state, tracker };   // for debugging in the console

function statusMessage(slit) {
  if (state.output.full) return "成品已滿";
  if (tracker.status === "no-camera") return "沒有鏡頭，可用滑鼠拉線";
  if (tracker.status === "loading") return "載入手部模型中…";
  if (tracker.status === "error") return "手部追蹤無法啟動，可用滑鼠拉線";
  if (!state.recording) return "已暫停";
  return slit ? "掃描中" : "等待掃描線";
}

new p5((p) => {
  let view;
  let pointer;
  const stage = document.getElementById("stage");

  p.setup = () => {
    p.createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
    setSource(createTestSource());
    view = createView(p);
    pointer = createPointer(p.canvas, view.toSource);
    initUI();
    tracker.start();
    window.dispatchEvent(new Event("handslit:ready"));
  };

  p.windowResized = () => p.resizeCanvas(stage.clientWidth, stage.clientHeight);

  p.draw = () => {
    const hands = tracker.getHands();
    const { slit: target } = interpret({ hands, pointerSlit: pointer.getSlit() });
    const slit = smoother.update(target, state.smoothing);

    if (state.recording && slit && !state.output.full) {
      sampleLine(state.source, slit, state.output.stripLength, strip);
      state.output.write(strip, state.thickness);
    }

    state.message = statusMessage(slit);
    view.draw({ source: state.source, output: state.output, slit, hands, tracker, recording: state.recording });
  };
});
