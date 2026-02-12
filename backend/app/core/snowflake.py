"""Snowflake ID generator."""
from __future__ import annotations

import threading
import time

# 2024-01-01 00:00:00 UTC in milliseconds
EPOCH_MS = 1704067200000

# Snowflake bit allocation
WORKER_ID_BITS = 10
SEQUENCE_BITS = 12
MAX_WORKER_ID = (1 << WORKER_ID_BITS) - 1
MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1
TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS
WORKER_SHIFT = SEQUENCE_BITS


class SnowflakeGenerator:
    def __init__(self, worker_id: int = 1):
        if worker_id < 0 or worker_id > MAX_WORKER_ID:
            raise ValueError(f"worker_id must be between 0 and {MAX_WORKER_ID}")
        self.worker_id = worker_id
        self._lock = threading.Lock()
        self._last_ms = -1
        self._sequence = 0

    def next_id(self) -> int:
        with self._lock:
            now_ms = int(time.time() * 1000)
            if now_ms < self._last_ms:
                now_ms = self._last_ms

            if now_ms == self._last_ms:
                self._sequence = (self._sequence + 1) & MAX_SEQUENCE
                if self._sequence == 0:
                    while now_ms <= self._last_ms:
                        now_ms = int(time.time() * 1000)
            else:
                self._sequence = 0

            self._last_ms = now_ms
            return (
                ((now_ms - EPOCH_MS) << TIMESTAMP_SHIFT)
                | (self.worker_id << WORKER_SHIFT)
                | self._sequence
            )


_generator = SnowflakeGenerator(worker_id=1)


def set_snowflake_worker(worker_id: int) -> None:
    global _generator
    _generator = SnowflakeGenerator(worker_id=worker_id)


def generate_snowflake_id() -> int:
    return _generator.next_id()
