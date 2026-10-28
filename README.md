# spend-tags

Write spending as hashtags in plain-text daily notes. `spend-tags` reads the notes and
reports spending by category and period.

```
- $4.80 flat white #log/spending/food/coffee
- $1,250.50 rent #log/spending/housing
- $300 hotel deposit #log/spending/2026/lisbon/planned/accommodation
- 120 pay #log/income/wages
```

```bash
npm install
node src/cli.ts sample/daily --period month            # table
node src/cli.ts sample/daily --period week --format csv
node src/cli.ts notes/ --from 2026-07-01 --to 2026-09-30 --format json
npm test && npm run typecheck
```

Output for the bundled sample (`npm run demo`):

```
2026-10-01 to 2026-10-31   spent 1401.91   income 120.00   net -1281.91   (planned trip 300.00)
  housing             1250.50    1 items   89%
  food                  77.50    4 items    6%
  transport             73.00    2 items    5%
  misc                   0.91    1 items    0%

1 line(s) skipped:
  sample/daily/2026-10-06.md:5  tagged line has no amount
```

## Behaviour worth knowing

- **Nothing is dropped silently.** A tagged line with no amount, or in a note with no date,
  is listed under "skipped" with file and line.
- **Planned trip money is not spending.** `.../planned/...` entries are budgeted, so they
  are reported separately and excluded from totals and category shares.
- **Dates are handled as UTC calendar days**, so a timezone or daylight-saving change cannot
  move a transaction into a different week. Weeks start on Monday; fortnights are 14-day
  windows anchored to Monday 1970-01-05.
- The last finance tag on a line wins, and non-finance tags (`#todo`) are ignored.

## Where this came from

The tag grammar and amount extraction are taken from the spending parser in my Obsidian
**Finance Tracker** plugin ([source](https://github.com/arangutambo)), which is MIT-licensed
and mine. This repository is a standalone rewrite of that small part: TypeScript with strict
types, no Obsidian dependency, a command-line interface, period summaries, CSV/JSON output,
explicit error reporting and a test suite. The rewrite and the extensions were developed
with Claude Code (Anthropic); I have read and run all of it.

## Limits

Single currency; currency codes, goals, balances and "owed" entries from the full plugin are
not implemented here. Amounts are the last number on the line, so a line such as
`2 coffees $9.60` works but `$9.60 for 2 coffees` would read 2. The test for this is in
`tests/spend-tags.test.ts`.
