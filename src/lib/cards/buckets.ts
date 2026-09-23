/**
 * Spend buckets: the vocabulary card terms are written in.
 *
 * Card issuers describe earn rates in merchant-category language ("10% on dining,
 * grocery and utilities"). A ledger describes spend in whatever language its owner
 * chose ("🍜 Food / Snacks"). This module is the translation layer between them, so
 * the card engine never has to know about one user's category names.
 *
 * Resolution is tiered, first match wins:
 *   1. user override   (confirmed by the user, highest trust)
 *   2. note pattern    (the Note column holds the merchant, so this is best signal)
 *   3. subcategory
 *   4. category
 *   5. default         (offline_retail)
 *
 * Anything resolved below `REVIEW_THRESHOLD` is flagged for review rather than
 * silently trusted. See the Friend/Family note on FALLBACK_SUBCATEGORY_RULES.
 */

import type { Transaction } from '@/lib/types';

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const SPEND_BUCKETS = [
  'dining',
  'food_delivery',
  'quick_commerce',
  'groceries',
  'online_shopping',
  'travel_flight',
  'travel_hotel',
  'cabs',
  'fuel',
  'utilities',
  'telecom',
  'entertainment',
  'health',
  'offline_retail',
  'education',
  'insurance',
  'rent',
  'investment',
  'transfer',
  'government',
] as const;

export type SpendBucket = (typeof SPEND_BUCKETS)[number];

/**
 * Buckets no credit card can earn on. Separating these is what turns a total
 * outflow into an *addressable* base. Without it the engine recommends cards
 * against money they could never capture.
 *
 * `fuel` is deliberately NOT here: you can swipe for fuel, you just earn nothing.
 * That is an exclusion on each card, not a property of the spend.
 */
export const NON_ADDRESSABLE_BUCKETS: ReadonlySet<SpendBucket> = new Set([
  'rent',
  'investment',
  'transfer',
  'government',
]);

export function isAddressable(bucket: SpendBucket): boolean {
  return !NON_ADDRESSABLE_BUCKETS.has(bucket);
}

/**
 * Buckets typically paid by scanning a UPI QR at a physical merchant.
 *
 * This is a heuristic about *how* a bucket is usually paid, not a hard property.
 * It matters because RuPay-on-UPI cards reach merchants that take no plastic,
 * which for UPI-heavy spenders is the single largest source of missed rewards.
 */
export const UPI_SCAN_PAY_BUCKETS: ReadonlySet<SpendBucket> = new Set([
  'dining',
  'offline_retail',
  'cabs',
  'entertainment',
  'groceries',
  'health',
]);

export const BUCKET_LABELS: Record<SpendBucket, string> = {
  dining: 'Dining out',
  food_delivery: 'Food delivery',
  quick_commerce: 'Quick commerce',
  groceries: 'Groceries',
  online_shopping: 'Online shopping',
  travel_flight: 'Flights',
  travel_hotel: 'Hotels and stays',
  cabs: 'Cabs and local transport',
  fuel: 'Fuel',
  utilities: 'Utilities and subscriptions',
  telecom: 'Telecom',
  entertainment: 'Entertainment',
  health: 'Health and fitness',
  offline_retail: 'Offline retail',
  education: 'Education',
  insurance: 'Insurance',
  rent: 'Rent',
  investment: 'Investments',
  transfer: 'Transfers to people',
  government: 'Government and tax',
};

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface BucketOverride {
  /** Lowercased substring matched against the Note column. */
  pattern: string;
  bucket: SpendBucket;
}

export type ResolvedVia = 'override' | 'note' | 'subcategory' | 'category' | 'default';

export interface BucketResolution {
  bucket: SpendBucket;
  via: ResolvedVia;
  confidence: number;
  /** True when the resolution is weak enough that the user should confirm it. */
  needsReview: boolean;
}

const CONFIDENCE: Record<ResolvedVia, number> = {
  override: 1.0,
  note: 0.9,
  subcategory: 0.7,
  category: 0.5,
  default: 0.2,
};

export const REVIEW_THRESHOLD = 0.7;

/**
 * Subcategories that describe WHO a spend was for, not WHAT it was.
 *
 * People routinely tag a real merchant purchase this way when they intend to be
 * reimbursed, so resolving them to `transfer` is a guess. They resolve at reduced
 * confidence and therefore always reach the review queue, rather than being quietly
 * dropped from the addressable base.
 *
 * This is not hypothetical: on the ledger this module was built against, Rs 59,611
 * of genuine e-commerce spend was tagged Friend or Family for reimbursement
 * tracking. Silently excluding it understated the addressable base by that much.
 */
