import type { Commit } from "./types";
export class GitHubError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function parseRepo(input: string) {
  let value = input.trim().replace(/\/$/, "");
  if (value.startsWith("https://")) {
    let u: URL;
    try {
      u = new URL(value);
    } catch {
      throw new GitHubError("URL inválida.");
    }
    if (
      u.hostname !== "github.com" ||
      u.username ||
      u.password ||
      u.search ||
      u.hash
    )
      throw new GitHubError("Use uma URL de repositório em github.com.");
    value = u.pathname.slice(1);
  }
  value = value.replace(/\.git$/, "");
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[a-zA-Z0-9_.-]{1,100}$/.test(value) ||
    value.endsWith("/..") ||
    value.endsWith("/.")
  )
    throw new GitHubError(
      "Informe proprietário/repositório ou a URL do GitHub.",
    );
  return value;
}
export async function githubFetch(path: string, token?: string) {
  const response = await fetch("https://api.github.com" + path, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if (response.status === 409) return { response, data: [] };
    const map: Record<number, string> = {
      401: "Sua sessão expirou. Conecte o GitHub novamente.",
      403: "Acesso negado ou limite do GitHub atingido. Tente novamente mais tarde.",
      404: "Repositório ou branch não encontrado. Nesta versão, use um repositório público.",
      422: "Branch ou filtro inválido.",
      429: "Limite do GitHub atingido. Aguarde antes de tentar novamente.",
    };
    throw new GitHubError(
      map[response.status] || "O GitHub não respondeu como esperado.",
      response.status,
    );
  }
  return { response, data: await response.json() };
}
export async function getCommits(repo: string, branch: string, token?: string) {
  const all: Commit[] = [];
  let truncated = false;
  for (let page = 1; page <= 5; page++) {
    const q = new URLSearchParams({ per_page: "100", page: String(page) });
    if (branch) q.set("sha", branch);
    const { data, response } = await githubFetch(
      `/repos/${repo}/commits?${q}`,
      token,
    );
    for (const c of data) {
      const date = c.commit?.author?.date || c.commit?.committer?.date;
      if (!date || Number.isNaN(Date.parse(date))) continue;
      all.push({
        sha: c.sha,
        message: c.commit.message,
        date: new Date(date).toISOString(),
        author: c.author?.login || c.commit.author?.name || "Unknown",
        url: `https://github.com/${repo}/commit/${c.sha}`,
        repo,
      });
    }
    const more = response.headers.get("link")?.includes('rel="next"');
    if (!more) break;
    if (page === 5) truncated = true;
  }
  return { commits: all, truncated };
}
