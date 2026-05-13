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
  const total = data.reduce((s, x) => s + x.value, 0);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-4">
      <div className="w-52 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={62} outerRadius={100} paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatINR(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full grid grid-cols-2 gap-3">
        {data.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={d.name} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{d.name}</span>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1">{formatINR(d.value)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {pct.toFixed(1)}% · {d.count} txns
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
