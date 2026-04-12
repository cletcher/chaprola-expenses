# Chaprola Expenses — Cookbook

Patterns discovered while building this app. Generic Chaprola reference lives in the main docs (`chaprola://cookbook`, `chaprola://endpoints`, `chaprola://gotchas`); this file only captures what's specific to the expense-tracker showcase.

---

## 1. Server-side GROUP BY via `/query` pivot

The dashboard runs five `/query` calls in parallel (`Promise.all`), each with a different `pivot` to let the backend do the aggregation. No JavaScript rollup loop, no client-side summation of 70 records.

```js
// Total amount by state (approved / pending / rejected)
pivot: { row: 'state', column: '', value: 'amount', aggregate: 'sum' }

// Record count by state
pivot: { row: 'state', column: '', value: 'state', aggregate: 'count' }

// Total amount by category
pivot: { row: 'category', column: '', value: 'amount', aggregate: 'sum' }

// Record count by category
pivot: { row: 'category', column: '', value: 'category', aggregate: 'count' }

// Cross-tab: category × month, summed dollars
pivot: { row: 'category', column: 'txmonth', value: 'amount', aggregate: 'sum' }
```

### Response shape (not what the docs imply)

The real shape of a `/query` pivot response is a **matrix**, not a records array:

```json
"pivot": {
  "rows": ["approved", "pending"],
  "columns": [""],
  "values": [[27150.44], [5400.0]],
  "row_totals": [27150.44, 5400.0],
  "column_totals": [32550.44]
}
```

For the category × month cross-tab, `columns` is `["2026-01", "2026-02", "2026-03"]` and `values[i][j]` is the cell for row `i` and column `j`. `row_totals[i]` is the sum across that row; `column_totals[j]` is the sum down that column. Grand total is not a separate field — sum `column_totals` client-side if you want it.

