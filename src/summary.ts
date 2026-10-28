import type { Transaction } from "./parse.ts";
import { inRange, periodOf, type Period, type Range } from "./period.ts";

export interface CategoryRow {
  category: string;
  total: number;
  count: number;
  share: number; // of spending in the range, 0..1
}

export interface PeriodSummary {
  range: Range;
  spending: number;
  income: number;
  plannedTrip: number;
  net: number;
  categories: CategoryRow[];
}

const cents = (n: number): number => Math.round(n * 100) / 100;
const top = (category: string): string => category.split("/")[0] || "uncategorised";

/** Summarise one range. Planned trip spending is budgeted, not spent, so it is reported separately. */
export function summarise(txs: Transaction[], range: Range): PeriodSummary {
  const inside = txs.filter((t) => inRange(t.date, range));
  const spent = inside.filter((t) => t.type !== "income" && !t.planned);
  const spending = spent.reduce((s, t) => s + t.amount, 0);
  const income = inside.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const plannedTrip = inside.filter((t) => t.planned).reduce((s, t) => s + t.amount, 0);

  const byCat = new Map<string, { total: number; count: number }>();
  for (const t of spent) {
    const key = top(t.category);
    const cur = byCat.get(key) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    byCat.set(key, cur);
  }
  const categories = [...byCat.entries()]
    .map(([category, v]) => ({ category, total: cents(v.total), count: v.count, share: spending ? v.total / spending : 0 }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

  return { range, spending: cents(spending), income: cents(income), plannedTrip: cents(plannedTrip), net: cents(income - spending), categories };
}

/** One summary per period that contains at least one transaction, oldest first. */
export function summariseByPeriod(txs: Transaction[], period: Period): PeriodSummary[] {
  const starts = new Map<string, Range>();
  for (const t of txs) {
    const r = periodOf(t.date, period);
    starts.set(r.start, r);
  }
  return [...starts.values()].sort((a, b) => a.start.localeCompare(b.start)).map((r) => summarise(txs, r));
}
