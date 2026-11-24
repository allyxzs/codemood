import { MOODS, type Mood, type Commit, type AnalyzedCommit } from "./types";
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
// Explicit emotional phrases win over technical terms. "fix" and "bug" alone stay neutral.
const rules: { mood: Mood; pattern: RegExp; weight: number }[] = [
  {
    mood: "happy",
    pattern:
      /\b(finally|yay|hooray|awesome|amazing|love it|it works|funcionou|finalmente|consegui|feliz|oba|agora vai)\b|🎉|🥳|😃/g,
    weight: 2,
  },
  {
    mood: "proud",
    pattern:
      /\b(proud|nailed it|shipped|milestone|beautiful|elegant|perfect|orgulho|perfeito|lancamos|missao cumprida|release ready)\b|🚀|🏆/g,
    weight: 3,
  },
  {
    mood: "frustrated",
    pattern:
      /\b(wtf|damn|hate|broken again|why on earth|nothing works|frustrated|ugh|inferno|droga|odeio|nao funciona|quebrou de novo|que raiva)\b|🤬|😡/g,
    weight: 3,
  },
  {
    mood: "chaotic",
    pattern:
      /\b(wip|yolo|hack|temp|fix it later|works on my machine|it works on my machine|dont ask|don't ask|sorry|gambiarra|depois eu arrumo|na minha maquina|socorro|a{4,})\b|🙃|🤡/g,
    weight: 3,
  },
  {
    mood: "tired",
    pattern:
      /\b(tired|sleep|sleepy|exhausted|need coffee|too late|cansado|sono|dormir|exausto|preciso de cafe|sem energia)\b|😴|🥱/g,
    weight: 3,
  },
];
export function analyze(commit: Commit): AnalyzedCommit {
  const text = normalize(commit.message.slice(0, 5000));
  const weights: Record<Mood, number> = {
    happy: 0,
    proud: 0,
    neutral: 0,
    frustrated: 0,
    chaotic: 0,
    tired: 0,
  };
  const evidence: Record<Mood, string[]> = {
    happy: [],
    proud: [],
    neutral: [],
    frustrated: [],
    chaotic: [],
    tired: [],
  };
  for (const rule of rules) {
    for (const match of text.matchAll(new RegExp(rule.pattern.source, "g"))) {
      const prefix = text.slice(Math.max(0, match.index! - 22), match.index);
      const negated = /\b(not|never|no|nao|nunca)\s+(?:\w+\s+)?$/.test(prefix);
      if (negated) continue;
      weights[rule.mood] += rule.weight;
      evidence[rule.mood].push(match[0]);
    }
  }
  // The sarcastic idiom should not also be classified as a happy breakthrough.
  if (text.includes("works on my machine")) {
    weights.happy = 0;
    evidence.happy = [];
  }
  const mood = (Object.keys(weights) as Mood[]).reduce(
    (best, key) => (weights[key] > weights[best] ? key : best),
    "neutral",
  );
  return {
    ...commit,
    mood,
    score: MOODS[mood].score,
    intensity: weights[mood],
    matches: [...new Set(evidence[mood])],
  };
}
export function breakdown(commits: AnalyzedCommit[]) {
  return (Object.keys(MOODS) as Mood[]).map((mood) => ({
    mood,
    ...MOODS[mood],
    count: commits.filter((c) => c.mood === mood).length,
    percent: commits.length
      ? (100 * commits.filter((c) => c.mood === mood).length) / commits.length
      : 0,
  }));
}
export function timeline(
  commits: AnalyzedCommit[],
  period: "week" | "month" = "week",
) {
  const buckets = new Map<string, AnalyzedCommit[]>();
  for (const c of commits) {
    const d = new Date(c.date);
    if (period === "month") d.setUTCDate(1);
    else d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, [...(buckets.get(key) || []), c]);
  }
  return [...buckets]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      label: new Date(date + "T12:00:00Z").toLocaleDateString("pt-BR", {
        day: period === "week" ? "2-digit" : undefined,
        month: "short",
        timeZone: "UTC",
      }),
      score: Math.round(
        (100 * list.reduce((s, c) => s + c.score, 0)) / list.length,
      ),
      count: list.length,
      positive: list.filter((c) => c.score > 0).length,
      negative: list.filter((c) => c.score < 0).length,
      chaotic: list.filter((c) => c.mood === "chaotic").length,
    }));
}
export function filterCommits(
  commits: AnalyzedCommit[],
  from: string,
  to: string,
  author: string,
  mood: string,
) {
  return commits.filter(
    (c) =>
      (!from || c.date.slice(0, 10) >= from) &&
      (!to || c.date.slice(0, 10) <= to) &&
      (!author || normalize(c.author).includes(normalize(author))) &&
      (mood === "all" || c.mood === mood),
  );
}
export function commitOfMonth(commits: AnalyzedCommit[], month: string) {
  return commits
    .filter((c) => c.date.startsWith(month) && c.intensity > 0)
    .sort(
      (a, b) => b.intensity - a.intensity || b.date.localeCompare(a.date),
    )[0];
}
