'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatINR, formatMonth } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';
import type { ExpenseTransaction } from '@/lib/types';

interface Props {
  expenses: ExpenseTransaction[];
  topCategories: string[];
}

export function CategoryMonthlyTrend({ expenses, topCategories }: Props) {
  // Build monthly totals per category
  const monthCatMap = new Map<string, Record<string, number>>();
  for (const t of expenses) {
    if (!topCategories.includes(t.category)) continue;
    let row = monthCatMap.get(t.month);
    if (!row) {
      row = {};
      monthCatMap.set(t.month, row);
    }
    row[t.category] = (row[t.category] || 0) + t.amount;
  }

  const chartData = [...monthCatMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cats]) => ({
      month: formatMonth(month),
      ...cats,
    }));

  const FALLBACK = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6'];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
        {topCategories.map((cat, i) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={CATEGORY_COLORS[cat] || FALLBACK[i % FALLBACK.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
