const assert = require("node:assert");
const { test } = require("node:test");

const { summarize, reportText } = require("./send-sync-report.js");

const placed = (id) => ({ id, name: id, slug: id, displayOnApp: true, periods: { 66: { lat: 1, lon: 2 } } });
const unplaced = (id) => ({ id, name: id, slug: id, displayOnApp: true, periods: {} });
const notOnGlobe = (id) => ({ id, name: id, slug: id, displayOnApp: false });
const ids = (items) => items.map((item) => item.id);

test("a new placed content is added", () => {
  const { added, unplaced: left, removed } = summarize({ items: [placed("a")] }, { items: [placed("a"), placed("b")] });
  assert.deepStrictEqual([ids(added), ids(left), ids(removed)], [["b"], [], []]);
});

test("a content placed at last is added", () => {
  assert.deepStrictEqual(ids(summarize({ items: [unplaced("a")] }, { items: [placed("a")] }).added), ["a"]);
});

test("a new content without position is reported once", () => {
  assert.deepStrictEqual(ids(summarize({ items: [] }, { items: [unplaced("a")] }).unplaced), ["a"]);
  assert.deepStrictEqual(ids(summarize({ items: [unplaced("a")] }, { items: [unplaced("a")] }).unplaced), []);
});

test("a removed content is reported, a content never placed is not", () => {
  const { removed } = summarize({ items: [placed("a"), notOnGlobe("b")] }, { items: [] });
  assert.deepStrictEqual(ids(removed), ["a"]);
});

test("a content not meant for the globe stays silent", () => {
  const changes = summarize({ items: [] }, { items: [notOnGlobe("a")] });
  assert.deepStrictEqual([changes.added, changes.unplaced, changes.removed], [[], [], []]);
});

test("the report names the environment and the contents", () => {
  const text = reportText({ added: [placed("a")], unplaced: [], removed: [] }, "staging");
  assert.match(text, /staging/);
  assert.match(text, /- a:/);
});
