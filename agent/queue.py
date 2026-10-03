"""Async scan queue for Zerra.

Provides a background task queue so scan requests return immediately with a
job ID while the actual clone-and-scan runs in a thread pool.  Results are
stored in SQLite via the normal db.save_scan() path.

Usage (in api.py)::

    from agent.queue import scan_queue
    job_id = await scan_queue.enqueue(config)
    # poll GET /v1/queue/{job_id} for status
"""

from __future__ import annotations

import asyncio
import logging
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from agent.scanner.models import ScanConfig, ScanStatus
from agent.scanner.repo_scanner import RepoScanner
from agent.db.database import get_db

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ScanJob:
    id: str
    config: ScanConfig
    repo_id: Optional[str]  # If triggered via /v1/repos/{id}/scan
    status: JobStatus = JobStatus.QUEUED
    scan_id: Optional[str] = None
    error: Optional[str] = None
    queued_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @property
    def duration_seconds(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "repo_id": self.repo_id,
            "repo_url": self.config.repo_url,
            "branch": self.config.branch,
            "mode": self.config.mode.value,
            "status": self.status.value,
            "scan_id": self.scan_id,
            "error": self.error,
            "queued_at": self.queued_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self.duration_seconds,
        }


class ScanQueue:
    """Thread-safe in-process scan queue backed by a thread-pool executor.

    Up to `max_workers` scans run concurrently.  Results are persisted to
    SQLite.  Job status can be polled via ``get_job(job_id)``.
    """

    def __init__(self, max_workers: int = 3, history_size: int = 200) -> None:
        self._max_workers = max_workers
        self._jobs: dict[str, ScanJob] = {}
        self._queue: deque[str] = deque()
        self._active: set[str] = set()
        self._lock = threading.Lock()
        self._history_size = history_size
        self._scanner = RepoScanner()
        self._shutdown = False
        self._thread = threading.Thread(target=self._worker_loop, daemon=True, name="zerra-scan-queue")
        self._thread.start()
        logger.info("ScanQueue started (max_workers=%d)", max_workers)

    # ── Public API ─────────────────────────────────────────────────────

    async def enqueue(
        self,
        config: ScanConfig,
        repo_id: Optional[str] = None,
    ) -> ScanJob:
        """Add a scan job to the queue and return the job immediately."""
        job = ScanJob(
            id=f"job-{uuid4().hex[:12]}",
            config=config,
            repo_id=repo_id,
        )
        with self._lock:
            self._jobs[job.id] = job
            self._queue.append(job.id)
            self._trim_history()
        logger.info("Scan queued: %s (%s, mode=%s)", job.id, config.repo_url, config.mode.value)
        return job

    def get_job(self, job_id: str) -> Optional[ScanJob]:
        """Return a job by ID, or None if not found."""
        return self._jobs.get(job_id)

    def list_jobs(self, limit: int = 50) -> list[dict[str, Any]]:
        """Return recent jobs newest-first."""
        with self._lock:
            jobs = list(self._jobs.values())
        jobs.sort(key=lambda j: j.queued_at, reverse=True)
        return [j.to_dict() for j in jobs[:limit]]

    @property
    def active_count(self) -> int:
        with self._lock:
            return len(self._active)

    @property
    def queued_count(self) -> int:
        with self._lock:
            return len(self._queue)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            total = len(self._jobs)
            by_status: dict[str, int] = {}
            for j in self._jobs.values():
                by_status[j.status.value] = by_status.get(j.status.value, 0) + 1
        return {
            "total_jobs": total,
            "active": len(self._active),
            "queued": len(self._queue),
            "by_status": by_status,
            "max_workers": self._max_workers,
        }

    def shutdown(self) -> None:
        self._shutdown = True

    # ── Internal ───────────────────────────────────────────────────────

    def _worker_loop(self) -> None:
        """Background thread: dequeue and dispatch scan jobs."""
        while not self._shutdown:
            with self._lock:
                if len(self._active) < self._max_workers and self._queue:
                    job_id = self._queue.popleft()
                    self._active.add(job_id)
                else:
                    job_id = None

            if job_id:
                t = threading.Thread(
                    target=self._run_job,
                    args=(job_id,),
                    daemon=True,
                    name=f"zerra-scan-{job_id}",
                )
                t.start()
            else:
                time.sleep(0.5)

    def _run_job(self, job_id: str) -> None:
        """Execute a single scan job in this thread."""
        job = self._jobs.get(job_id)
        if not job:
            return

        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        logger.info("Starting scan job %s: %s", job_id, job.config.repo_url)

        try:
            result = self._scanner.scan(job.config)
            db = get_db()
            db.save_scan(result)
            if job.repo_id:
                db.update_repo_last_scan(job.repo_id, result.id)

            # Attempt notification dispatch
            try:
                from agent.api import _get_notifier
                _get_notifier().notify_scan_complete(result)
            except Exception:
                pass

            job.scan_id = result.id
            job.status = JobStatus.COMPLETED if result.status.value == "completed" else JobStatus.FAILED
            if result.error_message:
                job.error = result.error_message
            logger.info(
                "Scan job %s completed: %s findings, grade %s",
                job_id,
                len(result.findings),
                result.security_score,
            )
        except Exception as exc:
            job.status = JobStatus.FAILED
            job.error = str(exc)
            logger.error("Scan job %s failed: %s", job_id, exc)
        finally:
            job.completed_at = datetime.now(timezone.utc)
            with self._lock:
                self._active.discard(job_id)

    def _trim_history(self) -> None:
        """Keep only the N most recent completed/failed jobs in memory."""
        if len(self._jobs) <= self._history_size:
            return
        done = [
            j for j in self._jobs.values()
            if j.status in (JobStatus.COMPLETED, JobStatus.FAILED)
        ]
        done.sort(key=lambda j: j.queued_at)
        to_remove = done[: len(self._jobs) - self._history_size]
        for j in to_remove:
            self._jobs.pop(j.id, None)


# ── Module-level singleton ──────────────────────────────────────────────
scan_queue = ScanQueue(max_workers=3)
