"""Docker sandbox orchestrator for Zerra.

Spins up an isolated Docker container to verify that an auto-generated fix
patch doesn't break the build / tests, then tears it down.

Design
------
- Uses the Docker CLI via subprocess (no docker-py required)
- Containers run with strict resource limits: no network, 512 MB RAM, 1 CPU
- All containers are labelled `zerra.sandbox=true` for easy audit/cleanup
- Verification timeout defaults to 120 seconds

Usage::

    from agent.sandbox import SandboxOrchestrator

    orch = SandboxOrchestrator()
    result = orch.verify_patch(
        repo_path="/tmp/cloned_repo",
        patch_diff="--- a/foo.py\\n+++ b/foo.py\\n@@...",
        image="python:3.11-slim",
        test_command=["pytest", "tests/", "-x", "--tb=short"],
    )
    if result.success:
        print("Patch verified!")
    else:
        print("Patch broke tests:", result.stderr)
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────
_DOCKER_AVAILABLE: Optional[bool] = None


def _check_docker() -> bool:
    global _DOCKER_AVAILABLE
    if _DOCKER_AVAILABLE is not None:
        return _DOCKER_AVAILABLE
    try:
        r = subprocess.run(
            ["docker", "info"], capture_output=True, timeout=10
        )
        _DOCKER_AVAILABLE = r.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        _DOCKER_AVAILABLE = False
    return _DOCKER_AVAILABLE


# ── Data models ───────────────────────────────────────────────────────────

@dataclass
class SandboxResult:
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    duration_seconds: float
    container_id: Optional[str] = None
    error: Optional[str] = None


@dataclass
class SandboxConfig:
    image: str = "python:3.11-slim"
    test_command: list[str] = field(default_factory=lambda: ["python", "-m", "pytest", "--tb=short", "-q"])
    timeout_seconds: int = 120
    memory_limit: str = "512m"
    cpu_quota: int = 100_000   # 1 CPU (100_000 / 100_000)
    network: str = "none"      # Air-gapped — no internet inside sandbox
    read_only_root: bool = False  # Set True for extra hardening (requires writable tmp)
    extra_env: dict[str, str] = field(default_factory=dict)


# ── Orchestrator ──────────────────────────────────────────────────────────

class SandboxOrchestrator:
    """Manages isolated Docker containers for patch verification."""

    def verify_patch(
        self,
        repo_path: str | Path,
        patch_diff: str,
        *,
        config: SandboxConfig | None = None,
    ) -> SandboxResult:
        """Apply a unified diff patch inside a container and run tests.

        Steps:
        1. Copy repo to a temp directory.
        2. Apply the patch with ``git apply``.
        3. Spin up a Docker container mounting the patched repo.
        4. Run the test command inside.
        5. Tear the container down unconditionally.

        Returns a SandboxResult with success flag, exit code, and logs.
        """
        if config is None:
            config = SandboxConfig()

        if not _check_docker():
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr="",
                duration_seconds=0.0,
                error="Docker is not available on this host",
            )

        repo_path = Path(repo_path)
        start = time.perf_counter()

        # 1. Copy repo to a temp workspace
        work_dir = Path(tempfile.mkdtemp(prefix="zerra-sandbox-"))
        try:
            shutil.copytree(repo_path, work_dir / "repo", dirs_exist_ok=True)
            patched = work_dir / "repo"

            # 2. Apply the patch
            if patch_diff.strip():
                patch_file = work_dir / "fix.patch"
                patch_file.write_text(patch_diff, encoding="utf-8")
                apply = subprocess.run(
                    ["git", "apply", "--whitespace=nowarn", str(patch_file)],
                    cwd=str(patched),
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if apply.returncode != 0:
                    return SandboxResult(
                        success=False,
                        exit_code=apply.returncode,
                        stdout=apply.stdout,
                        stderr=apply.stderr,
                        duration_seconds=time.perf_counter() - start,
                        error="Patch could not be applied",
                    )

            # 3. Build docker run command
            container_name = f"zerra-sandbox-{uuid.uuid4().hex[:8]}"
            env_args: list[str] = []
            for k, v in config.extra_env.items():
                env_args += ["-e", f"{k}={v}"]

            cmd = [
                "docker", "run",
                "--rm",
                "--name", container_name,
                "--label", "zerra.sandbox=true",
                "--memory", config.memory_limit,
                "--cpu-quota", str(config.cpu_quota),
                "--network", config.network,
                "--workdir", "/workspace",
                "-v", f"{patched.resolve()}:/workspace:ro",
                *env_args,
                config.image,
                *config.test_command,
            ]

            logger.info(
                "Sandbox: running %s in container %s (image=%s, timeout=%ds)",
                config.test_command,
                container_name,
                config.image,
                config.timeout_seconds,
            )

            # 4. Run the container
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=config.timeout_seconds,
                )
                duration = time.perf_counter() - start
                success = result.returncode == 0
                logger.info(
                    "Sandbox %s finished: exit=%d, success=%s, duration=%.1fs",
                    container_name,
                    result.returncode,
                    success,
                    duration,
                )
                return SandboxResult(
                    success=success,
                    exit_code=result.returncode,
                    stdout=result.stdout[-10_000:],   # Trim large outputs
                    stderr=result.stderr[-5_000:],
                    duration_seconds=duration,
                    container_name=container_name,
                )
            except subprocess.TimeoutExpired:
                # Kill the container on timeout
                subprocess.run(
                    ["docker", "kill", container_name],
                    capture_output=True,
                    timeout=10,
                )
                return SandboxResult(
                    success=False,
                    exit_code=-1,
                    stdout="",
                    stderr="",
                    duration_seconds=config.timeout_seconds,
                    container_name=container_name,
                    error=f"Container timed out after {config.timeout_seconds}s",
                )

        except Exception as exc:
            logger.error("Sandbox error: %s", exc)
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr="",
                duration_seconds=time.perf_counter() - start,
                error=str(exc),
            )
        finally:
            # 5. Always remove the temp workspace
            shutil.rmtree(work_dir, ignore_errors=True)

    def cleanup_stale_containers(self, max_age_minutes: int = 30) -> int:
        """Remove any lingering zerra sandbox containers older than max_age_minutes."""
        if not _check_docker():
            return 0
        try:
            result = subprocess.run(
                [
                    "docker", "ps", "-a",
                    "--filter", "label=zerra.sandbox=true",
                    "--filter", f"status=running",
                    "--format", "{{.ID}} {{.CreatedAt}}",
                ],
                capture_output=True,
                text=True,
                timeout=15,
            )
            removed = 0
            for line in result.stdout.splitlines():
                parts = line.split()
                if parts:
                    container_id = parts[0]
                    subprocess.run(
                        ["docker", "kill", container_id],
                        capture_output=True,
                        timeout=10,
                    )
                    subprocess.run(
                        ["docker", "rm", container_id],
                        capture_output=True,
                        timeout=10,
                    )
                    removed += 1
            if removed:
                logger.info("Cleaned up %d stale sandbox containers", removed)
            return removed
        except Exception as exc:
            logger.warning("Sandbox cleanup failed: %s", exc)
            return 0

    @staticmethod
    def is_available() -> bool:
        """Check if Docker is available for sandboxing."""
        return _check_docker()


# ── Convenience function ──────────────────────────────────────────────────

_orchestrator: Optional[SandboxOrchestrator] = None


def get_sandbox() -> SandboxOrchestrator:
    """Return the module-level sandbox orchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = SandboxOrchestrator()
    return _orchestrator
