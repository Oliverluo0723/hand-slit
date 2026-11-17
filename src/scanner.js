// Samples a source's pixels along a slit. Pure: no DOM.

/**
 * Write `n` RGBA samples taken evenly from slit.a to slit.b into `dest`
 * (length n*4). Nearest-pixel sampling; outside the source → opaque black.
 */
export function sampleLine(src, slit, n, dest) {
  const { width, height, data } = src;
  const { a, b } = slit;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const px = Math.floor((a.x + dx * t) * width);
    const py = Math.floor((a.y + dy * t) * height);
    const j = i * 4;
    if (px >= 0 && px < width && py >= 0 && py < height) {
      const k = (py * width + px) * 4;
      dest[j] = data[k];
      dest[j + 1] = data[k + 1];
      dest[j + 2] = data[k + 2];
    } else {
      dest[j] = 0;
      dest[j + 1] = 0;
      dest[j + 2] = 0;
    }
    dest[j + 3] = 255;
  }
}
