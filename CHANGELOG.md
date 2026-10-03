# Changelog

All notable changes to Zerra are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.2.0] — 2026-10-03

### Added
- **CLI v0.2** (`@zerra/cli`) — full-featured command line interface:
  - `zerra init` — start the Docker stack and open the dashboard
  - `zerra doctor` — prerequisites and health check
  - `zerra scan <path|url>` — enqueue a scan from the terminal
  - `zerra vault` — credential management (list / set / delete / github-token)
  - `zerra logs` — stream service logs
  - `zerra stop` — stop all services
  - `zerra update` — pull latest images and restart
- **One-line installer** (`install.sh` / `install.ps1`) for macOS, Linux, and Windows
- **Production-ready `compose.yaml`** with:
  - Named volumes for vault and Postgres data
  - `unless-stopped` restart policies
  - JSON structured logging
  - GHCR image references for tagged deployments (`ZERRA_VERSION=x.y.z`)
  - Healthchecks on all services with startup grace periods
- **Async scan queue** (`/v1/queue/*`) — non-blocking scan job submission via API
- **Encrypted credential vault** (`/v1/vault/*`) — OS keychain + AES-256-GCM fallback
- **Policy engine** (`/v1/policy/*`) — evaluates `zerra.yml` against scan results
- **Sandbox API** (`/v1/sandbox/*`) — Docker sandbox status and cleanup
- **LLM fix generation** (`/v1/findings/{id}/llm-fix`) — Ollama → Claude → GPT priority chain
- **Webhook security** (`/v1/webhooks/github/secure`) — HMAC-SHA256 verified webhooks
- **LLM backend status** (`/v1/llm/backends`) — reports available AI providers
- **GitHub Release workflow** — multi-arch Docker images (amd64 + arm64) + npm publish on git tag
- **INSTALL.md** — comprehensive getting-started and troubleshooting guide
- **Expanded `.env.example`** — full documentation for every configuration variable
- **Security rules** for 8 languages: Python, TypeScript, JavaScript, Go, Java, PHP, Rust, generic
- 31 passing unit tests covering all architecture modules

### Changed
- `compose.yaml` now uses service-specific Docker images and volumes
- `nginx.conf` now proxies dashboard, gateway, and inference on separate paths
- `zerra.yml` default policy updated with blocked CWEs (CWE-89, CWE-798, CWE-502)

### Infrastructure
- Docker images published to `ghcr.io/sjsreehari/zerra-*` on release
- CLI published to npm as `@zerra/cli`

---

## [0.1.0] — 2026-09-15

### Added
- Initial release of the Zerra security platform
- **LangGraph agent** — Python 3.11 AI agent with Ollama integration
- **FastAPI inference service** — REST API for policy evaluation, scan orchestration, and reporting
- **Go gateway** — JWT authentication, subdomain routing, and OWASP API Top 10 scanning
- **Next.js 15 dashboard** — dark-mode web interface with Findings, Repositories, Scans, and Threats views
- **Scanner engine** — SAST (custom YAML rules), SCA (OSV API), and entropy-based secret detection
- **Fix engine** (`@zerra/fix-engine`) — unified diff validation, `git apply --check`, test runner, and Anthropic fallback
- **Credential vault** (`@zerra/cli`) — OS keychain + AES-256-GCM encrypted file fallback
- **Prisma schema** — shared PostgreSQL models for scans, findings, and repositories
- **SARIF export** — OASIS SARIF 2.1.0 compatible output
- **Docker Compose stack** — Postgres 16, Go gateway, Python inference, Next.js dashboard, Nginx

[0.2.0]: https://github.com/sjsreehari/zerra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sjsreehari/zerra/releases/tag/v0.1.0
