import type { ExpenseTransaction, TemporalStats } from '../types';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function analyzeTemporal(expenses: ExpenseTransaction[]): TemporalStats {
  const dow = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    label: DOW_LABELS[i],
    amount: 0,
    count: 0,
  }));

  const dom = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    amount: 0,
    amountExInvestments: 0,
    count: 0,
  }));

  const calMap = new Map<string, { amount: number; count: number }>();
  let weekendAmount = 0;
  let weekdayAmount = 0;
  let weekendCount = 0;
  let weekdayCount = 0;
  let nonInvFirstWeek = 0;
  let nonInvRest = 0;

  for (const t of expenses) {
    const d = t.date;
    const w = d.getDay();
    const dayIdx = d.getDate() - 1;
    const isInv = t.classification === 'Investment';

    dow[w].amount += t.amount;
    dow[w].count += 1;

    dom[dayIdx].amount += t.amount;
    dom[dayIdx].count += 1;
    if (!isInv) dom[dayIdx].amountExInvestments += t.amount;

    const key = dateKey(d);
    const cell = calMap.get(key) || { amount: 0, count: 0 };
    cell.amount += t.amount;
    cell.count += 1;
    calMap.set(key, cell);

    if (w === 0 || w === 6) {
      weekendAmount += t.amount;
      weekendCount += 1;
    } else {
      weekdayAmount += t.amount;
      weekdayCount += 1;
    }

    if (!isInv) {
      if (d.getDate() <= 5) nonInvFirstWeek += t.amount;
      else nonInvRest += t.amount;
    }
  }

  const calendar = [...calMap.entries()]
    .map(([date, { amount, count }]) => ({ date, amount, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalNonInv = nonInvFirstWeek + nonInvRest;
  const firstWeekShareExInv = totalNonInv > 0 ? (nonInvFirstWeek / totalNonInv) * 100 : 0;

  const totalAll = weekendAmount + weekdayAmount;
  const weekendPct = totalAll > 0 ? (weekendAmount / totalAll) * 100 : 0;

  return {
    dayOfWeek: dow,
    dayOfMonth: dom,
    calendar,
    weekendAmount,
    weekdayAmount,
    weekendCount,
    weekdayCount,
    weekendPct,
    firstWeekShareExInv,
  };
}
