import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary' | 'success';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<Props> = ({
  open,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const btnClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-violet-600 hover:bg-violet-700 text-white';

  return (
    <div className="fixed inset-0 z-[60] bg-black/55 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {variant === 'danger' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer ${btnClass}`}
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
