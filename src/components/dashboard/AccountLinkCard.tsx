'use client';

import { useEffect, useMemo } from 'react';
import { Link2, Link2Off, Landmark } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUserCards } from '@/store/useUserCards';
import { getCard, CARD_CATALOGUE } from '@/lib/cards/catalogue';
import { suggestAccountLinks } from '@/lib/cards/wallet';
import { formatINR } from '@/lib/formatters';

/**
 * Maps the free-text `account` column in the uploaded sheet onto cards.
 *
 * Suggestions only. "HDFC" is a savings account while "HDFC Diners Club Privilege"
 * is a card, and linking a bank account to a card would make the app credit you with
 * rewards you never earned. So the match score is shown, weak matches are called out,
 * and nothing is linked without an explicit click.
 */
export function AccountLinkCard() {
  const data = useFinanceStore((s) => s.data);
  const { cards, isHydrated, hydrate, linkAccount, unlinkAccount } = useUserCards();

  useEffect(() => { void hydrate(); }, [hydrate]);

  const accountSpend = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of data?.expenses ?? []) {
      out[t.account] = (out[t.account] ?? 0) + t.amount;
    }
    return out;
  }, [data]);

  const linked = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) for (const l of c.ledgerAccountLabels) set.add(l.trim().toLowerCase());
    return set;
  }, [cards]);

  const walletCatalogue = useMemo(
    () => cards.map((c) => getCard(c.catalogueId)).filter((c): c is NonNullable<typeof c> => !!c),
    [cards]
  );

  const suggestions = useMemo(
    () => suggestAccountLinks(accountSpend, walletCatalogue.length ? walletCatalogue : CARD_CATALOGUE, linked),
    [accountSpend, walletCatalogue, linked]
  );

  const linkedRows = useMemo(
    () => cards.flatMap((c) =>
      c.ledgerAccountLabels.map((label) => ({
        label,
        catalogueId: c.catalogueId,
        spend: accountSpend[label] ?? 0,
      }))
    ),
    [cards, accountSpend]
  );

  if (!data) return null;

  return (
    <Card title="Ledger accounts">
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4">
        Tell the app which accounts in your sheet are cards. Anything left unlinked counts as a
        bank rail, which is how the Cards page measures what you are leaving on the table.
      </p>

      {linkedRows.length > 0 && (
        <div className="space-y-2 mb-5">
          {linkedRows.map((r) => {
            const terms = getCard(r.catalogueId);
            return (
              <div key={`${r.catalogueId}-${r.label}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                    {r.label}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 break-words">
                    {terms ? `${terms.issuer} ${terms.name}` : r.catalogueId} · {formatINR(r.spend)}
                  </p>
                </div>
                <button
                  onClick={() => void unlinkAccount(r.catalogueId, r.label)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
                >
                  <Link2Off size={13} />
                  Unlink
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!isHydrated && <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Loading...</p>}

      {isHydrated && suggestions.length === 0 && linkedRows.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
          No accounts found in your sheet.
        </p>
      )}

      <div className="space-y-2">
        {suggestions.map((s) => {
          const top = s.suggestions[0];
          const weak = !top || top.score < 0.5;
          return (
            <div key={s.account} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                  {s.account}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 break-words">
                  {formatINR(s.spend)}
                  {weak ? ' · looks like a bank account' : ` · probably ${top.name}`}
                </p>
              </div>

              {cards.length === 0 ? (
                <span className="text-xs text-gray-400 dark:text-gray-500">Add a card first</span>
              ) : (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) void linkAccount(e.target.value, s.account);
                  }}
                  className="w-full sm:w-auto sm:max-w-[55%] px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131316] text-gray-700 dark:text-gray-200 flex-shrink-0"
                >
                  <option value="">
                    {weak ? 'Keep as bank rail' : 'Link to...'}
                  </option>
                  {cards.map((c) => {
                    const terms = getCard(c.catalogueId);
                    if (!terms) return null;
                    const score = s.suggestions.find((x) => x.catalogueId === c.catalogueId)?.score;
                    return (
                      <option key={c.catalogueId} value={c.catalogueId}>
                        {terms.issuer} {terms.name}
                        {score != null && score >= 0.5 ? ' (likely)' : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          );
        })}
      </div>

      <p className="flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-4">
        <Landmark size={13} className="flex-shrink-0 mt-0.5" />
        Leave savings accounts and UPI rails unlinked. Linking one to a card would credit you with
        rewards you never earned and overstate every figure on the Cards page.
      </p>
      <p className="sr-only">
        <Link2 size={13} /> Link accounts to cards
      </p>
    </Card>
  );
}
