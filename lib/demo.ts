import type { Repository } from "./types";
const phrases = [
  [
    "feat: add repository selector",
    "docs: update setup guide",
    "refactor: simplify data fetching",
  ],
  [
    "ugh, broken again. why on earth does this fail?",
    "fix: nothing works and I need coffee",
    "wtf, race condition is back",
  ],
  [
    "wip: aaaaa just make it compile",
    "temp hack, fix it later",
    "it works on my machine, sorry",
  ],
  ["finally! it works 🎉", "consegui! finalmente funcionou", "yay, love it!"],
  [
    "tired. need coffee and sleep",
    "preciso de cafe, muito sono",
    "too late. finish tomorrow",
  ],
  [
    "shipped! proud of this beautiful release 🚀",
    "nailed it! elegant and perfect",
    "missao cumprida, lancamos 🚀",
  ],
];
export function makeDemo(now = new Date()): Repository[] {
  return ["studio/orbit-ui", "studio/tiny-api"].map((name, r) => ({
    name,
    branch: "main",
    demo: true,
    commits: Array.from({ length: r ? 118 : 204 }, (_, i) => {
      const day = Math.floor(i / (r ? 2 : 3));
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - 83 + day);
      date.setUTCHours(9 + (i % 14), i % 60, 0, 0);
      const phase = Math.floor(day / 8);
      const group = (phase + r + (i % 7 === 0 ? 2 : 0)) % phrases.length;
      return {
        sha: (i + r * 999).toString(16).padStart(40, "a"),
        message: phrases[group][i % 3],
        date: date.toISOString(),
        author: i % 4 === 0 ? "alex" : "you",
        repo: name,
      };
    }),
  }));
}
