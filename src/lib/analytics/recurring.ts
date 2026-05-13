import type { ExpenseTransaction, RecurringExpense } from '../types';

const AMOUNT_TOLERANCE = 0.15; // ±15% — matches across small price drifts

/**
 * Detects truly monthly recurring expenses:
 * - Same normalized note across 3+ distinct months
 * - Amounts cluster within ±15% (so a small price hike still groups together)
 * - Roughly 1 transaction per month (not frequent daily purchases)
 * - Day-of-month is consistent (within a 7-day window)
 * - Exposes `priceChanged` when latest amount drifts >5% from earliest
 */
export function analyzeRecurring(expenses: ExpenseTransaction[]): RecurringExpense[] {
  // Group by note alone, then split into amount clusters within ±15%
  const byNote = new Map<string, ExpenseTransaction[]>();
  for (const t of expenses) {
    if (!t.note || t.note.length === 0) continue;
    const list = byNote.get(t.note) ?? [];
    list.push(t);
    byNote.set(t.note, list);
  }

  const allMonths = [...new Set(expenses.map((t) => t.month))].sort();
  const recentMonths = new Set(allMonths.slice(-2));

  const results: RecurringExpense[] = [];

  for (const [, txns] of byNote) {
    // Sort by date so we can pick a centroid greedily and build clusters
    const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());

    const clusters: ExpenseTransaction[][] = [];
    for (const t of sorted) {
      // Place into the first cluster whose median is within tolerance
      let placed = false;
      for (const cluster of clusters) {
        const amounts = cluster.map((c) => c.amount).sort((a, b) => a - b);
        const median = amounts[Math.floor(amounts.length / 2)];
        if (median > 0 && Math.abs(t.amount - median) / median <= AMOUNT_TOLERANCE) {
          cluster.push(t);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push([t]);
    }

    for (const cluster of clusters) {
      const months = new Map<string, number>();
      for (const t of cluster) {
        // Keep the earliest day-of-month for each month bucket
        if (!months.has(t.month)) months.set(t.month, t.date.getDate());
      }

      if (months.size < 3) continue;

      const ratio = cluster.length / months.size;
      if (ratio > 1.3) continue;

      const days = [...months.values()];
      const minDay = Math.min(...days);
      const maxDay = Math.max(...days);
      if (maxDay - minDay > 7) continue;

      const first = cluster[0];
      if (first.classification === 'Investment') continue;

      const monthKeys = [...months.keys()].sort();
      const isRecent = monthKeys.some((m) => recentMonths.has(m));
      if (!isRecent) continue;

      const sortedDays = [...days].sort((a, b) => a - b);
      const typicalDay = sortedDays[Math.floor(sortedDays.length / 2)];

      const earliestAmount = cluster[0].amount;
      const latestAmount = cluster[cluster.length - 1].amount;
      const totalAmount = cluster.reduce((s, t) => s + t.amount, 0);
      const avgAmount = totalAmount / cluster.length;
      const priceDeltaPct =
        earliestAmount > 0 ? ((latestAmount - earliestAmount) / earliestAmount) * 100 : 0;
      const priceChanged = Math.abs(priceDeltaPct) > 5;

      results.push({
        name: first.note,
        subcategory: first.subcategory,
        totalAmount,
        paymentCount: months.size,
        avgAmount,
        frequency: 'Monthly',
        typicalDay,
        lastAmount: latestAmount,
        priceChanged,
        priceDeltaPct,
      });
    }
  }

  return results.sort((a, b) => b.paymentCount - a.paymentCount);
}
