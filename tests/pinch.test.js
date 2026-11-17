import test from "node:test";
import assert from "node:assert/strict";
import { pinchRatio, slitFromHands, createInterpreter } from "../src/interpreter.js";

const RAW = { mirror: false, gain: 1 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

// A hand whose size (wrist 0 → middle MCP 9) is 0.2, centred at x, with a given pinch ratio.
function hand(x, ratio, label = "Right") {
  const lm = Array.from({ length: 21 }, () => ({ x, y: 0.5 }));
  lm[0] = { x, y: 0.7 };
  lm[9] = { x, y: 0.5 };
  const gap = ratio * 0.2;
  lm[4] = { x: x - gap / 2, y: 0.3 };
  lm[8] = { x: x + gap / 2, y: 0.3 };
  return { handedness: label, landmarks: lm };
}

test("pinchRatio is fingertip gap over hand size", () => {
  near(pinchRatio(hand(0.5, 0.25).landmarks), 0.25);
  near(pinchRatio(hand(0.5, 0.8).landmarks), 0.8);
});

test("two hands: endpoints are the pinch midpoints, ordered left to right", () => {
  const s = slitFromHands([hand(0.7, 0.2), hand(0.3, 0.2)], RAW);
  near(s.a.x, 0.3); near(s.a.y, 0.3);
  near(s.b.x, 0.7); near(s.b.y, 0.3);
});

test("two hands record only while both are pinched", () => {
  const it = createInterpreter();
  const r1 = it.update({ hands: [hand(0.3, 0.2), hand(0.7, 0.8)], pointerSlit: null }, RAW);
  assert.equal(r1.engaged, false);
  assert.deepEqual(r1.pinched, [true, false]);
  assert.ok(r1.slit);                       // line still shown while not recording
  const r2 = it.update({ hands: [hand(0.3, 0.2), hand(0.7, 0.2)], pointerSlit: null }, RAW);
  assert.equal(r2.engaged, true);
});

test("pinch uses hysteresis: on below 0.35, off only above 0.5", () => {
  const it = createInterpreter();
  const step = (ratio) => it.update({ hands: [hand(0.3, ratio), hand(0.7, 0.1)], pointerSlit: null }, RAW).pinched[0];
  assert.equal(step(0.42), false);   // not yet pinched
  assert.equal(step(0.3), true);     // pinch
  assert.equal(step(0.42), true);    // still held inside the band
  assert.equal(step(0.55), false);   // released
  assert.equal(step(0.42), false);   // stays released inside the band
});

test("pinch state follows the hand's screen side even if array order changes", () => {
  const it = createInterpreter();
  it.update({ hands: [hand(0.3, 0.2), hand(0.7, 0.42)], pointerSlit: null }, RAW);   // left pinched, right not
  const r = it.update({ hands: [hand(0.7, 0.42), hand(0.3, 0.42)], pointerSlit: null }, RAW);
  assert.deepEqual(r.pinched, [true, false]);
});

test("losing a hand resets pinch state", () => {
  const it = createInterpreter();
  it.update({ hands: [hand(0.3, 0.2), hand(0.7, 0.2)], pointerSlit: null }, RAW);
  it.update({ hands: [hand(0.3, 0.2)], pointerSlit: null }, RAW);
  const r = it.update({ hands: [hand(0.3, 0.42), hand(0.7, 0.42)], pointerSlit: null }, RAW);
  assert.equal(r.engaged, false);
});

test("one hand shows the slit but never records; pointer records while pressed; nothing → no slit", () => {
  const it = createInterpreter();
  for (const h of [hand(0.5, 0.9), hand(0.5, 0.2)]) {   // open and pinched
    const one = it.update({ hands: [h], pointerSlit: null }, RAW);
    assert.ok(one.slit);
    assert.equal(one.engaged, false);
    assert.deepEqual(one.pinched, [false, false]);
  }
  const ptr = { a: { x: 0, y: 0 }, b: { x: 1, y: 1 } };
  assert.deepEqual(it.update({ hands: [], pointerSlit: ptr }, RAW), { slit: ptr, engaged: true, pinched: null, commands: [] });
  assert.deepEqual(it.update({ hands: [], pointerSlit: null }, RAW), { slit: null, engaged: false, pinched: null, commands: [] });
});
