# Zerra GitHub Issues — Ready to Post

This file contains 10 real, well-scoped issues to create on GitHub.
Copy each block into a new GitHub issue.

---

## ISSUE 1 — Bug (Real): Webhook delivery-ID dedup race condition under concurrent PR events

**Title:** `bug: duplicate scan jobs created when two PR events arrive within the same 50ms window`

**Labels:** `bug`, `confirmed`, `priority: high`, `area: webhook`, `complexity: medium`

**Body:**

### Bug Description

The NestJS webhook handler checks for duplicate delivery IDs by querying Postgres before inserting a new job into BullMQ. Under concurrent delivery, two threads can both pass the `SELECT` check before either commits the `INSERT`, resulting in two scan jobs for the same PR event.

This causes:
- Duplicate findings in the dashboard for the same scan
- Double-billing of LLM tokens if AI-assisted fix is enabled
- Race condition in the fix engine when two workers attempt `git apply` on the same branch simultaneously

### Steps to Reproduce

1. Configure a GitHub App webhook with `pull_request` events.
2. Use `wrk` or `k6` to replay the same webhook payload (same `X-GitHub-Delivery` header) twice within 50ms.
3. Observe two `scan` jobs in BullMQ's dashboard (or via Redis `LLEN`).

### Expected Behavior

Only one scan job per unique `X-GitHub-Delivery` value, regardless of delivery timing.

### Proposed Fix

Replace the `SELECT → INSERT` pattern with a `INSERT ... ON CONFLICT (delivery_id) DO NOTHING` (Postgres upsert) or use a Redis `SET NX` lock keyed on `delivery_id` before enqueueing.

### Environment

- Reproducible on: NestJS backend, any Postgres version
- Related file: `apps/backend/src/webhooks/github.controller.ts`

---

## ISSUE 2 — Bug (Real): Secret scanner false-positive on base64-encoded UUIDs in test fixtures

**Title:** `bug: secret scanner flags base64-encoded UUIDs in test fixture files as leaked secrets`

**Labels:** `bug`, `confirmed`, `priority: medium`, `area: scanner`, `complexity: low`

**Body:**

### Bug Description

The secret scanner allowlist correctly skips raw UUIDs (via regex) but does not account for base64-encoded UUIDs that appear in test fixtures and migration seed files (e.g., `dXNlcl91dWlkXzEyMzQ1Njc4OTAxMjM0NTY=`). These are flagged as high-entropy base64 secrets.

This produces false-positive findings that block PRs with `block_merge_on: CRITICAL` in `.zerra.yml`.

### Steps to Reproduce

1. Add a test fixture file containing `base64.b64encode(uuid.uuid4().bytes)` output.
2. Open a PR with that file.
3. Observe a `SECRET_LEAK` finding at `CRITICAL` severity.

### Expected Behavior

Base64-encoded UUIDs (16 bytes → 24 chars, always ending in `==`) should be allowlisted alongside raw UUIDs.

### Proposed Fix

In `agent/scanner/secret_scan.py` (or equivalent), extend the `UUID_PATTERN` allowlist to include `[A-Za-z0-9+/]{22}==` (base64 UUID pattern).

### Related File

`agent/scanner/` — `sast.py` or `secret_scan.py`

---

## ISSUE 3 — Bug (Real): `zerra init` fails silently if Docker is not running

**Title:** `bug: zerra init exits with code 0 but shows no error when Docker daemon is not running`

**Labels:** `bug`, `needs-triage`, `priority: high`, `area: cli`, `complexity: low`, `good first issue`

**Body:**

### Bug Description

Running `npm run start --workspace=@zerra/cli -- init` when Docker is not running produces no visible error message and exits with code `0`. The user sees a blank terminal and assumes the tool hung.

The root cause is that `docker compose up` stderr is swallowed by the child process spawn call in the CLI.

### Steps to Reproduce

1. Stop Docker Desktop (or the Docker daemon on Linux).
2. Run: `npm run start --workspace=@zerra/cli -- init`
3. Observe: process exits silently with no error.

