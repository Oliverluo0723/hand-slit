// Draws the stage with p5: source preview, slit, hand points and camera
// thumbnail. The output is a DOM "print" sliding out of a slot cut into the
// table (see style.css .tray). Also converts screen → source coords.
import { layoutStage, mapCameraToSource } from "./geometry.js";

const PAD = 24;        // stage padding
const MARGIN = 8;      // white border of the print, css px
const SLOT_H = 9;      // height of the slot opening
const SLOT_GAP = 14;   // room above the print for the slot
const SLOT_OVER = 16;  // slot reaches this far past each side of the paper
const RED = "#ff2828";
const IDLE = "#777";

/** DOM layer above the p5 canvas: slot + sheet. Pointer events pass through. */
function createTray(parent) {
  const tray = document.createElement("div");
  tray.className = "tray";
  tray.innerHTML = `
    <div class="slot-halo"></div>
    <div class="slot"><div class="inhole"></div></div>
    <div class="sheet">
      <div class="print"></div>
      <div class="grain"></div><div class="light"></div><div class="occl"></div>
    </div>`;
  parent.appendChild(tray);
  const q = (s) => tray.querySelector(s);
  const els = { halo: q(".slot-halo"), slot: q(".slot"), inhole: q(".inhole"), sheet: q(".sheet"), print: q(".print") };
  const px = (n) => `${Math.round(n)}px`;

  /** r: on-screen rect of the full image. The newest row sits at the slot. */
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

    if (els.print.firstChild !== output.canvas) els.print.replaceChildren(output.canvas);
    Object.assign(output.canvas.style, { left: px(MARGIN), bottom: px(MARGIN), width: px(r.w), height: px(r.h) });
  }

  return { update };
}

export function createView(p) {
  let last = null;     // last layout, for toSource
  const tray = createTray(p.canvas.parentElement);

  function layout(source, output) {
    const extra = SLOT_GAP + MARGIN * 2;   // slot + paper border above/below the image
    const inner = layoutStage(
      p.width - PAD * 2,
      p.height - PAD * 2 - extra,
      source.width / source.height,
      output.width / output.height,
    );
    inner.src.x += PAD;
    inner.src.y += PAD + extra / 2;
    inner.out.x += PAD;
    inner.out.y += PAD + SLOT_GAP + MARGIN;
    return inner;
  }

  function draw({ source, output, slit, hands, tracker, live, pinched }) {
    const L = (last = layout(source, output));
    const ctx = p.drawingContext;
    const toPx = (pt) => [L.src.x + pt.x * L.src.w, L.src.y + pt.y * L.src.h];

    p.clear();   // the table surface is the stage's CSS background

    // source preview
    ctx.drawImage(source.canvas, L.src.x, L.src.y, L.src.w, L.src.h);

    // output: print sliding out of the slot
    tray.update(L.out, output);

    // hand landmarks, clipped to the source preview
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.src.x, L.src.y, L.src.w, L.src.h);
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

  // camera thumbnail lives in the side panel so it never covers the previews
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
        g.arc((1 - k.x) * W, k.y * H, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  /** Window coords → source-normalized. null when outside the preview, unless unclamped. */
  function toSource(clientX, clientY, { unclamped = false } = {}) {
    if (!last) return null;
    const box = p.canvas.getBoundingClientRect();
    const x = (clientX - box.left - last.src.x) / last.src.w;
    const y = (clientY - box.top - last.src.y) / last.src.h;
    if (!unclamped && (x < 0 || x > 1 || y < 0 || y > 1)) return null;
    return { x, y };
  }

  return { layout: () => last, draw, toSource };
}
