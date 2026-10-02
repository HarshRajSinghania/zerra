---
name: "🔐 Security Rule Request"
about: "Propose a new Semgrep SAST rule or improve an existing one"
title: "rule: "
labels: ["security-rule", "enhancement"]
assignees: ""
---

## Rule Summary

<!-- One sentence: what vulnerability pattern does this rule detect? -->

## Language / Ecosystem

<!-- e.g. Python, Go, TypeScript, Dockerfile, Terraform -->

## CWE / OWASP Category

| Field | Value |
|---|---|
| CWE | <!-- e.g. CWE-89 SQL Injection --> |
| OWASP | <!-- e.g. A03:2021 – Injection --> |
| Severity | <!-- critical / high / medium / low --> |

## Vulnerable Pattern (PoC)

```
<!-- Paste a minimal code snippet that this rule should MATCH (flag as vulnerable) -->
```

## Safe Pattern (true-negative)

```
<!-- Paste a minimal code snippet that this rule should NOT match -->
```

## Proposed Fix / Remediation Hint

<!-- What fix should Zerra suggest when this rule fires? -->

## References

<!-- CVEs, OWASP links, Semgrep rule examples, blog posts, etc. -->
