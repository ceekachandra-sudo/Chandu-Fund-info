import { CsvImporter } from '@/components/holdings/CsvImporter';
import { HoldingForm } from '@/components/holdings/HoldingForm';
import { HoldingsTable } from '@/components/holdings/HoldingsTable';
import { Button } from '@/components/ui/button';
import { holdingsApi } from '@/services/holdings-api';
import type { DashboardHolding, DashboardResponse, HoldingCreate } from '@/types/holdings';
import { Plus, Upload, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type View = 'table' | 'add' | 'import';

export function Dashboard() {
  const [view, setView] = useState<View>('table');
  const [holdings, setHoldings] = useState<DashboardHolding[]>([]);
  const [summary, setSummary] = useState<Omit<DashboardResponse, 'holdings'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useDashboard, setUseDashboard] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useDashboard) {
        const data = await holdingsApi.getDashboard();
        setHoldings(data.holdings);
        setSummary({ total_cost: data.total_cost, total_value: data.total_value, total_profit_loss: data.total_profit_loss, total_profit_loss_pct: data.total_profit_loss_pct });
      } else {
        const raw = await holdingsApi.listHoldings();
        const mapped: DashboardHolding[] = raw.map(h => ({
          ...h,
          cost_basis: h.cost_basis || h.quantity * h.buy_price,
          current_price: null,
          current_value: null,
          profit_loss: null,
          profit_loss_pct: null,
          rsi_14: null,
          sma_20: null,
          sma_50: null,
          trend: null,
          action_label: 'WATCH',
        }));
        setHoldings(mapped);
        setSummary(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
      // Fallback to simple list if dashboard fails (no API key)
      if (useDashboard) {
        setUseDashboard(false);
      }
    } finally {
      setLoading(false);
    }
  }, [useDashboard]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (data: HoldingCreate) => {
    try {
      await holdingsApi.createHolding(data);
      setView('table');
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleImport = async (csvText: string, portfolioName: string) => {
    try {
      const result = await holdingsApi.importCsv({ csv_text: csvText, portfolio_name: portfolioName });
      if (result.errors.length > 0) {
        setError(`Imported ${result.imported} holdings. Errors: ${result.errors.join('; ')}`);
      }
      setView('table');
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await holdingsApi.deleteHolding(id);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">My Portfolio</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Educational analysis only — not financial advice
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView('import')}>
              <Upload size={14} className="mr-1" /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setView('add')}>
              <Plus size={14} className="mr-1" /> Add Holding
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-4">
            <SummaryCard label="Total Cost" value={`£${formatLarge(summary.total_cost)}`} />
            <SummaryCard label="Current Value" value={`£${formatLarge(summary.total_value)}`} />
            <SummaryCard
              label="Profit / Loss"
              value={`£${formatLarge(summary.total_profit_loss)}`}
              className={summary.total_profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <SummaryCard
              label="Return"
              value={summary.total_profit_loss_pct !== null ? `${summary.total_profit_loss_pct.toFixed(2)}%` : '—'}
              className={summary.total_profit_loss_pct !== null && summary.total_profit_loss_pct >= 0 ? 'text-green-400' : 'text-red-400'}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded border border-red-800 bg-red-900/20 px-4 py-2 text-sm text-red-300">
            {error}
            <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
          </div>
        )}

        {/* Content */}
        {view === 'add' && (
          <div className="rounded-lg border border-border p-4 bg-card">
            <h2 className="text-sm font-medium mb-4">Add Holding</h2>
            <HoldingForm onSubmit={handleAdd} onCancel={() => setView('table')} />
          </div>
        )}

        {view === 'import' && (
          <div className="rounded-lg border border-border p-4 bg-card">
            <h2 className="text-sm font-medium mb-4">Import Holdings from CSV</h2>
            <CsvImporter onImport={handleImport} onCancel={() => setView('table')} />
          </div>
        )}

        {view === 'table' && (
          <div className="rounded-lg border border-border bg-card">
            <HoldingsTable holdings={holdings} onDelete={handleDelete} />
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${className || ''}`}>{value}</div>
    </div>
  );
}

function formatLarge(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
