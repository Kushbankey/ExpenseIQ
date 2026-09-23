/**
 * Card routing engine.
 *
 * Answers three questions, which need to stay distinct:
 *
 *   computeActualEarn   what you DID earn, pricing each transaction against the card
 *                       it was actually paid with
 *   allocateOptimal     what you WOULD earn routing perfectly with the cards you hold
 *   rankCandidates      what each card you do not hold would ADD, net of its fee
 *
 * The gap between the first two is routing discipline. The third is the shopping list.
 * Conflating them produces the usual useless advice ("get this card") when the real
 * answer is often "use the one already in your pocket".
 *
 * Allocation walks transactions in date order and assigns each to the card paying most
 * for it at that moment, respecting caps, minimums, exclusions and rate tiers. Greedy
 * and chronological rather than globally optimal: an early small transaction can consume
 * cap that a later large one would have used better. That is also what happens in real
 * life, and the alternative needs foreknowledge of the month's spend. The error is small
 * at these volumes and the result stays explainable, which matters more.
 *
 * Pure functions. No Supabase, no React, mirroring the rest of lib/analytics.
 */

import type { Transaction } from '@/lib/types';
import {
  resolveBucket,
  isAddressable,
  type BucketOverride,
  type BucketResolution,
  type SpendBucket,
} from '@/lib/cards/buckets';
import {
  getCard,
  isRecommendable,
  cardLabel,
  CARD_CATALOGUE,
  type CardTerms,
  type EarnRule,
  type CapPeriod,
} from '@/lib/cards/catalogue';
import {
  activeCards,
  baseAnnualFee,
  buildAccountIndex,
  type UserCard,
} from '@/lib/cards/wallet';

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface CardResult {
  catalogueId: string;
  label: string;
  spend: number;
  rewardUnits: number;
  /** Reward converted to rupees at the card's CASH redemption value. */
  rewardRupees: number;
  fee: number;
  feeWaived: boolean;
  net: number;
  byBucket: Partial<Record<SpendBucket, number>>;
  /** Cap pools that ran out at least once, so extra spend earned less. */
  capsBinding: string[];
}

export interface AllocationResult {
  cards: CardResult[];
  addressableSpend: number;
  /** Addressable spend that earned nothing: every card excludes it, e.g. fuel. */
  unearnableSpend: number;
  grossRupees: number;
  totalFees: number;
  netRupees: number;
  /** Net reward as a share of addressable spend. */
  effectiveRate: number;
}

export interface ActualEarnResult extends AllocationResult {
  /** Addressable spend that went through a linked card at all. */
  capturedSpend: number;
  /** capturedSpend / addressableSpend. The routing-discipline number. */
  captureRate: number;
  /** Addressable spend paid from an account linked to no card. */
  leakedSpend: number;
  leakageByBucket: Partial<Record<SpendBucket, number>>;
}

export interface Candidate {
  card: CardTerms;
  /** Net rupees this card adds on top of the current wallet. */
  marginalNet: number;
  /** Spend the allocator would move onto it. */
  capturedSpend: number;
  fee: number;
  feeWaived: boolean;
  /** True when allocated spend clears the card's own waiver threshold. */
  clearsWaiver: boolean;
}

// ---------------------------------------------------------------------------
// Period and cap helpers
// ---------------------------------------------------------------------------

