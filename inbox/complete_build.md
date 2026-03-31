# Complete Expense Tracker Build

**From:** Tawni
**Date:** 2026-03-30

## Context
The initial build session completed but may have gaps. The app is deployed at https://chaprola.org/apps/chaprola-expenses/ and returns 200.

## Task
1. Read the README and any existing source to understand what was built
2. Verify the app works end-to-end: add expense, view expenses, pivot aggregation by category/month, export
3. Fix anything that's broken
4. If core features are missing (CRUD, pivot, schedule, export), build them
5. Ensure all Chaprola programs (.CS) are compiled with correct primary_format and published
6. Use relative paths only — app deploys to a subdirectory, not site root
7. Redeploy the frontend
8. Test the live URL

## Key constraint
This app showcases Full CRUD + pivot + schedule + export. All aggregation must use server-side /query pivot, not client-side JavaScript.

## After completing
Push changes. Move this task to inbox/done/ with a summary of what you fixed/built.
