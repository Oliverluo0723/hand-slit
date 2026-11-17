import test from "node:test";
import assert from "node:assert/strict";
import { slitFromHands, createSmoother, interpret } from "../src/interpreter.js";

const RAW = { mirror: false, gain: 1 };
const EPS = 1e-9;
const nearPt = (p, q) => assert.ok(Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS, `${JSON.stringify(p)} ≈ ${JSON.stringify(q)}`);
const nearSlit = (s, t) => { nearPt(s.a, t.a); nearPt(s.b, t.b); };
const hand = (handedness, thumb, index) => {
  const landmarks = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
  landmarks[4] = thumb; landmarks[8] = index;
  return { handedness, landmarks };
};

test("no hands gives no slit", () => {
  assert.equal(slitFromHands([], RAW), null);
});

test("one hand: thumb tip to index tip", () => {
  const s = slitFromHands([hand("Right", { x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 })], RAW);
  nearSlit(s, { a: { x: 0.1, y: 0.2 }, b: { x: 0.3, y: 0.4 } });
});

test("two hands: index tips, Left hand is always endpoint a", () => {
  const L = hand("Left", { x: 0, y: 0 }, { x: 0.2, y: 0.2 });
  const R = hand("Right", { x: 0, y: 0 }, { x: 0.8, y: 0.8 });
  const expected = { a: { x: 0.2, y: 0.2 }, b: { x: 0.8, y: 0.8 } };
  nearSlit(slitFromHands([L, R], RAW), expected);
  nearSlit(slitFromHands([R, L], RAW), expected);
});

test("smoother snaps on first target, eases after, resets on null", () => {
  const sm = createSmoother();
  const t0 = { a: { x: 0, y: 0 }, b: { x: 1, y: 1 } };
  const t1 = { a: { x: 1, y: 0 }, b: { x: 1, y: 1 } };
  assert.deepEqual(sm.update(t0, 0.5), t0);
  assert.equal(sm.update(t1, 0.5).a.x, 0.5);
  assert.equal(sm.update(null, 0.5), null);
  assert.deepEqual(sm.update(t1, 0.5), t1);          // 重新出現時不從舊位置滑過來
});

test("interpret prefers hands over pointer and returns no commands", () => {
  const pointerSlit = { a: { x: 0.9, y: 0.9 }, b: { x: 1, y: 1 } };
  const h = hand("Right", { x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 });
  nearPt(interpret({ hands: [h], pointerSlit }, RAW).slit.a, { x: 0.1, y: 0.2 });
  assert.deepEqual(interpret({ hands: [], pointerSlit }, RAW), { slit: pointerSlit, commands: [] });
  assert.equal(interpret({ hands: [], pointerSlit: null }, RAW).slit, null);
});
