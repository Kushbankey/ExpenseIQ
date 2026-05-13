'use client';

import { DataCard } from '@/components/dashboard/DataCard';
import { AccountCard } from '@/components/dashboard/AccountCard';

export default function SettingsPage() {
  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your data and account
        </p>
      </div>

      <DataCard />
      <AccountCard />
    </div>
  );
}
