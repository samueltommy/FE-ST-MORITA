import React from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface DataDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any> | null;
}

export const DataDetailModal: React.FC<DataDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-400 italic">null</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            val
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
          }`}
        >
          {val ? 'TRUE' : 'FALSE'}
        </span>
      );
    }
    if (typeof val === 'object') {
      return (
        <pre className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-1">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="text-slate-900 dark:text-white font-semibold">{String(val)}</span>;
  };

  // Try to extract an ID and Status for the top right corner
  const displayId = data.id || data.poNumber || data.code || data.docNumber || data.referenceNumber || '-';
  const displayStatus = data.status || data.stage || '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-start shrink-0">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {title}
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              ST. Morita Industries
            </h3>
            <div className="text-xs text-slate-500">
              Enterprise ERP Portal System
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <div className="font-bold text-blue-600 dark:text-blue-400">{displayId}</div>
            {displayStatus && (
              <div className="text-slate-400 uppercase text-[10px] tracking-wider mt-0.5">
                Status: {displayStatus}
              </div>
            )}
          </div>
        </div>

        {/* Body Table */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4 font-bold w-1/3">Parameter Properti</th>
                <th className="py-2.5 px-4 font-bold w-2/3">Nilai Data (Value)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {Object.entries(data).map(([key, value]) => (
                <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {key}
                  </td>
                  <td className="py-3 px-4 break-words">
                    {renderValue(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-2 shrink-0">
          <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
            System generated detail view
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handleCopy}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
