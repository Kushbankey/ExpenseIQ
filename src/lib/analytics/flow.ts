import type { ExpenseTransaction, Transaction, SankeyData, SankeyNode, SankeyLink } from '../types';
import { CHART_COLORS, CATEGORY_COLORS } from '../constants';

/**
 * Builds Sankey flow data: Income sources → Total Income → Needs/Wants/Investments → Top categories.
 * Constraint: nivo's sankey requires acyclic flow, source value must equal sum of target values for each node.
 */
export function buildSankeyData(
  expenses: ExpenseTransaction[],
  income: Transaction[]
): SankeyData {
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const seen = new Set<string>();

  const addNode = (id: string, color?: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    nodes.push({ id, nodeColor: color });
  };

  // ---- Income side: group sources by category, hide tiny slivers as "Other Income" ----
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

  // ---- Expense side: Income → Needs/Wants/Investments → Top categories per bucket ----
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const savings = totalIncome - totalExpense;

  // By classification
  const byClass = { Need: 0, Want: 0, Investment: 0 };
  const catByClass: Record<'Need' | 'Want' | 'Investment', Map<string, number>> = {
    Need: new Map(),
    Want: new Map(),
    Investment: new Map(),
  };
  for (const t of expenses) {
    byClass[t.classification] += t.amount;
    const m = catByClass[t.classification];
    m.set(t.category, (m.get(t.category) || 0) + t.amount);
  }

  const classMeta: Array<{ id: 'Need' | 'Want' | 'Investment'; label: string; color: string }> = [
    { id: 'Need', label: 'Needs', color: CHART_COLORS.need },
    { id: 'Want', label: 'Wants', color: CHART_COLORS.want },
    { id: 'Investment', label: 'Investments', color: CHART_COLORS.investment },
  ];

  for (const { id, label, color } of classMeta) {
    if (byClass[id] <= 0) continue;
    addNode(label, color);
    links.push({ source: incomeNodeId, target: label, value: byClass[id] });

    // Top 5 categories under this classification + "Other"
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

  // Savings = Income - Expense (only if positive)
  if (savings > 0) {
    addNode('Savings', '#10b981');
    links.push({ source: incomeNodeId, target: 'Savings', value: savings });
  }

  return { nodes, links };
}
