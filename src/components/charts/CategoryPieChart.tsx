'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatINR } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';
import type { CategoryTotal } from '@/lib/types';

const FALLBACK_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#e11d48', '#0ea5e9', '#6b7280'];

export function CategoryDonutChart({ categories }: { categories: CategoryTotal[] }) {
  const top10 = categories.slice(0, 10);
  const othersTotal = categories.slice(10).reduce((s, c) => s + c.total, 0);
  const data = [
    ...top10.map((c) => ({ name: c.category, value: c.total })),
    ...(othersTotal > 0 ? [{ name: 'Others', value: othersTotal }] : []),
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={80}
          outerRadius={155}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={CATEGORY_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatINR(Number(value))} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
