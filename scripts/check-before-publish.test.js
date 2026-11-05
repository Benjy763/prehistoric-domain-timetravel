const assert = require("node:assert");
const { test } = require("node:test");

const { findProblems } = require("./check-before-publish.js");

const items = (count) =>
  Array.from({ length: count }, (_, i) => ({
    slug: `item-${i}`,
    periods: { 66: { lat: 10, lon: 20 } },
  }));

test("accepts a normal update", () => {
  assert.deepStrictEqual(findProblems({ items: items(100) }, { items: items(101) }), []);
});

test("accepts a first file", () => {
  assert.deepStrictEqual(findProblems({ items: [] }, { items: items(3) }), []);
});

test("accepts a loss of exactly 10%", () => {
  assert.deepStrictEqual(findProblems({ items: items(100) }, { items: items(90) }), []);
});

test("refuses more than 10% lost at once", () => {
  assert.strictEqual(findProblems({ items: items(100) }, { items: items(89) }).length, 1);
});

test("refuses an empty or malformed file", () => {
  assert.strictEqual(findProblems({ items: items(5) }, { items: [] }).length, 1);
  assert.strictEqual(findProblems({ items: items(5) }, {}).length, 1);
});

test("refuses a placed content without coordinates", () => {
  const broken = { slug: "broken", periods: { 66: { lat: null, lon: 20 } } };
  assert.match(findProblems({ items: [] }, { items: [broken] })[0], /broken/);
});

test("accepts a content that is not placed", () => {
  assert.deepStrictEqual(findProblems({ items: [] }, { items: [{ slug: "unplaced" }] }), []);
});