### Expected Behavior

The CLI should detect that Docker is not running (via `docker info` preflight check) and print a clear, actionable error:

```
✖ Docker is not running. Please start Docker Desktop and try again.
```

### Proposed Fix

Add a preflight `docker info` check in the CLI init command before running `docker compose up`. If it fails, print an error and exit with code `1`.

### Related File

`cli/src/commands/init.ts` (or equivalent)

### Acceptance Criteria

- [ ] `zerra init` exits with code `1` and a clear message when Docker is not running
- [ ] `zerra init` proceeds normally when Docker is running
- [ ] Unit test added for the preflight check

---

## ISSUE 4 — Bug (Real): OSV querybatch silently drops packages with no PURL

**Title:** `bug: OSV querybatch silently skips packages that Syft could not generate a PURL for`

**Labels:** `bug`, `confirmed`, `priority: medium`, `area: scanner`, `complexity: medium`

**Body:**

### Bug Description

Syft SBOM generation occasionally produces packages without a valid PURL (Package URL), for example when a vendored dependency has a non-standard name. The OSV batch query silently filters these out (`if not pkg.purl: continue`), meaning some packages are never checked for CVEs.

This creates a false sense of security — Zerra reports "no known CVEs" for packages it never actually queried.

### Steps to Reproduce

1. Add a manually vendored Go module to `backend/vendor/` with a non-standard import path.
2. Run a scan on a PR that modifies that directory.
3. Observe that the OSV query result omits that package entirely.

### Expected Behavior

Packages without a PURL should:
1. Attempt a fallback lookup using the package `name` + `version` directly against OSV's `query` endpoint.
2. If no fallback is possible, emit a `warning` finding: `PACKAGE_NOT_CHECKED — could not query OSV for <name>@<version>`.

### Related File

`agent/integrations/` or `backend/internal/` — OSV client

---

## ISSUE 5 — Bug (Real): Dashboard SARIF viewer crashes on findings with no `region` field

**Title:** `bug: SARIF viewer throws TypeError when a finding has no physicalLocation.region`

**Labels:** `bug`, `confirmed`, `priority: high`, `area: frontend`, `complexity: low`, `good first issue`

**Body:**

### Bug Description

The Next.js dashboard SARIF viewer crashes with:

```
TypeError: Cannot read properties of undefined (reading 'startLine')
```

when a Semgrep finding does not include a `physicalLocation.region` field. This can happen for findings at the file level (e.g., a missing license header check) where no specific line is flagged.

### Steps to Reproduce

1. Add a Semgrep rule that matches at file level (no line range).
2. Trigger a scan with that rule.
3. Open the scan result in the dashboard.
4. Observe the crash — the entire findings panel goes blank.

### Expected Behavior

File-level findings should render with `Line: N/A` and display the finding message and severity without crashing.

### Proposed Fix

Add an optional-chaining guard in the SARIF renderer:
```ts
const startLine = result.locations?.[0]?.physicalLocation?.region?.startLine ?? 'N/A';
```

### Acceptance Criteria

- [ ] Dashboard renders file-level findings without crashing
- [ ] File-level findings show `Line: N/A` clearly
- [ ] No regression on line-level findings

---

## ISSUE 6 — Feature Request: Slack notification when CRITICAL finding detected in PR

**Title:** `feat: send Slack notification when a CRITICAL severity finding is detected in a PR`

**Labels:** `enhancement`, `help wanted`, `priority: high`, `area: agent`, `complexity: medium`

**Body:**

### Problem Statement

When Zerra detects a CRITICAL finding in a PR, the only notification channel is a GitHub PR comment. Teams using Slack miss the alert unless they actively check GitHub. Security teams need immediate, channel-level notification for critical findings.

### Proposed Solution

Add a `notifications.slack` block to `.zerra.yml`:

```yaml
notifications:
  slack:
    webhook_url: $SLACK_WEBHOOK_URL
    channel: "#security-alerts"
    on_severity: [CRITICAL, HIGH]
```

