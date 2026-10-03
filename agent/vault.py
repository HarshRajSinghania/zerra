"""Credential vault for Zerra.

Provides secure storage of GitHub tokens, API keys, and other secrets using:
1. OS keychain (keyring) — preferred; uses Windows Credential Manager, macOS Keychain, 
   or libsecret on Linux.
2. AES-256-GCM encrypted local file — fallback when keyring is unavailable 
   (e.g., headless servers, CI/CD).

Usage::

    from agent.vault import vault

    # Store
    vault.set("github-token-myrepo", "ghp_...")

    # Retrieve
    token = vault.get("github-token-myrepo")  # Returns None if not found

    # Delete
    vault.delete("github-token-myrepo")

    # List keys (without values)
    keys = vault.list_keys()
"""

from __future__ import annotations

import base64
import json
import logging
import os
import secrets
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_SERVICE_NAME = "zerra-credential-vault"
_VAULT_FILE = Path(os.environ.get("ZERRA_VAULT_PATH", Path.home() / ".zerra" / "vault.enc"))


# ── Keyring backend ────────────────────────────────────────────────────────

def _keyring_available() -> bool:
    """Check if a working keyring backend is available."""
    try:
        import keyring
        import keyring.errors
        # Attempt a no-op to verify the backend works
        keyring.get_password(_SERVICE_NAME, "__probe__")
        return True
    except Exception:
        return False


def _keyring_set(key: str, value: str) -> None:
    import keyring
    keyring.set_password(_SERVICE_NAME, key, value)


def _keyring_get(key: str) -> Optional[str]:
    import keyring
    return keyring.get_password(_SERVICE_NAME, key)


def _keyring_delete(key: str) -> None:
    import keyring
    import keyring.errors
    try:
        keyring.delete_password(_SERVICE_NAME, key)
    except keyring.errors.PasswordDeleteError:
        pass


# ── File-based AES-256-GCM vault ──────────────────────────────────────────

def _derive_key(master: bytes) -> bytes:
    """Derive a 32-byte AES key from the master secret using SHA-256."""
    import hashlib
    return hashlib.sha256(master).digest()


def _get_master_key() -> bytes:
    """Get or create a per-machine master key stored in an env var or a key file."""
    raw = os.environ.get("ZERRA_VAULT_KEY")
    if raw:
        return base64.b64decode(raw)
    key_file = _VAULT_FILE.parent / ".key"
    if key_file.exists():
        return base64.b64decode(key_file.read_text().strip())
    # Generate a new machine key
    master = secrets.token_bytes(32)
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key_file.write_text(base64.b64encode(master).decode())
    key_file.chmod(0o600)
    logger.info("Generated new vault master key at %s", key_file)
    return master


def _file_load() -> dict[str, str]:
    """Load and decrypt the vault file."""
    if not _VAULT_FILE.exists():
        return {}
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        raw = base64.b64decode(_VAULT_FILE.read_bytes())
        # Format: nonce(12) + ciphertext
        nonce, ciphertext = raw[:12], raw[12:]
        key = _derive_key(_get_master_key())
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode("utf-8"))
    except Exception as exc:
        logger.error("Failed to decrypt vault file: %s", exc)
        return {}


def _file_save(data: dict[str, str]) -> None:
    """Encrypt and save the vault file."""
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        plaintext = json.dumps(data).encode("utf-8")
        key = _derive_key(_get_master_key())
        nonce = secrets.token_bytes(12)
        ciphertext = AESGCM(key).encrypt(nonce, plaintext, None)
        _VAULT_FILE.parent.mkdir(parents=True, exist_ok=True)
        _VAULT_FILE.write_bytes(base64.b64encode(nonce + ciphertext))
        _VAULT_FILE.chmod(0o600)
    except Exception as exc:
        logger.error("Failed to write vault file: %s", exc)
        raise


def _file_set(key: str, value: str) -> None:
    data = _file_load()
    data[key] = value
    _file_save(data)


def _file_get(key: str) -> Optional[str]:
    return _file_load().get(key)


def _file_delete(key: str) -> None:
    data = _file_load()
    data.pop(key, None)
    _file_save(data)


def _file_list_keys() -> list[str]:
    return list(_file_load().keys())


# ── CredentialVault facade ─────────────────────────────────────────────────

class CredentialVault:
    """Unified credential vault that auto-selects keyring vs encrypted file."""

    def __init__(self) -> None:
        self._use_keyring = _keyring_available()
        backend = "OS keychain (keyring)" if self._use_keyring else "AES-256-GCM file vault"
        logger.info("CredentialVault: using %s", backend)

    # ── File-based key index (keyring doesn't support list) ────────────
    _INDEX_FILE = _VAULT_FILE.parent / ".vault_index"

    def _index_add(self, key: str) -> None:
        keys = self._index_load()
        if key not in keys:
            keys.append(key)
            self._INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
            self._INDEX_FILE.write_text(json.dumps(keys))

    def _index_remove(self, key: str) -> None:
        keys = [k for k in self._index_load() if k != key]
        self._INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
        self._INDEX_FILE.write_text(json.dumps(keys))

    def _index_load(self) -> list[str]:
        try:
            if self._INDEX_FILE.exists():
                return json.loads(self._INDEX_FILE.read_text())
        except Exception:
            pass
        return []

    # ── Public methods ─────────────────────────────────────────────────

    def set(self, key: str, value: str) -> None:
        """Store a credential."""
        if self._use_keyring:
            _keyring_set(key, value)
        else:
            _file_set(key, value)
        self._index_add(key)
        logger.debug("Vault: stored key %r", key)

    def get(self, key: str) -> Optional[str]:
        """Retrieve a credential. Returns None if not found."""
        if self._use_keyring:
            return _keyring_get(key)
        return _file_get(key)

    def delete(self, key: str) -> None:
        """Delete a stored credential."""
        if self._use_keyring:
            _keyring_delete(key)
        else:
            _file_delete(key)
        self._index_remove(key)
        logger.debug("Vault: deleted key %r", key)

    def list_keys(self) -> list[str]:
        """List all stored credential keys (not values)."""
        if self._use_keyring:
            return self._index_load()
        return _file_list_keys()

    def has(self, key: str) -> bool:
        """Check if a credential exists."""
        return self.get(key) is not None

    def get_github_token(self, repo_url: str) -> Optional[str]:
        """Get the GitHub token for a given repo URL (falls back to GITHUB_TOKEN env)."""
        # Normalize URL to a stable key
        normalized = repo_url.rstrip("/").lower().replace("https://", "").replace("http://", "")
        key = f"github-token:{normalized}"
        return self.get(key) or os.environ.get("GITHUB_TOKEN")

    def set_github_token(self, repo_url: str, token: str) -> None:
        """Store a GitHub token for a repo URL."""
        normalized = repo_url.rstrip("/").lower().replace("https://", "").replace("http://", "")
        self.set(f"github-token:{normalized}", token)


# ── Module-level singleton ─────────────────────────────────────────────────
vault = CredentialVault()
