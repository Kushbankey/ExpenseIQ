'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFinanceStore } from '@/store/useFinanceStore';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Wallet,
  TrendingUp,
  Target,
  Lightbulb,
  IndianRupee,
  LogOut,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Wallet,
  TrendingUp,
  Target,
  Lightbulb,
};

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Transactions', href: '/dashboard/transactions', icon: 'ArrowLeftRight' },
  { label: 'Categories', href: '/dashboard/categories', icon: 'PieChart' },
  { label: 'Accounts', href: '/dashboard/accounts', icon: 'Wallet' },
  { label: 'Trends', href: '/dashboard/trends', icon: 'TrendingUp' },
  { label: 'Budget', href: '/dashboard/budget', icon: 'Target' },
  { label: 'Insights', href: '/dashboard/insights', icon: 'Lightbulb' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const reset = useFinanceStore((s) => s.reset);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-100 h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <IndianRupee size={18} className="text-white" />
        </div>
        <span className="font-bold text-lg text-gray-900">ExpenseIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = iconMap[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {Icon && <Icon size={18} />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign Out */}
      <div className="px-3 py-4 border-t border-gray-50 space-y-2">
        {email && (
          <p className="text-xs text-gray-400 truncate px-3">{email}</p>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