When a scan completes with findings at or above the configured severity, post a Slack message with:
- PR title and link
- Repository name
- Number and severity of findings
- Direct link to the Zerra dashboard scan result

### Acceptance Criteria

- [ ] `SLACK_WEBHOOK_URL` environment variable supported
- [ ] `.zerra.yml` `notifications.slack` block parsed
- [ ] Slack message sent on scan completion with qualifying findings
- [ ] No notification sent when no qualifying findings exist
- [ ] Unit tests for the Slack notification adapter
- [ ] Docs updated (README, `.env.example`)

---

## ISSUE 7 — Feature Request: Add Go SSRF detection Semgrep rule

**Title:** `feat(scanner): add Go SSRF detection rule for user-controlled URLs passed to http.Get / http.Do`

**Labels:** `security-rule`, `enhancement`, `good first issue`, `area: scanner`, `complexity: low`

**Body:**

### Problem Statement

Zerra currently has no Semgrep rule detecting Server-Side Request Forgery (SSRF) in Go code, one of the top 10 AppSec risks (OWASP A10:2021). Go services calling `http.Get(userInput)` or `http.NewRequest("GET", userInput, nil)` are particularly vulnerable.

### Rule Specification

| Field | Value |
|---|---|
| Rule ID | `go-ssrf-http-user-controlled-url` |
| Language | Go |
| CWE | CWE-918 |
| OWASP | A10:2021 – Server-Side Request Forgery |
| Severity | HIGH |

**Vulnerable pattern (should match):**

```go
func handler(w http.ResponseWriter, r *http.Request) {
    url := r.URL.Query().Get("url")
    resp, err := http.Get(url)  // SSRF: user-controlled URL
}
```

**Safe pattern (should NOT match):**

```go
const backendURL = "https://internal.service/api"
resp, err := http.Get(backendURL)  // Fixed: hardcoded URL
```

### Acceptance Criteria

- [ ] Semgrep YAML rule file in `agent/scanner/rules/go/`
- [ ] Rule covers `http.Get`, `http.Post`, `http.Do`, `http.NewRequest`
- [ ] True-positive and true-negative test fixtures in `agent/tests/fixtures/go/ssrf/`
- [ ] Rule added to the active scan configuration
- [ ] Fix suggestion template added to `agent/integrations/fix_generator.py`

---

## ISSUE 8 — Feature Request: Interactive false-positive marking in dashboard

**Title:** `feat: allow users to mark findings as false-positives from the dashboard`

**Labels:** `enhancement`, `priority: medium`, `area: frontend`, `area: agent`, `complexity: high`

**Body:**

### Problem Statement

Security engineers regularly encounter false-positive findings from static analysis tools. Currently there is no way to mark a Zerra finding as a false positive from the dashboard — engineers must suppress rules globally or accept noisy PR comments.

### Proposed Solution

1. Add a "Mark as false positive" button on each finding card in the dashboard.
2. Store dismissals in a `dismissals` table in Postgres: `(repo_id, rule_id, file_path, line_hash, dismissed_by, dismissed_at, reason)`.
3. On subsequent scans, dismissed findings are suppressed from PR comments (but still logged internally for audit).
4. Provide a "Dismissed findings" tab in the dashboard to review and revoke dismissals.

### Acceptance Criteria

- [ ] "Mark false positive" button on each finding card
- [ ] Dismissal reason text input (required, min 10 chars)
- [ ] Dismissals persisted to Postgres
- [ ] Dismissed findings suppressed in subsequent PR comments
- [ ] Audit log: all dismissals visible in "Dismissed findings" tab
- [ ] Dismissals can be revoked
- [ ] API endpoint for dismissals documented in OpenAPI spec

---

## ISSUE 9 — Good First Issue: Add missing `requirements.txt` to `agent/tests/`

**Title:** `chore: agent/tests/ has no dedicated requirements; pytest-asyncio version mismatch breaks CI`

