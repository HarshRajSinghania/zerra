"""GitHub webhook signature verifier for Zerra.

Verifies the HMAC-SHA256 signature on incoming GitHub webhook payloads.
Requires GITHUB_WEBHOOK_SECRET environment variable to be set.

Usage (FastAPI)::

    from agent.webhook_security import verify_github_signature

    @app.post("/v1/webhooks/github")
    async def github_webhook(
        request: Request,
        x_hub_signature_256: str | None = Header(default=None),
    ):
        body = await request.body()
        verify_github_signature(body, x_hub_signature_256)
        ...
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Optional

from fastapi import Header, HTTPException, Request

logger = logging.getLogger(__name__)


def _get_webhook_secret() -> Optional[bytes]:
    """Load the GitHub webhook secret from environment."""
    raw = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
    return raw.encode("utf-8") if raw else None


def compute_github_signature(body: bytes, secret: bytes) -> str:
    """Compute the expected GitHub webhook HMAC-SHA256 signature."""
    mac = hmac.new(secret, body, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def verify_github_signature(
    body: bytes,
    signature_header: Optional[str],
    *,
    strict: bool = True,
) -> None:
    """Verify a GitHub webhook X-Hub-Signature-256 header.

    Parameters
    ----------
    body:
        The raw request body bytes.
    signature_header:
        The value of the X-Hub-Signature-256 header.
    strict:
        If True (default), raises HTTPException on verification failure.
        If False and GITHUB_WEBHOOK_SECRET is not set, silently skips check
        (useful for local dev without a configured secret).

    Raises
    ------
    HTTPException 401:
        If the signature is missing or invalid.
    """
    secret = _get_webhook_secret()

    if not secret:
        if strict:
            logger.warning("GITHUB_WEBHOOK_SECRET not set — rejecting webhook request")
            raise HTTPException(
                status_code=401,
                detail="Webhook secret not configured. Set GITHUB_WEBHOOK_SECRET.",
            )
        # Permissive mode: no secret configured, skip verification
        logger.debug("No webhook secret set; skipping signature check")
        return

    if not signature_header:
        raise HTTPException(
            status_code=401,
            detail="Missing X-Hub-Signature-256 header",
        )

    expected = compute_github_signature(body, secret)

    if not hmac.compare_digest(
        expected.encode("utf-8"),
        signature_header.encode("utf-8"),
    ):
        logger.warning("Webhook signature mismatch — possible replay or tampered payload")
        raise HTTPException(
            status_code=401,
            detail="Webhook signature verification failed",
        )

    logger.debug("Webhook signature verified OK")


async def extract_github_event(
    request: Request,
    x_github_event: Optional[str] = Header(default=None),
    x_hub_signature_256: Optional[str] = Header(default=None),
) -> tuple[str, bytes, dict]:
    """FastAPI dependency: reads body, verifies signature, parses JSON.

    Returns (event_type, raw_body, parsed_json).
    """
    import json as _json

    body = await request.body()

    # Allow relaxed verification in local dev (no secret set)
    verify_github_signature(body, x_hub_signature_256, strict=False)

    try:
        payload = _json.loads(body)
    except _json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in webhook body")

    event_type = x_github_event or "push"
    return event_type, body, payload
