// Full-resolution output buffer. The canvas is only created inside
// createOutput so this module can be imported by Node tests.

const vertical = (direction) => direction === "tb" || direction === "bt";

/**
 * The finished sheet: a white border around the image and a wider foot at the
 * bottom that carries the stamp. Sizes are shares of the image width, so the
 * page and the exported file have the same proportions.
 */
export const SHEET = { margin: 0.03, foot: 0.1, type: 0.028 };
export const STAMP_INK = "#77726b";
export const STAMP_FONT = '"Noto Sans TC", "PingFang TC", "Heiti TC", "Microsoft JhengHei", sans-serif';

/** Border and foot in pixels for an image `width` pixels wide. */
export function sheetLayout(width) {
  return {
    margin: Math.round(width * SHEET.margin),
    foot: Math.round(width * SHEET.foot),
    type: Math.round(width * SHEET.type),
  };
}

/** 72 000 ms → "1 分 12 秒". Never less than one second. */
export function formatDuration(ms) {
  const total = Math.max(1, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h) parts.push(`${h} 小時`);
  if (m) parts.push(`${m} 分`);
  if (s || parts.length === 0) parts.push(`${s} 秒`);
  return parts.join(" ");
}

/** "2026.11.21　1 分 12 秒": the day the sheet was finished and how long it took. */
export function stampText(date, ms) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}　${formatDuration(ms)}`;
}

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
    toSheetBlob,
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

  /** The whole sheet as a PNG: border, image, and the stamp in the foot. */
  async function toSheetBlob(stamp) {
    const { margin, foot, type } = sheetLayout(width);
    const sheet = document.createElement("canvas");
    sheet.width = width + margin * 2;
    sheet.height = height + margin + foot;
    const g = sheet.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, sheet.width, sheet.height);
    g.drawImage(canvas, margin, margin);

    const font = `400 ${type}px ${STAMP_FONT}`;
    try {
      await document.fonts.load(font, stamp);
    } catch {
      /* falls back to a system font */
    }
    g.font = font;
    g.fillStyle = STAMP_INK;
    g.textBaseline = "middle";
    g.fillText(stamp, margin, height + margin + foot / 2);

    return new Promise((resolve, reject) =>
      sheet.toBlob((b) => (b ? resolve(b) : reject(new Error("匯出失敗"))), "image/png"),
    );
  }

  clear();
  return out;
}
