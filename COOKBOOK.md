# Chaprola Expenses Cookbook

This cookbook documents the key Chaprola patterns demonstrated in this expense tracking application.

## 1. Pivot as GROUP BY

Chaprola doesn't have SQL, but its `pivot` feature in `/query` provides equivalent functionality to `GROUP BY` with aggregations.

### Category Spending Breakdown

**SQL equivalent:**
```sql
SELECT category, SUM(amount), COUNT(*)
FROM ledger
GROUP BY category
ORDER BY SUM(amount) DESC
```

**Chaprola:**
```javascript
POST /query {
  userid: "chaprola-expenses",
  project: "expenses",
  file: "ledger",
  pivot: {
    row: "category",
    values: [
      { field: "amount", function: "sum" },
      { field: "amount", function: "count" }
    ],
    totals: true  // Include grand total row
  }
}
```

**Response:**
```json
{
  "records": [
    { "category": "Marketing", "amount_sum": 6380.00, "amount_count": 9 },
    { "category": "Equipment", "amount_sum": 9056.00, "amount_count": 7 },
    ...
  ],
  "totals": { "amount_sum": 38245.74, "amount_count": 70 }
}
```

### Supported Aggregation Functions

| Function | Description |
|----------|-------------|
| `count` | Number of records |
| `sum` | Sum of numeric values |
| `avg` | Average of numeric values |
| `min` | Minimum value |
| `max` | Maximum value |
| `stddev` | Standard deviation |

---

## 2. Monthly Cross-Tabulation

Cross-tabulation (pivot tables) show data across two dimensions - here, category vs. month.

**SQL equivalent:**
```sql
SELECT category,
  SUM(CASE WHEN month = '2026-01' THEN amount ELSE 0 END) as jan,
  SUM(CASE WHEN month = '2026-02' THEN amount ELSE 0 END) as feb,
  SUM(CASE WHEN month = '2026-03' THEN amount ELSE 0 END) as mar,
  SUM(amount) as total
FROM ledger
GROUP BY category
```

**Chaprola:**
```javascript
POST /query {
  userid: "chaprola-expenses",
  project: "expenses",
  file: "ledger",
  pivot: {
    row: "category",      // Rows: one per category
    column: "month",       // Columns: one per month value
    values: [
      { field: "amount", function: "sum" }
    ],
    totals: true,          // Row totals
    grand_total: true      // Column totals + grand total
  }
}
```

**Response:**
```json
{
  "records": [
    {
      "category": "Marketing",
      "2026-01": 1300.00,
      "2026-02": 2770.00,
      "2026-03": 3160.00,
      "_total": 6380.00
    },
    ...
  ],
  "column_totals": {
    "2026-01": 9225.99,
    "2026-02": 10169.80,
    "2026-03": 18849.95
  },
  "grand_total": 38245.74
}
```

---

## 3. Scheduled Reports

Chaprola supports cron-based scheduling for automated report generation.

### Weekly Expense Summary Email

```javascript
POST /schedule {
  userid: "chaprola-expenses",
  name: "weekly-summary",
  cron: "0 9 * * MON",  // Every Monday at 9 AM
  endpoint: "/export-report",
  body: {
    project: "expenses",
    name: "SUMMARY",
    primary_file: "ledger",
    format: "text"
  },
  skip_if_unchanged: false
}
```

### Monthly PDF Report

```javascript
POST /schedule {
  userid: "chaprola-expenses",
  name: "monthly-pdf",
  cron: "0 6 1 * *",  // 1st of each month at 6 AM
  endpoint: "/export-report",
  body: {
    project: "expenses",
    name: "MONTHLY",
    primary_file: "ledger",
    format: "pdf",
    title: "Monthly Expense Report"
  }
}
```

### Schedule Management

```javascript
// List all schedules
POST /schedule/list { userid: "chaprola-expenses" }

// Delete a schedule
POST /schedule/delete {
  userid: "chaprola-expenses",
  name: "weekly-summary"
}
```

---

## 4. Export Pipeline

The export workflow demonstrates Chaprola's compile-run-export cycle.