export const AMBIGUOUS_SUBCATEGORIES: ReadonlySet<string> = new Set([
  'friend',
  'family',
  'split',
  'other',
]);

/** Confidence used for a subcategory hit that is ambiguous by nature. */
const AMBIGUOUS_CONFIDENCE = 0.55;

/**
 * Note-pattern rules. Order matters: the first entry whose pattern appears in the
 * note wins, so narrower patterns must precede broader ones.
 *
 * "swiggy instamart" must beat "swiggy", or every Instamart order lands in
 * food_delivery and the quick-commerce rate on it is never applied.
 */
export const NOTE_RULES: ReadonlyArray<readonly [string, SpendBucket]> = [
  // Quick commerce before food delivery (substring collision on "swiggy").
  ['swiggy instamart', 'quick_commerce'],
  ['instamart', 'quick_commerce'],
  ['zepto cafe', 'food_delivery'],
  ['zepto', 'quick_commerce'],
  ['blinkit', 'quick_commerce'],
  ['grofers', 'quick_commerce'],
  ['dunzo', 'quick_commerce'],
  ['bigbasket', 'quick_commerce'],
  ['flipkart minutes', 'quick_commerce'],
  ['amazon now', 'quick_commerce'],

  // Food delivery and dining
  ['swiggy dineout', 'dining'],
  ['swiggy', 'food_delivery'],
  ['zomato', 'food_delivery'],
  ['eatsure', 'food_delivery'],
  ['dominos', 'food_delivery'],
  ['mcdonald', 'dining'],
  ['starbucks', 'dining'],
  ['third wave', 'dining'],
  ['barbeque nation', 'dining'],

  // Online shopping. Amazon Pay handled before amazon for wallet loads.
  ['amazon pay', 'transfer'],
  ['amazon', 'online_shopping'],
  ['myntra', 'online_shopping'],
  ['flipkart', 'online_shopping'],
  ['ajio', 'online_shopping'],
  ['nykaa', 'online_shopping'],
  ['meesho', 'online_shopping'],
  ['snitch', 'online_shopping'],
  ['tatacliq', 'online_shopping'],
  ['tata cliq', 'online_shopping'],
  ['decathlon', 'offline_retail'],
  ['croma', 'offline_retail'],
  ['reliance digital', 'offline_retail'],
  ['ikea', 'offline_retail'],
  ['rentomojo', 'offline_retail'],
  ['furlenco', 'offline_retail'],

  // Travel. OTAs default to flight; a hotel booked on an OTA needs an override.
  ['makemytrip', 'travel_flight'],
  ['cleartrip', 'travel_flight'],
  ['goibibo', 'travel_flight'],
  ['ixigo', 'travel_flight'],
  ['yatra', 'travel_flight'],
  ['easemytrip', 'travel_flight'],
  ['indigo', 'travel_flight'],
  ['vistara', 'travel_flight'],
  ['akasa', 'travel_flight'],
  ['air india', 'travel_flight'],
  ['spicejet', 'travel_flight'],
  ['flight', 'travel_flight'],
  ['airbnb', 'travel_hotel'],
  ['oyo', 'travel_hotel'],
  ['marriott', 'travel_hotel'],
  ['hotel', 'travel_hotel'],
  ['resort', 'travel_hotel'],
  ['hostel', 'travel_hotel'],
  ['booking.com', 'travel_hotel'],
  ['agoda', 'travel_hotel'],

  // Transport
  ['uber', 'cabs'],
  ['ola', 'cabs'],
  ['rapido', 'cabs'],
  ['namma yatri', 'cabs'],
  ['blusmart', 'cabs'],
  ['irctc', 'travel_flight'],
  ['redbus', 'cabs'],
  ['bus', 'cabs'],
  ['metro', 'cabs'],
  ['train', 'travel_flight'],

  // Fuel. Before generic retail so "hp petrol" does not fall through.
  ['petrol', 'fuel'],
  ['diesel', 'fuel'],
  ['fuel', 'fuel'],
  ['indian oil', 'fuel'],
  ['bharat petroleum', 'fuel'],
  ['hindustan petroleum', 'fuel'],

  // Utilities and subscriptions. Streaming sits in utilities because that is the
  // band issuers put it in, which is what the earn rules key off.
  ['netflix', 'utilities'],
  ['spotify', 'utilities'],
  ['hotstar', 'utilities'],
  ['prime membership', 'utilities'],
  ['youtube premium', 'utilities'],
  ['apple subscription', 'utilities'],
  ['electricity', 'utilities'],
  ['bescom', 'utilities'],
  ['broadband', 'utilities'],
  ['wifi', 'utilities'],
  ['gas cylinder', 'utilities'],
  ['water bill', 'utilities'],
  ['maintenance', 'utilities'],

  // Telecom
  ['airtel', 'telecom'],
  ['jio', 'telecom'],
  ['vodafone', 'telecom'],
  ['bsnl', 'telecom'],
  ['recharge', 'telecom'],

  // Health
  ['cult', 'health'],
  ['cure.fit', 'health'],
  ['gym', 'health'],
  ['pharmeasy', 'health'],
  ['apollo', 'health'],
  ['1mg', 'health'],
  ['netmeds', 'health'],
  ['pharmacy', 'health'],
  ['hospital', 'health'],
  ['clinic', 'health'],
  ['diagnostic', 'health'],

  // Entertainment
  ['bookmyshow', 'entertainment'],
  ['pvr', 'entertainment'],
  ['inox', 'entertainment'],
  ['district', 'entertainment'],

  // Non-addressable. Domestic staff are paid person to person, not a merchant,
  // so they belong in transfer rather than falling through to offline_retail.
  ['cook', 'transfer'],
  ['maid', 'transfer'],
  ['domestic help', 'transfer'],
  ['house help', 'transfer'],
  ['rent', 'rent'],
  ['landlord', 'rent'],
  ['zerodha', 'investment'],
  ['groww', 'investment'],
  ['upstox', 'investment'],
  ['coinswitch', 'investment'],
  ['coindcx', 'investment'],
  ['indmoney', 'investment'],
  ['mutual fund', 'investment'],
  ['nifty', 'investment'],
  ['etf', 'investment'],
  ['sip', 'investment'],
  ['lic', 'insurance'],
  ['insurance', 'insurance'],
  ['premium', 'insurance'],
  ['income tax', 'government'],
  ['gst', 'government'],
  ['challan', 'government'],
  ['passport', 'government'],
  ['udemy', 'education'],
  ['coursera', 'education'],
  ['tuition', 'education'],
];

