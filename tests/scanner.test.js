import test from "node:test";
import assert from "node:assert/strict";
import { sampleLine } from "../src/scanner.js";

// 4×4 素材：R = 欄號 × 10，G = 列號 × 10
const src = { width: 4, height: 4, data: new Uint8ClampedArray(64) };
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
  const i = (y * 4 + x) * 4;
  src.data[i] = x * 10; src.data[i + 1] = y * 10; src.data[i + 3] = 255;
}
const px = (d, i) => [...d.slice(i * 4, i * 4 + 4)];
const mid = (k) => (k + 0.5) / 4;

test("samples along a vertical slit", () => {
  const d = new Uint8ClampedArray(16);
  sampleLine(src, { a: { x: mid(1), y: mid(0) }, b: { x: mid(1), y: mid(3) } }, 4, d);
  assert.deepEqual([0, 1, 2, 3].map((i) => px(d, i)),
    [[10, 0, 0, 255], [10, 10, 0, 255], [10, 20, 0, 255], [10, 30, 0, 255]]);
});

test("reversed slit reverses the samples", () => {
  const d = new Uint8ClampedArray(16);
  sampleLine(src, { a: { x: mid(1), y: mid(3) }, b: { x: mid(1), y: mid(0) } }, 4, d);
  assert.deepEqual(px(d, 0), [10, 30, 0, 255]);
});

test("out-of-bounds samples are opaque black and never wrap rows", () => {
  const d = new Uint8ClampedArray(12).fill(99);
  sampleLine(src, { a: { x: -0.5, y: mid(2) }, b: { x: 1.5, y: mid(2) } }, 3, d);
  assert.deepEqual(px(d, 0), [0, 0, 0, 255]);
  assert.deepEqual(px(d, 1), [20, 20, 0, 255]);
  assert.deepEqual(px(d, 2), [0, 0, 0, 255]);
});

test("x exactly 1 is out of bounds", () => {
  const d = new Uint8ClampedArray(4);
  sampleLine(src, { a: { x: 1, y: mid(0) }, b: { x: 1, y: mid(0) } }, 1, d);
  assert.deepEqual(px(d, 0), [0, 0, 0, 255]);
});

test("zero-length slit repeats one pixel with no NaN", () => {
  const d = new Uint8ClampedArray(12);
  const p = { x: mid(2), y: mid(1) };
  sampleLine(src, { a: p, b: p }, 3, d);
  assert.deepEqual([0, 1, 2].map((i) => px(d, i)), Array(3).fill([20, 10, 0, 255]));
});
