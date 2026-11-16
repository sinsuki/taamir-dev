const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAME = new Map(DAY.map((name, index) => [name.slice(0, 3).toLowerCase(), index]));
const MONTH_NAME = new Map(MONTH.slice(1).map((name, index) => [name.slice(0, 3).toLowerCase(), index + 1]));

const LIMITS = [
  { name: "Minute", min: 0, max: 59 },
  { name: "Hour", min: 0, max: 23 },
  { name: "Day", min: 1, max: 31 },
  { name: "Month", min: 1, max: 12, names: MONTH_NAME },
  { name: "Weekday", min: 0, max: 7, names: DAY_NAME },
];

/**
 * @param {string} raw
 * @param {Date} [now]
 * @returns {{ kind: "empty" | "help" | "error" | "cron" | "time", message?: string, summary?: string, runs?: string[], note?: string }}
 */
export function decodeInput(raw, now = new Date()) {
  const text = String(raw ?? "").trim();
  if (!text) return { kind: "empty" };
  if (/^\d+$/.test(text)) return decodeStamp(text, now);
  const fields = text.split(/\s+/);
  if (fields.length !== 5) {
    return { kind: "help", message: "Type five cron fields, like 0 9 * * 1-5, or a Unix timestamp." };
  }
  try {
    const cron = parseCron(fields);
    const runs = nextRuns(cron, now, 5);
    const formatted = runs.map((date) => formatLocal(date, now));
    return {
      kind: "cron",
      summary: describe(cron),
      runs: formatted,
      note: formatted.length === 0 ? "This does not run in the next year." : "In your local time.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "That cron expression is not one I can read.";
    return { kind: "error", message };
  }
}

export function parseCron(fields) {
  const parsed = fields.map((field, index) => parseField(field, LIMITS[index]));
  const [minute, hour, dom, month, dow] = parsed;
  const weekdays = new Set([...dow.values].map((value) => (value === 7 ? 0 : value)));
  return {
    minute: minute.values,
    hour: hour.values,
    dom: dom.values,
    month: month.values,
    dow: weekdays,
    minuteRaw: fields[0],
    hourRaw: fields[1],
    domStar: fields[2] === "*",
    dowStar: fields[4] === "*",
    monthStar: fields[3] === "*",
  };
}

export function matches(date, cron) {
  if (!cron.minute.has(date.getMinutes())) return false;
  if (!cron.hour.has(date.getHours())) return false;
  if (!cron.month.has(date.getMonth() + 1)) return false;
  const dom = cron.dom.has(date.getDate());
  const dow = cron.dow.has(date.getDay());
  if (cron.domStar && cron.dowStar) return true;
  if (cron.domStar) return dow;
  if (cron.dowStar) return dom;
  return dom || dow;
}

export function nextRuns(cron, from, count) {
  const start = new Date(from.getTime());
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);
  const limit = start.getTime() + 366 * 24 * 60 * 60 * 1000;
  const found = [];
  for (let time = start.getTime(); time < limit && found.length < count; time += 60_000) {
    const date = new Date(time);
    if (matches(date, cron)) found.push(date);
  }
  return found;
}

function parseField(field, limit) {
  const values = new Set();
  if (!field) throw new Error(`${limit.name} is empty.`);
  for (const part of field.split(",")) {
    if (!part) throw new Error(`${limit.name} has an empty list item.`);
    const [base, stepText, extra] = part.split("/");
    if (extra !== undefined) throw new Error(`${limit.name} has too many steps.`);
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new Error(`${limit.name} step must be 1 or more.`);
    let start = limit.min;
    let end = limit.max;
    if (base !== "*") {
      if (base.includes("-")) {
        const [from, to, more] = base.split("-");
        if (!to || more !== undefined) throw new Error(`${limit.name} has a broken range.`);
        start = token(from, limit);
        end = token(to, limit);
      } else {
        start = token(base, limit);
        end = start;
      }
    }
    if (start > end) throw new Error(`${limit.name} range is backwards.`);
    for (let value = start; value <= end; value += step) values.add(value);
    if (values.size === 0) throw new Error(`${limit.name} does not match anything.`);
  }
  return { values };
}

