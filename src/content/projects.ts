import latency from "../data/guardrail-latency.json";
import metrics from "../data/guardrail-metrics.json";
import incidentTests from "../data/incident-tests.json";
import { formatInt } from "../lib/format";
import { stemChart, type ChartRow } from "../lib/chart";
import { guardrailRepo, incidentRepo } from "./site";

export type Stamp = { name: string; href: string; detail: string };
export type Figure = {
  id: string;
  caption: string;
  provenance: string;
  svg: string;
  rows: { label: string; value: string }[];
};
export type Project = {
  id: string;
  kicker: string;
  title: string;
  href: string;
  summary: string;
  bullets: string[];
  datum: string;
  unit: string;
  takeaway: string;
  caveats: string[];
  figure: Figure;
  hoodFigure?: Figure;
  hood: string[];
  commands: string[];
  demo: string;
  stamps: Stamp[];
};

const guardrailPr = (n: number) => `${guardrailRepo}/pull/${n}`;
const incidentPr = (n: number) => `${incidentRepo}/pull/${n}`;

function chart(rows: ChartRow[], title: string, description: string): string {
  if (rows.some((row) => row.value >= 1_000_000)) throw new Error(`Chart scale is too wide: ${title}`);
  return stemChart(rows, title, description);
}

function requireRow<T>(row: T | undefined, label: string): T {
  if (!row) throw new Error(`Missing measured row: ${label}`);
  return row;
}

const allow = requireRow(
  latency.find((row) => row.path.startsWith("check: allow")),
  "check allow",
);
const needs = requireRow(
  latency.find((row) => row.path.startsWith("check: needs_approval")),
  "check needs approval",
);
const append = requireRow(
  latency.find((row) => row.path.startsWith("audit append")),
  "audit append",
);

const checkRows: ChartRow[] = [
  { label: "allow", lines: ["allow", "$500.00"], value: allow.median_ns_op, display: formatInt(allow.median_ns_op), accent: true },
  { label: "needs approval", lines: ["needs", "approval"], value: needs.median_ns_op, display: formatInt(needs.median_ns_op) },
];

const appendRows: ChartRow[] = [
  { label: "append", lines: ["append", "fsync"], value: append.median_ns_op, display: formatInt(append.median_ns_op), accent: true },
];

const milestoneRows: ChartRow[] = incidentTests.map((row) => {
  const milestone = row.milestone.slice(0, 1);
  return {
    label: `M${milestone}`,
    lines: [`M${milestone}`, `${row.seconds} s`],
    value: row.tests_passed,
    display: String(row.tests_passed),
  };
});

if (metrics.tests_per_milestone.length !== 5) throw new Error("Expected 5 guardrail milestones");
if (incidentTests.length !== 5) throw new Error("Expected 5 incident suite rows");

const guardrailStamps: Stamp[] = metrics.tests_per_milestone.map((row, index) => ({
  name: row.milestone,
  href: guardrailPr(index + 1),
  detail: `${row.test_cases} test cases`,
}));

const incidentNames = [
  "Simulated microservices, fault injector, and ground truth",
  "Log Forensics",
  "Code Archaeologist",
  "Runbook agent",
  "One-command RCA pipeline",
  "README, demo, CI, and license",
];

const incidentStamps: Stamp[] = incidentNames.map((name, index) => {
  const measured = incidentTests[index];
  return {
    name,
    href: incidentPr(index + 1),
    detail: measured ? `${measured.tests_passed} tests in ${measured.seconds} s` : "Merged",
  };
});

const demoRuns = metrics.demo_runtime_seconds.runs.join(" s and ");

