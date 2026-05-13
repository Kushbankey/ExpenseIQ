'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Upload, X, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DropZone } from '@/components/upload/DropZone';
import { createClient } from '@/lib/supabase/client';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatDate } from '@/lib/formatters';

interface Metadata {
  fileName: string | null;
  uploadedAt: Date | null;
}

export function DataCard() {
  const storeFileName = useFinanceStore((s) => s.fileName);
  const [meta, setMeta] = useState<Metadata>({ fileName: null, uploadedAt: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('user_data')
        .select('file_name, uploaded_at')
        .eq('user_id', user.id)
        .single()
        .then(({ data: row }) => {
          if (!row) return;
          setMeta({
            fileName: row.file_name ?? null,
            uploadedAt: row.uploaded_at ? new Date(row.uploaded_at) : null,
          });
        });
    });
  }, [storeFileName, refreshKey]);

  const handleSuccess = useCallback(() => {
    setModalOpen(false);
    setShowSuccess(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setShowSuccess(false), 4000);
  }, []);

  const displayName = meta.fileName ?? storeFileName ?? '—';

  return (
    <>
      <Card title="Your data">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet size={20} className="text-violet-500 dark:text-violet-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {meta.uploadedAt
                  ? `Uploaded ${formatDate(meta.uploadedAt)}`
                  : 'Upload date unavailable'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400 transition-colors flex-shrink-0"
          >
            <Upload size={16} />
            Upload new sheet
          </button>
        </div>

        {showSuccess && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-sm rounded-lg">
            <CheckCircle2 size={16} />
            Data updated. New analytics are live across all pages.
          </div>
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-[#131316] rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border dark:border-gray-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Replace your data</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Your current analytics will be replaced with the new sheet.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-5">
              <DropZone onSuccess={handleSuccess} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
