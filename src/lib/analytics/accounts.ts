import type { ExpenseTransaction, Transaction, AccountData, CreditCardData } from '../types';

// Detect credit card accounts by name pattern
function isCreditCardAccount(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('credit') || lower.includes('card') ||
    lower.includes('diners') || lower.includes('amex') ||
    lower.includes('visa') || lower.includes('mastercard');
}

export function analyzeAccounts(
  expenses: ExpenseTransaction[],
  income: Transaction[]
): { accounts: AccountData[]; creditCard: CreditCardData } {
  // Determine current (latest) month
  const allMonths = [...new Set(expenses.map((t) => t.month))].sort();
  const currentMonth = allMonths[allMonths.length - 1] || '';

  // Expense by account
  const accMap = new Map<string, { total: number; count: number; cmTotal: number; cmCount: number }>();
  for (const t of expenses) {
    const entry = accMap.get(t.account) || { total: 0, count: 0, cmTotal: 0, cmCount: 0 };
    entry.total += t.amount;
    entry.count += 1;
    if (t.month === currentMonth) {
      entry.cmTotal += t.amount;
      entry.cmCount += 1;
    }
    accMap.set(t.account, entry);
  }

  const accounts: AccountData[] = [...accMap.entries()]
    .map(([account, { total, count, cmTotal, cmCount }]) => ({
      account,
      totalSpent: total,
      txnCount: count,
      isCreditCard: isCreditCardAccount(account),
      currentMonthSpent: cmTotal,
      currentMonthTxns: cmCount,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // Credit card analysis — pick the first detected CC account
  const ccAccount = accounts.find((a) => a.isCreditCard);
  const ccName = ccAccount?.account || '';
  const cc = ccName ? expenses.filter((t) => t.account === ccName) : [];
  const ccCatMap = new Map<string, number>();
  const ccMonthMap = new Map<string, number>();
  for (const t of cc) {
    ccCatMap.set(t.category, (ccCatMap.get(t.category) || 0) + t.amount);
    ccMonthMap.set(t.month, (ccMonthMap.get(t.month) || 0) + t.amount);
  }

  const byCategory = [...ccCatMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const monthly = [...ccMonthMap.entries()]
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const totalCharged = cc.reduce((s, t) => s + t.amount, 0);
  const avgMonthlyBill = monthly.length > 0 ? totalCharged / monthly.length : 0;

  const creditCard: CreditCardData = {
    accountName: ccName,
    totalCharged,
    txnCount: cc.length,
    avgMonthlyBill,
    byCategory,
    monthly,
  };

  return { accounts, creditCard };
}