/**
 * Subcategory rules. Keys are lowercased.
 *
 * Friend and Family map to `transfer` but land under REVIEW_THRESHOLD on purpose.
 * People routinely tag a real merchant purchase with who it was for, so this tier
 * is a guess, not a fact. Flagging it sends those rows to the review queue instead
 * of silently deleting them from the addressable base, which would understate the
 * opportunity. Note patterns still override this when a merchant is recognisable.
 */
export const SUBCATEGORY_RULES: Readonly<Record<string, SpendBucket>> = {
  rent: 'rent',
  deposit: 'rent',
  sip: 'investment',
  ipo: 'investment',
  esop: 'investment',
  stocks: 'investment',
  crypto: 'investment',
  wallet: 'investment',
  policy: 'insurance',
  friend: 'transfer',
  family: 'transfer',
  split: 'transfer',
  flight: 'travel_flight',
  hotel: 'travel_hotel',
  groceries: 'groceries',
  dinner: 'dining',
  lunch: 'dining',
  breakfast: 'dining',
  beverages: 'dining',
  snacks: 'dining',
  'eating out': 'dining',
  'quick commerce': 'quick_commerce',
  petrol: 'fuel',
  bike: 'offline_retail',
  car: 'cabs',
  auto: 'cabs',
  taxi: 'cabs',
  bus: 'cabs',
  recharge: 'telecom',
  'data addon': 'telecom',
  movie: 'entertainment',
  music: 'utilities',
  concert: 'entertainment',
  games: 'entertainment',
  club: 'entertainment',
  party: 'entertainment',
  gym: 'health',
  medicine: 'health',
  clinic: 'health',
  tests: 'health',
  appliances: 'offline_retail',
  furniture: 'offline_retail',
  kitchen: 'offline_retail',
  utensils: 'offline_retail',
  toiletries: 'offline_retail',
  cleaning: 'offline_retail',
  decor: 'offline_retail',
  shoes: 'online_shopping',
  clothing: 'online_shopping',
  fashion: 'online_shopping',
  watch: 'online_shopping',
  cosmetics: 'online_shopping',
  perfume: 'online_shopping',
  accessories: 'online_shopping',
  'e-commerce': 'online_shopping',
  academy: 'education',
};

