import assert from "node:assert/strict";
import test from "node:test";
import { decodeInput, matches, nextRuns, parseCron } from "./decode.mjs";

test("weekday mornings are plain English and skip the weekend", () => {
  const now = new Date(2026, 10, 16, 10, 0, 30);
  const decoded = decodeInput("0 9 * * 1-5", now);
  assert.equal(decoded.kind, "cron");
  assert.equal(decoded.summary, "At 9:00 a.m., Monday through Friday.");
  assert.equal(decoded.note, "In your local time.");
  assert.equal(decoded.runs.length, 5);
  const cron = parseCron("0 9 * * 1-5".split(" "));
  const runs = nextRuns(cron, now, 5);
  assert.deepEqual(
    runs.map((date) => [date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getDay()]),
    [
      [10, 17, 9, 0, 2],
      [10, 18, 9, 0, 3],
      [10, 19, 9, 0, 4],
      [10, 20, 9, 0, 5],
      [10, 23, 9, 0, 1],
    ],
  );
});

test("a morning that has not happened yet is included", () => {
  const cron = parseCron(["0", "9", "*", "*", "1-5"]);
  const runs = nextRuns(cron, new Date(2026, 10, 16, 8, 59, 0), 1);
  assert.equal(runs[0].getDate(), 16);
  assert.equal(runs[0].getHours(), 9);
});

test("stepped minutes stay 15 apart", () => {
  const decoded = decodeInput("*/15 * * * *", new Date(2026, 10, 16, 10, 7, 0));
  assert.equal(decoded.summary, "Every 15 minutes, every day.");
  const runs = nextRuns(parseCron(["*/15", "*", "*", "*", "*"]), new Date(2026, 10, 16, 10, 7, 0), 5);
  assert.deepEqual(
    runs.map((date) => [date.getHours(), date.getMinutes()]),
    [
      [10, 15],
      [10, 30],
      [10, 45],
      [11, 0],
      [11, 15],
    ],
  );
});

test("day-of-month and weekday are or, not and", () => {
  const cron = parseCron(["0", "0", "1", "*", "1"]);
  assert.equal(matches(new Date(2026, 0, 1, 0, 0), cron), true);
  assert.equal(matches(new Date(2026, 0, 5, 0, 0), cron), true);
  assert.equal(matches(new Date(2026, 0, 2, 0, 0), cron), false);
});

test("a bad hour explains the range", () => {
  const decoded = decodeInput("0 25 * * *");
  assert.equal(decoded.kind, "error");
  assert.match(decoded.message, /Hour must be 0–23/);
});

test("names and an impossible day stay readable", () => {
  assert.equal(decodeInput("0 0 * JAN MON").summary, "At 12:00 a.m., Monday in January.");
  const impossible = decodeInput("0 0 31 2 *", new Date(2026, 0, 1));
  assert.equal(impossible.note, "This does not run in the next year.");
});

test("seconds and milliseconds are the same instant", () => {
  const seconds = decodeInput("1763300000");
  const millis = decodeInput("1763300000000");
  assert.equal(seconds.kind, "time");
  assert.equal(millis.kind, "time");
  assert.match(seconds.summary, /\(seconds\)/);
  assert.match(millis.summary, /\(milliseconds\)/);
  assert.equal(seconds.summary.replace(" (seconds).", ""), millis.summary.replace(" (milliseconds).", ""));
  assert.doesNotMatch(seconds.summary, /[A-Z][a-z]+\//);
});

test("run times are tight local strings and omit the current year", () => {
  const now = new Date(2026, 10, 16, 10, 0, 0);
  const decoded = decodeInput("0 9 * * 1-5", now);
  assert.equal(decoded.runs[0], "Tue 17 Nov  09:00");
  assert.equal(decoded.runs[0].includes(","), false);
  const nextYear = decodeInput("0 9 2 1 *", new Date(2026, 11, 20, 0, 0, 0));
  assert.equal(nextYear.runs[0], "Sat 2 Jan 2027  09:00");
});

test("other text is a short hint, not a stored value", () => {
  assert.equal(decodeInput("").kind, "empty");
  assert.match(decodeInput("hello").message, /0 9 \* \* 1-5/);
});
