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
  let [h1, h2] = hands;
  if (h1.handedness !== "Left" && h2.handedness === "Left") [h1, h2] = [h2, h1];
  return { a: map(h1.landmarks[INDEX_TIP]), b: map(h2.landmarks[INDEX_TIP]) };
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
