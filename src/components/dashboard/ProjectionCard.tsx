'use client';

import { TrendingUp, TrendingDown, CalendarClock } from 'lucide-react';
import { formatINR, formatMonth } from '@/lib/formatters';
import type { ProjectionStats } from '@/lib/types';

export function ProjectionCard({ projection }: { projection: ProjectionStats }) {
  if (!projection.currentMonth || projection.daysElapsed === 0) {
    return (
      <div className="bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-4 md:p-5">
        <p className="text-sm text-gray-400 dark:text-gray-500">No current-month data yet.</p>
      </div>
    );
  }

  const pct = projection.projectedVsAvgPct;
  const isOver = pct > 0;
  const Pill = isOver ? TrendingUp : TrendingDown;
  const pillColor = isOver ? 'text-red-500 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300';
  const pillBg = isOver ? 'bg-red-50 dark:bg-red-500/15' : 'bg-emerald-50 dark:bg-emerald-500/15';

  return (
    <div className="bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-4 md:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
            Projected this month
          </p>
          <p className="text-lg md:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate">
            {formatINR(projection.projectedTotal)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatINR(projection.monthToDate)} so far · day {projection.daysElapsed}/{projection.daysInMonth} of {formatMonth(projection.currentMonth)}
          </p>
          {projection.trailing3Avg > 0 && (
            <div className={`inline-flex items-center gap-1 text-xs mt-2 font-medium px-2 py-0.5 rounded-full ${pillBg} ${pillColor}`}>
              <Pill size={12} />
              {isOver ? '+' : ''}{pct.toFixed(0)}% vs 3-mo avg ({formatINR(projection.trailing3Avg)})
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#8b5cf622' }}
        >
          <CalendarClock size={20} style={{ color: '#8b5cf6' }} />
        </div>
      </div>
    </div>
  );
}
