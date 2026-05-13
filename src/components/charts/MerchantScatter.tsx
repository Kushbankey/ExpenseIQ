'use client';

import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatINR, formatCompactINR } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';

interface ScatterPoint {
  name: string;
  visits: number;
  avgTicket: number;
  total: number;
  category: string;
}

interface Props {
  data: ScatterPoint[];
}

const FALLBACK = '#8b5cf6';

export function MerchantScatter({ data }: Props) {
  if (data.length === 0) {
    return <div className="text-sm text-gray-400 py-8 text-center">No repeating merchants yet.</div>;
  }

  // Group by category — one Scatter series per category for distinct color + legend
  const byCategory = new Map<string, ScatterPoint[]>();
  for (const p of data) {
    const arr = byCategory.get(p.category) || [];
    arr.push(p);
    byCategory.set(p.category, arr);
  }
  const categories = [...byCategory.entries()].sort((a, b) => {
    const aTotal = a[1].reduce((s, p) => s + p.total, 0);
    const bTotal = b[1].reduce((s, p) => s + p.total, 0);
    return bTotal - aTotal;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 10, right: 15, left: 5, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          type="number"
          dataKey="visits"
          name="Visits"
          tick={{ fontSize: 11 }}
          label={{ value: 'Visits', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#6b7280' }}
        />
        <YAxis
          type="number"
          dataKey="avgTicket"
          name="Avg ticket"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => formatCompactINR(v)}
          label={{ value: 'Avg ticket', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' }}
        />
        <ZAxis type="number" dataKey="total" range={[60, 600]} name="Total" />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload || !payload[0]) return null;
            const d = payload[0].payload as ScatterPoint;
            return (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
                <p className="font-semibold text-gray-900">{d.name}</p>
                <p className="text-gray-500 mt-0.5">{d.category}</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-gray-700">Visits: <span className="font-medium">{d.visits}</span></p>
                  <p className="text-gray-700">Avg: <span className="font-medium">{formatINR(d.avgTicket)}</span></p>
                  <p className="text-gray-700">Total: <span className="font-medium">{formatINR(d.total)}</span></p>
                </div>
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          iconSize={8}
        />
        {categories.map(([category, points]) => (
          <Scatter
            key={category}
            name={category}
            data={points}
            fill={CATEGORY_COLORS[category] || FALLBACK}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
