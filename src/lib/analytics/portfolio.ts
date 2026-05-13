import type { ExpenseTransaction, PortfolioMix, PortfolioBucket } from '../types';

type BucketKey = 'Index' | 'Smallcap' | 'Midcap' | 'Flexicap' | 'Largecap' | 'Gold' | 'International' | 'Crypto' | 'Debt' | 'Other';

interface Rule {
  type: BucketKey;
  test: (note: string) => boolean;
}

const RULES: Rule[] = [
  { type: 'Crypto', test: (n) => /coinswitch|wazirx|coindcx|binance|bitcoin|btc|eth|ethereum|crypto/.test(n) },
  { type: 'International', test: (n) => /s&p|s and p|vanguard|nasdaq|us stock|indmoney|international|world index/.test(n) },
  { type: 'Gold', test: (n) => /gold/.test(n) },
  { type: 'Smallcap', test: (n) => /smallcap|small cap/.test(n) },
  { type: 'Midcap', test: (n) => /midcap|mid cap|nifty midcap/.test(n) },
  { type: 'Flexicap', test: (n) => /flexi|flexicap|multicap|multi cap|parag parikh/.test(n) },
  { type: 'Largecap', test: (n) => /largecap|large cap|bluechip|blue chip/.test(n) },
  { type: 'Index', test: (n) => /nifty 50|nifty50|index/.test(n) },
  { type: 'Debt', test: (n) => /debt|liquid fund|gilt|bond/.test(n) },
];

function classify(note: string): BucketKey {
  const n = note.toLowerCase();
  for (const r of RULES) {
    if (r.test(n)) return r.type;
  }
  return 'Other';
}

export function analyzePortfolio(expenses: ExpenseTransaction[]): PortfolioMix {
  const investments = expenses.filter((t) => t.classification === 'Investment');
  if (investments.length === 0) {
    return { buckets: [], totalInvested: 0 };
  }

  const months = new Set(investments.map((t) => t.month)).size || 1;

  const buckets = new Map<BucketKey, { total: number; count: number; funds: Map<string, { total: number; count: number }> }>();

  for (const t of investments) {
    const note = (t.note || t.subcategory || 'Other').trim();
    const type = classify(note);
    let entry = buckets.get(type);
    if (!entry) {
      entry = { total: 0, count: 0, funds: new Map() };
      buckets.set(type, entry);
    }
    entry.total += t.amount;
    entry.count += 1;
    const fundKey = note || 'Other';
    const fund = entry.funds.get(fundKey) || { total: 0, count: 0 };
    fund.total += t.amount;
    fund.count += 1;
    entry.funds.set(fundKey, fund);
  }

  const out: PortfolioBucket[] = [...buckets.entries()]
    .map(([type, info]) => ({
      type,
      total: info.total,
      monthlyAvg: info.total / months,
      count: info.count,
      funds: [...info.funds.entries()]
        .map(([name, { total, count }]) => ({ name, total, count }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);

  const totalInvested = out.reduce((s, b) => s + b.total, 0);

  return { buckets: out, totalInvested };
}
