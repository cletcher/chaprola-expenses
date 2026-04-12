# Lessons Learned — Chaprola Expenses

This is a forensic post-mortem of the April 2026 rebuild, not the aspirational CLI the earlier build pretended to be. The previous `LESSONS.md` described an architecture that didn't match reality; this one describes what the app actually does, plus every defect surfaced while making it work end-to-end in a real browser.

---

## Architectural decisions

### Static frontend + origin-locked site key

Chaprola's `/app/deploy/inline` endpoint hosts a static HTML/JS/CSS bundle. There is no server you can write backend code for — the "thin proxy" pattern described in older Chaprola samples does not exist in the hosted app model. The frontend therefore has to call `api.chaprola.org` directly, which means credentials live in the browser.

The only credential safe for this is a **site key** — a token the Chaprola authorizer restricts by `allowed_origins` (what sites may send it) and `allowed_endpoints` (what endpoints it may hit). Stolen from devtools, a properly scoped site key can do only what any honest visitor to the same origin could already do, which is the correct security model for a public app.

### No DASHBOARD or MONTHLY programs

The earlier build shipped compiled `.CS` programs called `DASHBOARD` and `MONTHLY` that each contained one `PRINT` statement telling the reader to "use `/query` with pivot". They were published as public reports, so `/report?name=DASHBOARD` returned that unhelpful line to anyone who called it. The frontend never used them; the dashboard was already hitting `/query` pivot directly.

This rebuild deletes both programs and unpublishes them. The dashboard's server-side aggregation happens via five parallel `/query` pivot calls. `DETAIL` and `SUMMARY` stay because they're actual programs that actual callers use — `DETAIL` is the parameterized report for direct `GET /report` consumption and export, and `SUMMARY` is what the weekly `/schedule` job runs.

### Export is client-side serialization

The `/export-report` endpoint has a formatting bug (see **Platform defects** below) that mangles text-concatenation output from `DETAIL.CS` at the CSV conversion step. Rather than debug an unrelated backend issue in this session, the Export page builds CSV and JSON client-side from a single `/query` call and delivers them via `Blob` URLs. PDF and XLSX options from the earlier build are removed — those genuinely need server-side conversion, which is a future v2 concern.

---

## Platform defects discovered during the rebuild

Six real, reproducible gaps in Chaprola surfaced during the six-hour session. Each of these made the previous "ready-to-ship" app unusable in a real browser even though CLI testing looked fine. Writing them down so Remo can triage.

### 1. Site key `allowed_origins` with path components never match browser requests

The `create_site_key` MCP tool description literally shows this as the example:
```json
"allowed_origins": ["https://chaprola.org/apps/poll/*"]
```
Path-style patterns like this cannot match a browser's `Origin` header, which is always scheme + host + port and never contains a path. All three site keys left behind by the earlier build used path patterns and therefore returned 403 on every API call. The app had literally never worked in a browser.

The backend's `origin_matches` function uses `starts_with` against the pattern prefix, so the only patterns that match a real browser `Origin` are scheme+host exact strings (or `https://chaprola.org` with a trailing wildcard, if you want a wildcard). The fix Syl took here was to create a new key with `allowed_origins: ["https://chaprola.org"]` and delete the three broken keys from both `sitekeys/{hash}.json` and `sitekeys/user/{username}/key_{prefix}.json`.

**What the platform should do:** either reject path patterns at `create_site_key` time with a helpful error, or fall through to matching `Referer` (which does contain a path) when the pattern has one. Until that happens, the docs and every tool description that shows a path pattern need to change.

### 2. `chaprola_app_deploy` does not invalidate CloudFront

Every `/app/deploy/inline` call writes the new files to S3 but leaves CloudFront serving the old version until the CDN TTL expires. During this rebuild Syl had to manually run `aws cloudfront create-invalidation --distribution-id E3BBOUFCVA6C84 --paths "/apps/.../*"` after each deploy, six times total.

The previous developer's "ship it" confidence almost certainly came from the fact that the CLI tests bypassed CloudFront entirely and hit the origin or API directly. CloudFront then served the stale version to every browser user, silently.

**What the platform should do:** the deploy function should call `CreateInvalidation` as a final step, with the paths it just wrote. This is a two-line fix in the deploy Lambda.

