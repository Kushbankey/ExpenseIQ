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
  totalExpense: number;
  pureExpense: number;
  investments: number;
  netSavings: number;
  savingsRate: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  avgMonthlyPureExpense: number;
  numMonths: number;
  numTransactions: number;
  dateRange: string;
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
  need: { amount: number; pct: number };
  want: { amount: number; pct: number };
  investment: { amount: number; pct: number };
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
}
