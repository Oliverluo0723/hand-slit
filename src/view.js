// Draws the stage with p5: source preview, output preview, slit, hand points,
// write position and camera thumbnail. Also converts screen → source coords.
import { layoutStage, mapCameraToSource } from "./geometry.js";

const PAD = 24;        // stage padding
const BED = 10;        // dark frame around the output preview
const BG = "#e9e7e2";
const RED = "#ff2828";

export function createView(p) {
  let last = null;     // last layout, for toSource

  function layout(source, output) {
    const inner = layoutStage(
      p.width - PAD * 2,
      p.height - PAD * 2,
      source.width / source.height,
      output.width / output.height,
    );
    for (const r of [inner.src, inner.out]) { r.x += PAD; r.y += PAD; }
    // keep the bed frame inside the output column
    const o = inner.out;
    const s = Math.min(1, (o.w - BED * 2) / o.w, (o.h - BED * 2) / o.h);
    inner.out = { x: o.x + (o.w - o.w * s) / 2, y: o.y + (o.h - o.h * s) / 2, w: o.w * s, h: o.h * s };
    return inner;
  }

  function writeLine(output, r) {
    const { direction: dir, pos, width, height } = output;
    if (dir === "lr" || dir === "rl") {
      const x = r.x + ((dir === "lr" ? pos : width - pos) / width) * r.w;
      return [x, r.y, x, r.y + r.h];
    }
    const y = r.y + ((dir === "tb" ? pos : height - pos) / height) * r.h;
    return [r.x, y, r.x + r.w, y];
  }

  function draw({ source, output, slit, hands, tracker }) {
    const L = (last = layout(source, output));
    const ctx = p.drawingContext;
    const toPx = (pt) => [L.src.x + pt.x * L.src.w, L.src.y + pt.y * L.src.h];

    p.background(BG);

    // source preview
    ctx.drawImage(source.canvas, L.src.x, L.src.y, L.src.w, L.src.h);

    // output preview inside a dark bed
    p.noStroke();
    p.fill("#1a1a1a");
    p.rect(L.out.x - BED, L.out.y - BED, L.out.w + BED * 2, L.out.h + BED * 2, 18);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(output.canvas, L.out.x, L.out.y, L.out.w, L.out.h);
    if (!output.full) {
      p.stroke(RED);
      p.strokeWeight(1);
      p.line(...writeLine(output, L.out));
    }

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

    // slit
    if (slit) {
      const [ax, ay] = toPx(slit.a);
      const [bx, by] = toPx(slit.b);
      p.stroke(255);
      p.strokeWeight(4);
      p.line(ax, ay, bx, by);
      p.stroke(RED);
      p.strokeWeight(2);
      p.line(ax, ay, bx, by);
      p.noStroke();
      p.fill(RED);
      p.circle(ax, ay, 10);
      p.fill(255);
      p.stroke(RED);
      p.circle(bx, by, 10);
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
