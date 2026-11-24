import { MOODS, type AnalyzedCommit } from "./types";
import { breakdown, timeline } from "./sentiment";
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportJSON(commits: AnalyzedCommit[]) {
  download(
    new Blob(
      [
        JSON.stringify(
          {
            app: "CodeMood",
            version: "1.0.0",
            exportedAt: new Date().toISOString(),
            commits,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    "codemood-analysis.json",
  );
}
export async function exportCard(
  commits: AnalyzedCommit[],
  name: string,
  highlight?: AnalyzedCommit,
) {
  if (!commits.length) throw new Error("Não há commits para exportar.");
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.fillStyle = "#101119";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#b69aff";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("⌘ CodeMood", 60, 66);
  ctx.fillStyle = "#f1eff8";
  ctx.font = "bold 45px sans-serif";
  ctx.fillText(
    highlight ? "Um commit. Uma história." : "Todo commit tem um sentimento.",
    60,
    145,
  );
  ctx.fillStyle = "#9b9aaa";
  ctx.font = "22px sans-serif";
  ctx.fillText(name.slice(0, 75), 60, 187);
  if (highlight) {
    ctx.fillStyle = MOODS[highlight.mood].color;
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(MOODS[highlight.mood].label.toUpperCase(), 60, 260);
    ctx.fillStyle = "#f1eff8";
    ctx.font = "32px sans-serif";
    const text = highlight.message.replace(/\s+/g, " ").slice(0, 5000);
    let line = "",
      y = 325,
      index = 0;
    for (const char of text) {
      if (ctx.measureText(line + char).width > 1040) {
        ctx.fillText(y >= 463 ? line.slice(0, -2) + "…" : line, 60, y);
        line = "";
        y += 46;
        if (y > 465) break;
      }
      line += char;
      index++;
    }
    if (y <= 465) ctx.fillText(line + (index < text.length ? "…" : ""), 60, y);
    ctx.fillStyle = "#9b9aaa";
    ctx.font = "20px monospace";
    ctx.fillText(
      `${highlight.sha.slice(0, 7)} · ${highlight.date.slice(0, 10)} · ${highlight.author}`.slice(
        0,
        90,
      ),
      60,
      520,
    );
  } else {
    const points = timeline(commits);
    ctx.strokeStyle = "#30303e";
    ctx.lineWidth = 1;
    for (const y of [250, 350, 450]) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(1140, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#b69aff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x =
          points.length === 1 ? 600 : 60 + (i * 1080) / (points.length - 1),
        y = 350 - p.score;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(600, 350 - points[0].score, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#b69aff";
      ctx.fill();
    }
    ctx.font = "20px sans-serif";
    breakdown(commits).forEach((b, i) => {
      ctx.fillStyle = b.color;
      ctx.fillText(
        `${b.label} ${Math.round(b.percent)}%`,
        60 + (i % 3) * 365,
        505 + Math.floor(i / 3) * 32,
      );
    });
  }
  ctx.fillStyle = "#77788b";
  ctx.font = "17px sans-serif";
  ctx.fillText(
    `${commits.length} commits · linguagem das mensagens ≠ estado emocional real`,
    60,
    590,
  );
  ctx.fillText("codemood / v1.0", 1000, 590);
  await new Promise<void>((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Não foi possível gerar a imagem."));
      download(
        blob,
        highlight ? "codemood-commit.png" : "codemood-timeline.png",
      );
      resolve();
    }, "image/png"),
  );
}
