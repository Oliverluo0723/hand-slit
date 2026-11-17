// Keyboard helpers. Pure: no DOM globals.

const NON_TEXT_INPUTS = new Set(["range", "button", "checkbox", "radio", "file", "color", "submit", "reset"]);

/** True when typing in this element should not trigger shortcuts. */
export function isTextEntry(el) {
  if (!el) return false;
  if (el.tagName === "TEXTAREA" || el.isContentEditable) return true;
  if (el.tagName === "INPUT") return !NON_TEXT_INPUTS.has(el.type);
  return false;
}
