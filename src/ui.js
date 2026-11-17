// Side panel, keyboard shortcuts, file loading and export.
import { state, resetOutput, setSource } from "./main.js";
import { loadImageSource } from "./source.js";

const $ = (id) => document.getElementById(id);
let errorMessage = "";
let errorTimer = 0;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function loadFile(file) {
  if (!file) return;
  try {
    setSource(await loadImageSource(file));
    errorMessage = "";
  } catch (err) {
    errorMessage = err.message;
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => (errorMessage = ""), 4000);
  }
}

async function exportImage(type) {
  if (state.output.pos === 0) return;
  const blob = await state.output.toBlob(type);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hand-slit-${timestamp()}.${type === "image/png" ? "png" : "jpg"}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setRecording(on) {
  state.recording = on;
  const b = $("recBtn");
  b.textContent = on ? "錄製中" : "已暫停";
  b.classList.toggle("primary", on);
}

function setPortrait(portrait) {
  state.portrait = portrait;
  $("portraitBtn").classList.toggle("active", portrait);
  $("landscapeBtn").classList.toggle("active", !portrait);
  resetOutput();
  $("sizeValue").textContent = `${state.output.width} × ${state.output.height}`;
}

function setDirection(dir) {
  state.direction = dir;
  for (const b of document.querySelectorAll(".btn.dir")) {
    b.classList.toggle("active", b.dataset.dir === dir);
  }
  resetOutput();
}

function tick() {
  const o = state.output;
  const pct = Math.round((100 * o.pos) / o.travel);
  $("statusLine").textContent = `${errorMessage || state.message}　${pct}%`;
  $("pngBtn").disabled = o.pos === 0;
  $("jpgBtn").disabled = o.pos === 0;
  requestAnimationFrame(tick);
}

export function initUI() {
  $("loadBtn").onclick = () => $("fileInput").click();
  $("fileInput").onchange = (e) => {
    loadFile(e.target.files?.[0]);
    e.target.value = "";
  };
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    loadFile(e.dataTransfer?.files?.[0]);
  });

  $("portraitBtn").onclick = () => setPortrait(true);
  $("landscapeBtn").onclick = () => setPortrait(false);
  for (const b of document.querySelectorAll(".btn.dir")) {
    b.onclick = () => setDirection(b.dataset.dir);
  }

  $("thickSlider").oninput = (e) => {
    state.thickness = +e.target.value;
    $("thickValue").textContent = `${state.thickness} px`;
  };
  $("smoothSlider").oninput = (e) => {
    state.smoothing = +e.target.value / 100;
    $("smoothValue").textContent = `${e.target.value}%`;
  };

  $("recBtn").onclick = () => setRecording(!state.recording);
  $("clearBtn").onclick = () => state.output.clear();
  $("pngBtn").onclick = () => exportImage("image/png");
  $("jpgBtn").onclick = () => exportImage("image/jpeg");

  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "Space") {
      e.preventDefault();
      setRecording(!state.recording);
    } else if (e.key === "c" || e.key === "C") {
      state.output.clear();
    } else if (e.key === "s" || e.key === "S") {
      exportImage("image/png");
    }
  });

  // after a button click, keep Space from re-triggering it
  for (const b of document.querySelectorAll("button")) {
    b.addEventListener("mouseup", () => b.blur());
  }

  requestAnimationFrame(tick);
}
