import { escapeXml } from "./format";

type Step =
  | { t: "node"; lines: string[]; planned?: boolean }
  | { t: "edge"; lines: string[] }
  | { t: "group-open"; label: string }
  | { t: "group-close" };

const WIDTH = 360;

function renderFlow(id: string, title: string, description: string, steps: Step[]): string {
  const parts: string[] = [];
  const frames: string[] = [];
  const open: { y: number }[] = [];
  let y = 10;

  for (const step of steps) {
    if (step.t === "group-open") {
      open.push({ y });
      parts.push(
        `<text class="group-label" font-size="14" x="${WIDTH / 2}" y="${y + 18}" text-anchor="middle">${escapeXml(step.label)}</text>`,
      );
      y += 32;
      continue;
    }
    if (step.t === "group-close") {
      const group = open.pop();
      if (!group) throw new Error("Diagram group was not opened");
      frames.push(
        `<rect class="group-rect" x="8" y="${group.y}" width="${WIDTH - 16}" height="${y - group.y + 8}" />`,
      );
      y += 20;
      continue;
    }
    if (step.t === "edge") {
      if (step.lines.length > 0) {
        const label = step.lines
          .map(
            (line, index) =>
              `<tspan x="${WIDTH / 2}" dy="${index === 0 ? 0 : 16}">${escapeXml(line)}</tspan>`,
          )
          .join("");
        parts.push(
          `<text class="edge-label" font-size="14" x="${WIDTH / 2}" y="${y + 14}" text-anchor="middle">${label}</text>`,
        );
        y += step.lines.length * 16 + 4;
      }
      parts.push(
        `<line class="edge" x1="${WIDTH / 2}" y1="${y}" x2="${WIDTH / 2}" y2="${y + 16}" marker-end="url(#${id}-arrow)" />`,
      );
      y += 22;
      continue;
    }
    const height = 14 + step.lines.length * 18;
    const textStart = y + (height - step.lines.length * 18) / 2 + 14;
    const label = step.lines
      .map(
        (line, index) =>
          `<tspan x="${WIDTH / 2}" dy="${index === 0 ? 0 : 18}">${escapeXml(line)}</tspan>`,
      )
      .join("");
    parts.push(
      `<g class="${step.planned ? "planned" : "live"}"><rect x="20" y="${y}" width="${WIDTH - 40}" height="${height}" /><text font-size="14" x="${WIDTH / 2}" y="${textStart}" text-anchor="middle">${label}</text></g>`,
    );
    y += height;
  }

  if (open.length > 0) throw new Error("Diagram group was not closed");
  const height = y + 12;
  return `<svg class="diagram" viewBox="0 0 ${WIDTH} ${height}" role="img">
    <title>${escapeXml(title)}</title>
    <desc>${escapeXml(description)}</desc>
    <defs>
      <marker id="${id}-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M1 1 L7 4 L1 7" class="arrow-head" />
      </marker>
    </defs>
    ${frames.join("")}
    ${parts.join("")}
  </svg>`;
}

export function guardrailDiagram(): string {
  const svg = renderFlow(
    "guardrail",
    "Guardrail proxy request path",
    "Every node is shipped. Branches are listed one after another: schema check, rule engine, approval, PII redaction, and the audit log.",
    [
      { t: "node", lines: ["LLM agent"] },
      { t: "edge", lines: ["POST /v1/tool-calls JSON"] },
      { t: "node", lines: ["Schema check", "strict per-tool fields and types"] },
      { t: "edge", lines: ["malformed"] },
      { t: "node", lines: ["HTTP 400 error"] },
      { t: "edge", lines: ["from schema check"] },
      { t: "node", lines: ["Rule engine", "policy.json, first match wins"] },
      { t: "edge", lines: ["allow"] },
      { t: "node", lines: ["Upstream financial API"] },
      { t: "edge", lines: ["deny"] },
      { t: "node", lines: ["HTTP 403, not forwarded"] },
      { t: "edge", lines: ["needs_approval"] },
      {
        t: "node",
        lines: ["Approval webhook", "HMAC-SHA256 signed,", "single-use id, call hash,", "5s timeout"],
      },
      { t: "edge", lines: ["signed approve"] },
      { t: "node", lines: ["Upstream financial API"] },
      { t: "edge", lines: ["deny / bad signature /", "replay / timeout"] },
      { t: "node", lines: ["HTTP 403, not forwarded"] },
      { t: "node", lines: ["LLM agent"] },
      { t: "edge", lines: ["POST /v1/llm prompt"] },
      { t: "node", lines: ["PII redaction", "typed placeholders"] },
      { t: "edge", lines: [] },
      { t: "node", lines: ["External LLM"] },
      { t: "edge", lines: ["reply"] },
      { t: "node", lines: ["PII redaction"] },
      { t: "edge", lines: ["originals restored"] },
      { t: "node", lines: ["LLM agent"] },
      { t: "edge", lines: ["rule engine"] },
      { t: "edge", lines: ["approval webhook"] },
      { t: "edge", lines: ["PII redaction"] },
      { t: "node", lines: ["Signed hash-chained audit log", "Ed25519 + SHA-256 chain"] },
    ],
  );
  if (/planned|dasharray/i.test(svg)) {
    throw new Error("Guardrail diagram must draw every node solid");
  }
  return svg;
}

export function incidentDiagram(): string {
  return renderFlow(
    "incident",
    "Incident responder architecture",
    "The simulator and Log Forensics are shipped. Code Archaeologist, the runbook agent, and the RCA report are planned.",
    [
      { t: "group-open", label: "Simulator (shipped)" },
      { t: "node", lines: ["gateway"] },
      { t: "edge", lines: [] },
      { t: "node", lines: ["orders"] },
      { t: "edge", lines: [] },
      { t: "node", lines: ["inventory"] },
      { t: "edge", lines: ["from orders"] },
      { t: "node", lines: ["payments"] },
      { t: "node", lines: ["fault injector", "faults = git commits"] },
      { t: "group-close" },
      { t: "edge", lines: [] },
      { t: "node", lines: ["OTel JSONL", "traces, logs, metrics"] },
      { t: "edge", lines: [] },
      { t: "node", lines: ["Log Forensics agent (shipped)"] },
      { t: "edge", lines: [] },
      { t: "node", lines: ["Citation check (shipped)"] },
      { t: "edge", lines: [] },
      { t: "node", lines: ["Code Archaeologist (planned)"], planned: true },
      { t: "edge", lines: [] },
      { t: "node", lines: ["Runbook agent (planned)"], planned: true },
      { t: "edge", lines: [] },
      { t: "node", lines: ["Citation-checked RCA report", "(planned)"], planned: true },
    ],
  );
}
