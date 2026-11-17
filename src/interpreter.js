// Turns tracked hands (or pointer input) into a slit: {a, b} in source
// coordinates, or null. Also the place where gesture commands will live.
import { mapCameraToSource } from "./geometry.js";

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;

const PINCH_ON = 0.35;   // ratio below this → pinched
const PINCH_OFF = 0.5;   // ratio above this → released (band in between keeps state)

const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const midpoint = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

/** Thumb–index gap relative to hand size, so it works at any distance from the camera. */
export function pinchRatio(lm) {
  const size = dist(lm[WRIST], lm[MIDDLE_MCP]);
  return size > 0 ? dist(lm[THUMB_TIP], lm[INDEX_TIP]) / size : Infinity;
}

/**
 * First two hands sorted by on-screen x of their pinch point (not by
 * MediaPipe's handedness label, which flickers). Returns [{point, hand}, …].
 */
function orderedHands(hands, map) {
  return hands
    .slice(0, 2)
    .map((hand) => ({ hand, point: map(midpoint(hand.landmarks[THUMB_TIP], hand.landmarks[INDEX_TIP])) }))
    .sort((u, v) => u.point.x - v.point.x);
}

function orderedPinchPoints(hands, map) {
  return orderedHands(hands, map).map((h) => h.point);
}

export function slitFromHands(hands, mapOpts) {
  if (hands.length === 0) return null;
  const map = (pt) => mapCameraToSource(pt, mapOpts);
  if (hands.length === 1) {
    const lm = hands[0].landmarks;
    return { a: map(lm[THUMB_TIP]), b: map(lm[INDEX_TIP]) };
  }
  const [p, q] = orderedPinchPoints(hands, map);
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

/**
 * Stateful: remembers each hand's pinch (hysteresis), keyed by screen side.
 * update() → {slit, engaged, pinched, commands}
 *   engaged: whether this frame should be recorded
 *   pinched: [aPinched, bPinched] in two-hand mode, otherwise null
 */
export function createInterpreter() {
  let held = [false, false];

  return {
    update({ hands, pointerSlit }, mapOpts) {
      const map = (pt) => mapCameraToSource(pt, mapOpts);
      if (hands.length < 2) held = [false, false];

      if (hands.length >= 2) {
        const ordered = orderedHands(hands, map);
        held = ordered.map(({ hand }, i) => {
          const r = pinchRatio(hand.landmarks);
          return held[i] ? r <= PINCH_OFF : r < PINCH_ON;
        });
        return {
          slit: { a: ordered[0].point, b: ordered[1].point },
          engaged: held[0] && held[1],
          pinched: [...held],
          commands: [],
        };
      }
      if (hands.length === 1) {
        return { slit: slitFromHands(hands, mapOpts), engaged: true, pinched: null, commands: [] };
      }
      return { slit: pointerSlit, engaged: pointerSlit !== null, pinched: null, commands: [] };
    },
  };
}
