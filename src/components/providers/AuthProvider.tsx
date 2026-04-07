'use client';

import { useEffect } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isLoaded = useFinanceStore((s) => s.isLoaded);
  const isRestoring = useFinanceStore((s) => s.isRestoring);
  const restoreFromSupabase = useFinanceStore((s) => s.restoreFromSupabase);

  useEffect(() => {
    // If store is empty and not already restoring, try to restore from Supabase
    if (!isLoaded && !isRestoring) {
      restoreFromSupabase();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
