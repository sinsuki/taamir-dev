import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve("dist");
const text = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) {
      walk(file);
      continue;
    }
    if (/\.(html|css|js|svg|json|txt|xml)$/i.test(file)) text.push(readFileSync(file, "utf8"));
  }
};
walk(root);
const all = text.join("\n");
const html = readFileSync(path.join(root, "index.html"), "utf8");

const failures = [];
const forbid = [
  /finagent/i,
  /ledgerly/i,
  /dallas/i,
  /texas/i,
  /storrs/i,
  /stamford/i,
  /arlington/i,
  /\bTX\b/,
  /\bCT\b/,
  /\bVA\b/,
];
for (const pattern of forbid) {
  if (pattern.test(all)) failures.push(`Forbidden match ${pattern}`);
}

const required = [
  "This is derived from the median, not a separate load test.",
  "That 112 µs is the difference between the two medians, not a separate benchmark.",
  "Approval adds ~111,696 ns (difference of the two proxy medians, not a separate benchmark).",
  "Simulator faults start at a clean boundary and stay on; eval is easy by construction.",
  "Short blips that recover could be missed.",
  "built binary, excludes compile",
  "Two runs, not a benchmark.",
  "not counting compilation",
  "a personal name, a street address, an obfuscated email",
  "0 false positives",
  "421.05",
  "472,600",
  "152,648",
  "taamirkhan0622@gmail.com",
  "page weight",
  "0 trackers",
  "0 LLM tokens spent rendering this page",
];
for (const phrase of required) {
  if (!html.includes(phrase)) failures.push(`Missing phrase: ${phrase}`);
}

const guardrailStart = html.indexOf('id="guardrail"');
const incidentStart = html.indexOf('id="incident"');
const guardrail = html.slice(guardrailStart, incidentStart);
if (/planned/i.test(guardrail)) failures.push("Guardrail section contains planned");
if (/in progress/i.test(guardrail)) failures.push("Guardrail section contains in progress");
const shipped = guardrail.match(/stamp-shipped/g) ?? [];
if (shipped.length < 5) failures.push(`Expected 5 shipped stamps, found ${shipped.length}`);
const svgs = guardrail.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
for (const svg of svgs) {
  if (svg.includes("421053507") || svg.includes("421,053,507")) {
    failures.push("Audit verify median was plotted");
  }
}
if (!svgs.some((svg) => svg.includes("472,600") || svg.includes(">472600<"))) {
  failures.push("Audit append median is missing from a chart");
}

const incident = html.slice(incidentStart);
const planned = incident.match(/stamp-planned/g) ?? [];
if (planned.length < 4) failures.push(`Expected 4 planned stamps, found ${planned.length}`);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("content checks passed");
