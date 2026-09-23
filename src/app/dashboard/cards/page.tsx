'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard, Search, TrendingUp, AlertTriangle, ArrowRight, Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUserCards } from '@/store/useUserCards';
import {
  allocateOptimal, computeActualEarn, rankCandidates, recommendCardFor,
} from '@/lib/analytics/cards';
import {
  computeBucketBreakdown, BUCKET_LABELS, isAddressable, type SpendBucket,
} from '@/lib/cards/buckets';
import { formatINR, formatPercent, formatDate } from '@/lib/formatters';

const CARD_HUES = ['#4f7118', '#a2323f', '#2a549b', '#63686e', '#7c5295', '#0f766e'];

/**
 * Trailing window, in months. 0 means the whole sheet.
 *
 * This matters more than it looks: without a window every figure covers however
 * many months the sheet happens to hold, so a reward total reads as annual when it
 * is not. Annual fees are charged per year, so comparing them against an 18-month
 * reward total silently flatters every card.
 */
const WINDOWS = [
  { months: 12, label: '12 months' },
  { months: 6, label: '6 months' },
  { months: 3, label: '3 months' },
  { months: 0, label: 'All data' },
] as const;

export default function CardsPage() {
  const data = useFinanceStore((s) => s.data);
  const { cards, overrides, isHydrated, hydrate } = useUserCards();
  const [query, setQuery] = useState('');
  const [months, setMonths] = useState<number>(12);

  useEffect(() => { void hydrate(); }, [hydrate]);

  const allExpenses = useMemo(() => data?.expenses ?? [], [data]);

  // Scope to the trailing window, measured from the latest transaction in the
  // sheet rather than today, so a sheet uploaded weeks ago still reads sensibly.
  const { expenses, from, to } = useMemo(() => {
    if (allExpenses.length === 0) return { expenses: allExpenses, from: null, to: null };
    let latest = 0;
    for (const e of allExpenses) {
      const t = +new Date(e.date);
      if (t > latest) latest = t;
    }
    const end = new Date(latest);
    if (!months) return { expenses: allExpenses, from: null, to: end };
    const cutoff = new Date(end);
    cutoff.setMonth(cutoff.getMonth() - months);
    return {
      expenses: allExpenses.filter((e) => +new Date(e.date) >= +cutoff),
      from: cutoff,
      to: end,
    };
  }, [allExpenses, months]);

  const breakdown = useMemo(
    () => computeBucketBreakdown(expenses, overrides),
    [expenses, overrides]
  );

  const actual = useMemo(
    () => computeActualEarn(expenses, cards, overrides),
    [expenses, cards, overrides]
  );

  const optimal = useMemo(
    () => allocateOptimal(expenses, cards, overrides),
    [expenses, cards, overrides]
  );

  const candidates = useMemo(
    () => rankCandidates(expenses, cards, overrides).filter((c) => c.marginalNet > 0).slice(0, 6),
    [expenses, cards, overrides]
  );

  const till = useMemo(
    () => (query.trim() ? recommendCardFor(query, cards, overrides) : null),
    [query, cards, overrides]
  );

  const hueFor = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((c, i) => map.set(c.catalogueId, CARD_HUES[i % CARD_HUES.length]));
    return map;
  }, [cards]);

  if (!data) return null;

  // ---- empty state --------------------------------------------------------
  if (isHydrated && cards.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <div className="py-10 text-center">
            <CreditCard size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Add your cards to get started
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              This page needs to know what is in your wallet. Card rates and fees are built in;
              you only declare which ones you hold.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 dark:bg-violet-500"
            >
              Set up cards
              <ArrowRight size={15} />
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const gap = optimal.netRupees - actual.netRupees;

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* ---- window picker ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.months}
              onClick={() => setMonths(w.months)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                months === w.months
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        {to && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {from ? `${formatDate(from)} to ${formatDate(to)}` : `everything up to ${formatDate(to)}`}
          </span>
        )}
      </div>

      {/* ---- headline ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          label="Earning today"
          value={formatINR(actual.netRupees)}
          sub={`${formatPercent(actual.captureRate * 100)} of eligible spend on a card`}
        />
        <Stat
          label="If routed well"
          value={formatINR(optimal.netRupees)}
          sub={`${formatPercent(optimal.effectiveRate * 100)} of ${formatINR(optimal.addressableSpend)} eligible`}
          accent
        />
        <Stat
          label="Left on the table"
          value={formatINR(Math.max(0, gap))}
          sub={gap > 0 ? 'Same cards, better routing' : 'You are routing well'}
          warn={gap > 0}
        />
      </div>

      {/* ---- at the till ---- */}
      <Card title="At the till">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a shop: myntra, zepto, auto, hotel..."
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131316] text-gray-900 dark:text-gray-100"
          />
        </div>

        {till && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              Reads as <strong className="text-gray-600 dark:text-gray-300">{BUCKET_LABELS[till.bucket]}</strong>
              {till.resolution.needsReview && ' (low confidence, check the review list below)'}
            </p>

            {!till.addressable ? (
              <p className="text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                No card earns on this. Pay it from your bank.
              </p>
            ) : till.options.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                None of your cards earn here. Any card works; none pays more.
              </p>
            ) : (
              <div className="space-y-1.5">
                {till.options.slice(0, 4).map((o, i) => (
                  <div
                    key={o.card.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl ${
                      i === 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-gray-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm break-words ${i === 0 ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                        <span className="block">{o.card.name}</span>
                        <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{o.card.issuer}</span>
                      </p>
                      {i === 0 && (o.minTxn || o.needsParam || o.ruleNote) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {o.needsParam && 'Needs the paid add-on switched on. '}
                          {o.minTxn ? `Minimum ${formatINR(o.minTxn)} per transaction. ` : ''}
                          {o.ruleNote ?? ''}
                        </p>
                      )}
                    </div>
                    <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${i === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {(o.rate * 100).toFixed(o.rate * 100 < 1 ? 1 : 0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!till && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Headline rates, ignoring how much of each monthly cap you have already used.
          </p>
        )}
      </Card>

      {months !== 12 && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 -mt-2">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          Annual fees are charged per year but this window is{' '}
          {months ? `${months} months` : 'your whole sheet'}, so net figures are not comparable to a
          yearly fee. Switch to 12 months for the honest number.
        </p>
      )}

      {/* ---- per-card routing ---- */}
      <Card title="Where each card earns">
        {optimal.cards.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
            None of your cards can be priced yet. Check their terms in Settings.
          </p>
        ) : (
          <div className="space-y-5">
            {optimal.cards.map((c) => {
              const hue = hueFor.get(c.catalogueId) ?? '#63686e';
              const buckets = Object.entries(c.byBucket)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);
              return (
                <div key={c.catalogueId}>
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-1" style={{ backgroundColor: hue }} />
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{c.label}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      {formatINR(c.spend)} spend · earns{' '}
                      <strong className="text-gray-800 dark:text-gray-200">{formatINR(c.rewardRupees)}</strong>
                      {c.fee > 0 ? ` · fee ${formatINR(c.fee)}` : c.feeWaived ? ' · fee waived' : ''}
                    </p>
                  </div>
                  <div className="space-y-1 pl-5">
                    {buckets.map(([b, v]) => (
                      <div key={b} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-600 dark:text-gray-300 break-words">
                          {BUCKET_LABELS[b as SpendBucket]}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 tabular-nums flex-shrink-0">
                          {formatINR(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {c.capsBinding.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 pl-5">
                      Hit its cap at least once, so extra spend there earned less.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {optimal.unearnableSpend > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            {formatINR(optimal.unearnableSpend)} of eligible spend earns nothing on any card you
            hold, usually fuel.
          </p>
        )}
      </Card>

      {/* ---- candidates ---- */}
      {candidates.length > 0 && (
        <Card title="Cards worth adding">
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4">
            What each would add on top of what you already hold, after its annual fee. A card that
            overlaps one you have is worth far less than its headline rate.
          </p>
          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.card.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                    {c.card.name}
                    <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{c.card.issuer}</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 break-words mt-0.5">
                    {formatINR(c.capturedSpend)} would move to it
                    {c.clearsWaiver ? ' · clears its fee waiver' : c.fee > 0 ? ` · ${formatINR(c.fee)} fee` : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums flex-shrink-0">
                  +{formatINR(c.marginalNet)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ---- leakage ---- */}
      {actual.leakedSpend > 0 && (
        <Card title="Not going through a card">
          <div className="space-y-1.5">
            {(Object.entries(actual.leakageByBucket) as [SpendBucket, number][])
              .filter(([b]) => isAddressable(b))
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([b, v]) => (
                <div key={b} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-600 dark:text-gray-300 break-words">
                    {BUCKET_LABELS[b]}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 tabular-nums font-medium flex-shrink-0">
                    {formatINR(v)}
                  </span>
                </div>
              ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {formatINR(actual.leakedSpend)} of card-eligible spend was paid from an account that is
            not linked to a card. If some of these accounts <em>are</em> cards, link them in{' '}
            <Link href="/dashboard/settings" className="underline">Settings</Link>.
          </p>
        </Card>
      )}

      {/* ---- review queue ---- */}
      {breakdown.reviewQueue.length > 0 && (
        <Card title="Needs your check">
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4">
            These could not be categorised confidently, usually because the note names a person
            rather than a shop. Until confirmed they may be counted in the wrong place.
          </p>
          <div className="space-y-1.5">
            {breakdown.reviewQueue.slice(0, 8).map((r) => (
              <div key={`${r.category}|${r.subcategory}|${r.note}`} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-gray-700 dark:text-gray-200 break-words">{r.note || '(no note)'}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 break-words">
                    {r.category} / {r.subcategory} · read as {BUCKET_LABELS[r.resolution.bucket]}
                  </p>
                </div>
                <span className="text-gray-900 dark:text-gray-100 tabular-nums font-medium flex-shrink-0">
                  {formatINR(r.total)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cards</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Which card to tap, and what better routing is worth
      </p>
    </div>
  );
}

function Stat({ label, value, sub, accent, warn }: {
  label: string; value: string; sub: string; accent?: boolean; warn?: boolean;
}) {
  const tone = accent
    ? 'text-emerald-700 dark:text-emerald-400'
    : warn
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-gray-900 dark:text-gray-100';
  const Icon = accent ? Sparkles : warn ? AlertTriangle : TrendingUp;
  return (
    <div className="bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className="text-gray-400 dark:text-gray-500" />
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-xl sm:text-2xl font-bold tabular-nums break-words ${tone}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
