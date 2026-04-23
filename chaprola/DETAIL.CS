// DETAIL.CS — Expense detail report for the caller
// Multi-user: scoped by PARAM.user_id (from chp_user_ token or passed
// explicitly by anonymous /report callers as 'demo-user').
// Optional PARAM.category filters to one category; otherwise all of
// the caller's expenses. Soft-deleted records (state='deleted') are
// always excluded.
// Output is pipe-delimited text suitable for CSV-style ingest by the
// frontend or for direct consumption via /export-report.

OPEN PRIMARY "ledger"

MOVE PARAM.category U.200 24
IF BLANK U.200 24 GOTO 200
QUERY ledger INTO results WHERE user_id EQ PARAM.user_id AND category EQ PARAM.category AND state NE "deleted" ORDER BY txdate DESC
GOTO 300

200 QUERY ledger INTO results WHERE user_id EQ PARAM.user_id AND expensecode NE "" AND state NE "deleted" ORDER BY txdate DESC

300 PRINT "DATE|CATEGORY|COMPANY|DETAIL|AMOUNT|STATE|SUBMITTER"

LET rec = 1

400 READ results rec
    IF EOF END
    PRINT results.txdate + "|" + results.category + "|" + results.company + "|" + results.detail + "|" + results.amount + "|" + results.state + "|" + results.submitter
    LET rec = rec + 1
    GOTO 400
