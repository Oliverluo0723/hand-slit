// Pure coordinate helpers. Points passed between modules are {x, y} in
// normalized source coordinates: top-left (0,0), bottom-right (1,1).

/** Camera-normalized point → source-normalized point. Not clamped. */
export function mapCameraToSource(pt, { mirror = true, gain = 1.4 } = {}) {
  const x = mirror ? 1 - pt.x : pt.x;
  return {
    x: (x - 0.5) * gain + 0.5,
    y: (pt.y - 0.5) * gain + 0.5,
  };
}

/** Shrink (never grow) so the long side is at most `max`. */
export function fitWithin(w, h, max) {
  const s = Math.min(1, max / Math.max(w, h));
  return {
    width: Math.max(1, Math.round(w * s)),
    height: Math.max(1, Math.round(h * s)),
  };
}

/** Largest rect of the given aspect (w/h) centred inside a box. */
export function containRect(boxW, boxH, aspect) {
  let w = boxW;
  let h = w / aspect;
  if (h > boxH) {
    h = boxH;
    w = h * aspect;
  }
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

/** Source preview in the left column, output preview in the right column. */
export function layoutStage(stageW, stageH, srcAspect, outAspect, gap = 16) {
  const colW = Math.max(0, (stageW - gap) / 2);
  const src = containRect(colW, stageH, srcAspect);
  const out = containRect(colW, stageH, outAspect);
  out.x += colW + gap;
  return { src, out };
}
