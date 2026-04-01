# Fix Site Key 403 Error

**Source:** Vogel eval v1 (2026-03-30)
**Status:** REWORK SECTION

## Problem

All API calls return 403 Forbidden. Site key `site_ca371406d665f28366a96886414ece3bc987e40e7cde74dba65cf1ace1c1b1e0` (app.js line 11) is rejected by API.

Possible causes:
1. Origin lock doesn't match deployed URL `https://chaprola.org/apps/chaprola-expenses/chaprola-expenses/`
2. Site key permissions don't include required endpoints (/query, /insert-record, /update-record, /delete-record, /report, /export-report)
3. Site key wasn't properly created

## What to Fix

1. **Verify origin lock:** Check site key config matches deployment URL (including double subdirectory path)
2. **Verify permissions:** Site key must allow /query, /insert-record, /update-record, /delete-record, /report, /export-report
3. **Test from deployed URL:** Open https://chaprola.org/apps/chaprola-expenses/chaprola-expenses/, check Network tab for 403 vs 200
4. **If origin lock is wrong, create new site key** with correct origin pattern

## After Auth Fix, Test

- CRUD operations (add/edit/delete expense)
- Pivot aggregation (verify category breakdown uses server-side /query with pivot, not client-side grouping)
- Export (CSV, JSON, PDF, Excel)
- "Schedule" feature (unclear what this is — clarify and test)

## Other Issues from Eval

- README mentions proxy but app uses site key — document which pattern is recommended
- Empty README section on export — document /export-report endpoint
- PHI detection forced extensive field renames — awkward, consider if PHI checking should be disabled for demo apps

## Filed

2026-03-31 04:00 UTC, Tawni