function token(raw, limit) {
  const named = limit.names?.get(raw.toLowerCase());
  const value = named ?? Number(raw);
  if (!Number.isInteger(value) || value < limit.min || value > limit.max) {
    throw new Error(`${limit.name} must be ${limit.min}–${limit.max}.`);
  }
  return value;
}

function decodeStamp(raw, now) {
  if (raw.length > 16) return { kind: "error", message: "That number is too long to be a Unix timestamp." };
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    return { kind: "error", message: "That number is too large to read as a Unix timestamp." };
  }
  const ms = value >= 1_000_000_000_000 ? value : value * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return { kind: "error", message: "That is not a Unix timestamp I can read. Use seconds or milliseconds." };
  }
  const unit = value >= 1_000_000_000_000 ? "milliseconds" : "seconds";
  return { kind: "time", summary: `${formatLocal(date, now)} (${unit}).`, note: "In your local time." };
}

function formatLocal(date, now) {
  const parts = new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  const year = part("year");
  const when = `${part("weekday")} ${part("day")} ${part("month")}${year === String(now.getFullYear()) ? "" : ` ${year}`}`;
  const hour = part("hour").padStart(2, "0");
  const minute = part("minute").padStart(2, "0");
  return `${when}  ${hour}:${minute}`;
}

function describe(cron) {
  return `${describeTime(cron)}, ${describeWhen(cron)}.`;
}

function describeTime(cron) {
  const minutes = [...cron.minute].sort((a, b) => a - b);
  const hours = [...cron.hour].sort((a, b) => a - b);
  const minuteStep = cron.minuteRaw.match(/^\*\/(\d+)$/);
  const hourStep = cron.hourRaw.match(/^\*\/(\d+)$/);
  if (minutes.length === 1 && hours.length === 1) return `At ${clock(hours[0], minutes[0])}`;
  if (cron.minuteRaw === "*" && cron.hourRaw === "*") return "Every minute";
  if (minuteStep && cron.hourRaw === "*") {
    const step = Number(minuteStep[1]);
    return step === 1 ? "Every minute" : `Every ${step} minutes`;
  }
  if (cron.minuteRaw === "0" && hourStep) {
    const step = Number(hourStep[1]);
    return step === 1 ? "Every hour" : `Every ${step} hours`;
  }
  return `At minute ${join(minutes.map(String))} of hour ${join(hours.map(String))}`;
}

function describeWhen(cron) {
  const month = cron.monthStar ? "" : ` in ${describeNumbers([...cron.month].sort((a, b) => a - b), MONTH)}`;
  if (cron.domStar && cron.dowStar) return `every day${month}`;
  const days = describeNumbers([...cron.dow].sort((a, b) => a - b), DAY);
  const dates = `day ${describeNumbers([...cron.dom].sort((a, b) => a - b), null)}`;
  if (cron.domStar) return `${days}${month}`;
  if (cron.dowStar) return `${dates}${month || " of the month"}`;
  return `${dates}${month}, or ${days}`;
}

function describeNumbers(values, names) {
  const labels = values.map((value) => (names ? names[value] : String(value)));
  const ranges = [];
  let start = 0;
  for (let index = 1; index <= labels.length; index += 1) {
    const follows = index < values.length && values[index] === values[index - 1] + 1;
    if (follows) continue;
    const from = labels[start];
    const to = labels[index - 1];
    ranges.push(from === to ? from : `${from} through ${to}`);
    start = index;
  }
  return join(ranges);
}

function join(parts) {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function clock(hour, minute) {
  const suffix = hour < 12 ? "a.m." : "p.m.";
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}:${String(minute).padStart(2, "0")} ${suffix}`;
}
