from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List


class AnalysisResultResponse(BaseModel):
    id: int
    holding_id: Optional[int] = None
    watchlist_id: Optional[int] = None
    ticker: str
    analysis_ticker: str
    final_action: str
    confidence: float
    technical_summary: Optional[str] = None
    fundamental_summary: Optional[str] = None
    sentiment_summary: Optional[str] = None
    valuation_summary: Optional[str] = None
    risk_summary: Optional[str] = None
    portfolio_manager_summary: Optional[str] = None
    positive_factors: List[str] = []
    risk_factors: List[str] = []
    uncertainties: List[str] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnalyzeRequest(BaseModel):
    holding_ids: Optional[List[int]] = None
    model_name: str = Field(default="gpt-4.1")
    model_provider: str = Field(default="OpenAI")


class WatchlistAnalyzeRequest(BaseModel):
    watchlist_ids: Optional[List[int]] = None
    model_name: str = Field(default="gpt-4.1")
    model_provider: str = Field(default="OpenAI")


class AnalysisJobResponse(BaseModel):
    job_id: int
    status: str
    job_type: str
    total_tickers: Optional[int] = None
    completed_tickers: Optional[int] = None
    error_message: Optional[str] = None
    results: Optional[List[AnalysisResultResponse]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
