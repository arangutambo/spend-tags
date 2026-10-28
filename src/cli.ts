#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseNote, type Problem, type Transaction } from "./parse.ts";
import { summariseByPeriod } from "./summary.ts";
import type { Period } from "./period.ts";

const PERIODS: Period[] = ["week", "fortnight", "month", "quarter", "year"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    period: { type: "string", default: "month" },
    format: { type: "string", default: "table" },
    from: { type: "string" },
    to: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || positionals.length === 0) {
  console.log("usage: spend-tags <dir> [--period week|fortnight|month|quarter|year] [--format table|csv|json] [--from YYYY-MM-DD] [--to YYYY-MM-DD]");
  process.exit(positionals.length === 0 && !values.help ? 2 : 0);
}
if (!PERIODS.includes(values.period as Period)) {
  console.error(`unknown period "${values.period}"`);
  process.exit(2);
}

const all: Transaction[] = [];
const problems: Problem[] = [];
for (const file of walk(positionals[0])) {
  const r = parseNote(readFileSync(file, "utf8"), file);
  all.push(...r.transactions);
  problems.push(...r.problems);
}
const txs = all.filter((t) => (!values.from || t.date >= values.from) && (!values.to || t.date <= values.to));
const summaries = summariseByPeriod(txs, values.period as Period);

if (values.format === "json") {
  console.log(JSON.stringify({ summaries, problems }, null, 2));
} else if (values.format === "csv") {
  console.log("period_start,period_end,category,total,count,share");
  for (const s of summaries)
    for (const c of s.categories) console.log([s.range.start, s.range.end, c.category, c.total, c.count, c.share.toFixed(3)].join(","));
} else {
  for (const s of summaries) {
    console.log(`\n${s.range.start} to ${s.range.end}   spent ${s.spending.toFixed(2)}   income ${s.income.toFixed(2)}   net ${s.net.toFixed(2)}` +
      (s.plannedTrip ? `   (planned trip ${s.plannedTrip.toFixed(2)})` : ""));
    for (const c of s.categories) console.log(`  ${c.category.padEnd(16)} ${c.total.toFixed(2).padStart(10)}  ${String(c.count).padStart(3)} items  ${(c.share * 100).toFixed(0).padStart(3)}%`);
  }
}
if (problems.length) {
  console.error(`\n${problems.length} line(s) skipped:`);
  for (const p of problems) console.error(`  ${p.source}:${p.line}  ${p.message}`);
}
