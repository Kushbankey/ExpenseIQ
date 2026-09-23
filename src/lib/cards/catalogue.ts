/**
 * Card catalogue: product reference data.
 *
 * These are public facts about cards that exist in the market, not facts about any
 * user, so the file is safe to commit. Nothing here is derived from a ledger.
 *
 * Two depths:
 *   - `full`    complete earn rules, priced by the engine, recommendable
 *   - `outline` headline text only, `earn: []`, NEVER priced or recommended
 *
 * An outline card exists so planning mode can show that a card is out there without
 * pretending to precision it does not have. Promoting one to `full` means reading the
 * issuer's current terms and filling in `earn`, then setting `verifiedOn`.
 *
 * Terms devalue constantly. Four of the ten full-depth cards here changed within
 * eighteen months, so `verifiedOn` is load-bearing: see `isStale` and `isRecommendable`.
 */

import type { SpendBucket } from './buckets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CardNetwork = 'visa' | 'mastercard' | 'rupay' | 'diners' | 'amex';
export type CardRail = 'card' | 'upi';
export type RewardUnit = 'cashback' | 'points' | 'miles';
export type CapPeriod = 'month' | 'quarter' | 'year';
export type CatalogueDepth = 'full' | 'outline';

/**
 * A cap expressed in reward units, not rupees, because that is how issuers write
 * them ("2,500 reward points per month"). For a cashback card one unit is one rupee,
 * so the two coincide.
 */
export type RewardCap =
  | { basis: 'fixed'; units: number; period: CapPeriod }
  /** Kiwi caps monthly cashback at a percentage of the holder's credit limit. */
  | { basis: 'creditLimitPct'; pct: number; period: CapPeriod };

/** A rate that steps up as cumulative annual spend on the card crosses thresholds. */
export interface RateTier {
  /** Cumulative spend on this card, in the period, at or above which the rate applies. */
  fromCumulative: number;
  /** Reward units per rupee spent. */
  rate: number;
}

export interface EarnRule {
  /** Buckets this rule applies to. Omit with `merchants` set, or use `allOther`. */
  buckets?: SpendBucket[];
  /** Lowercased merchant substrings, matched against the note. Beats bucket rules. */
  merchants?: string[];
  /** Catch-all: applies to any addressable bucket not claimed by a narrower rule. */
  allOther?: boolean;
  /** Reward units per rupee. 0.05 on a cashback card is 5%. */
  rate: number;
  /** Replaces `rate` when the rate steps with cumulative spend. */
  tiers?: RateTier[];
  cap?: RewardCap;
  /** Rules sharing a pool id share one cap. */
  capPool?: string;
  /** Transactions below this amount earn nothing under this rule. */
  minTxn?: number;
  /**
   * Earning base is rounded down to a multiple of this before the rate applies.
   * Kiwi accrues only in multiples of Rs 100, which is a real haircut on small
   * tickets: a Rs 180 payment earns on Rs 100.
   */
  roundDownTo?: number;
  /** Key in `UserCard.params` that must be true for this rule to apply. */
  requiresParam?: string;
  note?: string;
}

export interface LoungeBenefit {
  domestic?: number;
  international?: number;
  period: CapPeriod;
  /** Spend in the preceding period that unlocks it. Absent means unconditional. */
  spendTrigger?: number;
}

export interface CardTerms {
  id: string;
  issuer: string;
  name: string;
  network: CardNetwork;
  /** A RuPay card on UPI reaches merchants that accept no plastic. */
  rails: CardRail[];
  depth: CatalogueDepth;

  joiningFee: number;
  annualFee: number;
  feeWaiverSpend?: number;

  rewardUnit: RewardUnit;
  /** Rupees per reward unit at CASH redemption. The basis the engine prices on. */
  rewardValue: number;
  /** Rupees per unit at the best realistic redemption. Display only, never priced. */
  rewardValueBest?: number;
  rewardValueBestLabel?: string;

  earn: EarnRule[];
  excludedBuckets: SpendBucket[];

  lounge?: LoungeBenefit;
  milestones?: { spend: number; period: CapPeriod; reward: string }[];

  /** One line for outline cards, shown instead of computed value. */
  headline?: string;

