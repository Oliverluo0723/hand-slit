// Draws plate 1 with p5 (source, hand points, slit) and lays out plate 2: the
// output is a DOM "print" sliding out of a slot cut into the page (see
// style.css .tray). Captions sit right under each image. Also converts
// screen → source coords.
import { fitPlate, mapCameraToSource } from "./geometry.js";

const BLEED = 28;      // canvas reaches past the image so slit ends stay visible
const MARGIN = 8;      // white border of the print, css px
const SLOT_H = 9;      // height of the slot opening
const SLOT_GAP = 14;   // room above the print for the slot
const SLOT_OVER = 16;  // slot reaches this far past each side of the paper
const CAP_GAP = 10;    // image → caption
const CAP_ROOM = 48;   // room reserved under each plate for its caption
const RED = "#ff2828";
const IDLE = "#777";
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
    <div class="sheet">
      <div class="print"></div>
      <div class="grain"></div><div class="light"></div><div class="occl"></div>
    </div>`;
  parent.prepend(tray);
  const q = (s) => tray.querySelector(s);
  const els = { halo: q(".slot-halo"), slot: q(".slot"), inhole: q(".inhole"), sheet: q(".sheet"), print: q(".print"), footprint: q(".footprint") };

  /** r: rect of the full image inside the plate. The newest row sits at the slot. */
  function update(r, output) {
    const sheetW = r.w + MARGIN * 2;
    const sheetTop = r.y - MARGIN;
    const slotTop = sheetTop - SLOT_H + 1;
    const shown = (output.pos / output.travel) * r.h;
    const sheetH = output.pos > 0 ? MARGIN + shown + (output.full ? MARGIN : 0) : 0;

    Object.assign(els.slot.style, { left: px(r.x - MARGIN - SLOT_OVER), top: px(slotTop), width: px(sheetW + SLOT_OVER * 2), height: px(SLOT_H) });
    Object.assign(els.halo.style, { left: px(r.x - MARGIN - SLOT_OVER - 14), top: px(slotTop - 10), width: px(sheetW + SLOT_OVER * 2 + 28), height: px(SLOT_H + 20) });
    Object.assign(els.inhole.style, { left: px(SLOT_OVER), width: px(sheetW), opacity: output.pos > 0 ? 1 : 0 });
    Object.assign(els.sheet.style, { left: px(r.x - MARGIN), top: px(sheetTop), width: px(sheetW), height: px(sheetH) });
    Object.assign(els.footprint.style, { left: px(r.x - MARGIN), top: px(sheetTop), width: px(sheetW), height: px(r.h + MARGIN * 2) });

    if (els.print.firstChild !== output.canvas) els.print.replaceChildren(output.canvas);
    Object.assign(output.canvas.style, { left: px(MARGIN), bottom: px(MARGIN), width: px(r.w), height: px(r.h) });
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
    const h = px(fit.h + extraH + CAP_ROOM);
    if (plate.style.height !== h) plate.style.height = h;
    return fit;
  }
  if (plate.style.height) plate.style.height = "";
  return fitPlate(W, plate.clientHeight - CAP_ROOM, aspect, extraW, extraH);
}

export function createView(p) {
  const srcPlate = document.getElementById("figSource");
  const outPlate = document.getElementById("figOutput");
  const srcCaption = srcPlate.querySelector("figcaption");
  const outCaption = outPlate.querySelector("figcaption");
  const tray = createTray(outPlate);
  let img = null;      // image rect inside the p5 canvas, for drawing and toSource

  function layout(source, output) {
    // plate 1: the canvas is the image plus a bleed on every side
    const s = fitInto(srcPlate, source.width / source.height, 0, 0, 0.42);
    const cw = Math.round(s.w + BLEED * 2);
    const ch = Math.round(s.h + BLEED * 2);
    if (p.width !== cw || p.height !== ch) {
      p.resizeCanvas(cw, ch);
      Object.assign(p.canvas.style, { left: px(-BLEED), top: px(-BLEED) });
    }
    img = { x: BLEED, y: BLEED, w: s.w, h: s.h };
    srcCaption.style.top = px(s.h + CAP_GAP);

    // plate 2, the subject: slot, then the print with its white border, centred
    const o = fitInto(outPlate, output.width / output.height, MARGIN * 2, SLOT_GAP + MARGIN * 2, 0.8);
    const ox = narrow.matches ? 0 : Math.max(0, (outPlate.clientWidth - o.w - MARGIN * 2) / 2);
    tray.update({ x: ox + MARGIN, y: SLOT_GAP + MARGIN, w: o.w, h: o.h }, output);
    Object.assign(outCaption.style, { top: px(SLOT_GAP + MARGIN * 2 + o.h + CAP_GAP), left: px(ox) });
  }

  function draw({ source, output, slit, hands, tracker, live, pinched }) {
    layout(source, output);
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
