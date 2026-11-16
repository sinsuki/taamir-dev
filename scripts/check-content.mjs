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
  "The full approval round trip over localhost adds 111.7 µs (162.8 µs vs 51.1 µs). That is the difference between the two medians, not a separate benchmark.",
  "Simulator faults start at a clean boundary and stay on; eval is easy by construction.",
  "Short blips that recover could be missed.",
  "a personal name, a street address, an obfuscated email",
  "0 false positives",
  "421.05",
  "472,600",
  "152,648",
  "taamirkhan0622@gmail.com",
  "page weight",
  "0 trackers",
  "0 LLM tokens spent rendering this page",
  "Type five cron fields, like 0 9 * * 1-5, or a Unix timestamp.",
  "Palette Lab",
  "Desk plant",
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
if (!html.includes("Before that: Synchrony, Amazon, and a CS degree from UConn.")) {
  failures.push("Missing the intro note");
}
if (html.includes("Amazon (intern)")) failures.push("Intro still marks Amazon as intern");
if (!html.includes("SDE Intern, Fire TV")) failures.push("Amazon role title should stay intern");
const caveat = "not a separate benchmark";
const caveatCount = html.split(caveat).length - 1;
if (caveatCount !== 1) failures.push(`Approval caveat appears ${caveatCount} times`);
for (const raw of ["162,754", "51,058", "111,696", "0.027"]) {
  if (html.includes(raw)) failures.push(`Raw approval or demo figure still shown: ${raw}`);
}
if (!html.includes('id="play"')) failures.push("Play shelf is missing");
if (!html.includes(">V<")) failures.push("Contact should be section V");
if (!html.includes("Daily Sudoku") || !html.includes("Tic-tac-toe")) failures.push("Shelf is missing its games");
const postTitle = "Spending fewer tokens: a practical guide to cheaper LLM apps";
if (!html.includes(postTitle)) failures.push("Home writing band is missing the token post");
if (html.includes("First posts coming soon.")) failures.push("Empty writing state is still on the home page");
const postPage = path.join(root, "blog", "2026-11-16-token-efficiency", "index.html");
if (!existsSync(postPage)) failures.push("Missing the token post page");
else {
  const postHtml = readFileSync(postPage, "utf8");
  if (!postHtml.includes("min read")) failures.push("Post page is missing the computed read time");
  if (!postHtml.includes('href="https://platform.openai.com/docs/concepts"')) {
    failures.push("Post external link was rewritten");
  }
  if (postHtml.includes("style=")) failures.push("Post page has an inline style attribute");
  if (!/tok-token-keyword/.test(postHtml)) failures.push("Code tokens were not classed");
}
const rss = existsSync(path.join(root, "rss.xml")) ? readFileSync(path.join(root, "rss.xml"), "utf8") : "";
const rssItems = rss.match(/<item>/g) ?? [];
if (rssItems.length !== 1 || !rss.includes(postTitle)) failures.push("RSS should contain the one token post");
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
