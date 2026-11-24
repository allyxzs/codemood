import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  appUrl,
  configured,
  cookieOptions,
  seal,
  unseal,
  SESSION,
} from "@/lib/auth";
import { githubFetch } from "@/lib/github";
export async function GET(req: NextRequest) {
  if (!configured())
    return NextResponse.json({ error: "OAuth indisponível." }, { status: 503 });
  const failure = () => {
    const res = NextResponse.redirect(appUrl() + "/?auth=error");
    res.cookies.delete("codemood_oauth");
    return res;
  };
  try {
    const saved = unseal<{ state: string; verifier: string; expires: number }>(
      req.cookies.get("codemood_oauth")?.value || "",
    );
    const state = req.nextUrl.searchParams.get("state") || "",
      code = req.nextUrl.searchParams.get("code");
    if (
      !saved ||
      saved.expires < Date.now() ||
      !code ||
      state.length !== saved.state.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))
    )
      return failure();
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          code_verifier: saved.verifier,
          redirect_uri: appUrl() + "/api/auth/callback",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    const data = await response.json();
    if (!response.ok || typeof data.access_token !== "string") return failure();
    const { data: user } = await githubFetch("/user", data.access_token);
    const maxAge = Math.min(28800, Number(data.expires_in) || 28800);
    const res = NextResponse.redirect(appUrl());
    res.cookies.set(
      SESSION,
      seal({
        token: data.access_token,
        login: user.login,
        expires: Date.now() + maxAge * 1000,
      }),
      { ...cookieOptions, maxAge },
    );
    res.cookies.delete("codemood_oauth");
    return res;
  } catch {
    return failure();
  }
}
