'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { useFinanceStore } from '@/store/useFinanceStore';

export function DropZone() {
  const router = useRouter();
  const { processFile, isProcessing, error } = useFinanceStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        return;
      }
      await processFile(file);
      const store = useFinanceStore.getState();
      if (store.isLoaded) {
        router.push('/dashboard');
      }
    },
    [processFile, router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-200 cursor-pointer ${
        isDragging
          ? 'border-violet-400 bg-violet-50'
          : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
      }`}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      {isProcessing ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-violet-500 animate-spin" />
          <p className="text-lg font-medium text-gray-700">Processing your data...</p>
          <p className="text-sm text-gray-400">Analyzing transactions and generating insights</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-violet-50 flex items-center justify-center">
            {isDragging ? (
              <FileSpreadsheet size={36} className="text-violet-500" />
            ) : (
              <Upload size={36} className="text-violet-400" />
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {isDragging ? 'Drop your file here' : 'Upload your expense sheet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Drag & drop your .xlsx file or click to browse
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center justify-center gap-2 text-red-500 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
