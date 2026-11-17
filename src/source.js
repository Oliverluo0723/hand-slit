// Image sources. A Source is {width, height, data, canvas}: the pixel data the
// scanner reads, plus the canvas the view draws as the preview.
import { fitWithin } from "./geometry.js";

export const MAX_SOURCE_SIDE = 4096;

function fromCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data, canvas };
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function createTestSource() {
  const W = 720;
  const H = 960;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");

  g.fillStyle = "#e9e7e2";
  g.fillRect(0, 0, W, H);

  const bars = 12;
  for (let i = 0; i < bars; i++) {
    g.fillStyle = `rgb(${(i * 37) % 255}, ${(i * 83) % 255}, ${(i * 151) % 255})`;
    g.fillRect((i * W) / bars, 0, W / bars + 1, 120);
  }

  g.strokeStyle = "#111";
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= W; x += 60) { g.moveTo(x, 120); g.lineTo(x, H); }
  for (let y = 120; y <= H; y += 60) { g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke();

  g.fillStyle = "rgb(220, 60, 40)";
  g.beginPath(); g.arc(W / 2, 460, 180, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#111";
  g.beginPath(); g.arc(W / 2, 460, 70, 0, Math.PI * 2); g.fill();

  g.strokeStyle = "rgb(20, 80, 200)";
  g.lineWidth = 12;
  g.beginPath(); g.moveTo(40, 880); g.lineTo(W - 40, 680); g.stroke();

  g.fillStyle = "#111";
  g.font = "bold 128px Helvetica, Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("SCAN", W / 2, 820);

  return fromCanvas(c);
}

/** Fetch an image by URL and load it like a dropped file. */
export async function loadUrlSource(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`無法讀取 ${url}`);
  return loadImageSource(await res.blob());
}

export async function loadImageSource(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("無法讀取這個圖片檔");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SOURCE_SIDE);
  const c = makeCanvas(width, height);
  c.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return fromCanvas(c);
}
