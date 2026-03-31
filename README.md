# Chaprola Expenses

An expense tracking application built on [Chaprola](https://chaprola.org) that demonstrates the complete business data lifecycle: create records, query with aggregation, generate scheduled reports, and export to PDF/CSV.

## Features

- **Dashboard** - Category breakdown with CSS bar charts, monthly cross-tabulation
- **Add Expense** - Form-based expense submission with validation
- **Expense List** - Filterable, sortable list with edit/delete actions
- **Export** - Download reports in CSV, JSON, PDF, or Excel format

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│  Proxy Server   │────▶│   Chaprola API  │
│    (Static)     │     │   (Node.js)     │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     index.html              /api/*              api.chaprola.org
     add.html              Holds API key          /query
     list.html              CORS handling         /insert-record
     export.html            Authentication        /export-report
```

## Quick Start

### Prerequisites

- Node.js 18+
- Chaprola account (registered during setup)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/chaprola-expenses.git
cd chaprola-expenses

# Set up Chaprola backend (imports data, creates indexes, compiles programs)
export CHAPROLA_API_KEY=chp_your_api_key_here
node setup-chaprola.js

# Start the proxy server
npm start

# Open http://localhost:3000
```

### Environment Variables

Create a `.env` file or set environment variables:

```
CHAPROLA_USERNAME=chaprola-expenses
CHAPROLA_API_KEY=REDACTED_OLD_EXPENSES_KEY
PORT=3000
```

## Project Structure

```
chaprola-expenses/
├── frontend/               # Static frontend files
│   ├── index.html         # Dashboard
│   ├── add.html           # Add expense form
│   ├── list.html          # Expense list with filters
│   ├── export.html        # Export interface
│   ├── styles.css         # Dashboard-style CSS
│   └── app.js             # Frontend JavaScript
├── proxy/
│   └── server.js          # Node.js proxy server
├── setup-chaprola.js      # Setup script (import data, compile programs)
├── package.json
├── COOKBOOK.md            # Chaprola patterns reference
├── LESSONS.md             # Development insights
└── README.md
```

## Data Model

### ledger (One record per expense)

| Field | Type | Width | Description |
|-------|------|-------|-------------|
| expensecode | string | 12 | Unique identifier (EXP-timestamp) |
| amount | string | 12 | Expense amount (e.g., "1250.00") |
| category | string | 30 | Expense category |
| company | string | 60 | Vendor/company name |
| detail | string | 100 | Brief detail |
| txdate | string | 10 | Expense date (YYYY-MM-DD) |
| txmonth | string | 7 | Month for grouping (YYYY-MM) |
| method | string | 20 | Payment method |
| state | string | 10 | approved or pending |
| submitter | string | 40 | Submitter name |

### Categories

- Software & Subscriptions
- Office Supplies
- Travel
- Meals & Entertainment
- Equipment
- Training & Education
- Marketing
- Professional Services
- Utilities

## Chaprola Programs

| Program | Purpose |
|---------|---------|
| DASHBOARD.CS | Category spending breakdown (uses /query pivot) |
| MONTHLY.CS | Monthly cross-tabulation (uses /query pivot) |
| DETAIL.CS | Parameterized detail report (accepts category, month) |
| SUMMARY.CS | Weekly summary for email notifications |

## API Endpoints (Proxy)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/query` | POST | Query expenses with filters, aggregation, pivot |
| `/api/insert` | POST | Create new expense |
| `/api/update` | POST | Update existing expense |
| `/api/delete` | POST | Delete expense |
| `/api/export-report` | POST | Generate and download report |
| `/api/category-breakdown` | POST | Get category pivot data |
| `/api/monthly-crosstab` | POST | Get monthly cross-tabulation |

## Key Chaprola Concepts Demonstrated

### 1. Pivot as GROUP BY

```javascript
POST /query {
  file: "ledger",
  pivot: {
    row: "category",
    values: [
      { field: "amount", function: "sum" },
      { field: "amount", function: "count" }
    ]
  }
}
```

### 2. Monthly Cross-Tabulation

```javascript
POST /query {
  file: "ledger",
  pivot: {
    row: "category",
    column: "month",
    values: [{ field: "amount", function: "sum" }],
    totals: true,
    grand_total: true
  }
}
```

### 3. Export Pipeline

```
Compile → Publish → Export-Report → Download
```

### 4. Parameterized Reports

```
/report?userid=chaprola-expenses&project=expenses&name=DETAIL&category=Travel
```

## Seed Data

The setup script imports 70 realistic expenses across January-March 2026:

- **Total**: ~$38,245
- **Categories**: 9 (Marketing highest at ~$6,380)
- **Submitters**: 5 team members
- **Status**: 64 approved, 6 pending

## Documentation

- [COOKBOOK.md](./COOKBOOK.md) - Chaprola patterns and examples
- [LESSONS.md](./LESSONS.md) - Development insights and gotchas

## License

MIT
