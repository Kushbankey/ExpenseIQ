'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { formatINR, formatMonth } from '@/lib/formatters';
import type { CreditCardData } from '@/lib/types';

export function CreditCardMonthlyChart({ data }: { data: CreditCardData }) {
  const chartData = data.monthly.map((d) => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value) => [formatINR(Number(value)), 'Amount']} />
        <ReferenceLine
          y={data.avgMonthlyBill}
          stroke="#ef4444"
          strokeDasharray="5 5"
          label={{ value: `Avg: ${formatINR(data.avgMonthlyBill)}`, position: 'insideTopRight', fontSize: 10 }}
        />
        <Bar dataKey="amount" name="Monthly Spend" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
