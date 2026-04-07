'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { IndianRupee } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isLoaded = useFinanceStore((s) => s.isLoaded);
  const isRestoring = useFinanceStore((s) => s.isRestoring);

  useEffect(() => {
    // Only redirect if we're done restoring and still have no data
    if (!isRestoring && !isLoaded) {
      router.push('/');
    }
  }, [isLoaded, isRestoring, router]);

  if (isRestoring) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <IndianRupee size={20} className="text-white" />
          </div>
          <p className="text-sm text-gray-500">Restoring your data...</p>
        </div>
      </div>
    );
  }

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
