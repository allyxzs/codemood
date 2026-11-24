import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { configured, appUrl, cookieOptions, seal } from "@/lib/auth";
export async function GET() {
  if (!configured())
    return NextResponse.json(
      {
        error:
          "OAuth não configurado. A importação pública continua disponível.",
      },
      { status: 503 },
    );
  const state = randomBytes(32).toString("hex"),
    verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: appUrl() + "/api/auth/callback",
    state,
    scope: "read:user",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(
    "codemood_oauth",
    seal({ state, verifier, expires: Date.now() + 600000 }),
    { ...cookieOptions, maxAge: 600 },
  );
  return res;
}
