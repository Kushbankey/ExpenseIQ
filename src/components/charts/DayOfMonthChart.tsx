'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatINR } from '@/lib/formatters';
import type { DayOfMonthStat } from '@/lib/types';

interface Props {
  data: DayOfMonthStat[];
}

export function DayOfMonthChart({ data }: Props) {
  const [excludeInv, setExcludeInv] = useState(false);
  const display = data.map((d) => ({
    day: d.day,
    amount: excludeInv ? d.amountExInvestments : d.amount,
    count: d.count,
  }));

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeInv}
            onChange={(e) => setExcludeInv(e.target.checked)}
            className="w-3.5 h-3.5 accent-violet-600"
          />
          Exclude investments
        </label>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={display} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} interval={2} />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip
            formatter={(value, _name, ctx) => [`${formatINR(Number(value))} · ${ctx.payload.count} txns`, 'Spend']}
            labelFormatter={(d) => `Day ${d}`}
          />
          <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
