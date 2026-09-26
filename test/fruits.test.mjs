import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FRUITS, ALIASES, matchFruit } from "../src/fruits.ts";

describe("fruit dictionary", () => {
  it("has ~200 canonical fruits, all alias targets valid", () => {
    assert.ok(FRUITS.length >= 190, `only ${FRUITS.length} fruits`);
    const canon = new Set(FRUITS);
    for (const [k, v] of Object.entries(ALIASES)) {
      assert.ok(canon.has(v), `alias ${k} -> missing ${v}`);
    }
  });

  it("matches exact, case, whitespace and plurals", () => {
    assert.equal(matchFruit("Medlar"), "medlar");
    assert.equal(matchFruit("  Tomato  "), "tomato");
    assert.equal(matchFruit("cherries"), "cherry");
    assert.equal(matchFruit("tomatoes"), "tomato");
    assert.equal(matchFruit("mangoes"), "mango");
    assert.equal(matchFruit("apples"), "apple");
  });

  it("matches aliases", () => {
    assert.equal(matchFruit("kiwifruit"), "kiwi");
    assert.equal(matchFruit("rockmelon"), "cantaloupe");
    assert.equal(matchFruit("horned melon"), "kiwano");
    assert.equal(matchFruit("granny smith"), "apple");
    assert.equal(matchFruit("passion fruit"), "passionfruit");
    assert.equal(matchFruit("custard apple"), "custard apple");
  });

  it("forgives typos within distance 2", () => {
    assert.equal(matchFruit("kivi"), "kiwi");
    assert.equal(matchFruit("straberry"), "strawberry");
    assert.equal(matchFruit("pinapple"), "pineapple");
    assert.equal(matchFruit("aple"), "apple");
  });

  it("rejects non-fruits without counting them", () => {
    for (const w of [
      "rhubarb",
      "carrot",
      "potato",
      "onion",
      "kale",
      "beet",
      "salt",
      "fish",
      "beer",
      "jam",
      "pie",
      "the",
      "car",
      "apple pie",
      "",
    ]) {
      assert.equal(matchFruit(w), null, w);
    }
  });
});
