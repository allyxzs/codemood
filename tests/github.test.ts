import { test } from "node:test";
import assert from "node:assert/strict";
import { githubFetch, GitHubError, getCommits } from "../lib/github";
for (const status of [401, 403, 404, 422, 429, 500])
  test(`GitHub HTTP ${status} is handled without leaking upstream data`, async () => {
    const saved = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response('{"message":"sensitive upstream data"}', { status });
    try {
      await assert.rejects(
        () => githubFetch("/repos/a/b"),
        (e: unknown) =>
          e instanceof GitHubError &&
          e.status === status &&
          !e.message.includes("sensitive"),
      );
    } finally {
      globalThis.fetch = saved;
    }
  });
test("empty repository returns empty commit list", async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 409 });
  try {
    assert.deepEqual(await getCommits("a/b", ""), {
      commits: [],
      truncated: false,
    });
  } finally {
    globalThis.fetch = saved;
  }
});
test("branch name is URL encoded and token remains in server header", async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.equal(new URL(url).searchParams.get("sha"), "feature/new chart");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer test-only",
    );
    assert.ok(!url.includes("test-only"));
    return new Response("[]");
  };
  try {
    await getCommits("a/b", "feature/new chart", "test-only");
  } finally {
    globalThis.fetch = saved;
  }
});
