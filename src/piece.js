// The author's decisions. Nothing here is shown on the page or changeable by
// the viewer: edit this file to change the piece.

export const PIECE = {
  /** Images to scan, in order. One sheet per image; after the last, back to the first. */
  images: ["assets/default.webp"],
  /** Pixels the print advances per frame. */
  thickness: 4,
  /** How much the hands' jitter is smoothed, 0–95 (%). Some is kept on purpose. */
  smoothing: 65,
  /** Output size in pixels, image area only (the white border is added around it). */
  paper: { width: 1790, height: 2560 },
};
