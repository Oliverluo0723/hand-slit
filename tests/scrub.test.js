import test from "node:test";
import assert from "node:assert/strict";
import { scrubValue } from "../src/scrub.js";

const opts = { min: 1, max: 40, pxPerStep: 6 };

test("scrubValue steps once per pxPerStep", () => {
  assert.equal(scrubValue(4, 0, opts), 4);
  assert.equal(scrubValue(4, 12, opts), 6);
  assert.equal(scrubValue(4, -6, opts), 3);
});

test("scrubValue clamps to the range", () => {
  assert.equal(scrubValue(4, -600, opts), 1);
  assert.equal(scrubValue(4, 600, opts), 40);
});
