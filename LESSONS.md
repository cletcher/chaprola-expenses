# Lessons Learned Building Chaprola Expenses

This document captures insights and gotchas discovered while building an expense tracking application on Chaprola.

## Architecture Decisions

### 1. Proxy vs. Direct API Calls

**Decision:** Use a thin Node.js proxy for write operations.

**Why:**
- API keys must not be exposed to the browser
- Chaprola's `/insert-record`, `/update-record`, `/delete-record` require authentication
- Public `/report` endpoint only works for read operations

**Tradeoff:**
- Additional server component to deploy and maintain
- Read-through-proxy adds latency vs. direct `/report` calls
- Simpler security model (no CORS issues, no token refresh)

### 2. Pivot vs. Chaprola Programs for Aggregation

**Decision:** Use `/query` with `pivot` for dashboard aggregations instead of writing Chaprola programs.

**Why:**
- Pivot is declarative and easier to modify
- No compilation step needed
- JSON output matches frontend data structures
- Chaprola programs are better for complex formatting, multi-file joins, or scheduled reports

**When to use Chaprola programs:**
- Complex business logic (if/then rules, calculations)
- Formatted text output (reports with headers, footers)
- Joining multiple data files
- Scheduled email content

### 3. Data Model: Denormalized vs. Normalized

**Decision:** Use a single denormalized `ledger` file with all expense data.

**Why:**
- Chaprola joins (FIND/READ) add complexity
- 70 records is small enough that denormalization has no real cost
- Pivot queries work best on flat data

**When to normalize:**
- Large reference data (10K+ vendors, categories)
- Frequently changing lookup values
- Memory constraints (secondary files stay in memory during FIND)

---

## Gotchas Encountered

### 1. MCP Server Requires Restart for Environment Changes

The Chaprola MCP server reads `CHAPROLA_USERNAME` and `CHAPROLA_API_KEY` at startup. After updating `.mcp.json` with credentials, the Claude Code session must be restarted.

**Solution:** Created `setup-chaprola.js` script that uses direct fetch() calls with the API key, bypassing the MCP server for initial setup.

### 2. Field Width Determines Storage

Chaprola auto-sizes fields to the longest value during import. A `category` field with "Software & Subscriptions" (26 chars) will be 26 bytes wide.

**Impact:**
- Later inserts with longer values will be truncated
- Plan field widths based on maximum expected values
- Use `/alter` to widen fields after import if needed

### 3. Numeric Fields Stored as Strings

When importing JSON, numeric-looking strings remain strings. Chaprola's `/query` aggregations (sum, avg) convert on the fly, but programs need explicit `GET field FROM P.field` to use as numbers.

**Best practice:** Always use `GET` for numeric operations in Chaprola programs:
```chaprola
// WRONG: IF P.amount GT 100 GOTO 200
// RIGHT:
GET amt FROM P.amount
IF amt GT 100 GOTO 200
```

### 4. PARAM.name Returns Empty String If Missing

Parameterized reports using `PARAM.fieldname` get an empty string if the parameter isn't provided. Programs must handle this:

```chaprola
// Check if parameter was provided
IF EQUAL "" PARAM.category GOTO 200  // No filter, include all
IF EQUAL PARAM.category U.100 GOTO 200  // Filter matches
GOTO 300  // Filter doesn't match, skip
```

### 5. Pivot totals vs. grand_total

- `totals: true` adds a `_total` column to each row (row-wise sum)
- `grand_total: true` adds `column_totals` and `grand_total` to response (column-wise sums)

Both can be used together for complete pivot tables.

### 6. PRINT 0 Clears the Buffer

After `PRINT 0`, the U buffer is reset to spaces. Don't assume previous values persist:

```chaprola
MOVE "Header" U.1 10
PRINT 0
// U buffer is now empty!
MOVE "Detail" U.1 10  // Must rebuild from scratch
```

---

## Performance Considerations

### 1. Index Before Query

For datasets >1000 records, create indexes on frequently filtered fields:

```javascript
// Create index
POST /index {
  userid: "chaprola-expenses",
  project: "expenses",
  file: "ledger",
  field: "category"
}
```

Indexed fields make WHERE clauses O(log n) instead of O(n).

### 2. Async for Large Reports

The `/run` and `/export-report` endpoints have a 30-second API Gateway timeout. For reports on >100K records, use async mode:

```javascript
POST /run {
  ...,
  async_exec: true
}
// Response: { job_id: "..." }

POST /run/status {
  project: "expenses",
  job_id: "..."
}
// Poll until status: "done"
```

### 3. Limit Query Results

The `/query` endpoint returns all matching records by default. Use `limit` and `offset` for pagination:

```javascript
{ file: "ledger", limit: 50, offset: 100 }
```

---

## Security Notes

### 1. API Key Handling

- Never expose API keys to frontend JavaScript
- Use a server-side proxy for authenticated operations
- Store keys in environment variables, not source code

### 2. ACL Levels for Published Reports

| ACL | Description |
|-----|-------------|
| `public` | Anyone can access via `/report` |
| `authenticated` | Requires valid API key (any user) |
| `owner` | Only the owner's API key works |
| `token` | Requires action token (for OAuth flows) |

### 3. PHI and BAA

This expense app doesn't handle Protected Health Information (PHI). If it did:
- Sign the BAA before importing PHI
- Use `nophi: true` on exports to obfuscate sensitive fields
- Never include PHI in email reports (content moderator blocks it)

---

## Testing Strategy

### 1. Seed Data Design

Created 70 realistic expenses across:
- 3 months (Jan, Feb, Mar 2026)
- 9 categories (with varying spending patterns)
- 5 submitters
- 2 statuses (approved, pending)
- 6 payment methods

This diversity ensures:
- Pivot queries have meaningful data
- Filters have multiple matching records
- Monthly trends are visible

### 2. Manual Testing Flow

1. Run setup script: `node setup-chaprola.js`
2. Start proxy: `npm start`
3. Open http://localhost:3000
4. Verify dashboard totals match expected seed data
5. Add new expense, verify appears in list
6. Edit expense, verify changes persist
7. Delete expense, verify removed
8. Export to CSV, verify file downloads

---

## Future Improvements

1. **Authentication:** Add user login instead of hardcoded submitter
2. **Receipt uploads:** Store images in S3, link via expense_id
3. **Approval workflow:** Manager approval with email notifications
4. **Budget tracking:** Compare spending vs. budgets per category
5. **Multi-currency:** Add currency field, convert to USD for totals
