import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUNDS, START_CAPITAL, simulate, pct } from "../src/lib/arena.ts";

test("dataset shape", () => {
  assert.equal(START_CAPITAL, 1000);
  assert.equal(ROUNDS.length, 6);
});

test("pct formatting", () => {
  assert.equal(pct(0), "0.0%");
  assert.equal(pct(-6.4), "-6.4%");
  assert.equal(pct(9.5), "+9.5%");
});

test("reject all: human capital untouched, vetoes counted", () => {
  const r = simulate(["no", "no", "no", "no", "no", "no"]);
  assert.equal(r.hu, 1000);
  assert.equal(r.huRoi, 0);
  assert.equal(r.good, 3);
  assert.equal(r.bad, 2);
});

test("approve all: human equals autonomous AI", () => {
  const r = simulate(["ok", "ok", "ok", "ok", "ok", "ok"]);
  assert.equal(r.hu, r.ai);
  assert.equal(r.huRoi, r.aiRoi);
  assert.equal(r.good, 0);
  assert.equal(r.bad, 0);
});

test("autonomous AI loses money on this dataset", () => {
  const r = simulate(["ok", "ok", "ok", "ok", "ok", "ok"]);
  assert.ok(r.aiRoi < 0, "expected AI ROI < 0, got " + r.aiRoi);
});

test("optimal oversight (block losers, keep winners) beats AI", () => {
  const r = simulate(["no", "ok", "no", "no", "ok", "no"]);
  assert.equal(r.good, 3);
  assert.equal(r.bad, 0);
  assert.ok(r.huRoi > r.aiRoi, "human should beat AI");
  assert.ok(r.huRoi > 0, "human should be profitable");
});