### Step 1: Compile Program

```javascript
POST /compile {
  userid: "chaprola-expenses",
  project: "expenses",
  name: "DETAIL",
  source: `
    // DETAIL.CS - Expense detail report
    DEFINE VARIABLE rec R41
    LET rec = 1
    100 SEEK rec
        IF EOF GOTO 900
        MOVE P.date U.1 10
        MOVE P.category U.12 20
        MOVE P.vendor U.33 30
        GET amt FROM P.amount
        PUT amt INTO U.64 12 D 2
        PRINT 0
        LET rec = rec + 1
        GOTO 100
    900 END
  `,
  primary_format: "ledger"
}
```

### Step 2: Publish for Access

```javascript
POST /publish {
  userid: "chaprola-expenses",
  project: "expenses",
  name: "DETAIL",
  primary_file: "ledger",
  acl: "public"  // or "authenticated", "owner", "token"
}
```

### Step 3: Export to Format

```javascript
POST /export-report {
  userid: "chaprola-expenses",
  project: "expenses",
  name: "DETAIL",
  primary_file: "ledger",
  format: "pdf",    // csv, json, xlsx, text, pdf
  title: "Q1 2026 Expense Report"
}
// Response: { files_written: ["DETAIL.R"], ... }
```

### Step 4: Download File

```javascript
POST /download {
  userid: "chaprola-expenses",
  project: "expenses",
  file: "DETAIL.R",
  type: "output"
}
// Response: { download_url: "https://s3.../...", expires_in: 3600 }
```

### Supported Export Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| `csv` | .csv | Spreadsheet import, data analysis |
| `json` | .json | API integrations, data transfer |
| `xlsx` | .xlsx | Microsoft Excel workbooks |
| `pdf` | .pdf | Formal reports, printing |
| `text` | .txt | Plain text output |

---

## 5. Parameterized Reports

Reports can accept query parameters for filtering.

### Define Parameters in Program

```chaprola
// DETAIL.CS with parameters
// Accepts: ?category=Travel&month=2026-01

MOVE P.category U.100 30
IF EQUAL "" PARAM.category GOTO 150    // No filter = show all
IF EQUAL PARAM.category U.100 GOTO 150 // Match = show
GOTO 300                                // No match = skip

150 MOVE P.month U.100 7
    IF EQUAL "" PARAM.month GOTO 200
    IF EQUAL PARAM.month U.100 GOTO 200
    GOTO 300

200 // Output record
    MOVE P.date U.1 10
    ...
```

### Call with Parameters

**Via /report endpoint:**
```
GET /report?userid=chaprola-expenses&project=expenses&name=DETAIL&category=Travel&month=2026-01
```

**Via /run with R-variables:**
```javascript
POST /run {
  userid: "chaprola-expenses",
  project: "expenses",
  name: "DETAIL",
  primary_file: "ledger",
  params: {
    category: "Travel",
    month: "2026-01"
  }
}
```

### Discover Available Parameters

```javascript
POST /report/params {
  userid: "chaprola-expenses",
  project: "expenses",
  name: "DETAIL"
}
// Response: .PF schema with field names, types, widths
```

---

## Quick Reference

### Data Lifecycle

```
Import JSON  →  Index Fields  →  Compile Programs  →  Publish Reports
    ↓               ↓                   ↓                    ↓
 /import        /index            /compile              /publish
                                      ↓
                                   /run or /report
                                      ↓
                               /export-report
                                      ↓
                                 /download
```

### Common Query Patterns

```javascript
// Simple filter
{ file: "ledger", where: { status: { eq: "pending" } } }

// Multiple conditions (AND)
{ file: "ledger", where: [
  { field: "status", op: "eq", value: "approved" },
  { field: "amount", op: "gt", value: 500 }
]}

// Select specific fields
{ file: "ledger", select: ["date", "vendor", "amount"] }

// Order by multiple fields
{ file: "ledger", order_by: [
  { field: "date", dir: "desc" },
  { field: "amount", dir: "desc" }
]}

// Pagination
{ file: "ledger", limit: 20, offset: 40 }
```
