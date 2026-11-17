// TEMPORARY tracker check page (Task 2). Replaced in Task 8.
import { createTracker } from "./tracker.js";

const tracker = createTracker();
tracker.start();
window.tracker = tracker;

new p5((p) => {
  p.setup = () => p.createCanvas(640, 480).parent("stage");
  p.draw = () => {
    p.background(0);
    if (tracker.status === "ready") {
      const ctx = p.drawingContext;
      ctx.save();
      ctx.translate(640, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(tracker.video, 0, 0, 640, 480);
      ctx.restore();
    }
    p.noStroke();
    p.fill(255, 40, 40);
    for (const h of tracker.getHands()) {
      for (const k of h.landmarks) p.circle((1 - k.x) * 640, k.y * 480, 8);
    }
    p.fill(255);
    p.textSize(16);
    p.text(`status: ${tracker.status}   hands: ${tracker.getHands().length}   fps: ${tracker.fps}`, 12, 24);
  };
});
