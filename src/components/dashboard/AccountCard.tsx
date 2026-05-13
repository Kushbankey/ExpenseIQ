'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import { useFinanceStore } from '@/store/useFinanceStore';

export function AccountCard() {
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
    <Card title="Account">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <Mail size={18} className="text-violet-500 dark:text-violet-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500">Signed in as</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{email || '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-emerald-500 dark:text-emerald-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500">Data privacy</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Encrypted at rest · only you can read your sheet
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-colors w-full sm:w-auto"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </Card>
  );
}
