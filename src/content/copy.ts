// Placeholder copy lives here so it can be swapped in one place.

// NEEDS TAAMIR SIGN-OFF
export const introSentence =
  "Taamir Khan is a software engineer who builds banking software, and is working on making AI agents safer and cheaper to run.";

// NEEDS TAAMIR SIGN-OFF
export const caresLine =
  "I care about understanding people and explaining things clearly.";

// NEEDS TAAMIR SIGN-OFF
export const tellerLine =
  "I build teller software for banks: the screens and services behind a deposit or a withdrawal.";

// NEEDS TAAMIR SIGN-OFF
export const governanceLine =
  "I care about understanding people and explaining a system clearly. That is also why I am moving toward AI governance, and toward agents that do not waste tokens.";

// NEEDS TAAMIR SIGN-OFF
export const guardrailPlain = [
  "The agent can suggest a transfer.",
  "A rule decides whether it goes through.",
] as const;

// NEEDS TAAMIR SIGN-OFF
export const incidentPlain = [
  "Four services, gateway, orders, inventory, and payments, can be failed on purpose.",
  "A reviewer can check every claim against a real log line.",
] as const;

// NEEDS TAAMIR SIGN-OFF
export const contactLine = "Email is the best way to reach me.";

export const playCaption = "One rule from the proxy, in a form you can move.";

export const aboutJobs =
  "I am a software engineer II at Argo Data. Before that I was an Android developer at Synchrony, on the CareCredit app, and a software development engineer intern at Amazon, on Fire TV.";

export const aboutSchool =
  "I have a B.S. in Computer Science from the University of Connecticut.";

export const experience = [
  {
    title: "Software Engineer II",
    org: "Argo Data",
    dates: "Feb 2025 – Present",
    note: "Six account types. Early promotion within ~12 months of joining.",
    bullets: [
      "I design and ship full-stack features across a distributed, three-tier teller banking platform: a JavaScript/HTML front end, a proprietary middle-tier configuration layer, and C# integration services wired to the Fiserv Signature core host, for multiple bank clients.",
      "I re-engineered end-to-end withdrawal transaction logic for six account types (Checking/MMA, Savings, CD, IRA, Consumer LOC, Commercial Loan Draw) across all three tiers, tracing a multi-layer root cause through distributed system logs to clear host-rejection and balance-validation failures.",
      "I extended middle-tier data-enrichment services and host-integration calls to add real-time account-ownership safeguards (Guardian, Conservatorship, Representative Payee) across teller workflows, reducing teller error on protected accounts.",
      "I earned an early promotion, within ~12 months of joining, for taking on increased ownership of complex, cross-tier work.",
    ],
  },
  {
    title: "Android Developer, CareCredit",
    org: "Synchrony Financial",
    dates: "Sep 2022 – Jun 2024",
    note: "",
    bullets: [
      "I designed and shipped a telehealth feature in the production CareCredit app, integrating in-app video conferencing and geo-based provider search.",
      "I built and optimized Android features in Java and Kotlin, in Android Studio, on an Agile team, adding in-call controls such as mute, camera toggle, chat, and screen recording via a third-party API.",
    ],
  },
  {
    title: "Software Development Engineer Intern, Fire TV",
    org: "Amazon",
    dates: "Jun 2022 – Aug 2022",
    note: "80–85% accuracy across 35M+ users.",
    bullets: [
      "I built a predictive analytics model on Ceviche telemetry to anticipate user navigation on Fire TV, reaching 80–85% accuracy across 35M+ users.",
      "I implemented Spark (Java) pipelines to preload UI screens and drive content recommendations, using AWS Athena, EMR, and S3.",
    ],
  },
] as const;

export const education = {
  school: "University of Connecticut",
  degree: "B.S. in Computer Science",
  dates: "Aug 2019 – May 2023",
  gpa: "3.70",
  coursework:
    "Systems Programming, Algorithms & Complexity, Big Data Analytics, Databases, Cloud Computing, Probability & Statistics.",
  note: "",
} as const;
