'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '@/lib/formatters';
import type { TemporalStats } from '@/lib/types';

interface Props {
  temporal: TemporalStats;
}

export function WeekendSplitChart({ temporal }: Props) {
  const data = [
    { name: 'Weekday', value: temporal.weekdayAmount, count: temporal.weekdayCount, color: '#8b5cf6' },
    { name: 'Weekend', value: temporal.weekendAmount, count: temporal.weekendCount, color: '#f97316' },
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="w-28 h-28 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={32} outerRadius={52} paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatINR(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((d) => {
          const total = data.reduce((s, x) => s + x.value, 0);
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={d.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-gray-700">{d.name}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatINR(d.value)}</p>
                <p className="text-xs text-gray-400">
                  {pct.toFixed(1)}% · {d.count} txns
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
