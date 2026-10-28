import assert from "node:assert/strict";
import test from "node:test";
import { parseTag, lastTag } from "../src/tags.ts";
import { noteDate, parseNote, visibleAmount } from "../src/parse.ts";
import { periodOf } from "../src/period.ts";
import { summarise, summariseByPeriod } from "../src/summary.ts";

test("parseTag: ordinary, trip, planned trip, income, and non-finance tags", () => {
  assert.deepEqual(parseTag("log/spending/food/coffee"), { type: "spending", category: "food/coffee", trip: "", planned: false });
  assert.deepEqual(parseTag("log/spending/2026/lisbon/food"), { type: "trip-spending", category: "food", trip: "2026/lisbon", planned: false });
  assert.deepEqual(parseTag("log/spending/2026/lisbon/planned/accommodation"), { type: "trip-spending", category: "accommodation", trip: "2026/lisbon", planned: true });
  assert.equal(parseTag("log/income/wages")?.type, "income");
  assert.equal(parseTag("log/spending")?.category, "uncategorised");
  assert.equal(parseTag("project/ideas"), null);
  assert.equal(parseTag("log"), null);
});

test("lastTag: the last finance tag on the line wins and other tags are ignored", () => {
  assert.equal(lastTag("- $5 x #todo #log/spending/food #log/spending/misc")?.category, "misc");
  assert.equal(lastTag("- $5 x #todo"), null);
});

test("visibleAmount: thousands separators, missing leading zero, last number wins, none", () => {
  assert.equal(visibleAmount("- $1,250.50 rent #log/spending/housing"), 1250.5);
  assert.equal(visibleAmount("- $.91 bag #log/spending/misc"), 0.91);
  assert.equal(visibleAmount("- 2 coffees $9.60 #log/spending/food"), 9.6);
  assert.equal(visibleAmount("- coffee #log/spending/food"), null);
  assert.equal(visibleAmount("- [ ] $3 bus #log/spending/transport"), 3);
});

test("noteDate: front matter beats file name; either works alone", () => {
  assert.equal(noteDate("---\ndate: 2026-01-02\n---\n", "daily/2026-03-04.md"), "2026-01-02");
  assert.equal(noteDate("no frontmatter", "daily/2026-03-04.md"), "2026-03-04");
  assert.equal(noteDate("no frontmatter", "daily/notes.md"), null);
});

test("parseNote: reports tagged lines it cannot use instead of dropping them silently", () => {
  const r = parseNote("- $4 a #log/spending/food\n- no number #log/spending/food\n- untagged $9\n", "x/2026-05-01.md");
  assert.equal(r.transactions.length, 1);
  assert.equal(r.transactions[0].description, "a");
  assert.deepEqual(r.problems.map((p) => [p.line, p.message]), [[2, "tagged line has no amount"]]);
  const undated = parseNote("- $4 a #log/spending/food\n", "x/notes.md");
  assert.equal(undated.transactions.length, 0);
  assert.equal(undated.problems.length, 1);
});

test("periodOf: Monday weeks, month ends including leap February, quarters, and fortnight stability", () => {
  assert.deepEqual(periodOf("2026-10-28", "week"), { start: "2026-10-26", end: "2026-11-01" });
  assert.deepEqual(periodOf("2026-11-01", "week"), { start: "2026-10-26", end: "2026-11-01" }); // Sunday belongs to the week before
  assert.deepEqual(periodOf("2028-02-10", "month"), { start: "2028-02-01", end: "2028-02-29" });
  assert.deepEqual(periodOf("2026-08-15", "quarter"), { start: "2026-07-01", end: "2026-09-30" });
  // Fortnights are anchored to Monday 1970-01-05, so 2026-09-28 and 2026-10-12 each start one.
  assert.deepEqual(periodOf("2026-10-11", "fortnight"), { start: "2026-09-28", end: "2026-10-11" });
  assert.deepEqual(periodOf("2026-10-12", "fortnight"), { start: "2026-10-12", end: "2026-10-25" });
});

test("summarise: planned trip money is reported apart from spending; income is not spending", () => {
  const txs = [
    ...parseNote("- $10 a #log/spending/food/coffee\n- $30 b #log/spending/food/groceries\n- $60 c #log/spending/transport\n", "d/2026-10-01.md").transactions,
    ...parseNote("- $500 d #log/spending/2026/lisbon/planned/hotel\n- $100 pay #log/income/wages\n", "d/2026-10-02.md").transactions,
  ];
  const s = summarise(txs, { start: "2026-10-01", end: "2026-10-31" });
  assert.equal(s.spending, 100);
  assert.equal(s.income, 100);
  assert.equal(s.plannedTrip, 500);
  assert.equal(s.net, 0);
  assert.deepEqual(s.categories.map((c) => [c.category, c.total]), [["transport", 60], ["food", 40]]);
  assert.equal(Math.round(s.categories[0].share * 100), 60);
});

test("summariseByPeriod: skips empty periods and is oldest first", () => {
  const txs = [
    ...parseNote("- $1 a #log/spending/x\n", "d/2026-03-05.md").transactions,
    ...parseNote("- $2 b #log/spending/x\n", "d/2026-01-20.md").transactions,
  ];
  const out = summariseByPeriod(txs, "month");
  assert.deepEqual(out.map((o) => o.range.start), ["2026-01-01", "2026-03-01"]);
});
