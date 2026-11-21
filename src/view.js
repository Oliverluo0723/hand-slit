// Draws plate 1 with p5 (source, hand points, slit) and lays out plate 2: the
// output is a DOM "print" sliding out of a slot cut into the page (see
// style.css .tray). Also converts screen → source coords.
import { fitPlate, mapCameraToSource } from "./geometry.js";
import { SHEET } from "./output.js";

const BLEED = 28;      // canvas reaches past the image so slit ends stay visible
const SLOT_H = 9;      // height of the slot opening
const SLOT_GAP = 14;   // room above the print for the slot
const SLOT_OVER = 16;  // slot reaches this far past each side of the paper
const RED = "#ff2828";
const IDLE = "#777";
const SIDE_SHARE = 0.5;  // the source aims for about half the left column's height
const SIDE_MIN = 200;    // left column width bounds, css px …
const SIDE_MAX = 0.34;   // … and share of the window width
const narrow = window.matchMedia("(max-width: 760px)");
const px = (n) => `${Math.round(n)}px`;

/** DOM layer inside plate 2: slot + sheet. Pointer events pass through. */
function createTray(parent) {
  const tray = document.createElement("div");
  tray.className = "tray";
  tray.innerHTML = `
    <div class="footprint"></div>
    <div class="slot-halo"></div>
    <div class="slot"><div class="inhole"></div></div>
    <div class="sheet" aria-label="帶走這張紙">
      <div class="print"></div>
      <div class="stamp"></div>
      <div class="grain"></div><div class="light"></div><div class="occl"></div>
    </div>`;
  parent.prepend(tray);
  const q = (s) => tray.querySelector(s);
  const els = { halo: q(".slot-halo"), slot: q(".slot"), inhole: q(".inhole"), sheet: q(".sheet"), print: q(".print"), stamp: q(".stamp"), footprint: q(".footprint") };

  /**
   * r: rect of the full image inside the plate; m, foot: the sheet's border and
   * foot in css px. The newest row sits at the slot; the foot leads out.
   */
  function update(r, m, foot, output, { stamp, done, leaving }) {
    const sheetW = r.w + m * 2;
    const sheetTop = r.y - m;
    const slotTop = sheetTop - SLOT_H + 1;
    const shown = (output.pos / output.travel) * r.h;
    const sheetH = output.pos > 0 ? foot + shown + (output.full ? m : 0) : 0;

    Object.assign(els.slot.style, { left: px(r.x - m - SLOT_OVER), top: px(slotTop), width: px(sheetW + SLOT_OVER * 2), height: px(SLOT_H) });
    Object.assign(els.halo.style, { left: px(r.x - m - SLOT_OVER - 14), top: px(slotTop - 10), width: px(sheetW + SLOT_OVER * 2 + 28), height: px(SLOT_H + 20) });
    Object.assign(els.inhole.style, { left: px(SLOT_OVER), width: px(sheetW), opacity: output.pos > 0 && !leaving ? 1 : 0 });
    Object.assign(els.sheet.style, { left: px(r.x - m), top: px(sheetTop), width: px(sheetW), height: px(sheetH) });
    Object.assign(els.footprint.style, { left: px(r.x - m), top: px(sheetTop), width: px(sheetW), height: px(r.h + m + foot) });

    if (els.print.firstChild !== output.canvas) els.print.replaceChildren(output.canvas);
    Object.assign(output.canvas.style, { left: px(m), bottom: px(foot), width: px(r.w), height: px(r.h) });

    // the stamp is printed into the foot once the sheet is full
    Object.assign(els.stamp.style, { left: px(m), height: px(foot), lineHeight: px(foot), fontSize: `${(r.w * SHEET.type).toFixed(1)}px` });
    const text = done ? stamp : "";
    if (els.stamp.textContent !== text) els.stamp.textContent = text;

    const takeable = done && !leaving;
    els.sheet.classList.toggle("done", takeable);
    els.sheet.classList.toggle("leaving", leaving);
    if (takeable !== (els.sheet.getAttribute("role") === "button")) {
      if (takeable) {
        els.sheet.setAttribute("role", "button");
        els.sheet.tabIndex = 0;
      } else {
        els.sheet.removeAttribute("role");
        els.sheet.removeAttribute("tabindex");
      }
    }
  }

  return { update };
}

/**
 * Fit an image of `aspect` into a plate. On wide screens the grid gives the
 * plate its size; on narrow screens the plate takes its height from the image.
 */
function fitInto(plate, aspect, extraW, extraH, narrowShare) {
  const W = plate.clientWidth;
  if (narrow.matches) {
    const fit = fitPlate(W, Math.max(200, window.innerHeight * narrowShare), aspect, extraW, extraH);
    const h = px(fit.h + extraH);
    if (plate.style.height !== h) plate.style.height = h;
    return fit;
  }
  if (plate.style.height) plate.style.height = "";
  return fitPlate(W, plate.clientHeight, aspect, extraW, extraH);
}

