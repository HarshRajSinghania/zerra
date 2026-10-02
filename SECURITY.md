# Security Policy

## Reporting a Vulnerability

Zerra is an AppSec tool — we take our own security very seriously.

**Do NOT open a public GitHub issue for security vulnerabilities.** Doing so may expose users of Zerra before a fix is available.

Instead, please use one of the following channels:

| Channel | Details |
|---|---|
| Email | `isrosreehari@gmail.com` |
| GitHub Security Advisory | [Report a vulnerability](https://github.com/sjsreehari/zerra/security/advisories/new) |

We will respond to all valid reports within **48 hours** and aim to have a patch or mitigation available within **7 days** for critical issues.

---

## What to Include

A high-quality report helps us triage and fix faster. Please include:

- **Description** — what is the vulnerability and where does it exist?
- **Impact** — what can an attacker achieve? (data exposure, RCE, privilege escalation, etc.)
- **Steps to reproduce** — exact commands, payloads, or curl requests
- **Environment** — OS, Docker version, Zerra version, Node/Python/Go versions
- **Proof of concept** — a minimal script or screenshot if applicable

---

## Supported Versions

| Version | Supported |
|---|:---:|
| `main` branch (latest) | Yes |
| Tagged releases | Yes |
| Older versions | No — please upgrade |

---

## Disclosure Policy

We follow [coordinated vulnerability disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure):

1. Reporter submits a private report.
2. We confirm receipt within **48 hours**.
3. We investigate and develop a fix.
4. We release the fix and publish a GitHub Security Advisory with credit to the reporter (unless anonymity is requested).
5. We notify downstream users via the GitHub Releases page.

---

## Scope

The following are **in scope**:

- Webhook signature bypass (HMAC forgery)
- Secret exposure via API or dashboard
- Authentication bypass or privilege escalation
- Remote code execution in the scanner worker or AI agent
- SQL injection or data leakage via API endpoints
- Credential leakage (keychain, `.env`, encrypted fallback)
- Dependency vulnerabilities with direct exploitability

The following are **out of scope**:

- Issues in third-party dependencies without direct exploitability in Zerra
- DoS via resource exhaustion without demonstrated impact
- Social engineering attacks
- Physical access attacks

---

## Hall of Fame

We credit all responsible reporters in our [Security Advisories](https://github.com/sjsreehari/zerra/security/advisories) page (with permission).

Thank you for helping keep Zerra and its users safe.
