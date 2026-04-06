'use client';

import { useMemo } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/Card';
import { AccountUsageChart } from '@/components/charts/AccountUsageChart';
import { CreditCardMonthlyChart } from '@/components/charts/CreditCardChart';
import { AccountMonthlyChart } from '@/components/charts/AccountMonthlyChart';
import { formatINR } from '@/lib/formatters';
import { CreditCard, Building2, TrendingDown } from 'lucide-react';

export default function AccountsPage() {
  const data = useFinanceStore((s) => s.data);

  const accountNames = useMemo(() => {
    if (!data) return [];
    return data.accounts.map((a) => a.account);
  }, [data]);

  if (!data) return null;

  const ccName = data.creditCard.accountName;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <p className="text-sm text-gray-500 mt-1">Account usage and credit card analysis</p>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.accounts.map((acc) => (
          <div key={acc.account} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                {acc.isCreditCard ? (
                  <CreditCard size={16} className="text-violet-600" />
                ) : (
                  <Building2 size={16} className="text-violet-600" />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-800">{acc.account}</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatINR(acc.totalSpent)}</p>
            <p className="text-xs text-gray-400">{acc.txnCount} transactions</p>
            {acc.currentMonthSpent > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
                <TrendingDown size={12} className="text-red-400" />
                <p className="text-xs text-gray-500">
                  This month: <span className="font-semibold text-gray-700">{formatINR(acc.currentMonthSpent)}</span>
                  <span className="text-gray-400"> · {acc.currentMonthTxns} txns</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Usage Chart */}
        <Card title="Spending by Account">
          <AccountUsageChart data={data.accounts} />
        </Card>

        {/* Credit Card Monthly */}
        {ccName && (
          <Card title={`${ccName} — Monthly`}>
            <CreditCardMonthlyChart data={data.creditCard} />
          </Card>
        )}
      </div>

      {/* Monthly Spending by Account */}
      <Card title="Monthly Spending by Account">
        <AccountMonthlyChart expenses={data.expenses} accounts={accountNames} />
      </Card>

      {/* CC Category Breakdown */}
      {ccName && data.creditCard.byCategory.length > 0 && (
        <Card title={`${ccName} — Category Breakdown`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.creditCard.byCategory.slice(0, 9).map((item) => (
              <div key={item.category} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-700">{item.category}</span>
                <span className="text-sm font-semibold text-gray-900">{formatINR(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
