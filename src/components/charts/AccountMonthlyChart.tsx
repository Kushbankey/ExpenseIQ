'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatINR, formatMonth } from '@/lib/formatters';
import type { ExpenseTransaction } from '@/lib/types';

const PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#f97316', '#7c3aed', '#6b7280', '#06b6d4', '#ec4899',
  '#14b8a6', '#e11d48', '#84cc16',
];

interface Props {
  expenses: ExpenseTransaction[];
  accounts: string[];
}

export function AccountMonthlyChart({ expenses, accounts }: Props) {
  // Build monthly totals per account
  const monthAccMap = new Map<string, Record<string, number>>();
  for (const t of expenses) {
    if (!accounts.includes(t.account)) continue;
    let row = monthAccMap.get(t.month);
    if (!row) {
      row = {};
      monthAccMap.set(t.month, row);
    }
    row[t.account] = (row[t.account] || 0) + t.amount;
  }

  const chartData = [...monthAccMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, accs]) => ({
      month: formatMonth(month),
      ...accs,
    }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
        {accounts.map((acc, i) => (
          <Line
            key={acc}
            type="monotone"
            dataKey={acc}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
