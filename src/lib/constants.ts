import type { Classification } from './types';

export const NEEDS_CATEGORIES = new Set([
  '🍜 Food', '🚖 Transport', '🧘🏼 Health', '🪑 Household',
  '📱Phone', 'Haircut', '📙 Education',
]);

export const WANTS_CATEGORIES = new Set([
  '🧥 Shopping', '🖼 Culture', '👬🏻 Social Life', '🗺️ Travel',
  '💄 Beauty', '🎁 Gift', '💵 Petty cash', 'Fun & Activities', 'Other',
]);

export const INVESTMENT_CATEGORIES = new Set(['📈Investment']);

export const FOOD_WANTS_SUBCATS = new Set(['Snacks', 'Beverages', 'Eating out']);


export const CLASSIFICATION_COLORS: Record<Classification, string> = {
  Need: '#3b82f6',
  Want: '#f97316',
  Investment: '#10b981',
};

export const CHART_COLORS = {
  income: '#22c55e',
  expense: '#ef4444',
  need: '#3b82f6',
  want: '#f97316',
  investment: '#10b981',
  neutral: '#6b7280',
  accent: '#8b5cf6',
};

export const CATEGORY_COLORS: Record<string, string> = {
  '📈Investment': '#10b981',
  '🪑 Household': '#f59e0b',
  '👬🏻 Social Life': '#ec4899',
  '🍜 Food': '#f97316',
  '🚖 Transport': '#3b82f6',
  '🧥 Shopping': '#8b5cf6',
  '🗺️ Travel': '#06b6d4',
  'Fun & Activities': '#e11d48',
  'Other': '#6b7280',
  '💄 Beauty': '#d946ef',
  '🖼 Culture': '#14b8a6',
  '🧘🏼 Health': '#22c55e',
  '📱Phone': '#64748b',
  '📙 Education': '#0ea5e9',
  'Haircut': '#78716c',
  '🏦 Bank': '#1e40af',
  '🎁 Gift': '#dc2626',
  '💵 Petty cash': '#a3a3a3',
};

export const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Transactions', href: '/dashboard/transactions', icon: 'ArrowLeftRight' },
  { label: 'Categories', href: '/dashboard/categories', icon: 'PieChart' },
  { label: 'Accounts', href: '/dashboard/accounts', icon: 'Wallet' },
  { label: 'Trends', href: '/dashboard/trends', icon: 'TrendingUp' },
  { label: 'Budget', href: '/dashboard/budget', icon: 'Target' },
  { label: 'Insights', href: '/dashboard/insights', icon: 'Lightbulb' },
] as const;

export const RECURRING_SUBCATEGORIES = ['Gym', 'Recharge', 'Music', 'Movie', 'Data addon'];
