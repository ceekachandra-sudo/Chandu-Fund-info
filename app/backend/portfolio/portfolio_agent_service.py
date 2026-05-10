"""Portfolio Agent Service — orchestrates hedge-fund agents on user holdings.

Loads holdings from DB, normalizes tickers, calls existing AI agents,
synthesizes educational action labels, and stores results.
"""

import json
import logging
import traceback
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.backend.database.models import Holding, Watchlist, PortfolioAnalysisResult
from app.backend.portfolio.ticker_normalizer import normalize_ticker
from app.backend.portfolio.action_rules import determine_educational_action
from app.backend.services.api_key_service import ApiKeyService

logger = logging.getLogger(__name__)


def run_portfolio_analysis(
    db: Session,
    holding_ids: Optional[list[int]] = None,
    watchlist_ids: Optional[list[int]] = None,
    model_name: str = "gpt-4.1",
    model_provider: str = "OpenAI",
) -> list[dict]:
    """Run full agent analysis pipeline on holdings and/or watchlist items.

    This is the main entry point called by the async job.
    """
    from src.main import run_hedge_fund

    # Gather API keys
    api_key_service = ApiKeyService(db)
    api_keys = api_key_service.get_api_keys_dict()

    # Set env vars for agents that read from environment
    import os
    for key, value in api_keys.items():
        if value:
            os.environ[key] = value

    # Collect items to analyze
    items_to_analyze: list[dict] = []

    if holding_ids:
        holdings = db.query(Holding).filter(Holding.id.in_(holding_ids)).all()
        for h in holdings:
            items_to_analyze.append({
                "holding_id": h.id,
                "watchlist_id": None,
                "broker_ticker": h.ticker,
                "investment_name": h.investment_name,
            })
    elif not watchlist_ids:
        # Analyze all holdings
        holdings = db.query(Holding).all()
        for h in holdings:
            items_to_analyze.append({
                "holding_id": h.id,
                "watchlist_id": None,
                "broker_ticker": h.ticker,
                "investment_name": h.investment_name,
            })

    if watchlist_ids:
        watchlist_items = db.query(Watchlist).filter(Watchlist.id.in_(watchlist_ids)).all()
        for w in watchlist_items:
            items_to_analyze.append({
                "holding_id": None,
                "watchlist_id": w.id,
                "broker_ticker": w.ticker,
                "investment_name": w.investment_name or w.ticker,
            })

    # Group by normalized ticker (avoid duplicate API calls)
    ticker_groups: dict[str, list[dict]] = {}
    unsupported_items: list[dict] = []

    for item in items_to_analyze:
        analysis_ticker, supported = normalize_ticker(item["broker_ticker"])
        item["analysis_ticker"] = analysis_ticker
        item["supported"] = supported

        if not supported:
            unsupported_items.append(item)
        else:
            ticker_groups.setdefault(analysis_ticker, []).append(item)

    results: list[dict] = []

    # Handle unsupported tickers
    for item in unsupported_items:
        result = _create_unsupported_result(db, item)
        results.append(result)

    # Run agent pipeline on supported tickers in batches
    supported_tickers = list(ticker_groups.keys())

    if supported_tickers:
        # Build a minimal portfolio for the agent pipeline
        portfolio = {
            "cash": 100000.0,
            "margin_requirement": 0.0,
            "margin_used": 0.0,
            "positions": {t: {"long": 0, "short": 0, "long_cost_basis": 0.0, "short_cost_basis": 0.0, "short_margin_used": 0.0} for t in supported_tickers},
            "realized_gains": {t: {"long": 0.0, "short": 0.0} for t in supported_tickers},
        }

        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

        try:
            agent_result = run_hedge_fund(
                tickers=supported_tickers,
                start_date=start_date,
                end_date=end_date,
                portfolio=portfolio,
                show_reasoning=False,
                selected_analysts=None,  # Use all analysts
                model_name=model_name,
                model_provider=model_provider,
            )

            analyst_signals = agent_result.get("analyst_signals", {})
            decisions = agent_result.get("decisions", {})

            # Process each supported ticker
            for ticker, items in ticker_groups.items():
                ticker_result = _process_ticker_result(
                    db, ticker, items, analyst_signals, decisions
                )
                results.extend(ticker_result)

        except Exception as e:
            logger.error(f"Agent pipeline failed: {e}\n{traceback.format_exc()}")
            # Mark all supported items as WATCH with error
            for ticker, items in ticker_groups.items():
                for item in items:
                    result = _create_error_result(db, item, str(e))
                    results.append(result)

    return results


