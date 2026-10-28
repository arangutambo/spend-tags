export type Period = "week" | "fortnight" | "month" | "quarter" | "year";

const DAY = 86_400_000;
// Dates are handled as UTC midnights so a local timezone or DST change can never shift a day.
const toMs = (iso: string): number => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const toIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export interface Range {
  start: string;
  end: string; // inclusive
}

/** The period containing `iso`. Weeks start on Monday; fortnights are two such weeks counted from 1970-01-05. */
export function periodOf(iso: string, period: Period): Range {
  const ms = toMs(iso);
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const mo = dt.getUTCMonth();
  switch (period) {
    case "week": {
      const back = (dt.getUTCDay() + 6) % 7;
      return { start: toIso(ms - back * DAY), end: toIso(ms - back * DAY + 6 * DAY) };
    }
    case "fortnight": {
      const epochMonday = Date.UTC(1970, 0, 5);
      const n = Math.floor((ms - epochMonday) / (14 * DAY));
      const start = epochMonday + n * 14 * DAY;
      return { start: toIso(start), end: toIso(start + 13 * DAY) };
    }
    case "month":
      return { start: toIso(Date.UTC(y, mo, 1)), end: toIso(Date.UTC(y, mo + 1, 0)) };
    case "quarter": {
      const q = Math.floor(mo / 3) * 3;
      return { start: toIso(Date.UTC(y, q, 1)), end: toIso(Date.UTC(y, q + 3, 0)) };
    }
    case "year":
      return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
}

export const inRange = (iso: string, r: Range): boolean => iso >= r.start && iso <= r.end;
