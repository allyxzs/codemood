import { NextRequest, NextResponse } from "next/server";
import { getCommits, parseRepo, GitHubError, githubFetch } from "@/lib/github";
import { session } from "@/lib/auth";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  try {
    const repo = parseRepo(req.nextUrl.searchParams.get("repo") || "");
    const branch = (req.nextUrl.searchParams.get("branch") || "").trim();
    if (branch.length > 200 || /[\x00-\x1f]/.test(branch))
      throw new GitHubError("Branch inválida.");
    const auth = await session();
    const { data: meta } = await githubFetch(`/repos/${repo}`, auth?.token);
    if (meta.private)
      throw new GitHubError(
        "Esta versão analisa somente repositórios públicos.",
        403,
      );
    const result = await getCommits(repo, branch, auth?.token);
    return NextResponse.json(
      {
        name: repo,
        branch: branch || meta.default_branch || "main",
        demo: false,
        ...result,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof GitHubError
            ? e.message
            : "Não foi possível conectar ao GitHub. Tente novamente.",
      },
      {
        status: e instanceof GitHubError ? e.status : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
