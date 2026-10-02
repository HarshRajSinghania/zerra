# Contributing to Zerra

Thank you for considering contributing to **Zerra** — an open-source AppSec platform for GitHub pull requests. This document covers everything you need to get from zero to a merged pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Branch & Commit Guidelines](#branch--commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Adding New Security Rules](#adding-new-security-rules)
- [Testing](#testing)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Questions?](#questions)

---

## Code of Conduct

All contributors and maintainers are expected to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).  
Report unacceptable behavior to `security@zerra.dev`.

---

## How Can I Contribute?

### Reporting Bugs

- Check [existing issues](https://github.com/sjsreehari/zerra/issues) first to avoid duplicates.
- Use the **Bug Report** template when creating an issue.
- Include: OS, Node/Python/Go versions, Docker version, exact steps to reproduce, and terminal output or screenshots.

### Suggesting Features

- Open a **Feature Request** issue with the template provided.
- Explain the use case, not just the solution — what problem does this solve?
- Check the [Roadmap in README](README.md#roadmap) to see if it's already planned.

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/sjsreehari/zerra/labels/good%20first%20issue) — these are intentionally scoped to be approachable for new contributors with clear acceptance criteria.

### Pull Requests

1. Fork the repository and create your branch from `main`.
2. Follow the [commit message format](#branch--commit-guidelines).
3. Add or update tests for any logic you change.
4. Update docs if you change an API, CLI command, or config format.
5. Ensure all test suites pass locally before pushing.
6. Open a PR against `main` with a clear description of **what** changed and **why**.

---

## Development Setup

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Python | 3.11+ |
| Go | 1.22+ |
| Docker | 24+ |
| Docker Compose | v2 plugin |

### Clone & Install

```bash
git clone https://github.com/sjsreehari/zerra.git
cd zerra

# Install all Node.js dependencies (monorepo)
npm install

# Generate the Prisma client
npm run prisma:generate

# Start backing services (Postgres + Redis)
docker compose -f infra/docker-compose.yml up postgres redis -d
```

### Running Services (hot-reload)

```bash
# NestJS backend (port 3001)
npm run dev --workspace=apps/backend

# Next.js frontend (port 3000)
npm run dev --workspace=frontend

# Python AI agent (port 8001) — optional
cd agent
python -m venv venv
source venv/bin/activate      # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn api:app --reload --port 8001
```

### Project Structure

```
zerra/
├── apps/backend/       NestJS webhook ingestion + API
├── agent/              Python AI agent (scanner, fix-gen, LangGraph)
├── backend/            Go scanner worker (Semgrep, Syft, OSV, secret scan)
├── cli/                @zerra/cli — `zerra init` and helpers
├── frontend/           Next.js 15 dashboard
├── packages/schema/    Shared Prisma schema + OpenAPI types
└── infra/              Docker Compose, Dockerfiles
```

---

## Branch & Commit Guidelines

### Branch Naming

```
feat/<short-description>       e.g. feat/slack-notifications
fix/<short-description>        e.g. fix/webhook-hmac-constant-time
docs/<short-description>       e.g. docs/contributing-setup
chore/<short-description>      e.g. chore/bump-prisma-6
```

### Commit Messages — Conventional Commits

Zerra uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic changelog generation.

Format: `<type>(<scope>): <description>`

| Type | When to use | Appears in changelog? |
|---|---|:---:|
| `feat` | New user-facing feature | ✅ |
| `fix` | Bug fix | ✅ |
| `perf` | Performance improvement | ✅ |
| `docs` | Documentation only | ✅ |
| `refactor` | Code restructure, no behavior change | ❌ |
| `test` | Adding or updating tests | ❌ |
| `chore` | Maintenance, dependency bumps | ❌ |
| `ci` | CI/CD pipeline changes | ❌ |

**Examples:**

```
feat(scanner): add Go SQL injection Semgrep rule
fix(webhook): handle duplicate delivery ID race condition
docs(contributing): add Go prereqs to setup table
perf(worker): batch OSV querybatch calls to reduce API round-trips
chore: bump prisma to 6.2.0
```

---

## Pull Request Process

1. **Draft first** — open a draft PR early so maintainers can provide early feedback.
2. **Link the issue** — use `Closes #<issue-number>` in the PR description.
3. **CI must pass** — all GitHub Actions checks (lint, typecheck, pytest, go test, Next.js build) must be green before review.
4. **One approval required** — a maintainer will review and approve before merging.
5. **Squash merge** — PRs are squash-merged to keep `main` history clean.

---

## Adding New Security Rules

Security rules live in `agent/scanner/rules/` (Semgrep YAML) and `agent/scanner/sast.py`.

When contributing a new rule, provide:

1. **Rule identifier** — e.g. `python-sql-injection-cursor`, `go-ssrf-http-client`
2. **Severity mapping** — `critical`, `high`, `medium`, `low`, or `info`
3. **CWE identifier** — e.g. `CWE-89` for SQL injection
4. **OWASP category** — e.g. `A03:2021 – Injection`
5. **Fix suggestion template** — add to `agent/integrations/fix_generator.py`
6. **Test fixture** — in `agent/tests/`, demonstrate:
   - Positive detection (vulnerable pattern matches)
   - True-negative (safe pattern does NOT match)

---

## Testing

Run all test suites before submitting a PR:

```bash
# Node.js / TypeScript (Vitest)
npm test

# Python AI agent (pytest)
cd agent && pytest tests/ -v

# Go scanner worker
cd backend && go test ./...

# Next.js typecheck + build
cd frontend && npm run build
```

All four suites run automatically in CI on every push and pull request.

---

## Security Vulnerabilities

If you discover a security vulnerability in Zerra itself, **do not open a public GitHub issue**.

Options:
- **Email:** `security@zerra.dev` — we respond within 48 hours.
- **GitHub private reporting:** use the [Security Advisory](https://github.com/sjsreehari/zerra/security/advisories/new) flow.

See [SECURITY.md](SECURITY.md) for the full responsible disclosure policy.

---

## Questions?

- [Open a Discussion](https://github.com/sjsreehari/zerra/discussions) for general questions.
- Comment on the relevant issue if you're working on something specific.
- We're friendly — don't hesitate to ask.
