'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isLoaded = useFinanceStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) router.push('/');
  }, [isLoaded, router]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Sidebar />
      <main className="ml-60 p-6">
        {children}
      </main>
    </div>
  );
}
