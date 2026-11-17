// Turns tracked hands (or pointer input) into a slit: {a, b} in source
// coordinates, or null. Also the place where gesture commands will live.
import { mapCameraToSource } from "./geometry.js";

const THUMB_TIP = 4;
const INDEX_TIP = 8;

export function slitFromHands(hands, mapOpts) {
  if (hands.length === 0) return null;
  const map = (pt) => mapCameraToSource(pt, mapOpts);
  if (hands.length === 1) {
    const lm = hands[0].landmarks;
    return { a: map(lm[THUMB_TIP]), b: map(lm[INDEX_TIP]) };
  }
  // Order by on-screen position, not by MediaPipe's handedness label: labels
  // flicker and can coincide, which would swap the ends between frames.
  let p = map(hands[0].landmarks[INDEX_TIP]);
  let q = map(hands[1].landmarks[INDEX_TIP]);
  if (q.x < p.x) [p, q] = [q, p];
  return { a: p, b: q };
}

/** Slider "平滑" percent (0 = none) → per-frame lerp factor k. */
export function smoothingToK(percent) {
  return 1 - percent / 100;
}

export function createSmoother() {
  let cur = null;
  const copy = (s) => ({ a: { ...s.a }, b: { ...s.b } });
  return {
    update(target, k) {
      if (!target) {
        cur = null;
        return null;
      }
      if (!cur) {
        cur = copy(target);
      } else {
        for (const end of ["a", "b"]) {
          cur[end].x += (target[end].x - cur[end].x) * k;
          cur[end].y += (target[end].y - cur[end].y) * k;
        }
      }
      return copy(cur);
    },
  };
}

export function interpret({ hands, pointerSlit }, mapOpts) {
  const slit = hands.length > 0 ? slitFromHands(hands, mapOpts) : pointerSlit;
  return { slit, commands: [] };
}