export const guardrail: Project = {
  id: "guardrail",
  kicker: "PLATE 01 · Go · SHIPPED",
  title: "guardrail-proxy",
  href: guardrailRepo,
  summary: "I built a safety layer that sits between an AI agent and a bank's systems.",
  bullets: [
    "Every action is checked against fixed rules, and anything large waits for a person to sign off.",
    "Each approval works once, for one exact transfer, so an old approval can't be replayed.",
    "Emails, card numbers, and similar details are swapped for placeholders before anything leaves.",
  ],
  datum: "6.5",
  unit: "µs",
  takeaway:
    "Strict checking adds basically no delay. That median works out to about 152,648 checks/sec on one core.",
  caveats: ["This is derived from the median, not a separate load test."],
  figure: {
    id: "FIG_01",
    caption: "[ median check latency · ns/op · lower is better ]",
    provenance: `go test -bench · Go ${metrics.environment.go} · ${metrics.environment.os_arch}`,
    svg: chart(
      checkRows,
      "Median check latency",
      "Two medians from go test -bench, in nanoseconds per operation. The allow path is the highlighted value.",
    ),
    rows: checkRows.map((row) => ({ label: row.lines.join(" "), value: `${row.display} ns/op` })),
  },
  hoodFigure: {
    id: "FIG_01b",
    caption: "[ audit append · ns/op · includes fsync ]",
    provenance: `go test -bench · Go ${metrics.environment.go} · ${metrics.environment.os_arch}`,
    svg: chart(
      appendRows,
      "Audit append median",
      "Median time to append one audit entry with fsync, in nanoseconds.",
    ),
    rows: [{ label: "audit append with fsync", value: `${formatInt(append.median_ns_op)} ns/op` }],
  },
  hood: [
    "All five milestones are merged.",
    "The full approval round trip over localhost adds about 112 µs (162,754 vs 51,058 ns/op). That 112 µs is the difference between the two medians, not a separate benchmark.",
    metrics.notes,
    "On the labeled corpus there were 0 false positives and 0 misses on the 12 things it is built to catch. It still misses a personal name, a street address, an obfuscated email.",
    "Verifying 10,000 entries takes a median of 421.05 ms. Writing an entry is slower because it is saved to disk before the call returns.",
    `The built demo binary ran end to end in ${demoRuns} s, not counting compilation. Two runs, not a benchmark. ${metrics.demo_runtime_seconds.note}.`,
    "go test, go vet, and the race detector all pass.",
  ],
  commands: ["make demo", "go test -bench ."],
  demo: "make demo",
  stamps: guardrailStamps,
};

export const incident: Project = {
  id: "incident",
  kicker: "PLATE 02 · Python · SHIPPED",
  title: "incident-responder",
  href: incidentRepo,
  summary: "I built a system that investigates a software outage the way an on-call engineer would.",
  bullets: [
    "Every claim points to a real log line, a code change, or a playbook step.",
    "When one slow service makes its neighbors look slow, it still names the one that started it.",
    "It applies the chosen fix on a test system and confirms the outage is gone.",
  ],
  datum: "1.99",
  unit: "s",
  takeaway:
    "End to end it scored 20/20 correct root cause, with 0 tokens. A clean clone passed 157 tests in 6.57 s.",
  caveats: [
    "Simulator faults start at a clean boundary and stay on; eval is easy by construction.",
    "Short blips that recover could be missed.",
    "The 1.99 s figure is the clean-clone eval of 1.985 s on Python 3.12.3. Milestone 5 on the chart is an earlier run at 6.80 s.",
  ],
  figure: {
    id: "FIG_02",
    caption: "[ tests passed by milestone · M5 suite time is the earlier 6.80 s run ]",
    provenance: "milestone suite table · M5 is 157 tests in 6.80 s · not the clean-clone headline",
    svg: chart(
      milestoneRows,
      "Tests passed by milestone",
      "Pytest counts for milestones 1 through 5. The M5 label includes that run's 6.80 second suite time. The clean-clone headline is separate.",
    ),
    rows: incidentTests.map((row) => ({
      label: `Milestone ${row.milestone.slice(0, 1)}`,
      value: `${row.tests_passed} tests in ${row.seconds} s`,
    })),
  },
  hood: [
    "All six milestones are merged, including the README, demo, CI, and license.",
    "Milestone 5, the earlier run, passed 157 tests in 6.80 s. Its end-to-end eval was 2.066 s wall with 0 tokens. The headline above is the later clean clone: 157 tests in 6.57 s, and 20/20 in 1.985 s.",
    "CI on that clean clone ran 157 tests in 10.35 s and the eval in 2.965 s.",
    "The verifier checks that each cited id exists, not that a number written next to it matches.",
    "A sequential simulated clock makes runs fast and exact, but it can't show queueing or concurrent requests.",
    "Plain code does the detective work. The optional model path was not part of these measurements.",
  ],
  commands: ["make demo", "python -m orchestrator"],
  demo: "make demo",
  stamps: incidentStamps,
};

export const projects = [guardrail, incident];

for (const project of projects) {
  const summaryWords = project.summary.split(/\s+/).filter(Boolean).length;
  if (summaryWords > 25) throw new Error(`${project.title} summary is ${summaryWords} words`);
  for (const bullet of project.bullets) {
    const words = bullet.split(/\s+/).filter(Boolean).length;
    if (words > 20) throw new Error(`${project.title} bullet is ${words} words: ${bullet}`);
  }
}