def _process_ticker_result(
    db: Session,
    ticker: str,
    items: list[dict],
    analyst_signals: dict,
    decisions: dict,
) -> list[dict]:
    """Process agent results for a single ticker and save to DB."""
    results = []

    # Extract signals for this ticker from each agent type
    technical_signal = None
    technical_confidence = None
    fundamental_signal = None
    fundamental_confidence = None
    sentiment_signal = None
    valuation_signal = None
    risk_remaining_limit = None
    portfolio_manager_action = None
    rsi_14 = None

    # Summaries for display
    technical_summary = ""
    fundamental_summary = ""
    sentiment_summary = ""
    valuation_summary = ""
    risk_summary = ""
    portfolio_manager_summary = ""

    for agent_id, signals in analyst_signals.items():
        if ticker not in signals:
            continue
        ticker_data = signals[ticker]

        if "technical_analyst" in agent_id:
            technical_signal = ticker_data.get("signal")
            technical_confidence = ticker_data.get("confidence")
            reasoning = ticker_data.get("reasoning", {})
            # Extract RSI from mean reversion metrics
            mr = reasoning.get("mean_reversion", {})
            metrics = mr.get("metrics", {})
            if "rsi_14" in metrics:
                rsi_14 = metrics["rsi_14"]
            technical_summary = json.dumps(reasoning, default=str)[:2000]

        elif "fundamentals_analyst" in agent_id:
            fundamental_signal = ticker_data.get("signal")
            fundamental_confidence = ticker_data.get("confidence")
            fundamental_summary = json.dumps(ticker_data.get("reasoning", {}), default=str)[:2000]

        elif "sentiment_analyst" in agent_id:
            sentiment_signal = ticker_data.get("signal")
            sentiment_summary = json.dumps(ticker_data.get("reasoning", {}), default=str)[:2000]

        elif "valuation_analyst" in agent_id:
            valuation_signal = ticker_data.get("signal")
            valuation_summary = json.dumps(ticker_data.get("reasoning", {}), default=str)[:2000]

        elif "risk_management_agent" in agent_id:
            risk_remaining_limit = ticker_data.get("remaining_position_limit")
            risk_summary = json.dumps(ticker_data.get("reasoning", {}), default=str)[:2000]

    # Portfolio manager decision
    if decisions and ticker in decisions:
        pm_decision = decisions[ticker]
        portfolio_manager_action = pm_decision.get("action")
        portfolio_manager_summary = pm_decision.get("reasoning", "")

    # Determine educational action
    action_label, confidence, positive_factors, risk_factors, uncertainties = determine_educational_action(
        technical_signal=technical_signal,
        technical_confidence=technical_confidence,
        fundamental_signal=fundamental_signal,
        fundamental_confidence=fundamental_confidence,
        sentiment_signal=sentiment_signal,
        valuation_signal=valuation_signal,
        risk_remaining_limit=risk_remaining_limit,
        portfolio_manager_action=portfolio_manager_action,
        rsi_14=rsi_14,
    )

    # Save result for each item that maps to this ticker
    for item in items:
        analysis_result = PortfolioAnalysisResult(
            holding_id=item.get("holding_id"),
            watchlist_id=item.get("watchlist_id"),
            ticker=item["broker_ticker"],
            analysis_ticker=ticker,
            final_action=action_label,
            confidence=round(confidence, 1),
            technical_summary=technical_summary,
            fundamental_summary=fundamental_summary,
            sentiment_summary=sentiment_summary,
            valuation_summary=valuation_summary,
            risk_summary=risk_summary,
            portfolio_manager_summary=portfolio_manager_summary,
            positive_factors=json.dumps(positive_factors),
            risk_factors=json.dumps(risk_factors),
            uncertainties=json.dumps(uncertainties),
        )
        db.add(analysis_result)
        db.commit()
        db.refresh(analysis_result)

        results.append(_result_to_dict(analysis_result))

    return results


def _create_unsupported_result(db: Session, item: dict) -> dict:
    """Create a WATCH result for unsupported tickers."""
    analysis_result = PortfolioAnalysisResult(
        holding_id=item.get("holding_id"),
        watchlist_id=item.get("watchlist_id"),
        ticker=item["broker_ticker"],
        analysis_ticker=item.get("analysis_ticker", item["broker_ticker"]),
        final_action="WATCH",
        confidence=0.0,
        technical_summary="",
        fundamental_summary="",
        sentiment_summary="",
        valuation_summary="",
        risk_summary="",
        portfolio_manager_summary="Unsupported data source — no analysis available for this ticker.",
        positive_factors=json.dumps([]),
        risk_factors=json.dumps(["Unsupported data source"]),
        uncertainties=json.dumps(["No market data available for this ticker from current data providers"]),
    )
    db.add(analysis_result)
    db.commit()
    db.refresh(analysis_result)
    return _result_to_dict(analysis_result)


def _create_error_result(db: Session, item: dict, error_msg: str) -> dict:
    """Create a WATCH result when the pipeline errors."""
    analysis_result = PortfolioAnalysisResult(
        holding_id=item.get("holding_id"),
        watchlist_id=item.get("watchlist_id"),
        ticker=item["broker_ticker"],
        analysis_ticker=item.get("analysis_ticker", item["broker_ticker"]),
        final_action="WATCH",
        confidence=0.0,
        technical_summary="",
        fundamental_summary="",
        sentiment_summary="",
        valuation_summary="",
        risk_summary="",
        portfolio_manager_summary=f"Analysis failed: {error_msg[:500]}",
        positive_factors=json.dumps([]),
        risk_factors=json.dumps(["Analysis pipeline error"]),
        uncertainties=json.dumps([f"Error: {error_msg[:200]}"]),
    )
    db.add(analysis_result)
    db.commit()
    db.refresh(analysis_result)
    return _result_to_dict(analysis_result)


def _result_to_dict(r: PortfolioAnalysisResult) -> dict:
    """Convert a DB result to a serializable dict."""
    return {
        "id": r.id,
        "holding_id": r.holding_id,
        "watchlist_id": r.watchlist_id,
        "ticker": r.ticker,
        "analysis_ticker": r.analysis_ticker,
        "final_action": r.final_action,
        "confidence": r.confidence,
        "technical_summary": r.technical_summary,
        "fundamental_summary": r.fundamental_summary,
        "sentiment_summary": r.sentiment_summary,
        "valuation_summary": r.valuation_summary,
        "risk_summary": r.risk_summary,
        "portfolio_manager_summary": r.portfolio_manager_summary,
        "positive_factors": json.loads(r.positive_factors) if r.positive_factors else [],
        "risk_factors": json.loads(r.risk_factors) if r.risk_factors else [],
        "uncertainties": json.loads(r.uncertainties) if r.uncertainties else [],
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
