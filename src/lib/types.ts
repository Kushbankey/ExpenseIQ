export type Classification = 'Need' | 'Want' | 'Investment';

export interface Transaction {
  date: Date;
  account: string;
  category: string;
  subcategory: string;
  note: string;
  type: string; // 'Exp.' | 'Income' | 'Transfer-In' | 'Transfer-Out' | 'Income Balance'
  description: string;
  amount: number;
  month: string; // 'YYYY-MM'
}

export interface ExpenseTransaction extends Transaction {
  classification: Classification;
}

export interface SummaryStats {
  totalIncome: number;
  salaryIncome: number;
  totalExpense: number; // outflow = spending + investments (kept for back-compat)
  pureExpense: number; // alias of totalSpending
  investments: number;
  netSavings: number; // = totalSavings (income - spending), investments count as saved
  savingsRate: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  avgMonthlyPureExpense: number;
  numMonths: number;
  numTransactions: number;
  dateRange: string;

  // Correct conceptual model: Income = Spending + Investments + Cash
  totalSpending: number; // Needs + Wants only (true consumption)
  totalSavings: number; // Income - Spending = Investments + Cash
  cashSavings: number; // residual cash (not consumed, not invested)
  investmentShareOfIncome: number; // %, 0..100
  spendingShareOfIncome: number; // %, 0..100
  avgMonthlySpending: number;
  avgMonthlySavings: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  avgTxn: number;
  monthlyAvg: number;
}

export interface SubcategoryTotal {
  category: string;
  subcategory: string;
  total: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  expenseMA3: number;
}

export interface NeedsWantsResult {
  // Percentages are share of income (not share of outflow).
  need: { amount: number; pct: number };
  want: { amount: number; pct: number };
  savings: {
    amount: number; // investments + cash residual
    pct: number;
    breakdown: { investments: number; cash: number };
  };
}

export interface MonthlyClassification {
  month: string;
  need: number;
  want: number;
  investment: number;
}

export interface AccountData {
  account: string;
  totalSpent: number;
  txnCount: number;
  isCreditCard: boolean;
  currentMonthSpent: number;
  currentMonthTxns: number;
}

export interface CreditCardData {
  accountName: string;
  totalCharged: number;
  txnCount: number;
  avgMonthlyBill: number;
  byCategory: { category: string; amount: number }[];
  monthly: { month: string; amount: number }[];
}

export interface RecurringExpense {
  name: string;
  subcategory: string;
  totalAmount: number;
  paymentCount: number;
  avgAmount: number;
  frequency: string;
  typicalDay: number; // typical day-of-month (e.g. 5 for "around the 5th")
  lastAmount: number;
  priceChanged: boolean;
  priceDeltaPct: number; // % change from earliest to latest payment
}

export interface InsightData {
  topCategories: { category: string; total: number; monthlyAvg: number; count: number }[];
  largestTransactions: Transaction[];
  foodBreakdown: { subcategory: string; total: number; count: number }[];
  quickCommerce: { count: number; total: number; avg: number; monthlyAvg: number } | null;
  transportBreakdown: { subcategory: string; total: number; count: number; avg: number }[];
  investmentPattern: {
    total: number;
    monthlyAvg: number;
    min: number;
    max: number;
    monthsActive: number;
    totalMonths: number;
    sips: SipInfo[];
  } | null;
  splitTracking: {
    paidTotal: number;
    paidCount: number;
    receivedTotal: number;
    receivedCount: number;
    uncollected: number;
  } | null;
  spendingExtremes: {
    highest: { month: string; amount: number };
    lowest: { month: string; amount: number };
  } | null;
  savingsRateTrend: {
    first3Avg: number;
    last3Avg: number;
    trend: 'improving' | 'declining';
  } | null;
}

export interface SipInfo {
  name: string;
  amount: number;
  monthsActive: number;
  doneThisMonth: boolean;
  lastMonth: string;
  typicalDay: number;
}

export interface DayOfWeekStat {
  day: number; // 0=Sun, 6=Sat
  label: string;
  amount: number;
  count: number;
}

export interface DayOfMonthStat {
  day: number; // 1-31
  amount: number;
  amountExInvestments: number;
  count: number;
}

