'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { NeedsWantsResult } from '@/lib/types';

export function BudgetComparisonChart({ data }: { data: NeedsWantsResult }) {
  const chartData = [
    { name: 'Needs', actual: parseFloat(data.need.pct.toFixed(1)), target: 50 },
    { name: 'Wants', actual: parseFloat(data.want.pct.toFixed(1)), target: 30 },
    { name: 'Investments', actual: parseFloat(data.investment.pct.toFixed(1)), target: 20 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(value) => [`${value}%`]} />
        <Legend />
        <Bar dataKey="actual" name="Actual" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
        <Bar dataKey="target" name="50/30/20 Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
