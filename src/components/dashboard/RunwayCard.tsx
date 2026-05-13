'use client';

import { Anchor } from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import type { ProjectionStats } from '@/lib/types';

export function RunwayCard({ projection }: { projection: ProjectionStats }) {
  const months = projection.runwayMonths;
  const color =
    months >= 12 ? '#10b981' : months >= 6 ? '#f59e0b' : '#ef4444';
  const label =
    months >= 12 ? 'Strong buffer'
    : months >= 6 ? 'Healthy'
    : months >= 3 ? 'Tight'
    : 'Build buffer';

  return (
    <div className="bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-4 md:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Runway</p>
          <p className="text-lg md:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate">
            {months > 0 ? `${months.toFixed(1)} months` : '—'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatINR(projection.cumulativeNetSavings)} saved at {formatINR(projection.avgMonthlyPureExpense)}/mo
          </p>
          <p className="text-xs mt-2 font-medium" style={{ color }}>
            {label}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}22` }}
        >
          <Anchor size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}
