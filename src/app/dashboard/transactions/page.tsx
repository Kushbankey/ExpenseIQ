'use client';

import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatINR, formatDate } from '@/lib/formatters';
import { Search } from 'lucide-react';
import type { Transaction, ExpenseTransaction } from '@/lib/types';

const PAGE_SIZE = 20;

type UnifiedTxn = (Transaction | ExpenseTransaction) & { txnType: 'Income' | 'Expense' };

function isExpense(txn: UnifiedTxn): txn is ExpenseTransaction & { txnType: 'Expense' } {
  return txn.txnType === 'Expense';
}

export default function TransactionsPage() {
  const data = useFinanceStore((s) => s.data);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(0);

  const allTransactions = useMemo(() => {
    if (!data) return [];
    const expenses: UnifiedTxn[] = data.expenses.map((t) => ({ ...t, txnType: 'Expense' as const }));
    const income: UnifiedTxn[] = data.income.map((t) => ({ ...t, txnType: 'Income' as const }));
    return [...expenses, ...income].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data]);

  const categories = useMemo(() => {
    return [...new Set(allTransactions.map((t) => t.category))].sort();
  }, [allTransactions]);

  const accounts = useMemo(() => {
    return [...new Set(allTransactions.map((t) => t.account))].sort();
  }, [allTransactions]);

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      if (typeFilter && t.txnType !== typeFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (accountFilter && t.account !== accountFilter) return false;
      if (classFilter) {
        if (!isExpense(t) || t.classification !== classFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          t.note.toLowerCase().includes(q) ||
          t.subcategory.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTransactions, search, typeFilter, categoryFilter, accountFilter, classFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">{filtered.length.toLocaleString()} transactions</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setClassFilter(''); setPage(0); }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="">All Types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={accountFilter}
            onChange={(e) => { setAccountFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {typeFilter !== 'Income' && (
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setPage(0); }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
            >
              <option value="">All Classifications</option>
              <option value="Need">Needs</option>
              <option value="Want">Wants</option>
              <option value="Investment">Investments</option>
            </select>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Category</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Subcategory</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Note</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Account</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Type</th>
                <th className="text-right py-3 px-2 text-gray-500 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((txn, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 px-2 text-gray-600 whitespace-nowrap">{formatDate(txn.date)}</td>
                  <td className="py-2.5 px-2 text-gray-800">{txn.category}</td>
                  <td className="py-2.5 px-2 text-gray-600">{txn.subcategory}</td>
                  <td className="py-2.5 px-2 text-gray-600 max-w-[200px] truncate">{txn.note}</td>
                  <td className="py-2.5 px-2 text-gray-600 whitespace-nowrap">{txn.account}</td>
                  <td className="py-2.5 px-2">
                    {isExpense(txn) ? (
                      <Badge classification={txn.classification} />
                    ) : (
                      <Badge classification="Income" />
                    )}
                  </td>
                  <td className={`py-2.5 px-2 text-right font-semibold ${txn.txnType === 'Income' ? 'text-green-600' : 'text-red-500'}`}>
                    {txn.txnType === 'Income' ? '+' : ''}{formatINR(txn.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
