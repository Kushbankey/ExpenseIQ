/**
 * Wallet: which cards this user holds, has applied for, or is weighing.
 *
 * Mirrors the `user_cards` table. Kept separate from the catalogue because the
 * catalogue is public product data and this is personal state: the two have
 * different lifetimes, different privacy, and different places to live.
 *
 * Three fields here exist because the catalogue cannot know them:
 *   - `isLifetimeFree`   the catalogue lists a fee; a given holder may pay none
 *   - `creditLimit`      some caps are a percentage of it
 *   - `params`           per-card switches the terms depend on (Neon, Prime)
 */

import { cardLabel, type CardTerms } from './catalogue';

export type WalletStatus = 'held' | 'applied' | 'considering' | 'closed';

export interface UserCard {
  catalogueId: string;
  status: WalletStatus;
  isLifetimeFree: boolean;
  creditLimit?: number;
  annualFeeOverride?: number;
  /** Values of the ledger's `account` column that mean this card. */
  ledgerAccountLabels: string[];
  params: Record<string, boolean>;
  openedOn?: string;
}

export function makeUserCard(catalogueId: string, overrides: Partial<UserCard> = {}): UserCard {
  return {
    catalogueId,
    status: 'held',
    isLifetimeFree: false,
    ledgerAccountLabels: [],
    params: {},
    ...overrides,
  };
}

/** Cards to price as available right now. `considering` is planning-only. */
export function activeCards(wallet: readonly UserCard[]): UserCard[] {
  return wallet.filter((c) => c.status === 'held' || c.status === 'applied');
}

/**
 * The card's own annual fee, before any spend-based waiver.
 * Lifetime-free beats everything, then an explicit override, then the list price.
 */
export function baseAnnualFee(card: UserCard, terms: CardTerms): number {
  if (card.isLifetimeFree) return 0;
  if (card.annualFeeOverride != null) return card.annualFeeOverride;
  return terms.annualFee;
}

/**
 * Paid add-ons the holder has switched on, e.g. Kiwi Neon at Rs 999.
 *
 * Separate from the card fee for two reasons: a lifetime-free card can still carry a
 * paid add-on, and a spend-based waiver waives the card fee, never the membership.
 */
export function addOnFee(card: UserCard, terms: CardTerms): number {
  return (terms.addOnFees ?? [])
    .filter((a) => card.params[a.param] === true)
    .reduce((sum, a) => sum + a.fee, 0);
}

/** Ledger account label to catalogue id, for pricing what was actually earned. */
export function buildAccountIndex(wallet: readonly UserCard[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const card of wallet) {
    for (const label of card.ledgerAccountLabels) {
      index.set(label.trim().toLowerCase(), card.catalogueId);
    }
  }
  return index;
}

/**
 * Propose links between unrecognised ledger accounts and catalogue cards.
 *
 * Deliberately suggestive, never automatic. `account` is free text, and a label
 * like "HDFC" is a savings account while "HDFC Diners Club Privilege" is a card.
 * Guessing wrong silently corrupts every number downstream, so the user confirms.
 */
export interface AccountLinkSuggestion {
  account: string;
  spend: number;
  suggestions: { catalogueId: string; name: string; score: number }[];
}

export function suggestAccountLinks(
  accountSpend: Record<string, number>,
  catalogue: readonly CardTerms[],
  alreadyLinked: ReadonlySet<string>
): AccountLinkSuggestion[] {
  const out: AccountLinkSuggestion[] = [];

  for (const [account, spend] of Object.entries(accountSpend)) {
    if (alreadyLinked.has(account.trim().toLowerCase())) continue;

    const a = account.toLowerCase();
    const scored = catalogue
      .map((c) => ({
        catalogueId: c.id,
        name: cardLabel(c),
        score: scoreMatch(a, c),
      }))
      .filter((s) => s.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3);

    out.push({ account, spend, suggestions: scored });
  }

  return out.sort((x, y) => y.spend - x.spend);
}

function scoreMatch(account: string, card: CardTerms): number {
  const name = card.name.toLowerCase();
  const issuer = card.issuer.toLowerCase().split(/[\s/]+/)[0];

  // Full card name present is near-certain: "hdfc diners club privilege".
  if (account.includes(name)) return 0.9;

  const nameWords = name.split(/\s+/).filter((w) => w.length > 3);
  const hits = nameWords.filter((w) => account.includes(w)).length;

  if (hits > 0 && account.includes(issuer)) return 0.5 + 0.1 * hits;
  if (hits > 0) return 0.3 + 0.1 * hits;

  // Issuer alone is weak on purpose: it is as likely to be a bank account.
  if (account.includes(issuer)) return 0.2;

  return 0;
}
