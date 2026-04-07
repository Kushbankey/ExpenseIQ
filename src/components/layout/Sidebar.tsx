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
  Menu,
  X,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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

// Bottom nav shows a subset of icons for mobile
const BOTTOM_NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Txns', href: '/dashboard/transactions', icon: 'ArrowLeftRight' },
  { label: 'Categories', href: '/dashboard/categories', icon: 'PieChart' },
  { label: 'Trends', href: '/dashboard/trends', icon: 'TrendingUp' },
  { label: 'More', href: '#more', icon: 'Menu' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const reset = useFinanceStore((s) => s.reset);
  const [email, setEmail] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push('/login');
    router.refresh();
  };

  const isMoreActive = ['/dashboard/accounts', '/dashboard/budget', '/dashboard/insights'].includes(pathname);

  return (
    <>
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-60 bg-white border-r border-gray-100 h-screen flex-col fixed left-0 top-0 z-30">
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {BOTTOM_NAV_ITEMS.map((item) => {
            if (item.href === '#more') {
              return (
                <button
                  key="more"
                  onClick={() => setMobileMenuOpen(true)}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                    isMoreActive ? 'text-violet-600' : 'text-gray-400'
                  }`}
                >
                  <Menu size={20} />
                  <span className="text-[10px] font-medium">More</span>
                </button>
              );
            }

            const isActive = pathname === item.href;
            const Icon = iconMap[item.icon];

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  isActive ? 'text-violet-600' : 'text-gray-400'
                }`}
              >
                {Icon && <Icon size={20} />}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile "More" Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-up panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto safe-area-bottom">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <IndianRupee size={14} className="text-white" />
                </div>
                <span className="font-bold text-gray-900">ExpenseIQ</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <nav className="px-3 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = iconMap[item.icon];

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {Icon && <Icon size={18} />}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 py-3 border-t border-gray-100 space-y-2">
              {email && (
                <p className="text-xs text-gray-400 truncate px-4">{email}</p>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
