'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import { formatMonth } from '@/lib/formatters';
import type { MonthlyTrend } from '@/lib/types';

export function SavingsRateChart({ data }: { data: MonthlyTrend[] }) {
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Savings Rate']} />
        <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '20% target', position: 'right', fontSize: 10 }} />
        <Bar dataKey="savingsRate" name="Savings Rate" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.savingsRate >= 0 ? '#22c55e' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
