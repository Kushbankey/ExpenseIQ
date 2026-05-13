'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatINR } from '@/lib/formatters';
import type { DayOfWeekStat } from '@/lib/types';

interface Props {
  data: DayOfWeekStat[];
}

// Reorder Sun-first → Mon-first
function reorder(data: DayOfWeekStat[]): DayOfWeekStat[] {
  return [data[1], data[2], data[3], data[4], data[5], data[6], data[0]];
}

export function DayOfWeekChart({ data }: Props) {
  const ordered = reorder(data);
  const total = ordered.reduce((s, d) => s + d.amount, 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={ordered} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
        />
        <Tooltip
          formatter={(value, _name, ctx) => {
            const v = Number(value);
            const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
            return [`${formatINR(v)} (${pct}%) · ${ctx.payload.count} txns`, 'Spend'];
          }}
          labelStyle={{ color: '#374151' }}
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
          {ordered.map((d, i) => (
            <Cell key={i} fill={d.day === 0 || d.day === 6 ? '#f97316' : '#8b5cf6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
