'use client';

import { DropZone } from '@/components/upload/DropZone';
import { IndianRupee } from 'lucide-react';

export default function Home() {
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

        {/* Upload Area */}
        <DropZone />

        {/* Info */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
          <span>All data stays in your browser</span>
          <span>No server uploads</span>
          <span>Supports .xlsx files</span>
        </div>
      </div>
    </div>
  );
}
