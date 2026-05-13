import type {
  ExpenseTransaction,
  RecurringExpense,
  AnomalyAlerts,
  CategorySpike,
  OutlierTxn,
  DuplicateCluster,
  SubscriptionDrift,
} from '../types';

// Subcategories that legitimately dominate top-spend lists and would otherwise
// flood the outlier panel. Rent and money sent to family run an order of
// magnitude higher than discretionary spend, but they're not anomalies.
const OUTLIER_SUBCAT_BLOCKLIST = new Set(['Rent']);
const FAMILY_TRANSFER_TOKENS = ['papa', 'mom', 'mummy', 'mumma', 'mummy ji', 'dad', 'family'];

// Commute fares legitimately repeat several times a day on the same date.
const COMMUTE_SUBCAT_TOKENS = ['commute', 'bus', 'metro', 'auto'];

const OUTLIER_AMOUNT_FLOOR = 500;
const OUTLIER_MULTIPLIER = 3;
const DUPLICATE_AMOUNT_FLOOR = 500;
const SPIKE_NOISE_FLOOR = 500; // categories under this trailing avg are too small to spike-flag

function daysInMonth(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function isFamilyTransfer(t: ExpenseTransaction): boolean {
  const note = t.note?.toLowerCase() ?? '';
  return FAMILY_TRANSFER_TOKENS.some((token) => note.includes(token));
}

function isCommute(t: ExpenseTransaction): boolean {
  const sub = t.subcategory?.toLowerCase() ?? '';
  return COMMUTE_SUBCAT_TOKENS.some((token) => sub.includes(token));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Category-level spike detection.
 * Projects partial-month spending forward by (days-in-month / days-elapsed) so
 * a slow first-week doesn't make every category look quiet. Compares projected
 * total to trailing-3-month avg (completed months only).
 */
function detectSpikes(expenses: ExpenseTransaction[]): CategorySpike[] {
  const allMonths = [...new Set(expenses.map((t) => t.month))].sort();
  const currentMonth = allMonths[allMonths.length - 1];
  if (!currentMonth) return [];

  const dim = daysInMonth(currentMonth);
  const currentExp = expenses.filter((t) => t.month === currentMonth);
  const maxDayInData = currentExp.reduce((m, t) => Math.max(m, t.date.getDate()), 0);
  const now = new Date();
  const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayDay = todayMonth === currentMonth ? now.getDate() : 0;
  const daysElapsed = Math.max(1, Math.min(dim, Math.max(maxDayInData, todayDay)));
  const scale = dim / daysElapsed;

  // Trailing 3 completed months — exclude the current month and the empty trend slot
  const completedMonths = allMonths.filter((m) => m !== currentMonth);
  const trailingMonths = new Set(completedMonths.slice(-3));
  if (trailingMonths.size === 0) return [];

  // Per-category aggregations
  type Agg = { current: number; trailing: number; trailingMonths: number; classification: string };
  const agg = new Map<string, Agg>();

  for (const t of expenses) {
    if (t.classification === 'Investment') continue; // investments are intentional, skip
    let entry = agg.get(t.category);
    if (!entry) {
      entry = { current: 0, trailing: 0, trailingMonths: trailingMonths.size, classification: t.classification };
      agg.set(t.category, entry);
    }
    if (t.month === currentMonth) entry.current += t.amount;
    else if (trailingMonths.has(t.month)) entry.trailing += t.amount;
  }

  const spikes: CategorySpike[] = [];
  for (const [category, entry] of agg) {
    const trailingAvg = entry.trailing / entry.trailingMonths;
    if (trailingAvg < SPIKE_NOISE_FLOOR) continue;

    const projected = entry.current * scale;
    if (projected <= 0) continue;

    const ratio = projected / trailingAvg;
    if (ratio < 1.5) continue;

    spikes.push({
      category,
      classification: entry.classification as CategorySpike['classification'],
      currentMonthSpend: entry.current,
      projectedSpend: projected,
      trailing3Avg: trailingAvg,
      ratio,
      severity: ratio >= 2 ? 'high' : 'medium',
    });
  }

  return spikes.sort((a, b) => b.ratio - a.ratio);
}

/**
 * Outlier transactions: amount > 3× subcategory median AND > ₹500.
 * Excludes Rent (always huge) and money sent to family (also always huge).
 */
function detectOutliers(expenses: ExpenseTransaction[]): OutlierTxn[] {
  // Per-subcategory medians
  const bySubcat = new Map<string, number[]>();
  for (const t of expenses) {
    const key = `${t.category}|${t.subcategory}`;
    const list = bySubcat.get(key) ?? [];
    list.push(t.amount);
    bySubcat.set(key, list);
  }

  const medians = new Map<string, number>();
  for (const [key, amounts] of bySubcat) {
    medians.set(key, median(amounts));
  }

  const outliers: OutlierTxn[] = [];
  for (const t of expenses) {
    if (t.classification === 'Investment') continue;
    if (t.amount < OUTLIER_AMOUNT_FLOOR) continue;
    if (OUTLIER_SUBCAT_BLOCKLIST.has(t.subcategory)) continue;
    if (isFamilyTransfer(t)) continue;

    const m = medians.get(`${t.category}|${t.subcategory}`) ?? 0;
    if (m <= 0) continue;

    const multiplier = t.amount / m;
    if (multiplier < OUTLIER_MULTIPLIER) continue;

    outliers.push({
      date: t.date,
      category: t.category,
      subcategory: t.subcategory,
      note: t.note,
      amount: t.amount,
      subcatMedian: m,
      multiplier,
    });
  }

  return outliers.sort((a, b) => b.amount - a.amount).slice(0, 10);
}

/**
 * Duplicate-charge detector: same amount + same date + same category, > 1 occurrence.
 * Threshold ₹500 to skip commute fares (bus/metro/auto repeats are normal).
 */
function detectDuplicates(expenses: ExpenseTransaction[]): DuplicateCluster[] {
  const groups = new Map<string, ExpenseTransaction[]>();

  for (const t of expenses) {
    if (t.amount < DUPLICATE_AMOUNT_FLOOR) continue;
    if (t.classification === 'Investment') continue; // SIPs share amount+date by design
    if (isCommute(t)) continue;
    const dateStr = t.date.toISOString().slice(0, 10);
    const key = `${dateStr}|${t.category}|${t.amount}`;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const dupes: DuplicateCluster[] = [];
  for (const [, txns] of groups) {
    if (txns.length < 2) continue;
    const first = txns[0];
    dupes.push({
      amount: first.amount,
      date: first.date.toISOString().slice(0, 10),
      category: first.category,
      subcategory: first.subcategory,
      note: first.note,
      count: txns.length,
    });
  }

  return dupes.sort((a, b) => b.amount * b.count - a.amount * a.count).slice(0, 10);
}

/**
 * Subscription drift: recurring expenses whose latest payment differs >5%
 * from the earliest payment (exposed via `priceChanged` on the recurring item).
 */
function detectDrifts(recurring: RecurringExpense[]): SubscriptionDrift[] {
  return recurring
    .filter((r) => r.priceChanged)
    .map((r) => {
      // Reconstruct earliest from latest + delta
      const latestAmount = r.lastAmount;
      const earliestAmount = r.priceDeltaPct !== -100
        ? latestAmount / (1 + r.priceDeltaPct / 100)
        : 0;
      return {
        name: r.name,
        subcategory: r.subcategory,
        earliestAmount,
        latestAmount,
        deltaPct: r.priceDeltaPct,
        paymentCount: r.paymentCount,
      };
    })
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}

export function detectAnomalies(
  expenses: ExpenseTransaction[],
  recurring: RecurringExpense[]
): AnomalyAlerts {
  return {
    spikes: detectSpikes(expenses),
    outliers: detectOutliers(expenses),
    duplicates: detectDuplicates(expenses),
    drifts: detectDrifts(recurring),
  };
}
