export interface Holding {
  id: number;
  portfolio_name: string;
  ticker: string;
  investment_name: string;
  quantity: number;
  buy_price: number;
  cost_basis: number | null;
  currency: string;
  created_at: string;
  updated_at: string | null;
}

export interface HoldingCreate {
  portfolio_name?: string;
  ticker: string;
  investment_name: string;
  quantity: number;
  buy_price: number;
  cost_basis?: number;
  currency?: string;
}

export interface HoldingUpdate {
  portfolio_name?: string;
  ticker?: string;
  investment_name?: string;
  quantity?: number;
  buy_price?: number;
  cost_basis?: number;
  currency?: string;
}

export interface DashboardHolding {
  id: number;
  portfolio_name: string;
  ticker: string;
  investment_name: string;
  quantity: number;
  buy_price: number;
  cost_basis: number;
  currency: string;
  current_price: number | null;
  current_value: number | null;
  profit_loss: number | null;
  profit_loss_pct: number | null;
  rsi_14: number | null;
  sma_20: number | null;
  sma_50: number | null;
  trend: string | null;
  action_label: string;
}

export interface DashboardResponse {
  holdings: DashboardHolding[];
  total_cost: number;
  total_value: number;
  total_profit_loss: number;
  total_profit_loss_pct: number | null;
}

export interface HoldingImportRequest {
  portfolio_name?: string;
  csv_text: string;
}

export interface HoldingImportResponse {
  imported: number;
  errors: string[];
}
