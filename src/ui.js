// The colophon (settings and actions as words), captions, keyboard shortcuts,
// file loading and export.
import { state, resetOutput, setSource } from "./main.js";
import { loadImageSource } from "./source.js";
import { isTextEntry } from "./keys.js";
import { smoothingToK } from "./interpreter.js";
import { makeScrub } from "./scrub.js";

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
  b.classList.toggle("on", on);
  b.setAttribute("aria-label", on ? "暫停" : "錄製");
  $("recLabel").textContent = on ? "錄製中" : "已暫停";
}

function setPortrait(portrait) {
  if (portrait === state.portrait) return;
  state.portrait = portrait;
  $("portraitBtn").classList.toggle("on", portrait);
  $("landscapeBtn").classList.toggle("on", !portrait);
  resetOutput();
  $("sizeValue").textContent = `${state.output.width} × ${state.output.height}`;
}

const setText = (el, text) => {
  if (el.textContent !== text) el.textContent = text;
};

function tick() {
  const o = state.output;
  const pct = Math.round((100 * o.pos) / o.travel);
  const srcNote = errorMessage || state.sourceNote;
  setText($("sourceNote"), srcNote ? `。${srcNote}` : "");
  setText($("outputNote"), `${state.outputNote} ${pct}%`);
  $("outputNote").classList.toggle("live", state.live);
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

  makeScrub($("thick"), {
    min: 1,
    max: 40,
    value: state.thickness,
    pxPerStep: 6,
    format: (v) => `${v} px`,
    onChange: (v) => (state.thickness = v),
  });
  makeScrub($("smooth"), {
    min: 0,
    max: 95,
    value: 65,
    pxPerStep: 2,
    format: (v) => `${v}%`,
    onChange: (v) => (state.smoothing = smoothingToK(v)),
  });
  state.smoothing = smoothingToK(65);

  setRecording(state.recording);
  $("recBtn").onclick = () => setRecording(!state.recording);
  $("clearBtn").onclick = () => state.output.clear();
  $("pngBtn").onclick = () => exportImage("image/png");
  $("jpgBtn").onclick = () => exportImage("image/jpeg");

  window.addEventListener("keydown", (e) => {
    if (isTextEntry(e.target)) return;
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

  // after a click, keep Space from re-triggering the button
  for (const b of document.querySelectorAll("button")) {
    b.addEventListener("mouseup", () => b.blur());
  }

  requestAnimationFrame(tick);
}
