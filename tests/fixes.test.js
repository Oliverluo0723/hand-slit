import test from "node:test";
import assert from "node:assert/strict";
import { freshHands } from "../src/tracker.js";
import { isPrimaryPress, isReleasedMove } from "../src/pointer.js";
import { slitFromHands, smoothingToK } from "../src/interpreter.js";

// I1
test("hands older than 300 ms are dropped", () => {
  const hands = [{ handedness: "Left", landmarks: [] }];
  assert.equal(freshHands(hands, 1000, 1200), hands);
  assert.deepEqual(freshHands(hands, 1000, 1301), []);
});

// I3
test("only the primary mouse button starts a slit", () => {
  assert.equal(isPrimaryPress({ pointerType: "mouse", button: 0 }), true);
  assert.equal(isPrimaryPress({ pointerType: "mouse", button: 2 }), false);
  assert.equal(isPrimaryPress({ pointerType: "touch", button: 0 }), true);
});

test("a mouse move with no buttons held ends the slit", () => {
  assert.equal(isReleasedMove({ pointerType: "mouse", buttons: 0 }), true);
  assert.equal(isReleasedMove({ pointerType: "mouse", buttons: 1 }), false);
  assert.equal(isReleasedMove({ pointerType: "touch", buttons: 0 }), false);
});

// I4
test("two hands: endpoint a is the hand further left on screen, whatever the labels", () => {
  const RAW = { mirror: false, gain: 1 };
  const hand = (handedness, ix) => {
    const landmarks = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
    landmarks[8] = { x: ix, y: 0.5 };
    return { handedness, landmarks };
  };
  const s1 = slitFromHands([hand("Right", 0.8), hand("Right", 0.2)], RAW);
  const s2 = slitFromHands([hand("Left", 0.8), hand("Right", 0.2)], RAW);
  assert.ok(s1.a.x < s1.b.x);
  assert.ok(s2.a.x < s2.b.x);
});

// I5
test("smoothing percent is strength: 0 = follow instantly, more = slower", () => {
  assert.equal(smoothingToK(0), 1);
  assert.ok(smoothingToK(65) < smoothingToK(30));
  assert.ok(Math.abs(smoothingToK(65) - 0.35) < 1e-9);
  assert.ok(smoothingToK(95) > 0);
});
