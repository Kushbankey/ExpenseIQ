'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatINR, formatMonth } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';
import type { ExpenseTransaction, CompareDelta } from '@/lib/types';

export function CompareMonths({ expenses }: { expenses: ExpenseTransaction[] }) {
  const allMonths = useMemo(
    () => [...new Set(expenses.map((t) => t.month))].sort(),
    [expenses]
  );

  // Default: latest month vs previous full month
  const defaultB = allMonths[allMonths.length - 1] ?? '';
  const defaultA = allMonths[allMonths.length - 2] ?? defaultB;

  const [monthA, setMonthA] = useState(defaultA);
  const [monthB, setMonthB] = useState(defaultB);

  const deltas = useMemo<CompareDelta[]>(() => {
    if (!monthA || !monthB) return [];

    const aMap = new Map<string, number>();
    const bMap = new Map<string, number>();
    const cats = new Set<string>();

    for (const t of expenses) {
      cats.add(t.category);
      if (t.month === monthA) aMap.set(t.category, (aMap.get(t.category) || 0) + t.amount);
      if (t.month === monthB) bMap.set(t.category, (bMap.get(t.category) || 0) + t.amount);
    }

    const rows: CompareDelta[] = [];
    for (const c of cats) {
      const a = aMap.get(c) || 0;
      const b = bMap.get(c) || 0;
      if (a === 0 && b === 0) continue;
      const delta = b - a;
      const pctChange = a > 0 ? (delta / a) * 100 : 0;
      rows.push({ category: c, monthA: a, monthB: b, delta, pctChange });
    }

    // Sort by absolute delta, biggest movers first
    return rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  }, [expenses, monthA, monthB]);

  const totalA = deltas.reduce((s, r) => s + r.monthA, 0);
  const totalB = deltas.reduce((s, r) => s + r.monthB, 0);
  const totalDelta = totalB - totalA;
  const totalPct = totalA > 0 ? (totalDelta / totalA) * 100 : 0;

  if (allMonths.length < 2) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
        Need at least two months of data to compare.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <MonthPicker label="From" value={monthA} options={allMonths} onChange={setMonthA} />
        <MonthPicker label="To" value={monthB} options={allMonths} onChange={setMonthB} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label={formatMonth(monthA)} value={formatINR(totalA)} />
        <Stat label={formatMonth(monthB)} value={formatINR(totalB)} />
        <Stat
          label="Net change"
          value={`${totalDelta >= 0 ? '+' : ''}${formatINR(totalDelta)}`}
          subtle={totalA > 0 ? `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(0)}%` : ''}
          color={totalDelta > 0 ? '#ef4444' : '#10b981'}
        />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800/60 pt-2 space-y-1 max-h-[420px] overflow-y-auto">
        {deltas.map((row) => {
          const color = CATEGORY_COLORS[row.category] || '#6b7280';
          const Icon = row.delta > 0 ? TrendingUp : row.delta < 0 ? TrendingDown : Minus;
          const deltaColor =
            row.delta > 0
              ? 'text-red-500 dark:text-red-300'
              : row.delta < 0
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-gray-400 dark:text-gray-500';

          return (
            <div
              key={row.category}
              className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{row.category}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatINR(row.monthA)} → {formatINR(row.monthB)}</p>
                </div>
                <div className={`flex items-center gap-1 ${deltaColor} font-medium`}>
                  <Icon size={14} />
                  <span className="text-sm tabular-nums">
                    {row.delta >= 0 ? '+' : ''}{formatINR(row.delta)}
                  </span>
                  {row.monthA > 0 && (
                    <span className="text-xs hidden sm:inline">
                      ({row.pctChange >= 0 ? '+' : ''}{row.pctChange.toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {deltas.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">No spend in either month.</p>
        )}
      </div>
    </div>
  );
}

function MonthPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (m: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/30"
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {formatMonth(m)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({
  label,
  value,
  subtle,
  color,
}: {
  label: string;
  value: string;
  subtle?: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base font-bold mt-0.5 text-gray-900 dark:text-gray-100" style={color ? { color } : undefined}>
        {value}
      </p>
      {subtle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtle}</p>}
    </div>
  );
}
