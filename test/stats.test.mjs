import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sharePct, rarerThanPct } from "../src/stats.ts";

describe("fruit percentages", () => {
  it("computes share that fits within 100 for the reported case", () => {
    // Bug report: total 16 -> rarerThan 93.8/87.5/81.3/81.3/62.5 summed to 406%.
    const total = 16;
    const shares = [1, 2, 3, 3, 6].map((c) => sharePct(c, total));
    assert.deepEqual(shares, [6.3, 12.5, 18.8, 18.8, 37.5]);
    const sum = shares.reduce((a, b) => a + b, 0);
    assert.ok(sum <= 100, `shares sum to ${sum}`);
  });

  it("keeps rarerThan as the complement of share", () => {
    assert.equal(rarerThanPct(1, 16), 93.8);
    assert.equal(rarerThanPct(6, 16), 62.5);
    // Independent 1-decimal rounding: 6.3 + 93.8 = 100.1, within tolerance.
    const sum = sharePct(1, 16) + rarerThanPct(1, 16);
    assert.ok(Math.abs(sum - 100) < 0.2, `complement sums to ${sum}`);
  });

  it("returns 0 when there are no guesses yet", () => {
    assert.equal(sharePct(0, 0), 0);
    assert.equal(rarerThanPct(0, 0), 0);
  });
});
