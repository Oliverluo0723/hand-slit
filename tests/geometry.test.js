import test from "node:test";
import assert from "node:assert/strict";
import { mapCameraToSource, fitWithin, containRect, layoutStage } from "../src/geometry.js";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test("mapCameraToSource mirrors and applies gain around centre", () => {
  const c = mapCameraToSource({ x: 0.5, y: 0.5 });
  near(c.x, 0.5); near(c.y, 0.5);
  const p = mapCameraToSource({ x: 0.25, y: 0.5 });      // 鏡像後在右邊
  near(p.x, 0.85);
  const q = mapCameraToSource({ x: 0.25, y: 0.25 }, { mirror: false, gain: 1 });
  near(q.x, 0.25); near(q.y, 0.25);
});

test("mapCameraToSource does not clamp", () => {
  assert.ok(mapCameraToSource({ x: 0, y: 0 }).x > 1);
});

test("fitWithin only shrinks", () => {
  assert.deepEqual(fitWithin(8000, 6000, 4096), { width: 4096, height: 3072 });
  assert.deepEqual(fitWithin(800, 600, 4096), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(10000, 1, 4096), { width: 4096, height: 1 });
});

test("containRect centres and preserves aspect", () => {
  assert.deepEqual(containRect(200, 100, 1), { x: 50, y: 0, w: 100, h: 100 });
  assert.deepEqual(containRect(100, 200, 1), { x: 0, y: 50, w: 100, h: 100 });
});

test("layoutStage puts source left and output right without overlap", () => {
  const { src, out } = layoutStage(1016, 500, 1, 1790 / 2560);
  assert.ok(src.x + src.w <= 500);
  assert.ok(out.x >= 516);
  near(out.w / out.h, 1790 / 2560);
});
