// What little the page says and lets you do besides scanning: the one line of
// instructions, tracking notices, the camera switch, and taking a finished sheet.
import { state, takeSheet } from "./main.js";

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

function tick() {
  setText($("how"), state.done && !state.leaving ? DONE : HOW);
  setText($("hint"), state.notice);
  requestAnimationFrame(tick);
}

export function initUI(tracker) {
  setCamera(tracker, cameraWanted());
  $("camBtn").onclick = () => setCamera(tracker, tracker.status === "off");
  $("camBtn").addEventListener("mouseup", (e) => e.currentTarget.blur());

  // the images are the author's: a dropped file is not loaded, and the browser doesn't navigate to it
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

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
