"""Simple in-memory rate limiter for analysis endpoints."""

import os
import time
from collections import defaultdict

_STANDARD_DAILY_LIMIT = int(os.environ.get("STANDARD_DAILY_LIMIT", "10"))
_DEEP_DIVE_DAILY_LIMIT = int(os.environ.get("DEEP_DIVE_DAILY_LIMIT", "5"))
_DEEP_DIVE_ENABLED = os.environ.get("DEEP_DIVE_ENABLED", "false").lower() == "true"

_STANDARD_MAX_TICKERS = 10
_DEEP_DIVE_MAX_TICKERS = 5

_usage: dict[str, list[float]] = defaultdict(list)
_DAY_SECONDS = 86400


def _cleanup(key: str):
    cutoff = time.time() - _DAY_SECONDS
    _usage[key] = [t for t in _usage[key] if t > cutoff]


def check_analysis_allowed(mode: str, ticker_count: int = 0) -> tuple[bool, str]:
    """Check if analysis mode is allowed. Returns (allowed, reason)."""
    if mode == "deep_dive":
        if not _DEEP_DIVE_ENABLED:
            return False, "Deep Dive analysis is not enabled. Set DEEP_DIVE_ENABLED=true to activate."

        if ticker_count > _DEEP_DIVE_MAX_TICKERS:
            return False, f"Deep Dive is limited to {_DEEP_DIVE_MAX_TICKERS} tickers per run. Please select fewer tickers."

        key = "deep_dive_global"
        _cleanup(key)
        if len(_usage[key]) >= _DEEP_DIVE_DAILY_LIMIT:
            return False, f"Deep Dive daily limit reached ({_DEEP_DIVE_DAILY_LIMIT} runs/day). Try again tomorrow or use Standard mode."

    if mode == "standard":
        if ticker_count > _STANDARD_MAX_TICKERS:
            return False, f"Standard analysis is limited to {_STANDARD_MAX_TICKERS} tickers per run. Please select fewer tickers."

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
    _cleanup("deep_dive_global")
    return {
        "standard_used_today": len(_usage["standard_global"]),
        "standard_daily_limit": _STANDARD_DAILY_LIMIT,
        "standard_max_tickers": _STANDARD_MAX_TICKERS,
        "deep_dive_enabled": _DEEP_DIVE_ENABLED,
        "deep_dive_used_today": len(_usage["deep_dive_global"]),
        "deep_dive_daily_limit": _DEEP_DIVE_DAILY_LIMIT,
        "deep_dive_max_tickers": _DEEP_DIVE_MAX_TICKERS,
    }
