import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration, sheetLayout, stampText, stripRect } from "../src/output.js";

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

test("formatDuration: seconds, minutes, hours; never zero", () => {
  assert.equal(formatDuration(48_000), "48 秒");
  assert.equal(formatDuration(72_000), "1 分 12 秒");
  assert.equal(formatDuration(120_000), "2 分");
  assert.equal(formatDuration(3_723_000), "1 小時 2 分 3 秒");
  assert.equal(formatDuration(200), "1 秒");
});

test("stampText: the day, a full-width space, how long", () => {
  assert.equal(stampText(new Date(2026, 10, 21, 15, 4), 72_000), "2026.11.21　1 分 12 秒");
  assert.equal(stampText(new Date(2027, 0, 3), 9_400), "2027.01.03　9 秒");
});

test("sheetLayout: border and foot scale with the image width", () => {
  assert.deepEqual(sheetLayout(1790), { margin: 54, foot: 179, type: 50 });
  const half = sheetLayout(895);
  assert.ok(Math.abs(half.foot * 2 - 179) <= 1);
});
