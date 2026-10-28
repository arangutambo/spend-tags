/**
 * Tag grammar (from the Finance Tracker Obsidian plugin):
 *   #log/spending/<category>[/<subcategory>]      ordinary spending
 *   #log/spending/<year>/<trip>[/planned]/<cat>   spending on a trip (planned = budgeted, not yet spent)
 *   #log/income/<bucket>                           income
 * Anything else under #log/ is ignored; a line with no #log tag is not a transaction.
 */
export type EntryType = "spending" | "trip-spending" | "income";

export interface TagInfo {
  type: EntryType;
  category: string;
  trip: string;
  planned: boolean;
}

const YEAR = /^(?:\d{2}|\d{4})$/;

const slug = (s: string): string =>
  s.trim().toLowerCase().replace(/[^a-z0-9/_-]+/g, "-").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

/** Parse one tag body (without the leading #). Returns null when it is not a finance tag. */
export function parseTag(raw: string): TagInfo | null {
  const parts = slug(raw).split("/").filter(Boolean);
  if (parts[0] !== "log" || parts.length < 2) return null;

  if (parts[1] === "income") {
    return { type: "income", category: parts.slice(2).join("/") || "income", trip: "", planned: false };
  }
  if (parts[1] !== "spending") return null;

  const rest = parts.slice(2);
  if (rest.length >= 2 && YEAR.test(rest[0])) {
    const trip = `${rest[0]}/${rest[1]}`;
    const tail = rest.slice(2);
    const planned = tail[0] === "planned";
    const category = (planned ? tail.slice(1) : tail).join("/") || "uncategorised";
    return { type: "trip-spending", category, trip, planned };
  }
  return { type: "spending", category: rest.join("/") || "uncategorised", trip: "", planned: false };
}

/** The last finance tag on a line wins, matching the plugin's behaviour. */
export function lastTag(line: string): TagInfo | null {
  const found = [...line.matchAll(/#([^\s#\]]+)/g)];
  for (let i = found.length - 1; i >= 0; i--) {
    const info = parseTag(found[i][1]);
    if (info) return info;
  }
  return null;
}
