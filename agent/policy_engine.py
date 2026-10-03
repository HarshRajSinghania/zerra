"""Policy enforcement engine for Zerra.

Reads a `zerra.yml` policy file from the project root (or a custom path) and
evaluates scan results against it to:
  - Enforce severity thresholds (fail if critical > N)
  - Block deployment if a specific CWE / OWASP category is found
  - Set minimum security grade requirements
  - Define suppression rules (known false positives)

Schema example (`zerra.yml`)::

    version: "1"

    policy:
      min_grade: "C"               # Fail if grade worse than C
      max_critical: 0              # Zero tolerance for CRITICAL findings
      max_high: 3
      fail_on_new_secrets: true    # Always fail if new secrets detected

    block_rules:
      - cwe: "CWE-89"             # Always block on SQL injection
      - cwe: "CWE-798"            # Always block on hardcoded creds
      - owasp: "A03:2021"         # Block on Injection category

    suppressions:
      - rule_id: "cors-wildcard"
        file_path: "agent/api.py"
        reason: "Intentional CORS for dev environment"
        expires: "2027-01-01"
      - rule_id: "high-entropy"
        file_path: "tests/"
        reason: "Test fixtures contain high-entropy strings"
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml

from agent.scanner.models import Finding, ScanResult, Severity

logger = logging.getLogger(__name__)

# ── Grade ordering ────────────────────────────────────────────────────────
_GRADES = ["A+", "A", "B", "C", "D", "F"]
_GRADE_ORDER = {g: i for i, g in enumerate(_GRADES)}


def _grade_worse_than(actual: str, minimum: str) -> bool:
    """Return True if `actual` grade is worse (lower) than `minimum`."""
    a = _GRADE_ORDER.get(actual, len(_GRADES))
    m = _GRADE_ORDER.get(minimum, len(_GRADES))
    return a > m


# ── Data models ───────────────────────────────────────────────────────────

class PolicyViolation:
    def __init__(self, rule: str, message: str, severity: str = "error") -> None:
        self.rule = rule
        self.message = message
        self.severity = severity  # "error" | "warning"

    def to_dict(self) -> dict[str, str]:
        return {"rule": self.rule, "message": self.message, "severity": self.severity}

    def __repr__(self) -> str:
        return f"[{self.severity.upper()}] {self.rule}: {self.message}"


class PolicyResult:
    def __init__(self, violations: list[PolicyViolation]) -> None:
        self.violations = violations

    @property
    def passed(self) -> bool:
        return not any(v.severity == "error" for v in self.violations)

    @property
    def errors(self) -> list[PolicyViolation]:
        return [v for v in self.violations if v.severity == "error"]

    @property
    def warnings(self) -> list[PolicyViolation]:
        return [v for v in self.violations if v.severity == "warning"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "violations": [v.to_dict() for v in self.violations],
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
        }


# ── Suppression helpers ───────────────────────────────────────────────────

def _is_suppressed(finding: Finding, suppressions: list[dict]) -> bool:
    """Return True if a finding matches any suppression rule."""
    today = date.today()
    for sup in suppressions:
        # Check expiry
        expires = sup.get("expires")
        if expires:
            try:
                exp_date = date.fromisoformat(str(expires))
                if exp_date < today:
                    continue  # Suppression expired
            except ValueError:
                pass

        rule_match = (not sup.get("rule_id")) or (
            finding.rule_id and sup["rule_id"] in (finding.rule_id or "")
        )
        path_match = (not sup.get("file_path")) or (
            finding.file_path and (finding.file_path or "").startswith(sup["file_path"])
        )
        if rule_match and path_match:
            return True
    return False


# ── Policy engine ─────────────────────────────────────────────────────────

class PolicyEngine:
    """Loads and evaluates a zerra.yml policy against scan results."""

    DEFAULT_POLICY: dict[str, Any] = {
        "version": "1",
        "policy": {
            "min_grade": "D",
            "max_critical": 5,
            "max_high": 20,
            "fail_on_new_secrets": False,
        },
        "block_rules": [],
        "suppressions": [],
    }

    def __init__(self, policy_path: str | Path | None = None) -> None:
        self._policy_path = Path(policy_path) if policy_path else None
        self._config: dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        """Load policy config from file or use defaults."""
        candidates = [
            self._policy_path,
            Path("zerra.yml"),
            Path("zerra.yaml"),
            Path(".zerra.yml"),
        ]
        for path in candidates:
            if path and path.exists():
                try:
                    self._config = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
                    logger.info("Loaded policy from %s", path)
                    return
                except Exception as exc:
                    logger.warning("Failed to load policy file %s: %s", path, exc)
        self._config = self.DEFAULT_POLICY.copy()
        logger.debug("Using default policy (no zerra.yml found)")

    def reload(self) -> None:
        """Hot-reload the policy file."""
        self._load()

    def evaluate(self, result: ScanResult) -> PolicyResult:
        """Evaluate a ScanResult against the loaded policy."""
        violations: list[PolicyViolation] = []
        policy = self._config.get("policy", {})
        block_rules = self._config.get("block_rules", [])
        suppressions = self._config.get("suppressions", [])

        # Apply suppressions to get effective findings
        effective = [f for f in result.findings if not _is_suppressed(f, suppressions)]

        # ── Grade check ──────────────────────────────────────────────────
        min_grade = policy.get("min_grade", "D")
        actual_grade = result.security_score
        if _grade_worse_than(actual_grade, min_grade):
            violations.append(PolicyViolation(
                rule="min_grade",
                message=f"Security grade {actual_grade} is worse than required {min_grade}",
                severity="error",
            ))

        # ── Count thresholds ─────────────────────────────────────────────
        critical = sum(1 for f in effective if f.severity == Severity.CRITICAL)
        high = sum(1 for f in effective if f.severity == Severity.HIGH)

        max_critical = policy.get("max_critical", 99)
        max_high = policy.get("max_high", 99)

        if critical > max_critical:
            violations.append(PolicyViolation(
                rule="max_critical",
                message=f"Found {critical} CRITICAL findings (max allowed: {max_critical})",
                severity="error",
            ))

        if high > max_high:
            violations.append(PolicyViolation(
                rule="max_high",
                message=f"Found {high} HIGH findings (max allowed: {max_high})",
                severity="error",
            ))

        # ── Secrets gate ─────────────────────────────────────────────────
        if policy.get("fail_on_new_secrets", False):
            secrets = [f for f in effective if f.vulnerability_type.value == "secret"]
            if secrets:
                violations.append(PolicyViolation(
                    rule="fail_on_new_secrets",
                    message=f"Found {len(secrets)} secret(s): {', '.join(f.title for f in secrets[:3])}",
                    severity="error",
                ))

        # ── Block rules ──────────────────────────────────────────────────
        for rule in block_rules:
            blocked_cwe = rule.get("cwe")
            blocked_owasp = rule.get("owasp")
            blocked_rule_id = rule.get("rule_id")

            for f in effective:
                if blocked_cwe and f.cwe_id and f.cwe_id.startswith(blocked_cwe):
                    violations.append(PolicyViolation(
                        rule=f"block:{blocked_cwe}",
                        message=f"Blocked finding: {f.title} [{f.cwe_id}] in {f.file_path}:{f.line_start}",
                        severity="error",
                    ))
                    break
                if blocked_owasp and f.owasp_category and blocked_owasp in f.owasp_category:
                    violations.append(PolicyViolation(
                        rule=f"block:{blocked_owasp}",
                        message=f"Blocked OWASP category {blocked_owasp}: {f.title}",
                        severity="error",
                    ))
                    break
                if blocked_rule_id and f.rule_id and blocked_rule_id in (f.rule_id or ""):
                    violations.append(PolicyViolation(
                        rule=f"block:{blocked_rule_id}",
                        message=f"Blocked rule {blocked_rule_id}: {f.title}",
                        severity="error",
                    ))
                    break

        return PolicyResult(violations)


# ── Module-level singleton ─────────────────────────────────────────────────
_policy_engine: Optional[PolicyEngine] = None


def get_policy_engine() -> PolicyEngine:
    global _policy_engine
    if _policy_engine is None:
        _policy_engine = PolicyEngine()
    return _policy_engine
