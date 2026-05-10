import { ActionBadge } from '@/components/holdings/ActionBadge';
import type { DashboardHolding } from '@/types/holdings';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HoldingsTableProps {
  holdings: DashboardHolding[];
  onDelete?: (id: number) => void;
}

function formatNum(val: number | null, decimals = 2): string {
  if (val === null || val === undefined) return '—';
  return val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function TrendIndicator({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    up: 'text-green-400',
    down: 'text-red-400',
    sideways: 'text-yellow-400',
  };
  const arrows: Record<string, string> = { up: '▲', down: '▼', sideways: '►' };
  return <span className={colors[trend] || ''}>{arrows[trend] || trend}</span>;
}

export function HoldingsTable({ holdings, onDelete }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No holdings yet. Add a holding or import from CSV.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 px-2">Ticker</th>
            <th className="py-2 px-2">Investment</th>
            <th className="py-2 px-2 text-right">Qty</th>
            <th className="py-2 px-2 text-right">Buy Price</th>
            <th className="py-2 px-2 text-right">Current</th>
            <th className="py-2 px-2 text-right">Value</th>
            <th className="py-2 px-2 text-right">P&L</th>
            <th className="py-2 px-2 text-right">P&L %</th>
            <th className="py-2 px-2 text-right">RSI</th>
            <th className="py-2 px-2 text-right">SMA20</th>
            <th className="py-2 px-2 text-right">SMA50</th>
            <th className="py-2 px-2 text-center">Trend</th>
            <th className="py-2 px-2 text-center">Action</th>
            <th className="py-2 px-2"></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map(h => (
            <tr key={h.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-2 px-2 font-mono font-medium">{h.ticker}</td>
              <td className="py-2 px-2 max-w-[200px] truncate" title={h.investment_name}>{h.investment_name}</td>
              <td className="py-2 px-2 text-right">{formatNum(h.quantity)}</td>
              <td className="py-2 px-2 text-right">{formatNum(h.buy_price)}</td>
              <td className="py-2 px-2 text-right">{formatNum(h.current_price)}</td>
              <td className="py-2 px-2 text-right">{formatNum(h.current_value)}</td>
              <td className={`py-2 px-2 text-right ${h.profit_loss !== null && h.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatNum(h.profit_loss)}
              </td>
              <td className={`py-2 px-2 text-right ${h.profit_loss_pct !== null && h.profit_loss_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {h.profit_loss_pct !== null ? `${formatNum(h.profit_loss_pct)}%` : '—'}
              </td>
              <td className="py-2 px-2 text-right">{formatNum(h.rsi_14, 1)}</td>
              <td className="py-2 px-2 text-right">{formatNum(h.sma_20)}</td>
              <td className="py-2 px-2 text-right">{formatNum(h.sma_50)}</td>
              <td className="py-2 px-2 text-center"><TrendIndicator trend={h.trend} /></td>
              <td className="py-2 px-2 text-center"><ActionBadge label={h.action_label} /></td>
              <td className="py-2 px-2">
                {onDelete && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400" onClick={() => onDelete(h.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