/** Category rules. Coarse fallback, so confidence is low by construction. */
export const CATEGORY_RULES: Readonly<Record<string, SpendBucket>> = {
  '📈investment': 'investment',
  '🍜 food': 'dining',
  '🚖 transport': 'cabs',
  '🗺️ travel': 'travel_hotel',
  '🧥 shopping': 'online_shopping',
  '🪑 household': 'offline_retail',
  '👬🏻 social life': 'transfer',
  'fun & activities': 'entertainment',
  '🖼 culture': 'entertainment',
  '🧘🏼 health': 'health',
  '💄 beauty': 'online_shopping',
  '📱phone': 'telecom',
  '📙 education': 'education',
  '🎁 gift': 'online_shopping',
  haircut: 'offline_retail',
  taxes: 'government',
  '🏦 bank': 'government',
};

export const DEFAULT_BUCKET: SpendBucket = 'offline_retail';

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export function resolveBucket(
  txn: Pick<Transaction, 'category' | 'subcategory' | 'note'>,
  overrides: readonly BucketOverride[] = []
): BucketResolution {
  const note = (txn.note ?? '').toLowerCase().trim();
  const sub = (txn.subcategory ?? '').toLowerCase().trim();
  const cat = (txn.category ?? '').toLowerCase().trim();

  for (const o of overrides) {
    if (o.pattern && note.includes(o.pattern.toLowerCase())) {
      return settle(o.bucket, 'override');
    }
  }

  if (note) {
    for (const [pattern, bucket] of NOTE_RULES) {
      if (note.includes(pattern)) return settle(bucket, 'note');
    }
  }

  if (sub && sub in SUBCATEGORY_RULES) {
    return settle(
      SUBCATEGORY_RULES[sub],
      'subcategory',
      AMBIGUOUS_SUBCATEGORIES.has(sub) ? AMBIGUOUS_CONFIDENCE : undefined
    );
  }

  if (cat && cat in CATEGORY_RULES) {
    return settle(CATEGORY_RULES[cat], 'category');
  }

  return settle(DEFAULT_BUCKET, 'default');
}

function settle(
  bucket: SpendBucket,
  via: ResolvedVia,
  confidenceOverride?: number
): BucketResolution {
  const confidence = confidenceOverride ?? CONFIDENCE[via];
  return { bucket, via, confidence, needsReview: confidence < REVIEW_THRESHOLD };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface BucketTotal {
  bucket: SpendBucket;
  total: number;
  count: number;
  /** Spend whose resolution was weak enough to warrant a user check. */
  lowConfidenceTotal: number;
  /** Distinct ledger accounts this bucket was paid from, for leakage analysis. */
  accounts: Record<string, number>;
}

export interface BucketBreakdown {
  totals: Record<SpendBucket, BucketTotal>;
  addressableTotal: number;
  nonAddressableTotal: number;
  reviewQueue: ReviewItem[];
}

export interface ReviewItem {
  note: string;
  category: string;
  subcategory: string;
  total: number;
  count: number;
  resolution: BucketResolution;
}

export function computeBucketBreakdown(
  expenses: readonly Transaction[],
  overrides: readonly BucketOverride[] = []
): BucketBreakdown {
  const totals = {} as Record<SpendBucket, BucketTotal>;
  for (const b of SPEND_BUCKETS) {
    totals[b] = { bucket: b, total: 0, count: 0, lowConfidenceTotal: 0, accounts: {} };
  }

  const review = new Map<string, ReviewItem>();

  for (const txn of expenses) {
    const res = resolveBucket(txn, overrides);
    const t = totals[res.bucket];
    const amount = txn.amount ?? 0;

    t.total += amount;
    t.count += 1;
    t.accounts[txn.account] = (t.accounts[txn.account] ?? 0) + amount;

    if (res.needsReview) {
      t.lowConfidenceTotal += amount;
      const key = `${txn.category}|${txn.subcategory}|${txn.note}`;
      const existing = review.get(key);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        review.set(key, {
          note: txn.note,
          category: txn.category,
          subcategory: txn.subcategory,
          total: amount,
          count: 1,
          resolution: res,
        });
      }
    }
  }

  let addressableTotal = 0;
  let nonAddressableTotal = 0;
  for (const b of SPEND_BUCKETS) {
    if (isAddressable(b)) addressableTotal += totals[b].total;
    else nonAddressableTotal += totals[b].total;
  }

  return {
    totals,
    addressableTotal,
    nonAddressableTotal,
    reviewQueue: [...review.values()].sort((a, b) => b.total - a.total),
  };
}
