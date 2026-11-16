/** Facts that live in the project notes and not in the JSON tables. */
export const guardrailNotes = {
  checksPerSec: "152,648",
  checksPerSecSentence:
    "That median works out to about 152,648 checks/sec on one core.",
  checksCaveat: "This is derived from the median, not a separate load test.",
  checkAllocs: 115,
  checkBytes: "5,496",
  bodyLimit: "64 KiB",
  approvalTimeout: "5 seconds",
  approvalUsSentence:
    "The full approval round trip over localhost adds about 112 µs (162,754 vs 51,058 ns/op).",
  approvalUsCaveat:
    "That 112 µs is the difference between the two medians, not a separate benchmark.",
  redactionAllocs: 54,
  appendAllocs: 80,
  verifyMs: "421.05",
  verifySentence: "Verifying 10,000 entries takes a median of 421.05 ms.",
  demoCompile: "not counting compilation",
  demoNotABenchmark: "Two runs, not a benchmark.",
  vetSentence: "go test, go vet, and the race detector all pass.",
  knownMisses: "a personal name, a street address, an obfuscated email",
} as const;

export const incidentNotes = {
  evalEasy:
    "Simulator faults start at a clean boundary and stay on; eval is easy by construction.",
  shortBlips: "Short blips that recover could be missed.",
  runNote:
    "All numbers come from the project's cloud agent runs on Nov 16, 2026 (seed 1, 24 requests, 8 warmup for fault_runs.csv; seeds 1-5 for the eval).",
  clockTradeoff:
    "a sequential simulated clock makes runs fast and exact, but it can't show queueing or concurrent requests.",
  faultDecision:
    "faults live in the service code as git commits, not as flags in the simulator, so the telemetry and git blame point to the same line.",
  selfTime:
    "Fixed misattributed latency in nested calls by measuring each service's own span time (child spans subtracted), so a slow dependency isn't blamed on its callers.",
  llmOff: "Tokens: 0 in, 0 out (deterministic mode, no LLM called).",
} as const;
