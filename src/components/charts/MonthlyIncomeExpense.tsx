'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart,
} from 'recharts';
import { formatINR, formatMonth } from '@/lib/formatters';
import { CHART_COLORS } from '@/lib/constants';
import type { MonthlyTrend } from '@/lib/types';

export function MonthlyIncomeExpenseChart({ data }: { data: MonthlyTrend[] }) {
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
        <Tooltip
          formatter={(value, name) => [formatINR(Number(value)), name]}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend />
        <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="expense" name="Expense" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} barSize={20} />
        <Line
          dataKey="expenseMA3"
          name="3M Avg"
          stroke="#991b1b"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
