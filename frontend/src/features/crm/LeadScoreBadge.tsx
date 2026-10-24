import React from 'react';
import { Zap } from 'lucide-react';

interface LeadScoreBadgeProps {
  score: number;
}

export default function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let barColor = 'bg-slate-500';

  if (score >= 75) {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70';
    barColor = 'bg-emerald-500';
  } else if (score >= 50) {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/70';
    barColor = 'bg-blue-500';
  } else if (score >= 30) {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/70';
    barColor = 'bg-amber-500';
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${colorClass}`}>
        <Zap className="w-3 h-3 fill-current" />
        <span>{score}%</span>
      </div>
      <div className="w-12 h-1.5 bg-gray-100 dark:bg-slate-700/80 rounded-full overflow-hidden hidden sm:block">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}