### 3. CloudFront WAF blocks return HTML 403s with no CORS headers

When the browser POSTs a request whose body contains patterns the WAF blocks (e.g. a `<script>` tag, which is how XSS attempts are caught), CloudFront returns an HTML 403 page before the request ever reaches the Lambda. That response has no `Access-Control-Allow-Origin` header, so the browser reports the failure as "CORS error — no `Access-Control-Allow-Origin` header is present" and swallows the real cause.

During testing, submitting an expense whose `company` field contained `<script>alert(1)</script>` produced a mysterious CORS error instead of a clear "request blocked by WAF" message. The defense-in-depth behaviour (block the payload at the edge) is correct; the user-visible error is terrible.

**What the platform should do:** configure the WAF / CloudFront error-response page to include `Access-Control-Allow-Origin: *` (or echo the request origin) so browsers surface a real status and the JS `catch` block sees something it can report meaningfully.

### 4. `/export-report` mangles text output when converting text to CSV

`SELECT ... FROM DETAIL` via `/run` produces perfectly formatted pipe-delimited text:
```
2026-01-03|Software & Subscriptions|Adobe Creative Cloud|Annual design suite license|1250.00|approved|Sarah Chen
```
The same program invoked via `/export-report` returns a CSV where every field is off by one character:
```
2026-01-0|Software & Subscriptions|Adobe Creative Cloud|Annual design suite license|1250.00| approve|dSarah Chen
```
The date is truncated by one character and the trailing `d` of `approved` leaks into the `submitter` field. This is an `/export-report` text-to-CSV conversion bug, not a `DETAIL.CS` bug — `/run` on the same compiled `.PR` produces correct output. Likely cause: the converter is walking fixed-width field positions that are off-by-one relative to where `PRINT` concatenation actually placed them.

Because of this bug, the Export page in this app stopped using `/export-report` entirely and does client-side CSV generation from a `/query` response.

### 5. `/run/status` strips the `details` field from project-review jobs

A `POST /projectreview` run writes a full `JobStatus` to S3 at `{userid}/{project}/jobs/{job_id}.json` — programs reviewed, modified, skipped, failed, plus a `details[]` array with per-program changes and compile errors. But polling the job via `POST /run/status` only returns `{"status": "complete", "job_id": "..."}` — every other field is stripped. The only way to see what projectreview actually did is to read the S3 object directly.

`/run/status` must pass through the full job file, or projectreview needs its own status endpoint.

### 6. Project-review failure emails silently dropped on this run

`projectreview` is supposed to email `syl@chaprola.org` on each compile failure. Earlier runs against tawni's projects produced emails (dated 2026-04-10 in syl's inbox). This session's run against `chaprola-expenses` produced three compile failures but zero emails — the `syl` mailbox contains nothing from 2026-04-12. The handler uses `let _ = client.post(...)` to send, so any Resend API error is silently swallowed.

Either the send failed transparently, or the email path has a bug. Needs logging at minimum.

### 7. `IF BLANK PARAM.field GOTO` requires an explicit length argument

`gotchas.md` documents `IF BLANK P.notes GOTO 200` — no length. That works because `P.notes` carries its width from the format file. `IF BLANK PARAM.category GOTO 200` does *not* work — it fails at codegen with `Expected location or integer, got Param("category")`. The workaround is to MOVE the param to a U-location first and then `IF BLANK` on the U-location with an explicit length:
```
MOVE PARAM.category U.200 24
IF BLANK U.200 24 GOTO 200
```
This is worth calling out explicitly in the gotchas doc — otherwise every parameterized program will hit the same wall.

### 8. `QUERY requires a WHERE clause` means you can't "select all"

Chaprola's `QUERY` statement refuses to compile without a `WHERE` clause, which makes the common "list everything" path awkward. The workaround is a tautological `WHERE expensecode NE ""` (or any field that's never blank), which the optimizer presumably notices. Real fix: allow `QUERY ledger INTO results ORDER BY txdate DESC` without a `WHERE`, or support `WHERE TRUE` explicitly.

### 9. `GET amt FROM X.field` needs an explicit R-slot

