import assert from "node:assert/strict";
import test from "node:test";
import { dailyPuzzle, hint, solved } from "./sudoku.mjs";

test("the day's puzzle is stable and solvable by named techniques", () => {
  const first = dailyPuzzle(new Date(2026, 10, 16, 9, 0));
  assert.deepEqual(first, dailyPuzzle(new Date(2026, 10, 16, 18, 0)));
  const play = first.slice();
  while (!solved(play)) {
    const next = hint(play);
    assert.ok(next);
    assert.match(next.text, /Only/);
    play[next.index] = next.digit;
  }
});
