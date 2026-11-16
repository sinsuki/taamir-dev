import assert from "node:assert/strict";
import test from "node:test";
import { localDate, rememberVisit } from "./plant.mjs";

test("a day is counted once and growth stops at nine", () => {
  const once = rememberVisit([], "2026-11-16");
  assert.deepEqual(rememberVisit(once, "2026-11-16"), ["2026-11-16"]);
  const full = Array.from({ length: 9 }, (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`);
  assert.equal(rememberVisit(full, "2026-02-01").length, 9);
  assert.equal(rememberVisit(full, "2026-02-01").includes("2026-02-01"), false);
});

test("the date is the visitor's local calendar day", () => {
  assert.equal(localDate(new Date(2026, 10, 16, 23, 30)), "2026-11-16");
});
