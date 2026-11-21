// What little the page says and lets you do besides scanning: the one line of
// instructions, tracking notices, two faint words (change the image before
// scanning, the camera), and taking a finished sheet by clicking it.
import { state, takeSheet, changeImage, canChangeImage } from "./main.js";

const $ = (id) => document.getElementById(id);

const HOW = "舉起雙手捏住，兩手之間就是掃描線。滑鼠也可以拖曳。";
const DONE = "紙出完了。點一下紙，把它帶走。";

// camera on / off, remembered in this browser (best effort: storage may be blocked)
const CAMERA_KEY = "handslit.camera";

function cameraWanted() {
  try {
    return localStorage.getItem(CAMERA_KEY) !== "off";
  } catch {
    return true;
  }
}

function rememberCamera(on) {
  try {
    localStorage.setItem(CAMERA_KEY, on ? "on" : "off");
  } catch {
    /* not remembered; fine */
  }
}

function setCamera(tracker, on) {
  if (on) tracker.start();
  else tracker.stop();
  $("camBtn").textContent = on ? "關閉鏡頭" : "開啟鏡頭";
  rememberCamera(on);
}

const setText = (el, text) => {
  if (el.textContent !== text) el.textContent = text;
};

let fileError = "";
let fileErrorTimer = 0;

async function useFile(file) {
  if (!file || !canChangeImage()) return;
  try {
    await changeImage(file);
    fileError = "";
  } catch (err) {
    fileError = err.message;
    clearTimeout(fileErrorTimer);
    fileErrorTimer = setTimeout(() => (fileError = ""), 4000);
  }
}

/**
 * While the camera and hand model come up: the notice is darker, and a hairline
 * fills with the model download, then sweeps while the tracker starts (no
 * progress to measure there), so the page never looks stuck.
 */
function showLoading(load) {
  const bar = $("loadbar");
  $("hint").classList.toggle("loud", Boolean(load));
  if (bar.hidden !== !load) bar.hidden = !load;
  if (!load) return;
  const busy = load.phase === "init" || load.progress == null;
  bar.classList.toggle("busy", busy);
  bar.firstElementChild.style.transform = busy ? "" : `scaleX(${load.progress})`;
}

function tick() {
  setText($("how"), state.done && !state.leaving ? DONE : HOW);
  setText($("hint"), fileError || state.notice);
  showLoading(state.loading);
  // "換一張圖" is there only until the first strip is scanned
  const swap = $("imageBtn");
  if (swap.hidden === canChangeImage()) swap.hidden = !swap.hidden;
  requestAnimationFrame(tick);
}

export function initUI(tracker) {
  setCamera(tracker, cameraWanted());
  $("camBtn").onclick = () => setCamera(tracker, tracker.status === "off");
  $("imageBtn").onclick = () => $("fileInput").click();
  $("fileInput").onchange = (e) => {
    useFile(e.target.files?.[0]);
    e.target.value = "";
  };
  for (const b of [$("camBtn"), $("imageBtn")]) b.addEventListener("mouseup", () => b.blur());

  // a dropped image replaces the source, but only before anything is scanned
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    useFile(e.dataTransfer?.files?.[0]);
  });

  const sheet = document.querySelector("#figOutput .sheet");
  sheet.addEventListener("click", () => takeSheet());
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      takeSheet();
    }
  });

  requestAnimationFrame(tick);
}
