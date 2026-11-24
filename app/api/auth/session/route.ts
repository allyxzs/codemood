import { NextResponse } from "next/server";
import { configured, session } from "@/lib/auth";
export async function GET() {
  const data = await session();
  return NextResponse.json(
    { configured: configured(), login: data?.login || null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