Style rule #3 says to avoid `DEFINE VARIABLE` and let the compiler allocate R-slots through `LET amt = 0`. But `GET amt FROM approved_set.amount` fails with `GET requires an R-variable` even after an implicit LET. The only form that works today is `GET R10 FROM approved_set.amount`, which either violates the style guide or forces programmers to hand-pick register numbers. Either the compiler should treat implicitly-declared names as first-class R-targets for `GET`, or the style guide needs an explicit carve-out for `GET`.

### 10. Docs say `order_by: "txdate desc"` but the parser only accepts object/array

The `ref-query.md` example is:
```json
"order_by": "salary desc"
```
That fails at runtime with `order_by must be an object or array`. The working form is `[{"field": "txdate", "dir": "desc"}]`. Docs need fixing.

### 11. `/query` `where` takes an array of condition objects; `/update-record` `where` takes a plain object

```js
// /query
where: [{field: "state", op: "eq", value: "pending"}]

// /update-record
where: {expensecode: "EXP-..."}
```
Both accept "find records matching this predicate" but the shapes are different. This is a footgun — every new caller trips on it. Unify or document loudly.

### 12. `chaprola_alter` on a `.PF` (parameter format) file returns "not found"

When `projectreview` or `compile` detects a stale parameter in a program's `.PF`, its remediation string tells the user to run `chaprola_alter name="DETAIL.PF" drop=["txmonth"]`. Running that exact command returns `Format file not found: DETAIL.PF.F`. The `/alter` endpoint is hardcoding a `.F` suffix and can't touch `.PF` files despite the remediation saying otherwise.

---

## What the style guide held up well on

- **QUERY WHERE + named reads** — rewriting `DETAIL.CS` to use `QUERY ledger INTO results WHERE category EQ PARAM.category` plus `READ results rec` + `results.field` was straightforward once I got the `IF BLANK` and `GET` syntax right. The old SEEK-loop version was easily 2× the length for the same behaviour.

- **Implicit LET variables** — Style rule #3 (no `DEFINE VARIABLE`) is much nicer to write, as long as you remember that `GET` is the exception.

- **PRINT concatenation** — inside a program, `PRINT results.txdate + "|" + results.category` produces clean text. The `/export-report` CSV conversion is the thing that corrupts it, not `PRINT` itself.

---

## What the construction prompt got wrong

The original construction prompt in `APPS.md` Step 7 said "Create the proxy". For a Chaprola-hosted app there is no proxy to create — the deploy target is static hosting, and the only auth pattern that works is a site key. That sentence made the earlier developer build a `proxy/server.js` that could never be deployed anywhere and left the repo in a contradictory state (proxy files + direct API calls + docs about a proxy that was unused). Deleting `proxy/` was the single biggest cleanup in this rebuild.

Step 5 said "Use `/schedule` to run SUMMARY and email the output to the account owner." The `/schedule` endpoint can *run* programs on a cron, and it can separately *send* emails on a cron, but it cannot *pipe* one into the other — the scheduler dispatches its body verbatim to a target endpoint with no template substitution. This app ships a weekly `/report` schedule for `SUMMARY` whose output is captured in the schedule run history. Making that output flow into an email requires either a platform feature (templating, or a new "run-then-email" endpoint) or a second trigger wired elsewhere.

---

## PHI field-name rename

Chaprola's PHI detector is substring-based. Field names containing `name`, `id`, `date`, `phone`, `email`, `address`, `patient`, `ssn`, `dob`, or `mrn` trigger blocking. The earlier build hit this when importing and had to rename every field before the import would succeed:

| original      | renamed     | why |
|---------------|-------------|-----|
| `expense_id`  | `expensecode` | `id` |
| `vendor`      | `company`   | fine, renamed for consistency |
| `description` | `detail`    | fine, shorter |
| `date`        | `txdate`    | `date` |
| `month`       | `txmonth`   | implicit from `date` |
| `payment`     | `method`    | fine |
| `status`      | `state`     | fine, shorter |
| `submitted_by`| `submitter` | fine |

These renames look arbitrary until you realize each one is working around a substring match on sensitive terms. The platform should expose an opt-out flag for non-PHI projects, or use a smarter detector.
