import test from "node:test";
import assert from "node:assert/strict";
import { stripRect } from "../src/output.js";

test("stripRect for each direction", () => {
  assert.deepEqual(stripRect("lr", 100, 50, 10, 4), { x: 10, y: 0, w: 4, h: 50 });
  assert.deepEqual(stripRect("rl", 100, 50, 10, 4), { x: 86, y: 0, w: 4, h: 50 });
  assert.deepEqual(stripRect("tb", 100, 50, 10, 4), { x: 0, y: 10, w: 100, h: 4 });
  assert.deepEqual(stripRect("bt", 100, 50, 10, 4), { x: 0, y: 36, w: 100, h: 4 });
});

test("stripRect clips the last strip to the remaining travel", () => {
  assert.deepEqual(stripRect("lr", 100, 50, 98, 4), { x: 98, y: 0, w: 2, h: 50 });
  assert.deepEqual(stripRect("rl", 100, 50, 98, 4), { x: 0, y: 0, w: 2, h: 50 });
  assert.deepEqual(stripRect("bt", 100, 50, 49, 4), { x: 0, y: 0, w: 100, h: 1 });
});
