import type { ExpenseTransaction, RecurringExpense } from '../types';

/**
 * Detects truly monthly recurring expenses:
 * - Same note + same amount in 3+ distinct months
 * - Roughly 1 transaction per month (not frequent daily purchases)
 * - Day-of-month is consistent (within a 7-day window)
 */
export function analyzeRecurring(expenses: ExpenseTransaction[]): RecurringExpense[] {
  const grouped = new Map<
    string,
    { months: Map<string, number>; txns: ExpenseTransaction[] }
  >();

  for (const t of expenses) {
    if (!t.note || t.note.length === 0) continue;
    const key = `${t.note}|||${t.amount}`;
    let entry = grouped.get(key);
    if (!entry) {
      entry = { months: new Map(), txns: [] };
      grouped.set(key, entry);
    }
    // Track which day-of-month each occurrence falls on
    entry.months.set(t.month, t.date.getDate());
    entry.txns.push(t);
  }

  // Determine the 2 most recent months in the dataset
  const allMonths = [...new Set(expenses.map((t) => t.month))].sort();
  const recentMonths = new Set(allMonths.slice(-2));

  const results: RecurringExpense[] = [];

  for (const [, { months, txns }] of grouped) {
    if (months.size < 3) continue;

    // Must be roughly 1 per month (not petrol 15x/month)
    const ratio = txns.length / months.size;
    if (ratio > 1.3) continue;

    // Day-of-month must be consistent (within 7-day window)
    const days = [...months.values()];
    const minDay = Math.min(...days);
    const maxDay = Math.max(...days);
    if (maxDay - minDay > 7) continue;

    const first = txns[0];

    // Skip investments — those go in the Investment tracker
    if (first.classification === 'Investment') continue;

    // Must be active recently — present in at least one of the last 2 months
    const sortedMonths = [...months.keys()].sort();
    const isRecent = sortedMonths.some((m) => recentMonths.has(m));
    if (!isRecent) continue;

    // Typical day = median of all days
    const sortedDays = [...days].sort((a, b) => a - b);
    const typicalDay = sortedDays[Math.floor(sortedDays.length / 2)];

    results.push({
      name: first.note,
      subcategory: first.subcategory,
      totalAmount: txns.reduce((s, t) => s + t.amount, 0),
      paymentCount: months.size,
      avgAmount: first.amount,
      frequency: 'Monthly',
      typicalDay,
    });
  }

  return results.sort((a, b) => b.paymentCount - a.paymentCount);
}
