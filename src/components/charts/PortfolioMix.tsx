'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '@/lib/formatters';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PortfolioMix as PortfolioMixData } from '@/lib/types';

interface Props {
  portfolio: PortfolioMixData;
}

const TYPE_COLORS: Record<string, string> = {
  Index: '#3b82f6',
  Smallcap: '#ec4899',
  Midcap: '#8b5cf6',
  Flexicap: '#06b6d4',
  Largecap: '#0ea5e9',
  Gold: '#f59e0b',
  International: '#10b981',
  Crypto: '#f97316',
  Debt: '#64748b',
  Other: '#9ca3af',
};

export function PortfolioMix({ portfolio }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (portfolio.buckets.length === 0) {
    return <div className="text-sm text-gray-400 py-8 text-center">No investments tracked yet.</div>;
  }

  const pieData = portfolio.buckets.map((b) => ({
    name: b.type,
    value: b.total,
    fill: TYPE_COLORS[b.type] || '#8b5cf6',
  }));

  const toggle = (t: string) => setExpanded(expanded === t ? null : t);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={2}
            >
              {pieData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatINR(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {portfolio.buckets.map((b) => {
          const pct = portfolio.totalInvested > 0 ? (b.total / portfolio.totalInvested) * 100 : 0;
          const isExpanded = expanded === b.type;
          const hasMultipleFunds = b.funds.length > 1;
          return (
            <div key={b.type}>
              <button
                onClick={() => hasMultipleFunds && toggle(b.type)}
                className={`w-full flex items-center justify-between py-2 px-2 rounded-lg ${hasMultipleFunds ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[b.type] || '#8b5cf6' }}
                  />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{b.type}</p>
                    <p className="text-xs text-gray-400">
                      {formatINR(b.monthlyAvg)}/mo · {b.count} txns
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatINR(b.total)}</p>
                    <p className="text-xs text-gray-400">{pct.toFixed(1)}%</p>
                  </div>
                  {hasMultipleFunds &&
                    (isExpanded ? (
                      <ChevronDown size={14} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    ))}
                </div>
              </button>
              {isExpanded && hasMultipleFunds && (
                <div className="ml-5 mb-2 space-y-1">
                  {b.funds.map((f) => (
                    <div key={f.name} className="flex items-center justify-between py-1 px-2 text-xs">
                      <span className="text-gray-600 truncate pr-2">{f.name}</span>
                      <span className="font-medium text-gray-800 flex-shrink-0">{formatINR(f.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
