'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatINR, formatMonth } from '@/lib/formatters';
import { CHART_COLORS } from '@/lib/constants';
import type { MonthlyClassification } from '@/lib/types';

export function NeedsWantsStackedChart({ data }: { data: MonthlyClassification[] }) {
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value, name) => [formatINR(Number(value)), name]} />
        <Legend />
        <Bar dataKey="need" name="Needs" stackId="a" fill={CHART_COLORS.need} radius={[0, 0, 0, 0]} />
        <Bar dataKey="want" name="Wants" stackId="a" fill={CHART_COLORS.want} radius={[0, 0, 0, 0]} />
        <Bar dataKey="investment" name="Investments" stackId="a" fill={CHART_COLORS.investment} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
