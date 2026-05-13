'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatMonth, formatCompactINR, formatINR } from '@/lib/formatters';
import type { DiscretionaryPoint } from '@/lib/types';

export function DiscretionaryIncomeChart({ data }: { data: DiscretionaryPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(v) => formatCompactINR(v)} />
        <Tooltip
          formatter={(value) => [formatINR(Number(value)), 'Discretionary']}
          labelStyle={{ fontSize: 12 }}
        />
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="discretionary"
          stroke="#8b5cf6"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#8b5cf6' }}
          activeDot={{ r: 5 }}
          name="Discretionary"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
