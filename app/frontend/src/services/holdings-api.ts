import type {
  Holding,
  HoldingCreate,
  HoldingUpdate,
  DashboardResponse,
  HoldingImportRequest,
  HoldingImportResponse,
  Account,
  AccountCreate,
  AnalysisJob,
  AnalysisResult,
  WatchlistItem,
  WatchlistCreate,
} from '@/types/holdings';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = localStorage.getItem('app_api_key');
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return headers;
}

export const holdingsApi = {
  // Holdings
  async listHoldings(portfolio?: string, accountId?: number): Promise<Holding[]> {
    const params = new URLSearchParams();
    if (portfolio) params.set('portfolio', portfolio);
    if (accountId) params.set('account_id', String(accountId));
    const qs = params.toString() ? `?${params}` : '';
    const res = await fetch(`${API_BASE_URL}/holdings${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch holdings: ${res.status}`);
    return res.json();
  },

  async listPortfolios(): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/holdings/portfolios`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch portfolios: ${res.status}`);
    return res.json();
  },

  async getHolding(id: number): Promise<Holding> {
    const res = await fetch(`${API_BASE_URL}/holdings/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch holding: ${res.status}`);
    return res.json();
  },

  async createHolding(data: HoldingCreate): Promise<Holding> {
    const res = await fetch(`${API_BASE_URL}/holdings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create holding: ${res.status}`);
    return res.json();
  },

  async updateHolding(id: number, data: HoldingUpdate): Promise<Holding> {
    const res = await fetch(`${API_BASE_URL}/holdings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update holding: ${res.status}`);
    return res.json();
  },

  async deleteHolding(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/holdings/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete holding: ${res.status}`);
  },

  async importCsv(data: HoldingImportRequest): Promise<HoldingImportResponse> {
    const res = await fetch(`${API_BASE_URL}/holdings/import-csv`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to import CSV: ${res.status}`);
    return res.json();
  },

  // Dashboard
  async getDashboard(portfolio?: string, accountId?: number): Promise<DashboardResponse> {
    const params = new URLSearchParams();
    if (portfolio) params.set('portfolio', portfolio);
    if (accountId) params.set('account_id', String(accountId));
    const qs = params.toString() ? `?${params}` : '';
    const res = await fetch(`${API_BASE_URL}/dashboard${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
    return res.json();
  },

  // Accounts
  async listAccounts(): Promise<Account[]> {
    const res = await fetch(`${API_BASE_URL}/accounts`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`);
    return res.json();
  },

  async createAccount(data: AccountCreate): Promise<Account> {
    const res = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create account: ${res.status}`);
    return res.json();
  },

  async deleteAccount(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete account: ${res.status}`);
  },

  // Export
  getExportCsvUrl(portfolio?: string, accountId?: number): string {
    const params = new URLSearchParams();
    if (portfolio) params.set('portfolio', portfolio);
    if (accountId) params.set('account_id', String(accountId));
    const qs = params.toString() ? `?${params}` : '';
    return `${API_BASE_URL}/export/csv${qs}`;
  },

  // Portfolio Analysis
  async analyzePortfolio(holdingIds?: number[], modelName?: string, modelProvider?: string): Promise<AnalysisJob> {
    const body: Record<string, unknown> = {};
    if (holdingIds) body.holding_ids = holdingIds;
    if (modelName) body.model_name = modelName;
    if (modelProvider) body.model_provider = modelProvider;
    const res = await fetch(`${API_BASE_URL}/portfolio/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to start analysis: ${res.status}`);
    return res.json();
  },

  async getAnalysisJob(jobId: number): Promise<AnalysisJob> {
    const res = await fetch(`${API_BASE_URL}/portfolio/analyze/${jobId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch job: ${res.status}`);
    return res.json();
  },

  async getLatestAnalysis(): Promise<AnalysisResult[]> {
    const res = await fetch(`${API_BASE_URL}/portfolio/analysis/latest`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch analysis: ${res.status}`);
    return res.json();
  },

  // Watchlist
  async listWatchlist(): Promise<WatchlistItem[]> {
    const res = await fetch(`${API_BASE_URL}/watchlist`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch watchlist: ${res.status}`);
    return res.json();
  },

  async addToWatchlist(data: WatchlistCreate): Promise<WatchlistItem> {
    const res = await fetch(`${API_BASE_URL}/watchlist`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to add to watchlist: ${res.status}`);
    return res.json();
  },

  async removeFromWatchlist(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/watchlist/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to remove from watchlist: ${res.status}`);
  },

  async analyzeWatchlist(watchlistIds?: number[]): Promise<AnalysisJob> {
    const body: Record<string, unknown> = {};
    if (watchlistIds) body.watchlist_ids = watchlistIds;
    const res = await fetch(`${API_BASE_URL}/watchlist/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to start watchlist analysis: ${res.status}`);
    return res.json();
  },

  async getLatestWatchlistAnalysis(): Promise<AnalysisResult[]> {
    const res = await fetch(`${API_BASE_URL}/watchlist/analysis/latest`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch watchlist analysis: ${res.status}`);
    return res.json();
  },
};
