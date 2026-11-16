import assert from "node:assert/strict";
import test from "node:test";
import { contrast } from "./contrast.mjs";

test("black on white is 21 to 1", () => {
  const ratio = contrast([0, 0, 0], [255, 255, 255]);
  assert.ok(Math.abs(ratio - 21) < 0.05, String(ratio));
});

test("the same color is 1 to 1", () => {
  assert.equal(contrast([20, 20, 20], [20, 20, 20]).toFixed(2), "1.00");
});