Older examples (including ones in this project's earlier `COOKBOOK.md`) showed `records[{category: "X", amount_sum: N}]` — that shape does not exist in the response today.

### Multi-aggregate pivots don't exist

There is no way to get both SUM and COUNT out of a single pivot call. `value` can be a string or array, but `aggregate` is a single function and applies to every value. If you want both, you call `/query` twice — once with `aggregate: "sum"` and once with `aggregate: "count"`. The dashboard's five pivot calls include two pairs for this reason.

---

## 2. Parameterized detail report (`DETAIL.CS`)

`DETAIL` is the only publishable Chaprola program this app ships. It produces pipe-delimited output, optionally filtered to a single category.

```chaprola
// DETAIL.CS — Expense detail report

MOVE PARAM.category U.200 24
IF BLANK U.200 24 GOTO 200
QUERY ledger INTO results WHERE category EQ PARAM.category ORDER BY txdate DESC
GOTO 300

200 QUERY ledger INTO results WHERE expensecode NE "" ORDER BY txdate DESC

300 PRINT "DATE|CATEGORY|COMPANY|DETAIL|AMOUNT|STATE|SUBMITTER"

LET rec = 1

400 READ results rec
    IF EOF END
    PRINT results.txdate + "|" + results.category + "|" + results.company + "|" + results.detail + "|" + results.amount + "|" + results.state + "|" + results.submitter
    LET rec = rec + 1
    GOTO 400
```

### Gotchas

- **`IF BLANK PARAM.category GOTO 200`** fails to compile. `IF BLANK` accepts `P.field` and `U.location` addressing, but not `PARAM.*`. Stage the param into a U-location first (`MOVE PARAM.category U.200 24`) and then `IF BLANK U.200 24`.
- **`QUERY ledger ORDER BY txdate DESC`** (no `WHERE`) fails with `QUERY requires WHERE`. Use a tautology: `WHERE expensecode NE ""`.
- **`PARAM.category` matches records with a blank `category` field** when the caller omits it — not "all records". That's why the program branches to a separate `QUERY` statement for the no-param case.

Call it via `/report?userid=chaprola-expenses&project=expenses&name=DETAIL&category=Travel` (or any other category), or via `POST /run` with `params: { category: "Travel" }`. Both work for reads; `/report` is public and doesn't need auth, `/run` works with a site key.

---

## 3. Weekly summary via `/schedule` + `SUMMARY.CS`

`SUMMARY.CS` splits the ledger into approved and pending subsets and reports counts + dollar totals. It's 30 lines, all idiomatic style-guide syntax.

```chaprola
QUERY ledger INTO approved_set WHERE state EQ "approved"
QUERY ledger INTO pending_set WHERE state EQ "pending"

LET approved_total = 0
LET rec = 1

100 READ approved_set rec
    IF EOF GOTO 200
    GET R10 FROM approved_set.amount
    LET approved_total = approved_total + R10
    LET rec = rec + 1
    GOTO 100

200 LET pending_total = 0
    LET rec = 1

300 READ pending_set rec
    IF EOF GOTO 400
    GET R10 FROM pending_set.amount
    LET pending_total = pending_total + R10
    LET rec = rec + 1
    GOTO 300

400 PRINT "WEEKLY EXPENSE SUMMARY"
    PRINT "Approved: " + approved_set.RECORDCOUNT + " expenses, $" + approved_total
    PRINT "Pending:  " + pending_set.RECORDCOUNT + " expenses, $" + pending_total
```

### Gotchas

- **`GET amt FROM approved_set.amount`** fails with `GET requires an R-variable`, even though style rule #3 says to avoid `DEFINE VARIABLE`. The workaround is to use an explicit R-slot (`GET R10 FROM approved_set.amount`) and reuse it in the immediately-following `LET`.
- **Accumulating while iterating a QUERY result** works — `approved_total = approved_total + R10` inside the `READ` loop accumulates correctly across iterations.
- **`approved_set.RECORDCOUNT`** gives the count of matched rows without needing a separate counter.

### Scheduling it

```js
POST /schedule {
  userid: "chaprola-expenses",
  name: "weekly-summary",
  cron: "0 9 * * 1",          // Monday 09:00 UTC
  endpoint: "/report",
  body: { project: "expenses", name: "SUMMARY", primary_file: "ledger" }
}
```

The scheduler invokes the target endpoint on the cron, captures the response in the schedule run history, and stores a hash for `skip_if_unchanged` comparisons. It does **not** pipe the output into `/email/send` — that would need a platform feature (templating in the schedule body, or a new "run-then-email" endpoint) that doesn't exist yet. For now, `POST /schedule/list` shows the last run's captured output.

---

## 4. Origin-locked site keys (the pattern that actually works)

For a static frontend that needs to write via `/insert-record` and `/update-record`, you need a site key. The key's `allowed_origins` must match the browser's `Origin` header, which is always scheme + host + port — **never** a path.

```js
POST /create-site-key {
  userid: "chaprola-expenses",
  label: "expenses-frontend",
  allowed_origins: ["https://chaprola.org"],    // scheme + host only
  allowed_endpoints: [
    "/query", "/insert-record", "/update-record", "/export-report", "/report"
  ]
}
```

Path patterns like `"https://chaprola.org/apps/.../*"` **do not work** against browser requests — the backend's `origin_matches` does a `starts_with` comparison and a browser `Origin` is shorter than a path prefix, so the match always fails. See `LESSONS.md` #1 for the full story.

`/download` and `/delete-record` are always rejected for site keys regardless of `allowed_endpoints` — those require a full admin key. This app avoids both: exports are generated client-side from a `/query` response, and deletes are done via `/update-record` setting `state` to `rejected` (a soft-delete that the Review page drives).

---

## 5. Client-side CSV/JSON export from `/query`

The Export page skips `/export-report` entirely and builds the download in the browser:

```js
const data = await api('/query', {
  file: 'ledger',
  where: [{ field: 'txdate', op: 'ge', value: startDate },
          { field: 'txdate', op: 'le', value: endDate }],
  order_by: [{ field: 'txdate', dir: 'asc' }]
});

const records = data.records;
const columns = ['txdate', 'category', 'company', 'detail', 'amount', 'state', 'submitter'];

const csv = [columns.join(','), ...records.map(r => columns.map(c => escapeCell(r[c])).join(','))].join('\n');

const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = Object.assign(document.createElement('a'), { href: url, download: 'expenses.csv' });
a.click();
URL.revokeObjectURL(url);
```

Why not `/export-report`? The backend's text-to-CSV conversion mangles fixed-width field boundaries — see `LESSONS.md` #4. For the V1 showcase, doing it client-side is faster, reliable, and produces identical output.

---

## Quick reference

### WHERE shape varies by endpoint

```js
// /query — array of condition objects
where: [{ field: "state", op: "eq", value: "pending" }]

// /update-record, /delete-record — plain object
where: { expensecode: "EXP-..." }
```

### Order-by shape (docs lie)

```js
// Docs say this works. It does not.
order_by: "txdate desc"

// This is what the parser accepts today.
order_by: [{ field: "txdate", dir: "desc" }]
```

### Field widths for this project

```
expensecode  20
amount       12
category     24
company      60
detail       40
txdate       10
txmonth       7
method       14
state         8
submitter    40
```

Initially Chaprola auto-sized `expensecode` to 12 and `amount` to 7, both of which are too tight — new records with millisecond-precision IDs would truncate, and any amount ≥ 10000 would silently lose the leading digit. This app widens them via `/alter` at setup time; the bootstrap script handles this automatically.
