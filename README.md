# Chaprola Expenses

**Live demo:** <https://chaprola.org/apps/chaprola-expenses/expenses/>

A team expense tracker built entirely on [Chaprola](https://chaprola.org). Static frontend, no proxy, no server code to deploy — the browser talks directly to `api.chaprola.org` with an origin-locked site key. This is app #2 in the Chaprola showcase pipeline; it proves the full CRUD → pivot → schedule → export lifecycle on a live dataset.

## Features

- **Dashboard** — spending by category and a category × month cross-tab, both computed server-side via `/query` pivot. Totals / pending / approved tiles update on every load.
- **Add** — insert a pending expense via `/insert-record`.
- **List** — filter by category, month, status, or free-text search; inline edit via `/update-record`. Month filter is populated dynamically from the data.
- **Review** — approve or reject any `pending` expense in one click.
- **Export** — pull expenses for a date range and download as CSV or JSON. Serialization happens in the browser from a single `/query` call.
- **Scheduled report** — a weekly `/schedule` job runs the `SUMMARY` Chaprola program and captures the aggregated output.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│ Static frontend │────▶│  api.chaprola   │
│  (HTML/JS/CSS)  │     │      .org       │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
  chaprola.org/apps        /query, /insert-record,
  /chaprola-expenses       /update-record,
  /expenses/               /export-report, /report
```

No Node.js server. No proxy. No admin credentials in the browser. The frontend holds a site key (`site_...`) that the Chaprola authorizer restricts by origin and endpoint allowlist. Stolen from devtools, the site key can only do the same reads and writes any visitor can already trigger from the live URL.

## Project layout

```
chaprola-expenses/
├── frontend/               # Static app deployed to chaprola.org
│   ├── index.html          # Dashboard
│   ├── add.html            # Add expense form
│   ├── list.html           # Filterable list + edit modal
│   ├── review.html         # Approve / reject pending
│   ├── export.html         # CSV / JSON download
│   ├── styles.css
│   └── app.js
├── chaprola/               # Chaprola language source
│   ├── DETAIL.CS           # Parameterized detail report
│   ├── DETAIL.DS           # Intent for DETAIL
│   ├── SUMMARY.CS          # Weekly rollup (used by the scheduled job)
│   └── SUMMARY.DS          # Intent for SUMMARY
├── setup-chaprola.js       # One-time bootstrap: import seed, compile, publish
├── COOKBOOK.md             # Patterns and gotchas discovered while building
├── LESSONS.md              # Platform defects and doc gaps surfaced
└── README.md               # This file
```

## Data model

One file — `ledger` — one record per expense.

| Field         | Type   | Width | Description                                |
|---------------|--------|-------|--------------------------------------------|
| `expensecode` | string |    20 | Unique identifier (`EXP-YYMMDD-NNNN`)      |
| `amount`      | string |    12 | Dollar amount as text                      |
| `category`    | string |    24 | One of nine canonical categories           |
| `company`     | string |    60 | Vendor or payee                            |
| `detail`      | string |    40 | Short free-text description                |
| `txdate`      | string |    10 | Transaction date (`YYYY-MM-DD`)            |
| `txmonth`     | string |     7 | Derived grouping month (`YYYY-MM`)         |
| `method`      | string |    14 | Payment method                             |
| `state`       | string |     8 | `pending`, `approved`, or `rejected`       |
| `submitter`   | string |    40 | Who submitted the expense                  |

Field names avoid common PHI triggers (no `name`, `id`, `date`, `phone`, etc.) because Chaprola's ingest-time PHI detector is substring-based. See `LESSONS.md`.

## Chaprola programs

| Program      | Purpose                                                                        |
|--------------|--------------------------------------------------------------------------------|
| `DETAIL.CS`  | Parameterized detail report. Accepts optional `PARAM.category`. Publishable.   |
| `SUMMARY.CS` | Aggregates state counts + dollar totals. Consumed by the weekly schedule.      |

**No `DASHBOARD.CS` or `MONTHLY.CS`.** The earlier build shipped those as stub programs that just `PRINT`ed a one-line reminder to use `/query` pivot — which exactly the thing the frontend already does. Publishing a stub as a public report is worse than not having it, so both are deleted.

## Quick start

### Browse the live app

Open <https://chaprola.org/apps/chaprola-expenses/expenses/>. The dashboard loads ~70 seed expenses across three months and you can immediately add, edit, review, and export.

### Fork and deploy your own

1. **Clone the repo:** `git clone https://github.com/cletcher/chaprola-expenses.git`
2. **Register** a Chaprola account (via `chaprola_register` or the signup flow on chaprola.org). Save the admin key (`chp_...`) in a local `.env` (this file is `.gitignore`-d).
3. **Bootstrap** the backend from the repo:
   ```
   export CHAPROLA_API_KEY=chp_your_key_here
   node setup-chaprola.js
   ```
   This imports the seed ledger, widens the tight fields via `/alter`, compiles `DETAIL.CS` and `SUMMARY.CS`, uploads their `.DS` intent files, and publishes `DETAIL` as a public report.
4. **Create a site key** for the frontend (via `chaprola_create_site_key`). The `allowed_origins` must be the exact scheme+host of where you'll serve the app (e.g. `https://chaprola.org`) — path patterns do not work against browser `Origin` headers. See `LESSONS.md`.
5. **Drop the site key** into `frontend/app.js` (the `SITE_KEY` constant at the top).
6. **Deploy the frontend:**
   ```
   tar czf /tmp/frontend.tar.gz -C frontend .
   # Upload via chaprola_app_deploy_inline or the /app/deploy/inline endpoint.
   ```
7. **(Optional)** schedule the weekly summary:
   ```
   POST /schedule {
     name: "weekly-summary",
     cron: "0 9 * * 1",
     endpoint: "/report",
     body: { project: "expenses", name: "SUMMARY", primary_file: "ledger" }
   }
   ```

## License

MIT.
