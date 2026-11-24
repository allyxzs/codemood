import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  breakdown,
  timeline,
  filterCommits,
  commitOfMonth,
} from "../lib/sentiment";
import { parseRepo, getCommits } from "../lib/github";
import type { Commit } from "../lib/types";
const c = (message: string, date = "2026-11-24T10:00:00Z"): Commit => ({
  sha: "abc",
  message,
  date,
  repo: "a/b",
  author: "Alex",
});
for (const [message, mood] of [
  ["fix: update bug handler", "neutral"],
  ["Finalmente funcionou! 🎉", "happy"],
  ["it works on my machine", "chaotic"],
  ["wtf, broken again", "frustrated"],
  ["preciso de café e dormir", "tired"],
  ["proud! shipped 🚀", "proud"],
  ["not happy, just update docs", "neutral"],
  ["não estou cansado", "neutral"],
  ["feature: template engine", "neutral"],
  ["temp hack, fix it later", "chaotic"],
]) {
  test(`classifies: ${message}`, () =>
    assert.equal(analyze(c(message)).mood, mood));
}
test("percentage denominator includes neutral", () => {
  const d = breakdown([analyze(c("yay")), analyze(c("docs"))]);
  assert.equal(d.find((x) => x.mood === "happy")?.percent, 50);
  assert.equal(
    d.reduce((a, b) => a + b.percent, 0),
    100,
  );
});
test("empty data does not produce NaN", () => {
  assert.deepEqual(timeline([]), []);
  assert.ok(breakdown([]).every((x) => x.percent === 0));
});
test("UTC weeks start on Monday and include Sunday", () => {
  const t = timeline([
    analyze(c("yay", "2026-11-22T23:59:00Z")),
    analyze(c("wtf", "2026-11-23T00:00:00Z")),
  ]);
  assert.deepEqual(
    t.map((p) => p.date),
    ["2026-11-16", "2026-11-23"],
  );
  assert.deepEqual(
    t.map((p) => p.score),
    [100, -100],
  );
});
test("monthly aggregation", () =>
  assert.equal(
    timeline([analyze(c("yay")), analyze(c("wtf"))], "month")[0].score,
    0,
  ));
test("filters include end date and normalize authors", () =>
  assert.equal(
    filterCommits(
      [analyze(c("yay"))],
      "2026-11-24",
      "2026-11-24",
      "alex",
      "happy",
    ).length,
    1,
  ));
test("monthly winner uses explicit month and intensity", () => {
  const list = [
    analyze(c("yay")),
    analyze(c("wtf damn hate", "2026-10-05T00:00:00Z")),
  ];
  assert.equal(commitOfMonth(list, "2026-11")?.mood, "happy");
  assert.equal(commitOfMonth(list, "2025-01"), undefined);
});
test("repo parser accepts URLs and short references", () => {
  assert.equal(
    parseRepo("https://github.com/allyxzs/codemood.git/"),
    "allyxzs/codemood",
  );
  assert.equal(parseRepo("owner/name"), "owner/name");
});
test("repo parser rejects arbitrary hosts and paths", () => {
  for (const value of [
    "https://evil.com/a/b",
    "http://localhost/a/b",
    "https://github.com/a/b/issues",
    "a/..",
    "a/b?x=1",
    "https://github.com@evil.com/a/b",
  ])
    assert.throws(() => parseRepo(value));
});
test("pagination preserves all commits and reports truncation", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(
      JSON.stringify([
        {
          sha: String(calls),
          commit: {
            message: "docs",
            author: { date: "2026-11-24T00:00:00Z", name: "a" },
          },
        },
      ]),
      { headers: { link: '<https://api.github.com/next>; rel="next"' } },
    );
  };
  try {
    const data = await getCommits("a/b", "main");
    assert.equal(calls, 5);
    assert.equal(data.commits.length, 5);
    assert.equal(data.truncated, true);
  } finally {
    globalThis.fetch = original;
  }
});
