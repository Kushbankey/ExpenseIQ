'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  CopyCheck,
  Repeat,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { formatINR, formatDate } from '@/lib/formatters';
import { Card } from '@/components/ui/Card';
import type { AnomalyAlerts } from '@/lib/types';

type Group = 'spikes' | 'outliers' | 'duplicates' | 'drifts';

const SEVERITY_COLORS: Record<'high' | 'medium', { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-50 dark:bg-red-500/15', text: 'text-red-600 dark:text-red-300', label: 'High' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-300', label: 'Watch' },
};

export function AlertsPanel({ alerts }: { alerts: AnomalyAlerts }) {
  const [expanded, setExpanded] = useState<Group | null>('spikes');

  const counts = {
    spikes: alerts.spikes.length,
    outliers: alerts.outliers.length,
    duplicates: alerts.duplicates.length,
    drifts: alerts.drifts.length,
  };
  const total = counts.spikes + counts.outliers + counts.duplicates + counts.drifts;

  if (total === 0) {
    return (
      <Card title="Alerts">
        <div className="flex items-center gap-3 py-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#10b98122' }}
          >
            <ShieldCheck size={20} style={{ color: '#10b981' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Nothing unusual</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              No spikes, outliers, duplicates, or subscription drift detected.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const toggle = (g: Group) => setExpanded(expanded === g ? null : g);

  return (
    <Card title="Alerts" action={<span className="text-xs text-gray-400 dark:text-gray-500">{total} signals</span>}>
      <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
        <GroupRow
          icon={<TrendingUp size={18} className="text-red-500" />}
          title="Category spikes"
          subtitle="Projected month-end spend > 1.5× of trailing 3-month avg"
          count={counts.spikes}
          open={expanded === 'spikes'}
          onClick={() => toggle('spikes')}
        >
          {alerts.spikes.length === 0 ? (
            <EmptyRow text="No category is trending high right now." />
          ) : (
            alerts.spikes.map((s) => {
              const sev = SEVERITY_COLORS[s.severity];
              return (
                <div key={s.category} className="flex items-center justify-between py-2.5 px-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.category}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Projected {formatINR(s.projectedSpend)} · 3-mo avg {formatINR(s.trailing3Avg)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.bg} ${sev.text} flex-shrink-0`}>
                    {sev.label} · {s.ratio.toFixed(1)}×
                  </span>
                </div>
              );
            })
          )}
        </GroupRow>

        <GroupRow
          icon={<AlertTriangle size={18} className="text-amber-500" />}
          title="Outlier transactions"
          subtitle=">3× the typical amount for the same subcategory (excludes Rent + family transfers)"
          count={counts.outliers}
          open={expanded === 'outliers'}
          onClick={() => toggle('outliers')}
        >
          {alerts.outliers.length === 0 ? (
            <EmptyRow text="No unusually-large one-off transactions." />
          ) : (
            alerts.outliers.map((o, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-2 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{o.note || o.subcategory}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {o.category} · {formatDate(o.date)} · typical {formatINR(o.subcatMedian)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatINR(o.amount)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">{o.multiplier.toFixed(1)}× median</p>
                </div>
              </div>
            ))
          )}
        </GroupRow>

        <GroupRow
          icon={<CopyCheck size={18} className="text-violet-500" />}
          title="Possible duplicate charges"
          subtitle="Same amount + same date + same category, >₹500 (commute excluded)"
          count={counts.duplicates}
          open={expanded === 'duplicates'}
          onClick={() => toggle('duplicates')}
        >
          {alerts.duplicates.length === 0 ? (
            <EmptyRow text="No suspicious duplicates found." />
          ) : (
            alerts.duplicates.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-2 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{d.note || d.subcategory}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {d.category} · {d.date} · ×{d.count}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatINR(d.amount * d.count)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatINR(d.amount)} ea</p>
                </div>
              </div>
            ))
          )}
        </GroupRow>

        <GroupRow
          icon={<Repeat size={18} className="text-cyan-600" />}
          title="Subscription drift"
          subtitle="Recurring expenses where the latest payment moved >5% from the first one"
          count={counts.drifts}
          open={expanded === 'drifts'}
          onClick={() => toggle('drifts')}
        >
          {alerts.drifts.length === 0 ? (
            <EmptyRow text="No recurring expenses have drifted in price." />
          ) : (
            alerts.drifts.map((d, i) => {
              const up = d.deltaPct > 0;
              return (
                <div key={i} className="flex items-center justify-between py-2.5 px-2 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{d.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {d.subcategory} · {formatINR(d.earliestAmount)} → {formatINR(d.latestAmount)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium flex-shrink-0 ${up ? 'text-red-500 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}
                  >
                    {up ? '+' : ''}{d.deltaPct.toFixed(0)}%
                  </span>
                </div>
              );
            })
          )}
        </GroupRow>
      </div>

    </Card>
  );
}

function GroupRow({
  icon,
  title,
  subtitle,
  count,
  open,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left"
      >
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
            count > 0 ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
          }`}
        >
          {count}
        </span>
        {open ? (
          <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="ml-9 mr-2 mb-2 max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-xs text-gray-400 dark:text-gray-500 py-3 px-2">{text}</p>;
}
