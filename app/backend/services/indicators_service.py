import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
from src.tools.api import get_prices, prices_to_df


def compute_indicators(ticker: str, api_key: Optional[str] = None) -> dict:
    """
    Compute current price, RSI-14, SMA-20, SMA-50, and trend for a ticker.
    Returns a dict with keys: current_price, rsi_14, sma_20, sma_50, trend.
    """
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=120)).strftime("%Y-%m-%d")

    prices = get_prices(ticker=ticker, start_date=start_date, end_date=end_date, api_key=api_key)
    if not prices:
        return {}

    df = prices_to_df(prices)
    if df.empty or len(df) < 14:
        return {}

    close = df["close"]
    current_price = float(close.iloc[-1])
    rsi_14 = _calculate_rsi(close, 14)
    sma_20 = float(close.rolling(20).mean().iloc[-1]) if len(close) >= 20 else None
    sma_50 = float(close.rolling(50).mean().iloc[-1]) if len(close) >= 50 else None
    trend = _determine_trend(close, sma_20, sma_50)

    return {
        "current_price": round(current_price, 4),
        "rsi_14": round(rsi_14, 2) if rsi_14 is not None else None,
        "sma_20": round(sma_20, 4) if sma_20 is not None else None,
        "sma_50": round(sma_50, 4) if sma_50 is not None else None,
        "trend": trend,
    }


def determine_action_label(rsi: Optional[float], trend: Optional[str]) -> str:
    """
    Map indicators to educational action labels.
    NOT financial advice — purely educational.
    """
    if rsi is None or trend is None:
        return "WATCH"

    if trend == "up" and rsi < 70:
        return "HOLD"
    elif trend == "up" and rsi >= 70:
        return "REVIEW"
    elif trend == "down" and rsi > 30:
        return "REVIEW"
    elif trend == "down" and rsi <= 30:
        return "ADD CAUTIOUSLY"
    else:
        return "WATCH"


def _calculate_rsi(close: pd.Series, period: int = 14) -> Optional[float]:
    if len(close) < period + 1:
        return None
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta.where(delta < 0, 0.0))
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    val = rsi.iloc[-1]
    if pd.isna(val):
        return None
    return float(val)


def _determine_trend(close: pd.Series, sma_20: Optional[float], sma_50: Optional[float]) -> str:
    current = float(close.iloc[-1])
    if sma_20 is not None and sma_50 is not None:
        if current > sma_20 > sma_50:
            return "up"
        elif current < sma_20 < sma_50:
            return "down"
    elif sma_20 is not None:
        if current > sma_20:
            return "up"
        elif current < sma_20:
            return "down"
    return "sideways"
