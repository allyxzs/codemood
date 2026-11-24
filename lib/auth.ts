import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
export const SESSION = "codemood_session";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export const configured = () =>
  Boolean(
    process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET &&
    /^[a-f0-9]{64}$/i.test(process.env.SESSION_SECRET || "") &&
    process.env.APP_URL,
  );
export function appUrl() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("APP_URL must use HTTPS in production");
  return url.origin;
}
export function seal(value: object) {
  const iv = randomBytes(12),
    cipher = createCipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.SESSION_SECRET!, "hex"),
      iv,
    );
  const payload = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), payload]).toString(
    "base64url",
  );
}
export function unseal<T>(value: string): T | null {
  try {
    const b = Buffer.from(value, "base64url"),
      dec = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(process.env.SESSION_SECRET!, "hex"),
        b.subarray(0, 12),
      );
    dec.setAuthTag(b.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([dec.update(b.subarray(28)), dec.final()]).toString(),
    );
  } catch {
    return null;
  }
}
export async function session() {
  const value = (await cookies()).get(SESSION)?.value;
  if (!value) return null;
  const data = unseal<{ token: string; login: string; expires: number }>(value);
  return data && data.expires > Date.now() ? data : null;
}
