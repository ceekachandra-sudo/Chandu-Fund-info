import type {
  Holding,
  HoldingCreate,
  HoldingUpdate,
  DashboardResponse,
  HoldingImportRequest,
  HoldingImportResponse,
} from '@/types/holdings';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const holdingsApi = {
  async listHoldings(portfolio?: string): Promise<Holding[]> {
    const params = portfolio ? `?portfolio=${encodeURIComponent(portfolio)}` : '';
    const res = await fetch(`${API_BASE_URL}/holdings${params}`);
    if (!res.ok) throw new Error(`Failed to fetch holdings: ${res.status}`);
    return res.json();
  },

  async listPortfolios(): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/holdings/portfolios`);
    if (!res.ok) throw new Error(`Failed to fetch portfolios: ${res.status}`);
    return res.json();
  },

  async getHolding(id: number): Promise<Holding> {
    const res = await fetch(`${API_BASE_URL}/holdings/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch holding: ${res.status}`);
    return res.json();
  },

  async createHolding(data: HoldingCreate): Promise<Holding> {
    const res = await fetch(`${API_BASE_URL}/holdings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create holding: ${res.status}`);
    return res.json();
  },

  async updateHolding(id: number, data: HoldingUpdate): Promise<Holding> {
    const res = await fetch(`${API_BASE_URL}/holdings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update holding: ${res.status}`);
    return res.json();
  },

  async deleteHolding(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/holdings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete holding: ${res.status}`);
  },

  async importCsv(data: HoldingImportRequest): Promise<HoldingImportResponse> {
    const res = await fetch(`${API_BASE_URL}/holdings/import-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to import CSV: ${res.status}`);
    return res.json();
  },

  async getDashboard(portfolio?: string): Promise<DashboardResponse> {
    const params = portfolio ? `?portfolio=${encodeURIComponent(portfolio)}` : '';
    const res = await fetch(`${API_BASE_URL}/dashboard${params}`);
    if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
    return res.json();
  },
};
