// DETAIL.CS — Expense detail report
// Optional PARAM.category filters to one category; otherwise all expenses.
// Output is pipe-delimited text suitable for CSV-style ingest by the
// frontend or for direct consumption via /export-report.

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
