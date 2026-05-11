"""Simple in-memory rate limiter for analysis endpoints."""

import os
import time
from collections import defaultdict

# Daily limits per mode (resets every 24h)
_STANDARD_DAILY_LIMIT = int(os.environ.get("STANDARD_DAILY_LIMIT", "10"))
_DEEP_DIVE_ENABLED = os.environ.get("DEEP_DIVE_ENABLED", "false").lower() == "true"

_usage: dict[str, list[float]] = defaultdict(list)
_DAY_SECONDS = 86400


def _cleanup(key: str):
    cutoff = time.time() - _DAY_SECONDS
    _usage[key] = [t for t in _usage[key] if t > cutoff]


def check_analysis_allowed(mode: str) -> tuple[bool, str]:
    """Check if analysis mode is allowed. Returns (allowed, reason)."""
    if mode == "deep_dive" and not _DEEP_DIVE_ENABLED:
        return False, "Deep Dive analysis is disabled during beta. Use Quick Scan or Standard mode."

    if mode == "standard":
        key = "standard_global"
        _cleanup(key)
        if len(_usage[key]) >= _STANDARD_DAILY_LIMIT:
            return False, f"Standard analysis limit reached ({_STANDARD_DAILY_LIMIT}/day). Try again tomorrow or use Quick Scan."

    return True, ""


def record_analysis(mode: str):
    """Record that an analysis was started."""
    if mode in ("standard", "deep_dive"):
        key = f"{mode}_global"
        _usage[key].append(time.time())


def get_usage_stats() -> dict:
    """Get current usage stats for display."""
    _cleanup("standard_global")
    return {
        "standard_used_today": len(_usage["standard_global"]),
        "standard_daily_limit": _STANDARD_DAILY_LIMIT,
        "deep_dive_enabled": _DEEP_DIVE_ENABLED,
    }
