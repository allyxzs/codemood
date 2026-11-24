import { test } from "node:test";
import assert from "node:assert/strict";
import { seal, unseal, configured } from "../lib/auth";
process.env.SESSION_SECRET = "ab".repeat(32);
test("session encryption round trip", () => {
  const data = { token: "test-secret", login: "tester", expires: 123 };
  const encrypted = seal(data);
  assert.ok(!encrypted.includes("test-secret"));
  assert.deepEqual(unseal(encrypted), data);
});
test("encrypted sessions use a fresh nonce", () =>
  assert.notEqual(seal({ a: 1 }), seal({ a: 1 })));
test("tampered session is rejected", () => {
  const raw = Buffer.from(seal({ token: "secret" }), "base64url");
  raw[raw.length - 1] ^= 1;
  assert.equal(unseal(raw.toString("base64url")), null);
  assert.equal(unseal("junk"), null);
});
test("OAuth remains off without client credentials", () => {
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;
  assert.equal(configured(), false);
});
