export const email = "taamirkhan0622@gmail.com";
export const linkedin = "https://www.linkedin.com/in/taamir-khan0622";
export const github = "https://github.com/sinsuki";
export const guardrailRepo = "https://github.com/sinsuki/guardrail-proxy";
export const incidentRepo = "https://github.com/sinsuki/incident-responder";

export const guardrailDetails: Record<string, { summary: string; pr: string }> = {
  "1 schema + rule engine": {
    summary:
      "Schema and rule engine, config file, HTTP proxy, and a fake upstream API for testing.",
    pr: "https://github.com/sinsuki/guardrail-proxy/pull/1",
  },
  "2 approval webhook": {
    summary: "Human-in-the-loop approval webhook with a fake approver for tests.",
    pr: "https://github.com/sinsuki/guardrail-proxy/pull/2",
  },
  "3 PII redaction": {
    summary: "PII redaction with restore, plus a fake LLM for tests.",
    pr: "https://github.com/sinsuki/guardrail-proxy/pull/3",
  },
  "4 signed audit log": {
    summary: "Signed, hash-chained audit log with a verify command.",
    pr: "https://github.com/sinsuki/guardrail-proxy/pull/4",
  },
  "5 demo agent": {
    summary: "Demo agent, hiring-manager README, and CI.",
    pr: "https://github.com/sinsuki/guardrail-proxy/pull/5",
  },
};

export const incidentMilestones = [
  {
    name: "Simulated microservices, fault injector, and ground truth",
    status: "shipped" as const,
    pr: "https://github.com/sinsuki/incident-responder/pull/1",
    detail: "Merged Nov 16, 2026.",
  },
  {
    name: "Log Forensics agent",
    status: "shipped" as const,
    pr: "https://github.com/sinsuki/incident-responder/pull/2",
    detail: "Deterministic detection, citation check, and a scored eval. The optional LLM summary is off by default.",
  },
  {
    name: "Code Archaeologist agent",
    status: "shipped" as const,
    pr: "https://github.com/sinsuki/incident-responder/pull/3",
    detail: "Ranks commits by their diffs and requires git blame to own the cited line. 91 pytest tests.",
  },
  {
    name: "Runbook agent",
    status: "shipped" as const,
    pr: "https://github.com/sinsuki/incident-responder/pull/4",
    detail: "Picks ordered mitigation steps from repo runbooks. 136 pytest tests.",
  },
  {
    name: "One-command RCA pipeline",
    status: "shipped" as const,
    pr: "https://github.com/sinsuki/incident-responder/pull/5",
    detail: "python -m orchestrator writes rca.md and rca.json. A citation verifier checks every sentence. 157 pytest tests.",
  },
  {
    name: "README with demo",
    status: "planned" as const,
    detail: "",
  },
];
