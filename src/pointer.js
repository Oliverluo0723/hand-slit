// Mouse / touch → slit. One pointer: anchor at press point, other end follows.
// Two pointers (touch): each end follows one finger.

/** Mouse: only the main button. Touch / pen: any contact. */
export function isPrimaryPress(e) {
  return e.pointerType !== "mouse" || e.button === 0;
}

/** A mouse move with no button held means we missed the pointerup (e.g. context menu). */
export function isReleasedMove(e) {
  return e.pointerType === "mouse" && e.buttons === 0;
}

export function createPointer(el, toSource) {
  el.style.touchAction = "none";
  /** pointerId → {start: Point, cur: Point}, in press order */
  const active = new Map();

  el.addEventListener("pointerdown", (e) => {
    if (active.size >= 2 || !isPrimaryPress(e)) return;
    const pt = toSource(e.clientX, e.clientY);
    if (!pt) return;
    el.setPointerCapture(e.pointerId);
    active.set(e.pointerId, { start: pt, cur: pt });
  });

  el.addEventListener("pointermove", (e) => {
    const rec = active.get(e.pointerId);
    if (!rec) return;
    if (isReleasedMove(e)) {
      active.delete(e.pointerId);
      return;
    }
    rec.cur = toSource(e.clientX, e.clientY, { unclamped: true }) ?? rec.cur;
  });

  const release = (e) => active.delete(e.pointerId);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);

  return {
    getSlit() {
      const recs = [...active.values()];
      if (recs.length === 0) return null;
      if (recs.length === 1) return { a: recs[0].start, b: recs[0].cur };
      return { a: recs[0].cur, b: recs[1].cur };
    },
  };
}
