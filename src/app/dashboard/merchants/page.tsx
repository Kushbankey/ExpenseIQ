'use client';

import { useState } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/Card';
import { MerchantScatter } from '@/components/charts/MerchantScatter';
import { formatINR } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';
import { Store, Repeat } from 'lucide-react';

type Mode = 'amount' | 'frequency';

export default function MerchantsPage() {
  const data = useFinanceStore((s) => s.data);
  const [mode, setMode] = useState<Mode>('amount');

  if (!data) return null;
  const { merchants } = data;

  const list = mode === 'amount' ? merchants.byTotal : merchants.byFrequency;
  const maxValue = list.length > 0 ? (mode === 'amount' ? list[0].total : list[0].count) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
        <p className="text-sm text-gray-500 mt-1">
          Where your money actually goes — derived from transaction notes
        </p>
      </div>

      {/* Toggle */}
      <div className="inline-flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setMode('amount')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'amount' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          <Store size={14} />
          By spend
        </button>
        <button
          onClick={() => setMode('frequency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'frequency' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          <Repeat size={14} />
          By frequency
        </button>
      </div>

      {/* Leaderboard */}
      <Card title={mode === 'amount' ? 'Top Merchants by Spend' : 'Top Merchants by Frequency'}>
        {list.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No repeating merchants detected yet.</p>
        ) : (
          <div className="space-y-2">
            {list.map((m, i) => {
              const value = mode === 'amount' ? m.total : m.count;
              const pct = (value / maxValue) * 100;
              const color = CATEGORY_COLORS[m.categories[0]] || '#8b5cf6';
              return (
                <div key={m.normalizedName} className="py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-bold text-gray-300 w-5 flex-shrink-0">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {m.categories.join(', ')} · avg {formatINR(m.avg)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {mode === 'amount' ? formatINR(m.total) : `${m.count} visits`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {mode === 'amount' ? `${m.count} visits` : formatINR(m.total)}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full ml-8">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Scatter */}
      <Card title="Visits × Avg Ticket">
        <p className="text-xs text-gray-400 mb-3">
          Bubble size = total spend. Top-right = high-value frequent merchants.
        </p>
        <MerchantScatter data={merchants.scatter} />
      </Card>
    </div>
  );
}
