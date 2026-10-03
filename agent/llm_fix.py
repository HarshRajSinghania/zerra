"""LLM-powered fix generator for Zerra.

Extends the pattern-based fix_generator.py with AI-assisted patch generation.
Supports Ollama (local), Anthropic Claude, and OpenAI GPT backends.

Priority order:
1. Pattern-based fix (agent/integrations/fix_generator.py) — instant, no API call
2. Ollama local model (OLLAMA_BASE_URL set) — private, offline-capable
3. Anthropic Claude (ANTHROPIC_API_KEY set) — cloud, high quality
4. OpenAI GPT (OPENAI_API_KEY set) — cloud, fallback

Usage::

    from agent.llm_fix import generate_fix_with_llm

    fix = await generate_fix_with_llm(finding, file_content)
    if fix:
        print(fix.fixed_code)
"""

from __future__ import annotations

import json
import logging
import os
import urllib.request
import urllib.error
from typing import Optional

from agent.scanner.models import Finding, FixSuggestion
from agent.integrations.fix_generator import generate_fix

logger = logging.getLogger(__name__)

_MAX_CONTEXT_CHARS = 4000   # Keep prompts short for local models
_MAX_FIX_CHARS = 2000


# ── Prompt builder ────────────────────────────────────────────────────────

def _build_prompt(finding: Finding, file_content: Optional[str]) -> str:
    """Build a concise, model-agnostic fix prompt."""
    context = ""
    if file_content and finding.file_path:
        lines = file_content.splitlines()
        start = max(0, (finding.line_start or 1) - 10)
        end = min(len(lines), (finding.line_end or finding.line_start or 1) + 10)
        context = "\n".join(f"{i+start+1}: {l}" for i, l in enumerate(lines[start:end]))
        context = context[:_MAX_CONTEXT_CHARS]

    cwe = f" ({finding.cwe_id})" if finding.cwe_id else ""
    owasp = f" — {finding.owasp_category}" if finding.owasp_category else ""

    return f"""You are a security engineer fixing a vulnerability. Return ONLY a JSON object.

VULNERABILITY: {finding.title}{cwe}{owasp}
SEVERITY: {finding.severity.value.upper()}
FILE: {finding.file_path or 'unknown'}:{finding.line_start or '?'}
DESCRIPTION: {finding.description[:400]}

VULNERABLE CODE:
```
{finding.code_snippet or '(see context below)'}
```

SURROUNDING CONTEXT:
```
{context}
```

Return this exact JSON (no markdown, no explanation):
{{
  "fixed_code": "<the corrected code snippet only>",
  "explanation": "<one sentence explaining what was changed and why>"
}}"""


# ── Ollama backend ────────────────────────────────────────────────────────

def _ollama_fix(prompt: str) -> Optional[tuple[str, str]]:
    """Call Ollama local model. Returns (fixed_code, explanation) or None."""
    base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.environ.get("OLLAMA_MODEL", "llama3.2")

    payload = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 512},
    }).encode()

    try:
        req = urllib.request.Request(
            f"{base_url}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
            text = data.get("response", "")
            return _parse_json_response(text)
    except Exception as exc:
        logger.debug("Ollama fix failed: %s", exc)
        return None


# ── Anthropic backend ─────────────────────────────────────────────────────

def _anthropic_fix(prompt: str) -> Optional[tuple[str, str]]:
    """Call Anthropic Claude API. Returns (fixed_code, explanation) or None."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None

    model = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-20240307")
    payload = json.dumps({
        "model": model,
        "max_tokens": 512,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    try:
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            text = data.get("content", [{}])[0].get("text", "")
            return _parse_json_response(text)
    except Exception as exc:
        logger.debug("Anthropic fix failed: %s", exc)
        return None


# ── OpenAI backend ────────────────────────────────────────────────────────

def _openai_fix(prompt: str) -> Optional[tuple[str, str]]:
    """Call OpenAI API. Returns (fixed_code, explanation) or None."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return None

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 512,
        "temperature": 0.1,
    }).encode()

    try:
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            text = data["choices"][0]["message"]["content"]
            return _parse_json_response(text)
    except Exception as exc:
        logger.debug("OpenAI fix failed: %s", exc)
        return None


# ── JSON response parser ──────────────────────────────────────────────────

def _parse_json_response(text: str) -> Optional[tuple[str, str]]:
    """Extract fixed_code and explanation from a model JSON response."""
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        data = json.loads(text)
        fixed_code = str(data.get("fixed_code", "")).strip()
        explanation = str(data.get("explanation", "")).strip()
        if fixed_code:
            return fixed_code[:_MAX_FIX_CHARS], explanation
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    return None


# ── Main entry point ──────────────────────────────────────────────────────

async def generate_fix_with_llm(
    finding: Finding,
    file_content: Optional[str] = None,
) -> Optional[FixSuggestion]:
    """Generate a fix suggestion for a finding using pattern rules or LLM.

    Strategy:
    1. Try fast pattern-based fix first (no latency, no API cost).
    2. Fall back to local Ollama model if available.
    3. Fall back to Anthropic Claude if ANTHROPIC_API_KEY is set.
    4. Fall back to OpenAI GPT if OPENAI_API_KEY is set.
    5. Return None if all strategies fail.
    """
    import asyncio

    # 1. Pattern-based (instant)
    pattern_fix = generate_fix(finding, file_content)
    if pattern_fix:
        logger.debug("Fix from pattern rules for %s", finding.rule_id)
        return pattern_fix

    # No file path — LLM can't help without context
    if not finding.file_path:
        return None

    prompt = _build_prompt(finding, file_content)
    loop = asyncio.get_event_loop()

    # 2–4. Try LLM backends in priority order (run in thread pool to avoid blocking)
    for backend_name, backend_fn in [
        ("ollama", _ollama_fix),
        ("anthropic", _anthropic_fix),
        ("openai", _openai_fix),
    ]:
        try:
            result = await loop.run_in_executor(None, backend_fn, prompt)
            if result:
                fixed_code, explanation = result
                logger.info(
                    "LLM fix generated via %s for %s (%s)",
                    backend_name,
                    finding.rule_id,
                    finding.file_path,
                )
                return FixSuggestion(
                    file_path=finding.file_path,
                    original_code=finding.code_snippet or "",
                    fixed_code=fixed_code,
                    explanation=explanation or f"AI-generated fix via {backend_name}",
                )
        except Exception as exc:
            logger.debug("Backend %s error: %s", backend_name, exc)

    logger.debug("No fix available for %s", finding.rule_id)
    return None
