from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.backend.database import get_db
from app.backend.repositories.holdings_repository import HoldingsRepository
from app.backend.services.indicators_service import compute_indicators, determine_action_label
from app.backend.services.api_key_service import ApiKeyService
from app.backend.models.holdings import DashboardHolding, DashboardResponse

router = APIRouter(prefix="/dashboard")


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    portfolio: Optional[str] = Query(None, description="Filter by portfolio name"),
    db: Session = Depends(get_db),
):
    repo = HoldingsRepository(db)
    holdings = repo.get_all(portfolio_name=portfolio)

    # Get API key for market data
    api_key_service = ApiKeyService(db)
    api_keys = api_key_service.get_api_keys_dict()
    financial_api_key = api_keys.get("FINANCIAL_DATASETS_API_KEY")

    dashboard_holdings: list[DashboardHolding] = []
    total_cost = 0.0
    total_value = 0.0

    # Cache indicators per ticker to avoid duplicate API calls
    indicators_cache: dict[str, dict] = {}

    for h in holdings:
        quantity = float(h.quantity)
        buy_price = float(h.buy_price)
        cost_basis = float(h.cost_basis) if h.cost_basis else quantity * buy_price

        total_cost += cost_basis

        # Get indicators (cached per ticker)
        ticker = h.ticker
        if ticker not in indicators_cache:
            indicators_cache[ticker] = compute_indicators(ticker, api_key=financial_api_key)
        indicators = indicators_cache[ticker]

        current_price = indicators.get("current_price")
        current_value = quantity * current_price if current_price else None
        profit_loss = (current_value - cost_basis) if current_value else None
        profit_loss_pct = (profit_loss / cost_basis * 100) if profit_loss is not None and cost_basis > 0 else None

        if current_value:
            total_value += current_value
        else:
            total_value += cost_basis

        action_label = determine_action_label(
            indicators.get("rsi_14"),
            indicators.get("trend"),
        )

        dashboard_holdings.append(DashboardHolding(
            id=h.id,
            portfolio_name=h.portfolio_name,
            ticker=ticker,
            investment_name=h.investment_name,
            quantity=quantity,
            buy_price=buy_price,
            cost_basis=cost_basis,
            currency=h.currency,
            current_price=current_price,
            current_value=round(current_value, 2) if current_value else None,
            profit_loss=round(profit_loss, 2) if profit_loss else None,
            profit_loss_pct=round(profit_loss_pct, 2) if profit_loss_pct else None,
            rsi_14=indicators.get("rsi_14"),
            sma_20=indicators.get("sma_20"),
            sma_50=indicators.get("sma_50"),
            trend=indicators.get("trend"),
            action_label=action_label,
        ))

    total_profit_loss = total_value - total_cost
    total_profit_loss_pct = (total_profit_loss / total_cost * 100) if total_cost > 0 else None

    return DashboardResponse(
        holdings=dashboard_holdings,
        total_cost=round(total_cost, 2),
        total_value=round(total_value, 2),
        total_profit_loss=round(total_profit_loss, 2),
        total_profit_loss_pct=round(total_profit_loss_pct, 2) if total_profit_loss_pct else None,
    )
