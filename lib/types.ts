export type Mood =
  "happy" | "proud" | "neutral" | "frustrated" | "chaotic" | "tired";
export type Commit = {
  sha: string;
  message: string;
  date: string;
  author: string;
  url?: string;
  repo: string;
};
export type AnalyzedCommit = Commit & {
  mood: Mood;
  score: number;
  intensity: number;
  matches: string[];
};
export type Repository = {
  name: string;
  branch: string;
  commits: Commit[];
  demo: boolean;
  truncated?: boolean;
};
export const MOODS: Record<
  Mood,
  { label: string; color: string; emoji: string; score: number }
> = {
  happy: { label: "Feliz", color: "#83d9b4", emoji: "✦", score: 1 },
  proud: { label: "Orgulhoso", color: "#b69aff", emoji: "★", score: 1 },
  neutral: { label: "Neutro", color: "#8b97ac", emoji: "−", score: 0 },
  frustrated: { label: "Frustrado", color: "#f59095", emoji: "!", score: -1 },
  chaotic: { label: "Caótico", color: "#f6c777", emoji: "↯", score: 0 },
  tired: { label: "Cansado", color: "#85b7f6", emoji: "☾", score: -0.7 },
};
