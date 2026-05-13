'use client';

import { DataCard } from '@/components/dashboard/DataCard';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your data and account
        </p>
      </div>

      <DataCard />
    </div>
  );
}
