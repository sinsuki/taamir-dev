import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
  /understanding people/i,
  /explaining clearly/i,
  /passionate/i,
  /github\.com\/taamir-khan/i,
  /\btimezone\b/i,
  /\bbased in\b/i,
  /\(\d{3}\)\s*\d{3}/,
  /\b\d{3}[-.]\d{3}[-.]\d{4}\b/,
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
if (planned.length !== 0) failures.push(`Expected 0 planned stamps, found ${planned.length}`);
const incidentShipped = incident.match(/stamp-shipped/g) ?? [];
if (incidentShipped.length !== 6) {
  failures.push(`Expected 6 shipped incident stamps, found ${incidentShipped.length}`);
}
if (!html.includes("20/20 correct root cause")) failures.push("Missing end-to-end root cause result");
if (!html.includes("157") || !html.includes("6.80")) failures.push("Missing milestone 5 test count");
if (!html.includes("6.57") || !html.includes("1.99") || !html.includes("1.985")) {
  failures.push("Missing clean-clone headline");
}
if (!html.includes("I'm Taamir Khan, a software engineer currently working on banking software at Argo Data.")) {
  failures.push("Missing the chosen intro");
}
if (html.includes('id="play"')) failures.push("Empty shelf is on the page");
if (!html.includes("First posts coming soon.")) failures.push("Missing empty writing state");
const preloads = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map((match) => match[0]);
if (preloads.length !== 1 || !preloads[0].includes("fraunces")) {
  failures.push(`Preload should be Fraunces only, found ${preloads.join(" | ") || "none"}`);
}
if (!existsSync(path.join(root, "rss.xml"))) failures.push("Missing rss.xml");
if (!existsSync(path.join(root, "blog", "index.html"))) failures.push("Missing blog index");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("content checks passed");