export function createView(p) {
  const srcPlate = document.getElementById("figSource");
  const outPlate = document.getElementById("figOutput");
  const tray = createTray(outPlate);
  let img = null;      // image rect inside the p5 canvas, for drawing and toSource

  /** Left column width follows the source's shape: landscape sources get a wider column. */
  function sizeSide(aspect) {
    const page = srcPlate.closest(".page");
    let cols = "";
    if (!narrow.matches) {
      const rowH = srcPlate.parentElement.clientHeight;
      const w = Math.min(window.innerWidth * SIDE_MAX, Math.max(SIDE_MIN, rowH * SIDE_SHARE * aspect));
      cols = `${Math.round(w)}px 1fr`;
    }
    if (page.style.gridTemplateColumns !== cols) page.style.gridTemplateColumns = cols;
  }

  function layout(source, output, sheetState) {
    sizeSide(source.width / source.height);
    // plate 1: the canvas is the image plus a bleed on every side
    const s = fitInto(srcPlate, source.width / source.height, 0, 0, 0.42);
    const cw = Math.round(s.w + BLEED * 2);
    const ch = Math.round(s.h + BLEED * 2);
    if (p.width !== cw || p.height !== ch) {
      p.resizeCanvas(cw, ch);
      Object.assign(p.canvas.style, { left: px(-BLEED), top: px(-BLEED) });
    }
    img = { x: BLEED, y: BLEED, w: s.w, h: s.h };

    // plate 2, the subject: slot, then the whole sheet (border, image, foot), centred.
    // Border and foot are shares of the image width, so fit the sheet's own shape.
    const a = output.width / output.height;
    const sheetAspect = (1 + 2 * SHEET.margin) / (1 / a + SHEET.margin + SHEET.foot);
    const fit = fitInto(outPlate, sheetAspect, 0, SLOT_GAP, 0.8);
    const w = fit.w / (1 + 2 * SHEET.margin);
    const m = w * SHEET.margin;
    const ox = narrow.matches ? 0 : Math.max(0, (outPlate.clientWidth - fit.w) / 2);
    tray.update({ x: ox + m, y: SLOT_GAP + m, w, h: w / a }, m, w * SHEET.foot, output, sheetState);
  }

  function draw({ source, output, slit, hands, tracker, live, pinched, stamp, done, leaving }) {
    layout(source, output, { stamp, done, leaving });
    const ctx = p.drawingContext;
    const toPx = (pt) => [img.x + pt.x * img.w, img.y + pt.y * img.h];

    p.clear();
    ctx.drawImage(source.canvas, img.x, img.y, img.w, img.h);

    // hand landmarks, clipped to the image
    ctx.save();
    ctx.beginPath();
    ctx.rect(img.x, img.y, img.w, img.h);
    ctx.clip();
    p.noStroke();
    p.fill(255, 255, 255, 200);
    for (const h of hands) {
      for (const k of h.landmarks) p.circle(...toPx(mapCameraToSource(k)), 5);
    }
    ctx.restore();

    // slit: solid red while recording, dashed grey otherwise
    if (slit) {
      const [ax, ay] = toPx(slit.a);
      const [bx, by] = toPx(slit.b);
      const color = live ? RED : IDLE;
      ctx.save();
      if (!live) ctx.setLineDash([8, 6]);
      p.stroke(255);
      p.strokeWeight(4);
      p.line(ax, ay, bx, by);
      p.stroke(color);
      p.strokeWeight(2);
      p.line(ax, ay, bx, by);
      ctx.restore();
      // ends: filled = pinched (two-hand mode); otherwise a filled, b hollow
      const filled = pinched ?? [true, false];
      for (const [[x, y], on] of [[[ax, ay], filled[0]], [[bx, by], filled[1]]]) {
        p.stroke(color);
        p.strokeWeight(2);
        p.fill(on ? color : 255);
        p.circle(x, y, 12);
      }
    }

    drawThumb(tracker, hands);
  }

  // a small camera view at the foot of the left column
  function drawThumb(tracker, hands) {
    const el = document.getElementById("camThumb");
    if (!el) return;
    el.hidden = tracker.status !== "ready";
    if (el.hidden) return;
    const g = el.getContext("2d");
    const W = el.width;
    const H = el.height;
    g.save();
    g.translate(W, 0);
    g.scale(-1, 1);
    g.drawImage(tracker.video, 0, 0, W, H);
    g.restore();
    g.fillStyle = RED;
    for (const h of hands) {
      for (const k of h.landmarks) {
        g.beginPath();
        g.arc((1 - k.x) * W, k.y * H, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  /** Window coords → source-normalized. null when outside the image, unless unclamped. */
  function toSource(clientX, clientY, { unclamped = false } = {}) {
    if (!img) return null;
    const box = p.canvas.getBoundingClientRect();
    const x = (clientX - box.left - img.x) / img.w;
    const y = (clientY - box.top - img.y) / img.h;
    if (!unclamped && (x < 0 || x > 1 || y < 0 || y > 1)) return null;
    return { x, y };
  }

  return { draw, toSource };
}
