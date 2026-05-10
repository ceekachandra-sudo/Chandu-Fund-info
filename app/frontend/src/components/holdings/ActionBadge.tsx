import { cn } from '@/lib/utils';

interface ActionBadgeProps {
  label: string;
}

const colorMap: Record<string, string> = {
  'HOLD': 'bg-green-900/50 text-green-300 border-green-700',
  'WATCH': 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  'REVIEW': 'bg-orange-900/50 text-orange-300 border-orange-700',
  'ADD CAUTIOUSLY': 'bg-blue-900/50 text-blue-300 border-blue-700',
  'REDUCE / REVIEW EXIT': 'bg-red-900/50 text-red-300 border-red-700',
};

export function ActionBadge({ label }: ActionBadgeProps) {
  const colors = colorMap[label] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', colors)}>
      {label}
    </span>
  );
}
