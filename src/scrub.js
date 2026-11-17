// A number you drag sideways to change, like a slider with no track.
// scrubValue is pure so Node tests can import this module.

/** Value after dragging `dx` css px from `start`. */
export function scrubValue(start, dx, { min, max, pxPerStep }) {
  const v = Math.round(start + dx / pxPerStep);
  return Math.min(max, Math.max(min, v));
}

/**
 * Turn `el` into a draggable number. Arrow keys step by 1 (Shift: 5).
 * `format(v)` gives the text; `onChange(v)` fires on every change.
 */
export function makeScrub(el, { min, max, value, pxPerStep = 4, format = String, onChange }) {
  let v = value;
  let drag = null;

  const set = (next) => {
    next = Math.min(max, Math.max(min, next));
    el.textContent = format(next);
    el.setAttribute("aria-valuenow", String(next));
    el.setAttribute("aria-valuetext", format(next));
    if (next === v) return;
    v = next;
    onChange(v);
  };

  el.setAttribute("aria-valuemin", String(min));
  el.setAttribute("aria-valuemax", String(max));
  el.textContent = format(v);
  el.setAttribute("aria-valuenow", String(v));
  el.setAttribute("aria-valuetext", format(v));

  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    el.focus();
    el.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, start: v };
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    set(scrubValue(drag.start, e.clientX - drag.x, { min, max, pxPerStep }));
  });
  const end = (e) => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  el.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") set(v + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(v - step);
    else return;
    e.preventDefault();
  });
}
