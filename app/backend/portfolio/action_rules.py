"""Educational action label rules.

Maps agent pipeline output to one of:
- ADD CAUTIOUSLY
- HOLD
- WATCH
- REDUCE / REVIEW EXIT

Never outputs BUY NOW or SELL NOW.
"""

from typing import Optional

ALLOWED_LABELS = ["ADD CAUTIOUSLY", "HOLD", "WATCH", "REDUCE / REVIEW EXIT"]


def determine_educational_action(
    technical_signal: Optional[str],
    technical_confidence: Optional[float],
    fundamental_signal: Optional[str],
    fundamental_confidence: Optional[float],
    sentiment_signal: Optional[str],
    valuation_signal: Optional[str],
    risk_remaining_limit: Optional[float],
    portfolio_manager_action: Optional[str],
    rsi_14: Optional[float] = None,
) -> tuple[str, float, list[str], list[str], list[str]]:
    """Determine educational action label from agent outputs.

    Returns:
        (action_label, confidence, positive_factors, risk_factors, uncertainties)
    """
    positive_factors: list[str] = []
    risk_factors: list[str] = []
    uncertainties: list[str] = []

    # Detect high-risk scenario from risk manager
    high_risk = False
    if risk_remaining_limit is not None and risk_remaining_limit <= 0:
        high_risk = True
        risk_factors.append("Risk manager: position limit exhausted")

    # Gather signal counts
    signals = [technical_signal, fundamental_signal, sentiment_signal, valuation_signal]
    bullish_count = sum(1 for s in signals if s == "bullish")
    bearish_count = sum(1 for s in signals if s == "bearish")
    neutral_count = sum(1 for s in signals if s == "neutral")
    none_count = sum(1 for s in signals if s is None)

    # Build factor lists
    if technical_signal == "bullish":
        positive_factors.append("Technical trend is positive")
    elif technical_signal == "bearish":
        risk_factors.append("Technical trend is negative")

    if fundamental_signal == "bullish":
        positive_factors.append("Fundamentals are strong")
    elif fundamental_signal == "bearish":
        risk_factors.append("Fundamental weakness detected")

    if sentiment_signal == "bullish":
        positive_factors.append("Market sentiment is positive")
    elif sentiment_signal == "bearish":
        risk_factors.append("Negative market sentiment")

    if valuation_signal == "bullish":
        positive_factors.append("Valuation appears reasonable/undervalued")
    elif valuation_signal == "bearish":
        risk_factors.append("Valuation appears expensive")

    if none_count > 0:
        uncertainties.append(f"{none_count} agent(s) returned no data")

    # RSI-based guardrails
    rsi_high = rsi_14 is not None and rsi_14 > 70
    rsi_low = rsi_14 is not None and rsi_14 < 30

    if rsi_high:
        risk_factors.append(f"RSI is elevated ({rsi_14:.0f})")
    if rsi_low:
        positive_factors.append(f"RSI suggests oversold ({rsi_14:.0f})")

    # === Decision rules ===

    # Rule: If insufficient data, WATCH
    if none_count >= 3:
        uncertainties.append("Insufficient agent data for confident assessment")
        confidence = 30.0
        return "WATCH", confidence, positive_factors, risk_factors, uncertainties

    # Rule: If risk manager says high risk, never ADD CAUTIOUSLY
    # Rule: RSI high + valuation expensive → WATCH or REDUCE
    if rsi_high and valuation_signal == "bearish":
        if bearish_count >= 2:
            confidence = min(70.0, (bearish_count / 4) * 100)
            return "REDUCE / REVIEW EXIT", confidence, positive_factors, risk_factors, uncertainties
        else:
            confidence = 50.0
            return "WATCH", confidence, positive_factors, risk_factors, uncertainties

    # Rule: Fundamentals strong + valuation reasonable + trend positive → ADD CAUTIOUSLY
    if (fundamental_signal == "bullish" and
            valuation_signal in ("bullish", "neutral") and
            technical_signal == "bullish" and
            not high_risk):
        confidence = min(80.0, bullish_count / 4 * 100)
        return "ADD CAUTIOUSLY", confidence, positive_factors, risk_factors, uncertainties

    # Rule: Mostly bearish
    if bearish_count >= 3:
        confidence = min(75.0, (bearish_count / 4) * 100)
        return "REDUCE / REVIEW EXIT", confidence, positive_factors, risk_factors, uncertainties

    # Rule: Mostly bullish (but high risk blocks ADD)
    if bullish_count >= 3 and not high_risk:
        confidence = min(70.0, (bullish_count / 4) * 100)
        return "ADD CAUTIOUSLY", confidence, positive_factors, risk_factors, uncertainties

    # Rule: Signals conflict → HOLD or WATCH
    if bullish_count >= 2 and bearish_count == 0:
        confidence = 55.0
        return "HOLD", confidence, positive_factors, risk_factors, uncertainties

    if bearish_count >= 2 and bullish_count == 0:
        confidence = 55.0
        if high_risk:
            return "REDUCE / REVIEW EXIT", confidence, positive_factors, risk_factors, uncertainties
        return "WATCH", confidence, positive_factors, risk_factors, uncertainties

    # Mixed signals
    if bullish_count > 0 and bearish_count > 0:
        uncertainties.append("Conflicting signals across agents")
        confidence = 40.0
        if high_risk:
            return "WATCH", confidence, positive_factors, risk_factors, uncertainties
        return "HOLD", confidence, positive_factors, risk_factors, uncertainties

    # Default: WATCH
    confidence = 35.0
    uncertainties.append("No strong directional consensus")
    return "WATCH", confidence, positive_factors, risk_factors, uncertainties