function periodKey(date: Date, period: CapPeriod): string {
  const y = date.getFullYear();
  if (period === 'year') return `${y}`;
  if (period === 'quarter') return `${y}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  return `${y}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Resolve a cap to reward units for one period.
 * Returns Infinity when uncapped, and 0 when the cap depends on a credit limit the
 * user has not supplied. Zero is deliberate: guessing a limit silently invents value.
 */
function capUnits(rule: EarnRule, holder: UserCard): number {
  if (!rule.cap) return Infinity;
  if (rule.cap.basis === 'fixed') return rule.cap.units;
  if (holder.creditLimit == null) return 0;
  return holder.creditLimit * rule.cap.pct;
}

export function capNeedsCreditLimit(terms: CardTerms, holder: UserCard): boolean {
  return (
    holder.creditLimit == null &&
    terms.earn.some((r) => r.cap?.basis === 'creditLimitPct')
  );
}

function tierRate(rule: EarnRule, cumulative: number): number {
  if (!rule.tiers?.length) return rule.rate;
  let rate = rule.tiers[0].rate;
  for (const t of rule.tiers) if (cumulative >= t.fromCumulative) rate = t.rate;
  return rate;
}

/** Narrower rules win: a merchant rule beats a bucket rule beats the catch-all. */
function ruleSpecificity(rule: EarnRule): number {
  if (rule.merchants?.length) return 3;
  if (rule.buckets?.length) return 2;
  return 1;
}

function ruleApplies(
  rule: EarnRule,
  bucket: SpendBucket,
  note: string,
  amount: number,
  holder: UserCard
): boolean {
  if (rule.requiresParam && holder.params[rule.requiresParam] !== true) return false;
  if (rule.minTxn != null && amount < rule.minTxn) return false;
  if (rule.merchants?.some((m) => note.includes(m))) return true;
  if (rule.buckets?.includes(bucket)) return true;
  return rule.allOther === true;
}

function earnBase(rule: EarnRule, amount: number): number {
  if (!rule.roundDownTo) return amount;
  return Math.floor(amount / rule.roundDownTo) * rule.roundDownTo;
}

// ---------------------------------------------------------------------------
// Core allocation
// ---------------------------------------------------------------------------

interface Priced {
  rule: EarnRule;
  units: number;
  rupees: number;
  poolKey: string;
  capped: boolean;
}

interface EngineState {
  /** capPoolKey -> reward units consumed */
  used: Map<string, number>;
  /** cardId|pool -> cumulative spend, for rate tiers */
  cumulative: Map<string, number>;
}

function newState(): EngineState {
  return { used: new Map(), cumulative: new Map() };
}

/**
 * Best value a card can produce for one transaction, given state so far.
 * Returns null when the card earns nothing on it.
 */
function priceTransaction(
  terms: CardTerms,
  holder: UserCard,
  bucket: SpendBucket,
  note: string,
  amount: number,
  date: Date,
  state: EngineState,
  commit: boolean
): Priced | null {
  if (terms.excludedBuckets.includes(bucket)) return null;

  const candidates = terms.earn
    .filter((r) => ruleApplies(r, bucket, note, amount, holder))
    .sort((a, b) => ruleSpecificity(b) - ruleSpecificity(a));

  let best: Priced | null = null;

  for (const rule of candidates) {
    const poolId = rule.capPool ?? `${terms.id}:${terms.earn.indexOf(rule)}`;
    const pKey = rule.cap ? `${terms.id}|${poolId}|${periodKey(date, rule.cap.period)}` : `${terms.id}|${poolId}`;
    const cumKey = `${terms.id}|${poolId}`;

    const rate = tierRate(rule, state.cumulative.get(cumKey) ?? 0);
    const limit = capUnits(rule, holder);
    const remaining = limit - (state.used.get(pKey) ?? 0);
    if (remaining <= 0) continue;

    const wanted = earnBase(rule, amount) * rate;
    const units = Math.min(wanted, remaining);
    const rupees = units * terms.rewardValue;

    if (!best || rupees > best.rupees) {
      best = { rule, units, rupees, poolKey: pKey, capped: units < wanted };
    }

    // Specificity is descending, so the first rule that yields anything is the
    // intended one. Keep scanning only while nothing has been earned yet.
    if (best.rupees > 0) break;
  }

  if (!best) return null;

  if (commit) {
    state.used.set(best.poolKey, (state.used.get(best.poolKey) ?? 0) + best.units);
    const poolId = best.rule.capPool ?? `${terms.id}:${terms.earn.indexOf(best.rule)}`;
    const cumKey = `${terms.id}|${poolId}`;
    state.cumulative.set(cumKey, (state.cumulative.get(cumKey) ?? 0) + amount);
  }

  return best;
}

function blankResult(terms: CardTerms): CardResult {
  return {
    catalogueId: terms.id,
    label: cardLabel(terms),
    spend: 0,
    rewardUnits: 0,
    rewardRupees: 0,
    fee: 0,
    feeWaived: false,
    net: 0,
    byBucket: {},
    capsBinding: [],
  };
}

function finalise(
  results: Map<string, CardResult>,
  wallet: readonly UserCard[],
  addressableSpend: number,
  unearnableSpend: number
): AllocationResult {
  let gross = 0;
  let fees = 0;

  for (const holder of wallet) {
    const terms = getCard(holder.catalogueId);
    const r = results.get(holder.catalogueId);
    if (!terms || !r) continue;

    const base = baseAnnualFee(holder, terms);
    const waived = base > 0 && terms.feeWaiverSpend != null && r.spend >= terms.feeWaiverSpend;
    r.fee = waived ? 0 : base;
    r.feeWaived = waived;
    r.net = r.rewardRupees - r.fee;

    gross += r.rewardRupees;
    fees += r.fee;
  }

  const cards = [...results.values()].filter((r) => r.spend > 0 || r.fee > 0);
  cards.sort((a, b) => b.net - a.net);

  const net = gross - fees;
  return {
    cards,
    addressableSpend,
    unearnableSpend,
    grossRupees: gross,
    totalFees: fees,
    netRupees: net,
    effectiveRate: addressableSpend > 0 ? net / addressableSpend : 0,
  };
}

/** Chronological order matters: caps reset per period and tiers step with cumulative spend. */
function sortByDate(expenses: readonly Transaction[]): Transaction[] {
  return [...expenses].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function allocateOptimal(
  expenses: readonly Transaction[],
  wallet: readonly UserCard[],
  overrides: readonly BucketOverride[] = []
): AllocationResult {
  const holders = activeCards(wallet).filter((h) => {
    const t = getCard(h.catalogueId);
    return t != null && isRecommendable(t);
  });

  const results = new Map<string, CardResult>();
  for (const h of holders) {
    const t = getCard(h.catalogueId);
    if (t) results.set(h.catalogueId, blankResult(t));
  }

  const state = newState();
  let addressable = 0;
  let unearnable = 0;

  for (const txn of sortByDate(expenses)) {
    const bucket = resolveBucket(txn, overrides).bucket;
    if (!isAddressable(bucket)) continue;

    const amount = txn.amount ?? 0;
    addressable += amount;

    const note = (txn.note ?? '').toLowerCase();
    const date = new Date(txn.date);

    let bestHolder: UserCard | null = null;
    let bestPriced: Priced | null = null;

    for (const holder of holders) {
      const terms = getCard(holder.catalogueId);
      if (!terms) continue;
      const priced = priceTransaction(terms, holder, bucket, note, amount, date, state, false);
      if (priced && (!bestPriced || priced.rupees > bestPriced.rupees)) {
        bestPriced = priced;
        bestHolder = holder;
      }
    }

    if (!bestHolder || !bestPriced || bestPriced.rupees <= 0) {
      unearnable += amount;
      continue;
    }

    const terms = getCard(bestHolder.catalogueId)!;
    const committed = priceTransaction(terms, bestHolder, bucket, note, amount, date, state, true)!;
    const r = results.get(bestHolder.catalogueId)!;

    r.spend += amount;
    r.rewardUnits += committed.units;
    r.rewardRupees += committed.rupees;
    r.byBucket[bucket] = (r.byBucket[bucket] ?? 0) + committed.rupees;
    if (committed.capped && !r.capsBinding.includes(committed.poolKey.split('|')[1])) {
      r.capsBinding.push(committed.poolKey.split('|')[1]);
    }
  }

  return finalise(results, holders, addressable, unearnable);
}

export function computeActualEarn(
  expenses: readonly Transaction[],
  wallet: readonly UserCard[],
  overrides: readonly BucketOverride[] = []
): ActualEarnResult {
  // Only cards actually held have history, and only they cost a fee. An applied or
  // considered card must not drag the historical number down with a fee it never charged.
  const holders = wallet.filter((c) => c.status === 'held');

  const index = buildAccountIndex(holders);
  const byId = new Map(holders.map((c) => [c.catalogueId, c]));

  const results = new Map<string, CardResult>();
  for (const h of holders) {
    const t = getCard(h.catalogueId);
    if (t) results.set(h.catalogueId, blankResult(t));
  }

  const state = newState();
  let addressable = 0;
  let captured = 0;
  let leaked = 0;
  let unearnable = 0;
  const leakageByBucket: Partial<Record<SpendBucket, number>> = {};

  for (const txn of sortByDate(expenses)) {
    const bucket = resolveBucket(txn, overrides).bucket;
    if (!isAddressable(bucket)) continue;

    const amount = txn.amount ?? 0;
    addressable += amount;

    const catalogueId = index.get((txn.account ?? '').trim().toLowerCase());
    if (!catalogueId) {
      leaked += amount;
      leakageByBucket[bucket] = (leakageByBucket[bucket] ?? 0) + amount;
      continue;
    }

    captured += amount;

    const holder = byId.get(catalogueId);
    const terms = getCard(catalogueId);
    const r = results.get(catalogueId);
    if (!holder || !terms || !r) continue;

    r.spend += amount;

    const priced = priceTransaction(
      terms, holder, bucket, (txn.note ?? '').toLowerCase(),
      amount, new Date(txn.date), state, true
    );

    if (!priced || priced.rupees <= 0) {
      unearnable += amount;
      continue;
    }

    r.rewardUnits += priced.units;
    r.rewardRupees += priced.rupees;
    r.byBucket[bucket] = (r.byBucket[bucket] ?? 0) + priced.rupees;
    if (priced.capped && !r.capsBinding.includes(priced.poolKey.split('|')[1])) {
      r.capsBinding.push(priced.poolKey.split('|')[1]);
    }
  }

  const base = finalise(results, holders, addressable, unearnable);

  return {
    ...base,
    capturedSpend: captured,
    captureRate: addressable > 0 ? captured / addressable : 0,
    leakedSpend: leaked,
    leakageByBucket,
  };
}

/**
 * Price every card the user does not already hold, ranked by what it adds.
 *
 * Marginal, not standalone: a card is worth what it adds *on top of* the current
 * wallet. A second cashback card overlapping the first is worth far less than its
 * headline rate, and only a marginal calculation shows that.
 */
export function rankCandidates(
  expenses: readonly Transaction[],
  wallet: readonly UserCard[],
  overrides: readonly BucketOverride[] = [],
  catalogue: readonly CardTerms[] = CARD_CATALOGUE
): Candidate[] {
  const baseline = allocateOptimal(expenses, wallet, overrides);
  const held = new Set(wallet.map((c) => c.catalogueId));

  const out: Candidate[] = [];

  for (const card of catalogue) {
    if (held.has(card.id) || !isRecommendable(card)) continue;

    const probe: UserCard = {
      catalogueId: card.id,
      // Must be 'held': allocateOptimal prices only held or applied cards, so a
      // 'considering' probe would be filtered out and every candidate would score 0.
      status: 'held',
      isLifetimeFree: false,
      ledgerAccountLabels: [],
      params: defaultParamsFor(card),
      // A credit-limit-derived cap cannot be priced without a limit. Assume the
      // card's own minimum viable limit is unknown and leave it out: capUnits
      // returns 0, so the card is scored on its uncapped rules only. Conservative
      // by design, and the UI prompts for the limit.
    };

    const withCard = allocateOptimal(expenses, [...wallet, probe], overrides);
    const added = withCard.cards.find((c) => c.catalogueId === card.id);

    out.push({
      card,
      marginalNet: withCard.netRupees - baseline.netRupees,
      capturedSpend: added?.spend ?? 0,
      fee: added?.fee ?? card.annualFee,
      feeWaived: added?.feeWaived ?? false,
      clearsWaiver:
        card.feeWaiverSpend != null && (added?.spend ?? 0) >= card.feeWaiverSpend,
    });
  }

  return out.sort((a, b) => b.marginalNet - a.marginalNet);
}

/**
 * Optional paid add-ons default to on when pricing a card the user does not hold,
 * so a candidate is shown at the value it can actually reach. The fee for the add-on
 * is the user's call and is surfaced separately in the UI.
 */
function defaultParamsFor(card: CardTerms): Record<string, boolean> {
  const params: Record<string, boolean> = {};
  for (const rule of card.earn) {
    if (rule.requiresParam) params[rule.requiresParam] = true;
  }
  return params;
}

// ---------------------------------------------------------------------------
// "At the till" lookup
// ---------------------------------------------------------------------------

export interface TillOption {
  card: CardTerms;
  /** Headline effective rate in rupees per rupee spent. */
  rate: number;
  ruleNote?: string;
  minTxn?: number;
  /** True when this rate needs a paid add-on the user has not switched on. */
  needsParam?: string;
}

export interface TillSuggestion {
  bucket: SpendBucket;
  resolution: BucketResolution;
  addressable: boolean;
  options: TillOption[];
}

/**
 * Which card to tap for a given merchant, ranked.
 *
 * Deliberately ignores caps and running balances: at a counter you need the
 * headline answer in two seconds, not a simulation of the month so far. Caps are
 * surfaced separately on the card panels, where there is room to explain them.
 */
export function recommendCardFor(
  note: string,
  wallet: readonly UserCard[],
  overrides: readonly BucketOverride[] = []
): TillSuggestion {
  const resolution = resolveBucket(
    { category: '', subcategory: '', note },
    overrides
  );
  const bucket = resolution.bucket;
  const lower = note.toLowerCase();

  const options: TillOption[] = [];

  for (const holder of activeCards(wallet)) {
    const terms = getCard(holder.catalogueId);
    if (!terms || !isRecommendable(terms)) continue;
    if (terms.excludedBuckets.includes(bucket)) continue;

    const applicable = terms.earn
      .filter((r) => {
        if (r.merchants?.some((m) => lower.includes(m))) return true;
        if (r.buckets?.includes(bucket)) return true;
        return r.allOther === true;
      })
      .sort((a, b) => ruleSpecificity(b) - ruleSpecificity(a));

    let picked: EarnRule | undefined;
    for (const rule of applicable) {
      // A rule gated on an add-on still counts, but is flagged so the UI can say
      // "only if you subscribe" rather than quietly promising a rate.
      if (rule.requiresParam && holder.params[rule.requiresParam] !== true) {
        if (!picked) picked = rule;
        continue;
      }
      picked = rule;
      break;
    }
    if (!picked) continue;

    const gated = picked.requiresParam && holder.params[picked.requiresParam] !== true;
    const topRate = picked.tiers?.length
      ? Math.max(...picked.tiers.map((t) => t.rate))
      : picked.rate;

    options.push({
      card: terms,
      rate: topRate * terms.rewardValue,
      ruleNote: picked.note,
      minTxn: picked.minTxn,
      needsParam: gated ? picked.requiresParam : undefined,
    });
  }

  options.sort((a, b) => b.rate - a.rate);

  return { bucket, resolution, addressable: isAddressable(bucket), options };
}
