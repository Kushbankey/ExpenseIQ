'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropZone } from '@/components/upload/DropZone';
import { useFinanceStore } from '@/store/useFinanceStore';
import { createClient } from '@/lib/supabase/client';
import { IndianRupee, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const isLoaded = useFinanceStore((s) => s.isLoaded);
  const isRestoring = useFinanceStore((s) => s.isRestoring);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setChecking(false);
    });
  }, []);

  // If data is already loaded (restored or just processed), go to dashboard
  useEffect(() => {
    if (isLoaded && user) {
      router.push('/dashboard');
    }
  }, [isLoaded, user, router]);

  if (checking || isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200 animate-pulse">
            <IndianRupee size={28} className="text-white" />
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-purple-50 p-4">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
            <IndianRupee size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ExpenseIQ</h1>
          <p className="text-gray-500 mt-2">
            Upload your expense sheet to get instant financial insights
          </p>
        </div>

        {user ? (
          <>
            {/* Logged in — show upload */}
            <DropZone />
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span>Your data is encrypted and private</span>
              <span>Persists across sessions</span>
              <span>Supports .xlsx files</span>
            </div>
          </>
        ) : (
          <>
            {/* Not logged in — show auth buttons */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
              <p className="text-sm text-gray-600">
                Sign in to upload your expenses and access your dashboard
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
                >
                  <LogIn size={16} /> Sign in
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <UserPlus size={16} /> Create account
                </Link>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span>Your data stays private</span>
              <span>Password protected</span>
              <span>Free to use</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
