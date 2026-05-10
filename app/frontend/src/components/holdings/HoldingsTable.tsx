import { ActionBadge } from '@/components/holdings/ActionBadge';
import type { AnalysisResult, DashboardHolding } from '@/types/holdings';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Fragment, useState } from 'react';

interface HoldingsTableProps {
  holdings: DashboardHolding[];
  analysisResults?: Record<number, AnalysisResult>;
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

function RiskBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  const getColor = (s: number) => {
    if (s <= 3) return 'bg-green-900/50 text-green-300 border-green-700';
    if (s <= 6) return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
    return 'bg-red-900/50 text-red-300 border-red-700';
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getColor(score)}`}>
      {score}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number | undefined }) {
  if (confidence === undefined || confidence === null) return <span className="text-muted-foreground">—</span>;
  const getColor = (c: number) => {
    if (c >= 70) return 'text-green-400';
    if (c >= 50) return 'text-yellow-400';
    return 'text-muted-foreground';
  };
  return <span className={`text-xs font-medium ${getColor(confidence)}`}>{confidence.toFixed(0)}%</span>;
}

function parseSummary(summary: string | null): Record<string, unknown> | null {
  if (!summary) return null;
  try {
    return JSON.parse(summary);
  } catch {
    return null;
  }
}

function AnalysisExpandedRow({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="px-4 py-3 space-y-3 text-xs bg-muted/20">
      {/* Factors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {analysis.positive_factors.length > 0 && (
          <div>
            <div className="font-medium text-green-400 mb-1">Positive Factors</div>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {analysis.positive_factors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
        {analysis.risk_factors.length > 0 && (
          <div>
            <div className="font-medium text-red-400 mb-1">Risk Factors</div>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {analysis.risk_factors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
        {analysis.uncertainties.length > 0 && (
          <div>
            <div className="font-medium text-yellow-400 mb-1">Uncertainties</div>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {analysis.uncertainties.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Agent Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-border/50">
        <AgentSummaryCard title="Technical" summary={analysis.technical_summary} />
        <AgentSummaryCard title="Fundamental" summary={analysis.fundamental_summary} />
        <AgentSummaryCard title="Sentiment" summary={analysis.sentiment_summary} />
        <AgentSummaryCard title="Valuation" summary={analysis.valuation_summary} />
        <AgentSummaryCard title="Risk" summary={analysis.risk_summary} />
        {analysis.portfolio_manager_summary && (
          <div>
            <div className="font-medium text-muted-foreground mb-1">Portfolio Manager</div>
            <p className="text-muted-foreground">{analysis.portfolio_manager_summary}</p>
          </div>
        )}
      </div>

      <div className="text-muted-foreground/60 text-[10px] pt-1 border-t border-border/30">
        Analyzed: {analysis.created_at ? new Date(analysis.created_at).toLocaleString() : 'Unknown'}
        {' | '}Analysis ticker: {analysis.analysis_ticker}
        {' | '}Educational only — not financial advice
      </div>
    </div>
  );
}

function AgentSummaryCard({ title, summary }: { title: string; summary: string | null }) {
  const parsed = parseSummary(summary);
  if (!parsed && !summary) return null;

  const getSignalBadge = (data: Record<string, unknown>) => {
    const signal = data.signal as string | undefined;
    if (!signal) return null;
    const colors: Record<string, string> = {
      bullish: 'text-green-400',
      bearish: 'text-red-400',
      neutral: 'text-yellow-400',
    };
    return <span className={colors[signal] || ''}>{signal}</span>;
  };

  return (
    <div>
      <div className="font-medium text-muted-foreground mb-1">{title}</div>
      {parsed ? (
        <div className="text-muted-foreground">
          {typeof parsed === 'object' && 'signal' in parsed && (
            <span>Signal: {getSignalBadge(parsed as Record<string, unknown>)}</span>
          )}
          {typeof parsed === 'object' && !('signal' in parsed) && (
            <span className="line-clamp-3">{JSON.stringify(parsed).slice(0, 150)}...</span>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground line-clamp-2">{summary?.slice(0, 150)}</p>
      )}
    </div>
  );
}

export function HoldingsTable({ holdings, analysisResults, onDelete }: HoldingsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No holdings yet. Add a holding or import from CSV.
      </div>
    );
  }

  const hasAccounts = holdings.some(h => h.account_label);
  const hasAnalysis = analysisResults && Object.keys(analysisResults).length > 0;

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {hasAnalysis && <th className="py-2 px-1 w-6"></th>}
            {hasAccounts && <th className="py-2 px-2">Account</th>}
            <th className="py-2 px-2">Ticker</th>
            <th className="py-2 px-2">Investment</th>
            <th className="py-2 px-2 text-right">Qty</th>
            <th className="py-2 px-2 text-right">Buy Price</th>
            <th className="py-2 px-2 text-right">Current</th>
            <th className="py-2 px-2 text-right">Value</th>
            <th className="py-2 px-2 text-right">P&L</th>
            <th className="py-2 px-2 text-right">P&L %</th>
            <th className="py-2 px-2 text-center">Risk</th>
            <th className="py-2 px-2 text-center">Trend</th>
            <th className="py-2 px-2 text-center">Action</th>
            {hasAnalysis && <th className="py-2 px-2 text-center">Conf.</th>}
            <th className="py-2 px-2"></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map(h => {
            const analysis = analysisResults?.[h.id];
            const isExpanded = expandedRows.has(h.id);
            const displayAction = analysis?.final_action || h.action_label;

            return (
              <Fragment key={h.id}>
                <tr className="border-b border-border/50 hover:bg-muted/30">
                  {hasAnalysis && (
                    <td className="py-2 px-1">
                      {analysis && (
                        <button onClick={() => toggleRow(h.id)} className="text-muted-foreground hover:text-foreground">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </td>
                  )}
                  {hasAccounts && (
                    <td className="py-2 px-2 text-xs text-muted-foreground max-w-[120px] truncate" title={h.account_label || ''}>
                      {h.account_label || '—'}
                    </td>
                  )}
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
                  <td className="py-2 px-2 text-center"><RiskBadge score={h.risk_score} /></td>
                  <td className="py-2 px-2 text-center"><TrendIndicator trend={h.trend} /></td>
                  <td className="py-2 px-2 text-center"><ActionBadge label={displayAction} /></td>
                  {hasAnalysis && (
                    <td className="py-2 px-2 text-center">
                      <ConfidenceBadge confidence={analysis?.confidence} />
                    </td>
                  )}
                  <td className="py-2 px-2">
                    {onDelete && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400" onClick={() => onDelete(h.id)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
                {isExpanded && analysis && (
                  <tr className="border-b border-border/30">
                    <td colSpan={hasAccounts ? (hasAnalysis ? 15 : 13) : (hasAnalysis ? 14 : 12)}>
                      <AnalysisExpandedRow analysis={analysis} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
