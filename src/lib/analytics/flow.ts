import type {
  ExpenseTransaction,
  Transaction,
  SankeyData,
  SankeyNode,
  SankeyLink,
  PortfolioMix,
} from '../types';
import { CHART_COLORS, CATEGORY_COLORS } from '../constants';

/**
 * Sankey: Income sources → Income → {Needs, Wants, Savings} → leaves.
 *
 * Savings branches into Investments (subdivided by portfolio bucket) and
 * a Cash residual. Investments are NOT a peer of Needs/Wants — they are
 * a form of saving (deferred consumption), so they sit on the savings side
 * of the flow.
 *
 * nivo's sankey requires acyclic flow with source value == sum of target
 * values for each internal node, so we balance everything explicitly below.
 */
export function buildSankeyData(
  expenses: ExpenseTransaction[],
  income: Transaction[],
  portfolio?: PortfolioMix
): SankeyData {
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const seen = new Set<string>();

  const addNode = (id: string, color?: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    nodes.push({ id, nodeColor: color });
  };

  // ---- Income side: top sources → Income, hide tail as "Other Income" ----
  const incMap = new Map<string, number>();
  for (const t of income) {
    incMap.set(t.category, (incMap.get(t.category) || 0) + t.amount);
  }
  const incEntries = [...incMap.entries()].sort((a, b) => b[1] - a[1]);
  const totalIncome = incEntries.reduce((s, [, v]) => s + v, 0);
  if (totalIncome === 0) return { nodes: [], links: [] };

  const incomeNodeId = 'Income';
  addNode(incomeNodeId, CHART_COLORS.income);

  const topIncome = incEntries.slice(0, 4);
  const restIncome = incEntries.slice(4).reduce((s, [, v]) => s + v, 0);
  for (const [cat, amount] of topIncome) {
    addNode(cat, CHART_COLORS.income);
    links.push({ source: cat, target: incomeNodeId, value: amount });
  }
  if (restIncome > 0) {
    addNode('Other Income', CHART_COLORS.income);
    links.push({ source: 'Other Income', target: incomeNodeId, value: restIncome });
  }

  // ---- Aggregate spending (consumption) and investments separately ----
  let needTotal = 0;
  let wantTotal = 0;
  let investmentTotal = 0;
  const catByClass: Record<'Need' | 'Want', Map<string, number>> = {
    Need: new Map(),
    Want: new Map(),
  };
  for (const t of expenses) {
    if (t.classification === 'Investment') {
      investmentTotal += t.amount;
      continue;
    }
    if (t.classification === 'Need') needTotal += t.amount;
    else wantTotal += t.amount;
    const m = catByClass[t.classification as 'Need' | 'Want'];
    m.set(t.category, (m.get(t.category) || 0) + t.amount);
  }

  const totalSpending = needTotal + wantTotal;
  const totalSavings = totalIncome - totalSpending;

  // ---- Income → Needs / Wants → top categories ----
  const spendBuckets: Array<{
    id: 'Need' | 'Want';
    label: string;
    color: string;
    total: number;
  }> = [
    { id: 'Need', label: 'Needs', color: CHART_COLORS.need, total: needTotal },
    { id: 'Want', label: 'Wants', color: CHART_COLORS.want, total: wantTotal },
  ];

  for (const { id, label, color, total } of spendBuckets) {
    if (total <= 0) continue;
    addNode(label, color);
    links.push({ source: incomeNodeId, target: label, value: total });

    const sorted = [...catByClass[id].entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    for (const [cat, amount] of top) {
      const nodeId = `${cat} (${label})`;
      addNode(nodeId, CATEGORY_COLORS[cat] || color);
      links.push({ source: label, target: nodeId, value: amount });
    }
    if (rest > 0) {
      const nodeId = `Other ${label}`;
      addNode(nodeId, color);
      links.push({ source: label, target: nodeId, value: rest });
    }
  }

  // ---- Income → Savings → {Investments → buckets, Cash buffer} ----
  // If totalSavings <= 0, user overspent; we just skip the savings branch.
  // If investments exceed savings (dipped into prior savings), clip the
  // Investments link to totalSavings and skip portfolio sub-buckets to
  // keep the Sankey acyclic and balanced.
  if (totalSavings > 0) {
    const savingsNode = 'Savings';
    addNode(savingsNode, CHART_COLORS.investment);
    links.push({ source: incomeNodeId, target: savingsNode, value: totalSavings });

    const invAmount = Math.min(investmentTotal, totalSavings);
    const cashAmount = totalSavings - invAmount;

    if (invAmount > 0) {
      const invNode = 'Investments';
      addNode(invNode, CHART_COLORS.investment);
      links.push({ source: savingsNode, target: invNode, value: invAmount });

      // Only sub-divide if we routed the full investment amount; otherwise
      // proportional scaling would distort the portfolio picture.
      if (invAmount === investmentTotal) {
        const portfolioBuckets = portfolio?.buckets ?? [];
        for (const b of portfolioBuckets) {
          if (b.total <= 0) continue;
          const nodeId = `${b.type} (Portfolio)`;
          addNode(nodeId, CHART_COLORS.investment);
          links.push({ source: invNode, target: nodeId, value: b.total });
        }
      }
    }

    if (cashAmount > 0) {
      const cashNode = 'Cash buffer';
      addNode(cashNode, CHART_COLORS.accent);
      links.push({ source: savingsNode, target: cashNode, value: cashAmount });
    }
  }

  return { nodes, links };
}
