// Full-resolution output buffer. The canvas is only created inside
// createOutput so this module can be imported by Node tests.

const vertical = (direction) => direction === "tb" || direction === "bt";

/** Rect the next strip occupies, given `pos` pixels already filled. */
export function stripRect(direction, width, height, pos, thickness) {
  const travel = vertical(direction) ? height : width;
  const t = Math.min(thickness, travel - pos);
  switch (direction) {
    case "lr": return { x: pos, y: 0, w: t, h: height };
    case "rl": return { x: width - pos - t, y: 0, w: t, h: height };
    case "tb": return { x: 0, y: pos, w: width, h: t };
    case "bt": return { x: 0, y: height - pos - t, w: width, h: t };
    default: throw new Error(`unknown direction: ${direction}`);
  }
}

export function createOutput({ width, height, direction }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  const isVertical = vertical(direction);

  const out = {
    canvas,
    width,
    height,
    direction,
    stripLength: isVertical ? width : height,
    travel: isVertical ? height : width,
    pos: 0,
    get full() {
      return out.pos >= out.travel;
    },
    write,
    clear,
    toBlob,
  };

  function write(strip, thickness) {
    if (out.full) return;
    const r = stripRect(direction, width, height, out.pos, thickness);
    const img = ctx.createImageData(r.w, r.h);
    const d = img.data;
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        const s = (isVertical ? x : y) * 4;
        const j = (y * r.w + x) * 4;
        d[j] = strip[s];
        d[j + 1] = strip[s + 1];
        d[j + 2] = strip[s + 2];
        d[j + 3] = 255;
      }
    }
    ctx.putImageData(img, r.x, r.y);
    out.pos += isVertical ? r.h : r.w;
  }

  function clear() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    out.pos = 0;
  }

  function toBlob(type) {
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("匯出失敗"))), type, 0.92),
    );
  }

  clear();
  return out;
}