  validFrom: string;
  validTo?: string;
  sourceUrl: string;
  /** null means never verified. Such a card can never be recommended. */
  verifiedOn: string | null;
  notes?: string[];
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export const STALE_AFTER_DAYS = 180;

export function isStale(card: CardTerms, asOf: Date = new Date()): boolean {
  if (!card.verifiedOn) return true;
  const age = (asOf.getTime() - new Date(card.verifiedOn).getTime()) / 86_400_000;
  return age > STALE_AFTER_DAYS;
}

export function isExpired(card: CardTerms, asOf: Date = new Date()): boolean {
  return !!card.validTo && new Date(card.validTo) < asOf;
}

/**
 * The single gate the engine must respect. An outline card, a stale card or a card
 * whose terms have lapsed is shown to the user but never priced into a recommendation.
 * Silent staleness is the main way a model like this goes quietly wrong.
 */
export function isRecommendable(card: CardTerms, asOf: Date = new Date()): boolean {
  return (
    card.depth === 'full' &&
    card.earn.length > 0 &&
    !isStale(card, asOf) &&
    !isExpired(card, asOf)
  );
}

export function effectiveRate(card: CardTerms, rule: EarnRule): number {
  return rule.rate * card.rewardValue;
}

/**
 * Display name that does not repeat itself.
 *
 * Several cards carry their issuer inside their own name ("Cashback SBI Card",
 * "Swiggy HDFC Bank"), so a naive `issuer + name` renders "SBI Card Cashback SBI Card".
 */
export function cardLabel(card: CardTerms): string {
  const issuerHead = card.issuer.split(/[\s/]+/)[0].toLowerCase();
  return card.name.toLowerCase().includes(issuerHead)
    ? card.name
    : `${card.issuer} ${card.name}`;
}

// ---------------------------------------------------------------------------
// Full-depth cards. Terms read from issuer and review sources on 2026-09-23.
// ---------------------------------------------------------------------------

const VERIFIED = '2026-09-23';

export const FULL_DEPTH_CARDS: CardTerms[] = [
  {
    id: 'hdfc-diners-club-privilege',
    issuer: 'HDFC Bank',
    name: 'Diners Club Privilege',
    network: 'diners',
    rails: ['card'],
    depth: 'full',
    joiningFee: 1000,
    annualFee: 1000,
    feeWaiverSpend: 300000,
    rewardUnit: 'points',
    rewardValue: 0.2,
    rewardValueBest: 0.5,
    rewardValueBestLabel: 'SmartBuy flights and hotels',
    earn: [
      {
        buckets: ['food_delivery'],
        merchants: ['swiggy', 'zomato'],
        rate: 0.1, // 5X = 20 RP per 200 = 10 RP per 100
        cap: { basis: 'fixed', units: 2500, period: 'month' },
        capPool: 'dcp-accelerated',
        note: '5X on Swiggy and Zomato',
      },
      { allOther: true, rate: 0.02 }, // 4 RP per 200, cut from 4 per 150 on 15-May-2026
    ],
    excludedBuckets: ['fuel', 'rent', 'transfer', 'investment', 'government'],
    lounge: { domestic: 2, international: 1, period: 'quarter', spendTrigger: 60000 },
    milestones: [{ spend: 150000, period: 'quarter', reward: 'Voucher worth Rs 1,500' }],
    validFrom: '2026-05-15',
    sourceUrl: 'https://cardinsider.com/hdfc-bank/hdfc-diners-club-privilege-credit-card/',
    verifiedOn: VERIFIED,
    notes: [
      'Base rate cut from 4 points per Rs 150 to 4 per Rs 200 on 15-May-2026.',
      'Lounge access became spend-gated on 01-Jul-2026; vouchers generated via SmartBuy.',
      'Often held lifetime free. Set is_lifetime_free on the wallet row to zero the fee.',
    ],
  },

  {
    id: 'hdfc-swiggy',
    issuer: 'HDFC Bank',
    name: 'Swiggy HDFC Bank',
    network: 'mastercard',
    rails: ['card'],
    depth: 'full',
    joiningFee: 500,
    annualFee: 500,
    feeWaiverSpend: 200000,
    rewardUnit: 'cashback',
    rewardValue: 1,
    earn: [
      {
        buckets: ['food_delivery', 'quick_commerce'],
        merchants: ['swiggy', 'instamart', 'dineout', 'genie'],
        rate: 0.1,
        cap: { basis: 'fixed', units: 1500, period: 'month' },
        capPool: 'swiggy-app',
        minTxn: 249,
        note: 'Swiggy app. Minimum Rs 249 per transaction since 21-Apr-2026.',
      },
      {
        // A fixed MCC list, not all online spend. Groceries and gift cards excluded.
        buckets: ['online_shopping', 'entertainment', 'cabs', 'health', 'offline_retail'],
        rate: 0.05,
        cap: { basis: 'fixed', units: 1500, period: 'month' },
        capPool: 'swiggy-online',
        note: 'Apparel, electronics, entertainment, home decor, department stores, personal care, medical, local cabs',
      },
      { allOther: true, rate: 0.01, cap: { basis: 'fixed', units: 500, period: 'month' } },
    ],
    excludedBuckets: ['fuel', 'rent', 'transfer', 'investment', 'government', 'groceries'],
    validFrom: '2026-04-21',
    sourceUrl: 'https://cardinsider.com/hdfc-bank/swiggy-hdfc-bank-credit-card/',
    verifiedOn: VERIFIED,
  },

  {
    id: 'hsbc-live-plus',
    issuer: 'HSBC',
    name: 'Live+',
    network: 'visa',
    rails: ['card'],
    depth: 'full',
    joiningFee: 999,
    annualFee: 999,
    feeWaiverSpend: 200000,
    rewardUnit: 'cashback',
    rewardValue: 1,
    earn: [
      {
        buckets: ['dining', 'food_delivery', 'quick_commerce', 'groceries', 'utilities'],
        rate: 0.1,
        cap: { basis: 'fixed', units: 1200, period: 'month' },
        capPool: 'hsbc-accelerated',
        note: 'Amazon, Flipkart and Myntra are excluded from 10% and earn the 1.5% base',
      },
      { allOther: true, rate: 0.015 },
    ],
    excludedBuckets: ['fuel', 'rent', 'insurance', 'education', 'government', 'transfer', 'investment'],
    lounge: { domestic: 2, international: 1, period: 'year' },
    validFrom: '2026-01-01',
    sourceUrl: 'https://www.hsbc.bank.in/credit-cards/products/live-plus/',
    verifiedOn: VERIFIED,
    notes: ['Available in 20 cities. Requires Rs 6L annual income for salaried applicants.'],
  },

  {
    id: 'sbi-cashback',
    issuer: 'SBI Card',
    name: 'Cashback SBI Card',
    network: 'visa',
    rails: ['card'],
    depth: 'full',
    joiningFee: 999,
    annualFee: 999,
    feeWaiverSpend: 200000,
    rewardUnit: 'cashback',
    rewardValue: 1,
    earn: [
      {
        buckets: [
          'online_shopping', 'food_delivery', 'quick_commerce',
          'travel_flight', 'travel_hotel', 'entertainment', 'health', 'cabs',
        ],
        rate: 0.05,
        cap: { basis: 'fixed', units: 2000, period: 'month' },
        capPool: 'sbi-online',
      },
      {
        buckets: ['dining', 'offline_retail', 'groceries'],
        rate: 0.01,
        cap: { basis: 'fixed', units: 2000, period: 'month' },
        capPool: 'sbi-offline',
      },
    ],
    excludedBuckets: [
      'utilities', 'telecom', 'fuel', 'insurance', 'education',
      'government', 'rent', 'transfer', 'investment',
    ],
    validFrom: '2026-04-01',
    sourceUrl: 'https://www.sbicard.com/sbi-card-en/assets/docs/pdf/cashback-revised.pdf',
    verifiedOn: VERIFIED,
    notes: ['Devalued 01-Apr-2026: caps tightened, gaming, tolls and government added to exclusions.'],
  },

  {
    id: 'kiwi-rupay',
    issuer: 'Kiwi',
    name: 'Kiwi RuPay',
    network: 'rupay',
    rails: ['card', 'upi'],
    depth: 'full',
    joiningFee: 0,
    annualFee: 0,
    rewardUnit: 'cashback',
    rewardValue: 1,
    earn: [
      {
        buckets: ['dining', 'offline_retail', 'cabs', 'entertainment', 'groceries', 'health'],
        rate: 0.05,
        tiers: [
          { fromCumulative: 0, rate: 0.02 },
          { fromCumulative: 50000, rate: 0.03 },
          { fromCumulative: 100000, rate: 0.04 },
          { fromCumulative: 150000, rate: 0.05 },
        ],
        cap: { basis: 'creditLimitPct', pct: 0.01, period: 'month' },
        capPool: 'kiwi',
        requiresParam: 'neonSubscribed',
        minTxn: 100,
        roundDownTo: 100,
        note: 'Kiwi Neon, Rs 999 a year. Tiers step with cumulative annual UPI spend.',
      },
      {
        buckets: ['dining', 'offline_retail', 'cabs', 'entertainment', 'groceries', 'health'],
        rate: 0.015,
        cap: { basis: 'creditLimitPct', pct: 0.01, period: 'month' },
        capPool: 'kiwi',
        minTxn: 100,
        roundDownTo: 100,
        note: 'Base Scan and Pay rate without Neon',
      },
      {
        allOther: true,
        rate: 0.005,
        cap: { basis: 'creditLimitPct', pct: 0.01, period: 'month' },
        capPool: 'kiwi',
        minTxn: 100,
        roundDownTo: 100,
      },
    ],
    excludedBuckets: [
      'telecom', 'utilities', 'fuel', 'rent', 'insurance',
      'education', 'government', 'transfer', 'investment',
    ],
    validFrom: '2025-06-01',
    sourceUrl: 'https://cardmaven.in/kiwi-rupay-credit-card-review/',
    verifiedOn: VERIFIED,
    notes: [
      'Issued by Yes Bank, PNB or AU Small Finance. Older cards sit on Axis.',
      'Runs on UPI, so it reaches QR merchants that accept no plastic.',
      'Cashback caps at 1% of credit limit per month. Set credit_limit on the wallet row.',
      'Rewards accrue only in multiples of Rs 100. Person to person UPI does not earn.',
    ],
  },

  {
    id: 'axis-flipkart',
    issuer: 'Axis Bank',
    name: 'Flipkart Axis Bank',
    network: 'mastercard',
    rails: ['card'],
    depth: 'full',
    joiningFee: 500,
    annualFee: 500,
    feeWaiverSpend: 350000,
    rewardUnit: 'cashback',
    rewardValue: 1,
    earn: [
      {
        merchants: ['myntra'],
        rate: 0.075,
        cap: { basis: 'fixed', units: 4000, period: 'quarter' },
        capPool: 'fk-myntra',
        note: 'Raised from 1% on 20-Jun-2025',
      },
      {
        merchants: ['flipkart'],
        rate: 0.05,
        cap: { basis: 'fixed', units: 4000, period: 'quarter' },
        capPool: 'fk-flipkart',
      },
      {
        merchants: ['cleartrip'],
        rate: 0.05,
        cap: { basis: 'fixed', units: 4000, period: 'quarter' },
        capPool: 'fk-cleartrip',
      },
      {
        merchants: ['swiggy', 'uber', 'pvr', 'cult'],
        rate: 0.04,
        note: 'Preferred partners',
      },
      { allOther: true, rate: 0.01 },
    ],
    excludedBuckets: ['fuel', 'rent', 'transfer', 'investment', 'government'],
    validFrom: '2025-06-20',
    sourceUrl: 'https://1finance.co.in/blog/flipkart-axis-bank-credit-card-review-2026/',
    verifiedOn: VERIFIED,
    notes: ['Domestic lounge access discontinued. First-year-free offer expired 31-Jul-2026.'],
  },

  {
    id: 'icici-amazon-pay',
    issuer: 'ICICI Bank',
    name: 'Amazon Pay ICICI',
    network: 'visa',
    rails: ['card'],
    depth: 'full',
    joiningFee: 0,
    annualFee: 0,
    rewardUnit: 'cashback',
    rewardValue: 1,
    earn: [
      { merchants: ['amazon'], rate: 0.05, requiresParam: 'amazonPrime', note: 'Prime members' },
      { merchants: ['amazon'], rate: 0.03, note: 'Without Prime' },
      { merchants: ['swiggy', 'zomato', 'uber', 'bookmyshow'], rate: 0.02 },
      { allOther: true, rate: 0.01 },
    ],
    excludedBuckets: ['fuel', 'rent', 'education', 'transfer', 'investment', 'government'],
    validFrom: '2025-10-01',
    sourceUrl: 'https://cardinsider.com/icici-bank/amazon-pay-icici-bank-credit-card/',
    verifiedOn: VERIFIED,
    notes: ['Lifetime free. Forex markup cut to 1.99% in Oct-2025.'],
  },

  {
    id: 'hdfc-regalia-gold',
    issuer: 'HDFC Bank',
    name: 'Regalia Gold',
    network: 'visa',
    rails: ['card'],
    depth: 'full',
    joiningFee: 2500,
    annualFee: 2500,
    feeWaiverSpend: 400000,
    rewardUnit: 'points',
    rewardValue: 0.2,
    rewardValueBest: 0.5,
    rewardValueBestLabel: 'SmartBuy flights and hotels',
    earn: [
      {
        merchants: ['myntra', 'nykaa', 'reliance digital', 'marks & spencer'],
        rate: 0.125, // 5X = 25 RP per 200
        cap: { basis: 'fixed', units: 5000, period: 'month' },
        capPool: 'rg-5x',
      },
      { allOther: true, rate: 0.025 }, // 5 RP per 200, cut from 4 per 150 on 15-May-2026
    ],
    excludedBuckets: ['fuel', 'rent', 'transfer', 'investment', 'government'],
    lounge: { domestic: 3, period: 'quarter', spendTrigger: 60000 },
    validFrom: '2026-05-15',
    sourceUrl: 'https://www.paisabazaar.com/hdfc-bank/hdfc-regalia-gold-credit-card/',
    verifiedOn: VERIFIED,
    notes: [
      'Base cut from 4 points per Rs 150 to 5 per Rs 200 on 15-May-2026.',
      'Lounges spend-gated from 01-Jul-2026. SmartBuy brand vouchers capped at 3,000 points a month.',
      'Upgrading a lifetime-free card to this forfeits the LTF status permanently.',
    ],
  },

  {
    id: 'axis-atlas',
    issuer: 'Axis Bank',
    name: 'Atlas',
    network: 'visa',
    rails: ['card'],
    depth: 'full',
    joiningFee: 5000,
    annualFee: 5000,
    rewardUnit: 'miles',
    rewardValue: 0.2,
    rewardValueBest: 1.0,
    rewardValueBestLabel: 'Airline and hotel transfer partners',
    earn: [
      {
        buckets: ['travel_flight', 'travel_hotel'],
        rate: 0.05, // 5 EDGE Miles per 100
        note: 'Travel EDGE portal, direct airline and direct hotel. Rs 2L per month ceiling.',
      },
      { allOther: true, rate: 0.02 },
    ],
    excludedBuckets: ['fuel', 'rent', 'transfer', 'investment', 'government'],
    milestones: [{ spend: 300000, period: 'year', reward: '2,500 EDGE Miles (Silver tier)' }],
    validFrom: '2026-04-01',
    sourceUrl: 'https://www.paisabazaar.com/axis-bank/atlas-credit-card/',
    verifiedOn: VERIFIED,
    notes: ['Devalued April 2026. Value depends almost entirely on transfer partners, not cash.'],
  },

  {
    id: 'amex-platinum-travel',
    issuer: 'American Express',
    name: 'Platinum Travel',
    network: 'amex',
    rails: ['card'],
    depth: 'full',
    joiningFee: 5000,
    annualFee: 5000,
    rewardUnit: 'points',
    rewardValue: 0.25,
    rewardValueBest: 0.5,
    rewardValueBestLabel: 'Travel vouchers at milestone thresholds',
    earn: [{ allOther: true, rate: 0.01 }],
    excludedBuckets: ['fuel', 'rent', 'insurance', 'transfer', 'investment', 'government'],
    lounge: { domestic: 2, period: 'quarter', spendTrigger: 100000 },
    milestones: [
      { spend: 190000, period: 'year', reward: '7,500 bonus MR points' },
      { spend: 400000, period: 'year', reward: '10,000 bonus MR points' },
      { spend: 700000, period: 'year', reward: 'Taj voucher worth Rs 20,000' },
    ],
    validFrom: '2026-10-01',
    sourceUrl: 'https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/',
    verifiedOn: VERIFIED,
    notes: [
      'Taj voucher threshold raised from Rs 4L to Rs 7L.',
      'From 01-Oct-2026 lounge access needs Rs 1L quarterly spend.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Outline cards. Headline text only. `earn: []` and `verifiedOn: null` mean these
// can never be priced or recommended until someone reads the current terms and
// promotes them to full depth.
// ---------------------------------------------------------------------------

function outline(
  id: string,
  issuer: string,
  name: string,
  network: CardNetwork,
  rails: CardRail[],
  annualFee: number,
  headline: string,
  sourceUrl: string
): CardTerms {
  return {
    id, issuer, name, network, rails,
    depth: 'outline',
    joiningFee: annualFee,
    annualFee,
    rewardUnit: 'points',
    rewardValue: 0,
    earn: [],
    excludedBuckets: [],
    headline,
    validFrom: '2026-01-01',
    sourceUrl,
    verifiedOn: null,
  };
}

export const OUTLINE_CARDS: CardTerms[] = [
  // RuPay on UPI. Weighted deliberately: UPI reach is the biggest lever for
  // anyone whose spend leaks to QR merchants.
  outline('scapia-federal', 'Federal Bank', 'Scapia', 'rupay', ['card', 'upi'], 0,
    'Lifetime free travel card, rewards on UPI spends, zero forex markup', 'https://www.scapia.cards/'),
  outline('tata-neu-rupay-hdfc', 'HDFC Bank', 'Tata Neu Infinity RuPay', 'rupay', ['card', 'upi'], 1499,
    'NeuCoins on Tata brands and UPI spends', 'https://www.hdfc.bank.in/credit-cards/tata-neu-infinity-credit-card'),
  outline('au-ixigo-rupay', 'AU Small Finance Bank', 'ixigo AU RuPay', 'rupay', ['card', 'upi'], 0,
    'Lifetime free, travel focused, earns on UPI', 'https://www.aubank.in/'),
  outline('axis-airtel', 'Axis Bank', 'Airtel Axis Bank', 'visa', ['card'], 500,
    'Up to 25% on Airtel recharges and bill payments', 'https://www.axis.bank.in/'),

  // HDFC ladder
  outline('hdfc-infinia', 'HDFC Bank', 'Infinia Metal', 'visa', ['card'], 12500,
    'Super premium, unlimited lounge access, strongest SmartBuy redemption', 'https://www.hdfc.bank.in/'),
  outline('hdfc-diners-black-metal', 'HDFC Bank', 'Diners Club Black Metal', 'diners', ['card'], 10000,
    'Premium travel and dining, 10X on SmartBuy', 'https://www.hdfc.bank.in/'),
  outline('hdfc-millennia', 'HDFC Bank', 'Millennia', 'visa', ['card'], 1000,
    '5% on ten partner brands, 1% elsewhere, capped monthly', 'https://www.hdfc.bank.in/credit-cards/millennia-credit-card'),
  outline('hdfc-marriott-bonvoy', 'HDFC Bank', 'Marriott Bonvoy', 'visa', ['card'], 3000,
    'Marriott points, free night award, hotel status', 'https://www.hdfc.bank.in/'),

  // ICICI
  outline('icici-sapphiro', 'ICICI Bank', 'Sapphiro', 'visa', ['card'], 6500,
    'Premium travel and lifestyle, lounge access', 'https://www.icicibank.com/'),
  outline('icici-coral', 'ICICI Bank', 'Coral', 'visa', ['card'], 500,
    'Entry tier, movie and dining offers', 'https://www.icicibank.com/'),
  outline('icici-hpcl-super-saver', 'ICICI Bank', 'HPCL Super Saver', 'visa', ['card'], 500,
    'Fuel focused, surcharge waiver plus HPCL rewards', 'https://www.icicibank.com/'),

  // Axis
  outline('axis-magnus', 'Axis Bank', 'Magnus', 'mastercard', ['card'], 12500,
    'Premium travel, transfer partners, lounge access', 'https://www.axis.bank.in/'),
  outline('axis-horizon', 'Axis Bank', 'Horizon', 'visa', ['card'], 3000,
    'Travel focused EDGE Miles earner', 'https://www.axis.bank.in/'),
  outline('axis-ace', 'Axis Bank', 'Ace', 'visa', ['card'], 499,
    'Flat cashback with accelerated bill payments via Google Pay', 'https://www.axis.bank.in/'),
  outline('axis-select', 'Axis Bank', 'Select', 'visa', ['card'], 3000,
    'Lifestyle and shopping vouchers, lounge access', 'https://www.axis.bank.in/'),

  // SBI
  outline('sbi-simplyclick', 'SBI Card', 'SimplyCLICK', 'visa', ['card'], 499,
    'Accelerated rewards on selected online partners', 'https://www.sbicard.com/'),
  outline('sbi-prime', 'SBI Card', 'Prime', 'visa', ['card'], 2999,
    'Lounge access, milestone benefits, category accelerators', 'https://www.sbicard.com/'),
  outline('sbi-bpcl-octane', 'SBI Card', 'BPCL Octane', 'visa', ['card'], 1499,
    'Fuel focused, accelerated rewards at BPCL', 'https://www.sbicard.com/'),

  // Amex
  outline('amex-mrcc', 'American Express', 'Membership Rewards', 'amex', ['card'], 1500,
    'Entry MR earner, strong bonus point milestones', 'https://www.americanexpress.com/in/'),
  outline('amex-platinum-charge', 'American Express', 'Platinum Charge', 'amex', ['card'], 66000,
    'Ultra premium lifestyle and travel benefits', 'https://www.americanexpress.com/in/'),

  // Others
  outline('idfc-first-wealth', 'IDFC First Bank', 'Wealth', 'visa', ['card'], 0,
    'Lifetime free, never expiring rewards, lounge access', 'https://www.idfcfirstbank.com/'),
  outline('idfc-first-select', 'IDFC First Bank', 'Select', 'visa', ['card'], 0,
    'Lifetime free, tiered rewards on spend', 'https://www.idfcfirstbank.com/'),
  outline('kotak-zen-signature', 'Kotak Mahindra Bank', 'Zen Signature', 'visa', ['card'], 1500,
    'Replacement for the discontinued Myntra Kotak card', 'https://www.kotak.bank.in/'),
  outline('kotak-league-platinum', 'Kotak Mahindra Bank', 'League Platinum', 'visa', ['card'], 499,
    'Entry tier with milestone rewards', 'https://www.kotak.bank.in/'),
  outline('au-lit', 'AU Small Finance Bank', 'LIT', 'visa', ['card'], 0,
    'Customisable, switch on the reward categories you want', 'https://www.aubank.in/'),
  outline('au-zenith', 'AU Small Finance Bank', 'Zenith', 'mastercard', ['card'], 7999,
    'Premium travel and lifestyle', 'https://www.aubank.in/'),
  outline('indusind-legend', 'IndusInd Bank', 'Legend', 'visa', ['card'], 0,
    'Lifetime free on request, weekend accelerated rewards', 'https://www.indusind.com/'),
  outline('rbl-world-safari', 'RBL Bank', 'World Safari', 'mastercard', ['card'], 3000,
    'Zero forex markup, travel focused', 'https://www.rblbank.com/'),
  outline('yes-marquee', 'Yes Bank', 'Marquee', 'visa', ['card'], 9999,
    'Premium, high base reward rate', 'https://www.yesbank.in/'),
  outline('bob-eterna', 'Bank of Baroda', 'Eterna', 'visa', ['card'], 2499,
    'Accelerated rewards across travel, dining and online', 'https://www.bobfinancial.com/'),
];

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

export const CARD_CATALOGUE: CardTerms[] = [...FULL_DEPTH_CARDS, ...OUTLINE_CARDS];

const BY_ID = new Map(CARD_CATALOGUE.map((c) => [c.id, c]));

export function getCard(id: string): CardTerms | undefined {
  return BY_ID.get(id);
}

export function recommendableCards(asOf: Date = new Date()): CardTerms[] {
  return CARD_CATALOGUE.filter((c) => isRecommendable(c, asOf));
}

/** Cards that reach UPI QR merchants. The differentiator for UPI-heavy spenders. */
export function upiCapableCards(): CardTerms[] {
  return CARD_CATALOGUE.filter((c) => c.rails.includes('upi'));
}
