export const email = "taamirkhan0622@gmail.com";
export const github = "https://github.com/sinsuki";
export const linkedin = "https://www.linkedin.com/in/taamir-khan0622";
export const guardrailRepo = "https://github.com/sinsuki/guardrail-proxy";
export const incidentRepo = "https://github.com/sinsuki/incident-responder";

export const intro =
  "I'm Taamir Khan, a software engineer currently working on banking software at Argo Data.";

export const introNote = "Before that: Synchrony, Amazon, and a CS degree from UConn.";

export const contactLine = "Email is the best way to reach me.";

export type Role = {
  id: string;
  dates: string;
  org: string;
  title: string;
  line: string;
  bullets: string[];
};

export const jobs: Role[] = [
  {
    id: "argo",
    dates: "Feb 2025 – now",
    org: "Argo Data",
    title: "Software Engineer II",
    line: "Teller software for several bank clients.",
    bullets: [
      "I ship features on a three-tier teller platform for multiple bank clients.",
      "I rebuilt withdrawals for six account types after tracing host rejections in the logs.",
      "I added ownership checks for guardian, conservator, and payee accounts.",
    ],
  },
  {
    id: "synchrony",
    dates: "Sep 2022 – Jun 2024",
    org: "Synchrony Financial",
    title: "Android Developer, CareCredit",
    line: "Android features for the CareCredit app.",
    bullets: [
      "I shipped in-app video visits in the production CareCredit app.",
      "I built Android features in Java and Kotlin, including mute, camera, chat, and screen recording.",
    ],
  },
  {
    id: "amazon",
    dates: "Jun–Aug 2022",
    org: "Amazon",
    title: "SDE Intern, Fire TV",
    line: "A summer building Fire TV recommendations.",
    bullets: [
      "I built a Fire TV model with 80–85% accuracy across 35M+ users.",
      "I wrote Spark pipelines that preload screens and recommend content.",
    ],
  },
];

export const school: Role = {
  id: "uconn",
  dates: "2019–2023",
  org: "University of Connecticut",
  title: "B.S. Computer Science",
  line: "B.S. Computer Science, GPA 3.70.",
  bullets: ["Coursework included systems, algorithms, databases, cloud computing, and statistics."],
};

export type ShelfItem = {
  slug: string;
  title: string;
  pitch: string;
  edition: string;
};

export const shelfItems: ShelfItem[] = [
  { slug: "sudoku", title: "Daily Sudoku", pitch: "One puzzle a day, with pencil marks and hints that name the technique.", edition: "No. 01" },
  { slug: "tic-tac-toe", title: "Tic-tac-toe", pitch: "A perfect game. Turn on its thinking to see each square's score.", edition: "No. 02" },
  { slug: "palette-lab", title: "Palette Lab", pitch: "Pick a color in OKLCH, check contrast, and copy a light-dark() pair.", edition: "No. 03" },
  { slug: "cron", title: "Cron decoder", pitch: "Paste a cron expression or a Unix timestamp and read it in your local time.", edition: "No. 04" },
  { slug: "desk-plant", title: "Desk plant", pitch: "A leaf for each day you visit. It stays on this device.", edition: "No. 05" },
];
export const showShelf = shelfItems.length > 0;

for (const role of [...jobs, school]) {
  for (const bullet of role.bullets) {
    const words = bullet.split(/\s+/).filter(Boolean).length;
    if (words > 22) throw new Error(`Role bullet is ${words} words: ${bullet}`);
  }
}
