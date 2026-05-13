import type { ExpenseTransaction, MerchantStats, MerchantStat } from '../types';

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Normalize a free-text note into a canonical merchant key.
// Strips emojis, lowercases, collapses whitespace, drops common suffixes.
function normalize(note: string): string {
  return note
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\w\s&+\-/.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pretty display name: title-case first letter of each word, keep acronyms.
function pretty(normalized: string): string {
  return normalized
    .split(' ')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

export function analyzeMerchants(expenses: ExpenseTransaction[]): MerchantStats {
  const map = new Map<
    string,
    {
      total: number;
      count: number;
      categories: Set<string>;
      firstSeen: string;
      lastSeen: string;
      rawNames: Map<string, number>;
    }
  >();

  for (const t of expenses) {
    const raw = (t.note || '').trim();
    if (!raw) continue;
    const key = normalize(raw);
    if (!key) continue;
    const dk = dateKey(t.date);
    let entry = map.get(key);
    if (!entry) {
      entry = {
        total: 0,
        count: 0,
        categories: new Set(),
        firstSeen: dk,
        lastSeen: dk,
        rawNames: new Map(),
      };
      map.set(key, entry);
    }
    entry.total += t.amount;
    entry.count += 1;
    entry.categories.add(t.category);
    if (dk < entry.firstSeen) entry.firstSeen = dk;
    if (dk > entry.lastSeen) entry.lastSeen = dk;
    entry.rawNames.set(raw, (entry.rawNames.get(raw) || 0) + 1);
  }

  const stats: MerchantStat[] = [];
  for (const [normalizedName, info] of map.entries()) {
    if (info.count < 2) continue; // a true merchant repeats at least twice
    // Use the most common raw spelling as the display name
    let displayName = pretty(normalizedName);
    let topCount = 0;
    for (const [raw, c] of info.rawNames.entries()) {
      if (c > topCount) {
        topCount = c;
        displayName = raw;
      }
    }
    stats.push({
      name: displayName,
      normalizedName,
      count: info.count,
      total: info.total,
      avg: info.total / info.count,
      categories: [...info.categories],
      firstSeen: info.firstSeen,
      lastSeen: info.lastSeen,
    });
  }

  const byTotal = [...stats].sort((a, b) => b.total - a.total).slice(0, 25);
  const byFrequency = [...stats].sort((a, b) => b.count - a.count).slice(0, 25);

  // Scatter: visits × avg ticket. Cap to top 40 by total to keep chart legible.
  const topForScatter = [...stats].sort((a, b) => b.total - a.total).slice(0, 40);
  const scatter = topForScatter.map((m) => ({
    name: m.name,
    visits: m.count,
    avgTicket: m.avg,
    total: m.total,
    category: m.categories[0] || 'Other',
  }));

  return { byTotal, byFrequency, scatter };
}