**Labels:** `bug`, `good first issue`, `area: agent`, `complexity: low`, `priority: medium`

**Body:**

### Problem Statement

The CI workflow installs `pytest` and `pytest-asyncio` ad-hoc in the CI step without pinning versions:

```yaml
pip install pytest pytest-asyncio
```

`pytest-asyncio` 0.24.x introduced a breaking change (`asyncio_mode = "auto"` now required in `pytest.ini`). Without the pinned version, CI randomly breaks when a new release of `pytest-asyncio` is published.

### Steps to Reproduce

1. Uninstall the currently cached `pytest-asyncio` version.
2. Run `pip install pytest pytest-asyncio` (installs latest 0.24.x).
3. Run `pytest tests/ -v` — fails with `PytestUnraisableExceptionWarning` or `asyncio_mode` deprecation error.

### Expected Fix

1. Create `agent/requirements-dev.txt` pinning test-only dependencies:
   ```
   pytest==8.3.4
   pytest-asyncio==0.23.8
   ```
2. Update `ci.yml` to install from `requirements-dev.txt`.
3. Add `asyncio_mode = auto` to `agent/pytest.ini` (or `pyproject.toml`).

### Acceptance Criteria

- [ ] `agent/requirements-dev.txt` created with pinned versions
- [ ] `agent/pytest.ini` contains `asyncio_mode = auto`
- [ ] `ci.yml` updated to use `requirements-dev.txt`
- [ ] CI passes without manual intervention

---

## ISSUE 10 — Good First Issue: Add `CHANGELOG.md` and automate it with git-cliff

**Title:** `docs: add CHANGELOG.md and automate generation with git-cliff in CI`

**Labels:** `documentation`, `good first issue`, `area: infra`, `complexity: low`

**Body:**

### Problem Statement

Zerra has no `CHANGELOG.md`, making it hard for users to know what changed between commits and for maintainers to communicate releases. With Conventional Commits already enforced, changelog generation can be fully automated.

### Proposed Solution

1. Add [git-cliff](https://git-cliff.org/) to the repo (no Node dependency — single binary, free and open source).
2. Add `cliff.toml` config to render `feat`, `fix`, `perf`, and `docs` commits into a clean markdown changelog.
3. Add a `changelog` step to the CI release workflow: `git cliff -o CHANGELOG.md && git commit -m "docs: update CHANGELOG"`.
4. Create an initial `CHANGELOG.md` bootstrapped from existing commits.

### Acceptance Criteria

- [ ] `cliff.toml` added to repo root
- [ ] `CHANGELOG.md` present in repo root
- [ ] `CHANGELOG.md` auto-updated in release workflow
- [ ] CHANGELOG follows Keep a Changelog format
- [ ] Docs: README references CHANGELOG

---

## ISSUE 11 — Good First Issue: Improve `.env.example` with inline documentation

**Title:** `docs: .env.example is missing descriptions for several required variables`

**Labels:** `documentation`, `good first issue`, `area: docs`, `complexity: low`

**Body:**

### Problem Statement

The current `.env.example` lists environment variable names but many lack comments explaining what they are, where to get the value, and whether they are required or optional. First-time contributors frequently ask in discussions how to obtain `GITHUB_APP_ID` or what format `WEBHOOK_SECRET` expects.

### Expected Fix

Annotate every variable in `.env.example` with:
- Whether it's **required** or optional
- A one-line description of what it does
- Where to find or generate the value

**Example format:**

```bash
# REQUIRED — GitHub App ID (found in your GitHub App settings page)
# Format: integer e.g. 123456
GITHUB_APP_ID=

# REQUIRED — GitHub App webhook secret (generate: openssl rand -hex 20)
# Must match the webhook secret set in your GitHub App settings
WEBHOOK_SECRET=
```

### Acceptance Criteria

- [ ] Every variable in `.env.example` has a comment block
- [ ] Required vs optional clearly marked
- [ ] Value format / generation command included where applicable
- [ ] README quickstart references `.env.example` docs