export interface CalendarHeatmapCell {
  date: string; // YYYY-MM-DD
  amount: number;
  count: number;
}

export interface TemporalStats {
  dayOfWeek: DayOfWeekStat[];
  dayOfMonth: DayOfMonthStat[];
  calendar: CalendarHeatmapCell[];
  weekendAmount: number;
  weekdayAmount: number;
  weekendCount: number;
  weekdayCount: number;
  weekendPct: number;
  firstWeekShareExInv: number; // % of non-investment spend in days 1-5
}

export interface MerchantStat {
  name: string;
  normalizedName: string;
  count: number;
  total: number;
  avg: number;
  categories: string[]; // distinct categories this merchant appears in
  firstSeen: string; // YYYY-MM-DD
  lastSeen: string;
}

export interface MerchantStats {
  byTotal: MerchantStat[];
  byFrequency: MerchantStat[];
  scatter: { name: string; visits: number; avgTicket: number; total: number; category: string }[];
}

export interface PortfolioBucket {
  type: string; // 'Index', 'Smallcap', 'Midcap', 'Flexicap', 'Gold', 'International', 'Crypto', 'Other'
  total: number;
  monthlyAvg: number;
  count: number;
  funds: { name: string; total: number; count: number }[];
}

export interface PortfolioMix {
  buckets: PortfolioBucket[];
  totalInvested: number;
}

export interface SankeyNode {
  id: string;
  nodeColor?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface ProjectionStats {
  // Month-end projection for the latest (current) month
  currentMonth: string;
  daysElapsed: number;
  daysInMonth: number;
  monthToDate: number;
  projectedTotal: number;
  trailing3Avg: number;
  projectedVsAvgPct: number; // % delta of projectedTotal vs trailing3Avg
  // Runway: months of pure-expense buffer from cumulative net savings
  cumulativeNetSavings: number;
  avgMonthlyPureExpense: number;
  runwayMonths: number;
}

export interface DiscretionaryPoint {
  month: string;
  income: number;
  needs: number;
  investments: number;
  discretionary: number; // income - needs - investments (what's left for wants + savings)
}

export interface CategorySpike {
  category: string;
  classification: Classification;
  currentMonthSpend: number;
  projectedSpend: number;
  trailing3Avg: number;
  ratio: number; // projected / trailing3Avg
  severity: 'high' | 'medium';
}

export interface OutlierTxn {
  date: Date;
  category: string;
  subcategory: string;
  note: string;
  amount: number;
  subcatMedian: number;
  multiplier: number; // amount / subcatMedian
}

export interface DuplicateCluster {
  amount: number;
  date: string; // YYYY-MM-DD — duplicates share a date
  category: string;
  subcategory: string;
  note: string;
  count: number;
}

export interface SubscriptionDrift {
  name: string;
  subcategory: string;
  earliestAmount: number;
  latestAmount: number;
  deltaPct: number;
  paymentCount: number;
}

export interface AnomalyAlerts {
  spikes: CategorySpike[];
  outliers: OutlierTxn[];
  duplicates: DuplicateCluster[];
  drifts: SubscriptionDrift[];
}

export interface CompareDelta {
  category: string;
  monthA: number; // amount in month A
  monthB: number; // amount in month B
  delta: number; // monthB - monthA
  pctChange: number; // (delta / monthA) * 100; 0 if monthA is 0
}

export interface FinanceData {
  expenses: ExpenseTransaction[];
  income: Transaction[];
  summary: SummaryStats;
  categoryAnalysis: CategoryTotal[];
  subcategoryAnalysis: SubcategoryTotal[];
  monthlyTrends: MonthlyTrend[];
  needsWants: NeedsWantsResult;
  monthlyClassification: MonthlyClassification[];
  accounts: AccountData[];
  creditCard: CreditCardData;
  recurring: RecurringExpense[];
  insights: InsightData;
  temporal: TemporalStats;
  merchants: MerchantStats;
  portfolio: PortfolioMix;
  sankey: SankeyData;
  projection: ProjectionStats;
  alerts: AnomalyAlerts;
  discretionary: DiscretionaryPoint[];
}
