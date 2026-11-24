import { NextRequest, NextResponse } from "next/server";
import { appUrl, SESSION } from "@/lib/auth";
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== appUrl())
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION);
  return res;
}
