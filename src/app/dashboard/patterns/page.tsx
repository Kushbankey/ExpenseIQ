'use client';

import { useFinanceStore } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/Card';
import { CalendarHeatmap } from '@/components/charts/CalendarHeatmap';
import { DayOfWeekChart } from '@/components/charts/DayOfWeekChart';
import { DayOfMonthChart } from '@/components/charts/DayOfMonthChart';
import { WeekendSplitChart } from '@/components/charts/WeekendSplitChart';
import { formatINR, formatPercent } from '@/lib/formatters';
import { Calendar, CalendarDays, Sun, TrendingUp } from 'lucide-react';

export default function PatternsPage() {
  const data = useFinanceStore((s) => s.data);
  if (!data) return null;

  const { temporal } = data;

  // Peak day-of-week (Mon-first ordering for display)
  const ordered = [temporal.dayOfWeek[1], temporal.dayOfWeek[2], temporal.dayOfWeek[3], temporal.dayOfWeek[4], temporal.dayOfWeek[5], temporal.dayOfWeek[6], temporal.dayOfWeek[0]];
  const peakDay = [...ordered].sort((a, b) => b.amount - a.amount)[0];
  const totalDow = ordered.reduce((s, d) => s + d.amount, 0);

  // Peak day-of-month
  const peakDom = [...temporal.dayOfMonth].sort((a, b) => b.amount - a.amount)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patterns</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          When and how your spending happens across days, weeks, and the year
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#131316] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <TrendingUp size={14} className="text-violet-500 dark:text-violet-300" />
            Peak weekday
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{peakDay.label}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {formatINR(peakDay.amount)} ({totalDow > 0 ? formatPercent((peakDay.amount / totalDow) * 100) : '0%'})
          </p>
        </div>
        <div className="bg-white dark:bg-[#131316] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar size={14} className="text-violet-500 dark:text-violet-300" />
            Peak day of month
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">Day {peakDom.day}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {formatINR(peakDom.amount)} ({peakDom.count} txns)
          </p>
        </div>
        <div className="bg-white dark:bg-[#131316] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Sun size={14} className="text-orange-500 dark:text-orange-300" />
            Weekend share
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{formatPercent(temporal.weekendPct)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatINR(temporal.weekendAmount)}</p>
        </div>
        <div className="bg-white dark:bg-[#131316] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <CalendarDays size={14} className="text-blue-500 dark:text-blue-300" />
            First 5 days (ex inv.)
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{formatPercent(temporal.firstWeekShareExInv)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">of non-investment spend</p>
        </div>
      </div>

      {/* Calendar heatmap */}
      <Card title="Daily Activity">
        <CalendarHeatmap calendar={temporal.calendar} />
      </Card>

      {/* DoW + Weekend split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="By Day of Week">
          <DayOfWeekChart data={temporal.dayOfWeek} />
        </Card>
        <Card title="Weekday vs Weekend">
          <WeekendSplitChart temporal={temporal} />
        </Card>
      </div>

      {/* DoM */}
      <Card title="By Day of Month">
        <DayOfMonthChart data={temporal.dayOfMonth} />
      </Card>
    </div>
  );
}
