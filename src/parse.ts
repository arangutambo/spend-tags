import { lastTag, type EntryType } from "./tags.ts";

export interface Transaction {
  date: string; // YYYY-MM-DD
  amount: number;
  type: EntryType;
  category: string;
  trip: string;
  planned: boolean;
  description: string;
  source: string; // file path
  line: number; // 1-based
}

export interface Problem {
  source: string;
  line: number;
  message: string;
}

/** The date of a note: front-matter `date:` first, else a YYYY-MM-DD.md file name. */
export function noteDate(content: string, filePath: string): string | null {
  const fm = content.match(/^---[\s\S]*?\bdate:\s*(\d{4}-\d{2}-\d{2})\b/m);
  if (fm) return fm[1];
  const fn = filePath.match(/(\d{4}-\d{2}-\d{2})\.md$/);
  return fn ? fn[1] : null;
}

/**
 * The amount written on a line: the last number outside the tags. Handles "$1,250.50",
 * "$.91" (no leading zero) and negatives. Returns null when the line has no number.
 */
export function visibleAmount(line: string): number | null {
  const text = line.replace(/#[^\s#\]]+/g, " ").replace(/^\s*-\s*(?:\[[^\]]\]\s*)?/, "");
  const nums = [...text.matchAll(/-?\d[\d,]*(?:\.\d+)?|-?\.\d+/g)]
    .map((m) => Number(m[0].replace(/,/g, "")))
    .filter(Number.isFinite);
  return nums.length ? nums[nums.length - 1] : null;
}

function describe(line: string): string {
  return line
    .replace(/#[^\s#\]]+/g, " ")
    .replace(/^\s*-\s*(?:\[[^\]]\]\s*)?/, "")
    .replace(/[-+]?\$?\s*\d[\d,]*(?:\.\d+)?|\$?\.\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNote(content: string, filePath: string): { transactions: Transaction[]; problems: Problem[] } {
  const date = noteDate(content, filePath);
  const transactions: Transaction[] = [];
  const problems: Problem[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  lines.forEach((text, i) => {
    const tag = lastTag(text);
    if (!tag) return;
    const where = { source: filePath, line: i + 1 };
    if (!date) return void problems.push({ ...where, message: "tagged line in a note with no date" });
    const amount = visibleAmount(text);
    if (amount === null) return void problems.push({ ...where, message: "tagged line has no amount" });
    transactions.push({
      date, amount: Math.abs(amount), type: tag.type, category: tag.category, trip: tag.trip,
      planned: tag.planned, description: describe(text), ...where,
    });
  });
  return { transactions, problems };
}
