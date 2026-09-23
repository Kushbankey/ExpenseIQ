'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Plus, Trash2, AlertTriangle, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useUserCards } from '@/store/useUserCards';
import { CARD_CATALOGUE, getCard, isRecommendable, isStale } from '@/lib/cards/catalogue';
import { capNeedsCreditLimit } from '@/lib/analytics/cards';
import type { WalletStatus } from '@/lib/cards/wallet';
import { formatINR } from '@/lib/formatters';

const STATUS_LABEL: Record<WalletStatus, string> = {
  held: 'I have this',
  applied: 'Applied for',
  considering: 'Considering',
  closed: 'Closed',
};

/** Add-on params that cost money, so the label has to say so. */
const PARAM_LABEL: Record<string, string> = {
  neonSubscribed: 'Kiwi Neon subscribed (₹999/yr)',
  amazonPrime: 'Amazon Prime member',
};

export function CardWalletCard() {
  const { cards, isHydrated, isHydrating, error, hydrate,
          addCard, removeCard, updateCard, setStatus, setParam } = useUserCards();
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState('');

  useEffect(() => { void hydrate(); }, [hydrate]);

  const available = useMemo(
    () => CARD_CATALOGUE
      .filter((c) => !cards.some((w) => w.catalogueId === c.id))
      .sort((a, b) => {
        const ar = isRecommendable(a) ? 0 : 1;
        const br = isRecommendable(b) ? 0 : 1;
        return ar - br || `${a.issuer} ${a.name}`.localeCompare(`${b.issuer} ${b.name}`);
      }),
    [cards]
  );

  return (
    <Card
      title="Your cards"
      action={
        !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400 transition-colors"
          >
            <Plus size={14} />
            Add card
          </button>
        )
      }
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4">
        Declare a card here the day you get it. The playbook can then price it straight away,
        without waiting for a first transaction to appear in your sheet.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 text-sm rounded-lg">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {adding && (
        <div className="mb-4 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
            Pick a card
          </label>
          <div className="flex gap-2 flex-wrap">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131316] text-gray-900 dark:text-gray-100"
            >
              <option value="">Select...</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.issuer} {c.name}
                  {isRecommendable(c) ? '' : ' (terms not verified)'}
                </option>
              ))}
            </select>
            <button
              disabled={!pick}
              onClick={async () => { await addCard(pick); setPick(''); setAdding(false); }}
              className="px-4 py-2 bg-violet-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg hover:bg-violet-700 dark:bg-violet-500"
            >
              Add
            </button>
            <button
              onClick={() => { setPick(''); setAdding(false); }}
              className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Cards marked &ldquo;terms not verified&rdquo; can be tracked but are never used in
            recommendations until someone confirms their current rates.
          </p>
        </div>
      )}

      {isHydrating && !isHydrated && (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">Loading your cards...</p>
      )}

      {isHydrated && cards.length === 0 && !adding && (
        <div className="py-8 text-center">
          <CreditCard size={28} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No cards yet.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Add one to unlock the Cards page.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {cards.map((w) => {
          const terms = getCard(w.catalogueId);
          if (!terms) {
            return (
              <div key={w.catalogueId} className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Unknown card <code>{w.catalogueId}</code>. It may have been removed from the catalogue.
                </p>
                <button onClick={() => void removeCard(w.catalogueId)} className="text-xs underline mt-1 text-amber-700 dark:text-amber-400">
                  Remove
                </button>
              </div>
            );
          }

          const needsLimit = capNeedsCreditLimit(terms, w);
          const stale = isStale(terms);

          return (
            <div key={w.catalogueId} className="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                    {terms.name}
                    <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{terms.issuer}</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {w.isLifetimeFree
                      ? 'Lifetime free'
                      : `${formatINR(terms.annualFee)}/yr` +
                        (terms.feeWaiverSpend ? `, waived at ${formatINR(terms.feeWaiverSpend)}` : '')}
                    {w.ledgerAccountLabels.length > 0 &&
                      ` · linked to ${w.ledgerAccountLabels.join(', ')}`}
                  </p>
                </div>
                <button
                  onClick={() => void removeCard(w.catalogueId)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex-shrink-0"
                  aria-label={`Remove ${terms.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <select
                  value={w.status}
                  onChange={(e) => void setStatus(w.catalogueId, e.target.value as WalletStatus)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131316] text-gray-700 dark:text-gray-200"
                >
                  {(Object.keys(STATUS_LABEL) as WalletStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={w.isLifetimeFree}
                    onChange={(e) => void updateCard(w.catalogueId, { isLifetimeFree: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Lifetime free
                </label>

                {terms.earn
                  .map((r) => r.requiresParam)
                  .filter((k, i, arr): k is string => !!k && arr.indexOf(k) === i)
                  .map((key) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={w.params[key] === true}
                        onChange={(e) => void setParam(w.catalogueId, key, e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      {PARAM_LABEL[key] ?? key}
                    </label>
                  ))}
              </div>

              {terms.earn.some((r) => r.cap?.basis === 'creditLimitPct') && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Credit limit
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    defaultValue={w.creditLimit ?? ''}
                    placeholder="e.g. 150000"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      void updateCard(w.catalogueId, {
                        creditLimit: v === '' ? undefined : Number(v),
                      });
                    }}
                    className="w-full sm:w-48 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131316] text-gray-900 dark:text-gray-100"
                  />
                  {needsLimit && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 mt-1.5">
                      <Info size={13} className="flex-shrink-0 mt-0.5" />
                      This card caps rewards at a share of your credit limit. Without it the capped
                      rates are scored as zero rather than guessed.
                    </p>
                  )}
                </div>
              )}

              {stale && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 mt-2">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  Terms not verified recently. This card is tracked but left out of recommendations.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
