<div align="center">

```
 ███████╗███████╗██████╗ ██████╗  █████╗
 ╚══███╔╝██╔════╝██╔══██╗██╔══██╗██╔══██╗
   ███╔╝ █████╗  ██████╔╝██████╔╝███████║
  ███╔╝  ██╔══╝  ██╔══██╗██╔══██╗██╔══██║
 ███████╗███████╗██║  ██║██║  ██║██║  ██║
 ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
```

**Every commit, reviewed like your best security engineer just looked at it — because one did.**

[![CI](https://img.shields.io/github/actions/workflow/status/sjsreehari/zerra/ci.yml?style=flat-square&color=6366f1&label=CI&logo=githubactions&logoColor=white)](https://github.com/sjsreehari/zerra/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-GPL--3.0-6366f1?style=flat-square&logo=gnu&logoColor=white)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-6366f1?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/python-3.11%2B-6366f1?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Go](https://img.shields.io/badge/go-1.22%2B-6366f1?style=flat-square&logo=go&logoColor=white)](https://golang.org)
[![Issues](https://img.shields.io/github/issues/sjsreehari/zerra?style=flat-square&color=6366f1&logo=github&logoColor=white)](https://github.com/sjsreehari/zerra/issues)
[![Last commit](https://img.shields.io/github/last-commit/sjsreehari/zerra?style=flat-square&color=6366f1&logo=git&logoColor=white)](https://github.com/sjsreehari/zerra/commits/main)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-6366f1.svg?style=flat-square&logo=github&logoColor=white)](CONTRIBUTING.md)

*Self-hostable · Open Source · AppSec for GitHub PRs*

</div>

---

## What is Zerra?

Zerra is an **open-source, self-hostable Application Security (AppSec) platform** for GitHub pull requests. Every PR triggers a diff-scoped security review combining:

- 🔍 **SAST** via Semgrep with customizable rule sets
- 📦 **SCA** via Syft SBOM + OSV batch vulnerability queries
- 🔑 **Secret scanning** with entropy analysis and smart allowlisting
- 🤖 **AI-assisted remediation** with confidence gating and automated patch verification

Zerra never asks for a personal access token. It authenticates via the GitHub App manifest flow, stores credentials in the OS keychain, and uses an AES-256-GCM encrypted-file fallback.

```
GitHub PR ──→ signed NestJS webhook ──→ Redis / BullMQ ──→ Go worker
                                                      ↘ Postgres ← Next.js dashboard
worker ──→ Semgrep + Syft/OSV + secret scan ──→ verified patch ──→ GitHub PR / Issue
```

---

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quickstart](#quickstart)
- [Development](#development)
- [Project Structure](#project-structure)
- [Current Work](#current-work)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub PR Event                      │
└──────────────────────────┬──────────────────────────────┘
                           │ X-Hub-Signature-256 (verified)
                           ▼
┌─────────────────────────────────────────────────────────┐
│        NestJS Webhook Ingestion  (port 3001)            │
│  • Deduplicates by delivery ID (Postgres)               │
│  • Only queues: opened / synchronized / reopened        │
└──────────────────────────┬──────────────────────────────┘
                           │ BullMQ job
                           ▼
┌─────────────────────────────────────────────────────────┐
│           Go Worker  (diff-scoped analysis)             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Semgrep   │  │  Syft + OSV  │  │ Secret Scan   │  │
│  │    SAST     │  │     SCA      │  │(entropy+regex)│  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────────┬──────────────────────────────┘
              ┌────────────┴────────────┐
              ▼                         ▼
  ┌─────────────────────┐   ┌──────────────────────────┐
  │    Fix Engine       │   │   Postgres + Redis        │
  │ git apply --check   │   │ scan records, queues,     │
  │ AI patch + rescan   │   │ delivery ID dedup         │
  └──────────┬──────────┘   └──────────────────────────┘
             │
             ▼
  ┌──────────────────────┐     ┌─────────────────────┐
  │  GitHub PR comment   │     │  Next.js Dashboard   │
  │  or Issue creation   │     │  SARIF viewer, live  │
  └──────────────────────┘     │  scan results        │
                               └─────────────────────┘
```

---

## Features

| Feature | Status | Description |
|---|:---:|---|
| **Signed Webhook Ingestion** | ✅ Done | Validates `X-Hub-Signature-256` in constant time; deduplicates retries by delivery ID |
| **SAST (Semgrep)** | ✅ Done | Runs against diff-scoped changed files only; SARIF output per scan |
| **SCA (Syft + OSV)** | ✅ Done | Generates SBOM, batch-queries OSV for known CVEs in dependencies |
| **Secret Scanning** | ✅ Done | Entropy analysis + UUID/hash/base64 allowlisting; strict subprocess input validation |
| **Fix Engine** | ✅ Done | Rejects non-unified diffs; runs `git apply --check`; detects test/lint commands |
| **Next.js Dashboard** | ✅ Done | Live API routes, real empty states, per-scan SARIF output viewer |
| **OS Keychain Auth** | ✅ Done | GitHub App manifest flow; AES-256-GCM encrypted-file fallback |
| **CLI (`zerra init`)** | ✅ Done | Starts Compose stack, opens GitHub App manifest onboarding |
| **AI-Assisted Fixes** | 🔧 In Progress | Anthropic integration wired; pending live credential hookup |
| **PR / Issue Creation** | 🔧 In Progress | GitHub App token exchange partially complete |
| **Slack / Discord / Email** | 📋 Planned | Notification delivery adapters |
| **Dashboard Trends / MTTF** | 📋 Planned | Scan trend charts and mean-time-to-fix metrics |

✅ Implemented · 🔧 In Progress · 📋 Planned

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Webhook / API** | NestJS (TypeScript), BullMQ, Redis |
| **Worker / Scanner** | Go 1.22, Semgrep, Syft, OSV API |
| **AI Agent** | Python 3.11, FastAPI, LangGraph |
| **Frontend** | Next.js 15, React 19, TailwindCSS |
| **Database** | PostgreSQL (Prisma ORM) |
| **Auth** | GitHub App manifest flow, OS keychain, AES-256-GCM fallback |
| **Infrastructure** | Docker Compose, GitHub Actions |
| **Testing** | Vitest (TypeScript), pytest (Python), `go test` |

---

## Quickstart

### Requirements

- **Docker Desktop** (macOS / Windows) or `docker` + `docker compose` (Linux)
- **Node.js 18+** and **npm**
- A **GitHub account** (to install the Zerra GitHub App)

### Setup

```bash
git clone https://github.com/sjsreehari/zerra.git
cd zerra
cp .env.example .env          # fill in your values
npm install
docker compose -f infra/docker-compose.yml up --build
npm run start --workspace=@zerra/cli -- init
```

`zerra init` opens `http://localhost:3000/setup`, which starts GitHub's App-manifest flow. Follow the on-screen steps to install the app on your repositories.

| Service | URL |
|---|---|
| Dashboard | `http://localhost:3000` |
| Webhook endpoint | `http://localhost:3001/webhooks/github` |

---

## Development

### Prerequisites

- **Node.js 18+** & **npm**
- **Python 3.11+** (for the AI agent)
- **Go 1.22+** (for the scanner worker)
- **Docker & Docker Compose**

### Setup

```bash
# Install Node.js dependencies (monorepo)
npm install

# Generate Prisma client
npm run prisma:generate

# Start infrastructure (Postgres + Redis only)
docker compose -f infra/docker-compose.yml up postgres redis -d

# Run all tests
npm test
```

### Hot-reload Dev Servers

```bash
# Terminal A — NestJS backend
npm run dev --workspace=apps/backend

# Terminal B — Next.js frontend
npm run dev --workspace=frontend

# Terminal C — Python AI agent (optional)
cd agent
python -m venv venv && source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn api:app --reload --port 8001
```

### Running Tests

```bash
# All workspaces (Vitest + workspace tests)
npm test

# Unit tests only
npm run test:unit

# Python agent tests
cd agent && pytest tests/ -v

# Go scanner tests
cd backend && go test ./...
```

---

## Project Structure

```
zerra/
├── .github/
│   ├── workflows/          CI/CD pipelines (ci.yml, release.yml, codeql.yml)
│   └── ISSUE_TEMPLATE/     Bug / feature / security issue forms
├── apps/
│   └── backend/            NestJS webhook ingestion + BullMQ job producer
├── agent/                  Python AI agent (LangGraph / FastAPI)
│   ├── scanner/            Semgrep rule wrappers + SAST orchestration
│   ├── integrations/       Fix generator, GitHub adapter (PR/Issue creation)
│   ├── orchestrator/       LangGraph scan-fix-rescan graph
│   └── tests/              pytest suites
├── backend/                Go scanner worker
│   ├── cmd/                Entry points (worker, healthcheck)
│   ├── internal/           Core scanner, OSV client, secret detector
│   └── migrations/         DB migration SQL files
├── cli/                    @zerra/cli — `zerra init` and helpers
├── frontend/               Next.js 15 dashboard (SARIF viewer, scan list)
├── packages/
│   └── schema/             Shared Prisma schema + OpenAPI contract (TypeScript)
├── infra/                  Docker Compose stacks, Dockerfiles
├── tests/                  Integration test suite
├── .zerra.yml              Zerra self-scan policy (block on CRITICAL, auto-fix rules)
└── package.json            Monorepo root (npm workspaces)
```

---

## Current Work

> These items are actively under development or in code review.

- **GitHub App token exchange** — Installation-token refresh so the worker can clone private repos and post PR review comments / create Issues as the Zerra bot.
- **Durable worker orchestration** — End-to-end wiring of the scan → fix → re-scan → verified merge/comment pipeline with dead-letter routing for failed jobs.
- **AI fix confidence scoring** — Prompt-engineering the Anthropic chain to return a structured confidence score before applying a fix automatically.
- **SARIF explorer UX** — Making the SARIF viewer interactive: filter by severity, jump to file/line, mark false-positives inline.
- **Semgrep rule registry** — Custom rules targeting Go and TypeScript AppSec patterns (SQL injection, insecure deserialization, SSRF, path traversal).

---

## Roadmap

> Planned features not yet started. PRs welcome!

| Priority | Feature | Description |
|:---:|---|---|
| 🔴 High | **Slack / Discord / Email notifications** | Alert channels when a CRITICAL finding lands in a PR |
| 🔴 High | **GitHub PR inline comments** | Post inline review comments per finding, grouped by file |
| 🟡 Medium | **Dashboard trend charts** | MTTF, finding rates, scan-count trends over time |
| 🟡 Medium | **Policy-as-code (`.zerra.yml`)** | Branch-level block rules, per-rule severity overrides, auto-fix constraints |
| 🟡 Medium | **Multi-repo support** | Scan multiple GitHub repos from a single Zerra installation |
| 🟡 Medium | **Semgrep rule marketplace** | Community-contributed rule packs, versioned and signed |
| 🟢 Low | **DAST integration** | Optionally trigger a lightweight DAST scan on staging URLs post-merge |
| 🟢 Low | **VS Code extension** | Surface Zerra findings inline in the editor during development |
| 🟢 Low | **Audit log export** | Export all scan findings and fix decisions as signed, tamper-evident JSON |
| 🟢 Low | **Homebrew / Scoop tap** | Package the CLI: `brew install zerra` / `scoop install zerra` |

---

## Contributing

We welcome contributions of all kinds — bug reports, security rule enhancements, feature proposals, documentation improvements, and pull requests.

👉 Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

First-time contributors: look for issues labeled [`good first issue`](https://github.com/sjsreehari/zerra/labels/good%20first%20issue).

---

## Security

Zerra is an AppSec tool — we take our own security seriously. For responsible disclosure guidelines, see [SECURITY.md](SECURITY.md).

**Do not open a public GitHub issue for security vulnerabilities.** Email `security@zerra.dev` instead. We respond within 48 hours.

---

## License

Zerra is licensed under the **GNU General Public License v3.0**.  
See [LICENSE](LICENSE) for the full text.

---

<div align="center">

*Built in public. Security for everyone.*

[GitHub](https://github.com/sjsreehari/zerra) · [Issues](https://github.com/sjsreehari/zerra/issues) · [Discussions](https://github.com/sjsreehari/zerra/discussions)

</div>
