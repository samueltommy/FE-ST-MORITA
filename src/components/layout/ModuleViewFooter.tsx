import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ModuleViewFooterProps {
  onBack: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const ModuleViewFooter: React.FC<ModuleViewFooterProps> = ({
  onBack,
  backLabel = 'BACK',
  actions,
  className = '',
}) => {
  return (
    <div
      className={`mt-6 pt-4 border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 sm:p-4 rounded-2xl ${className}`}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-black text-sm uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-102"
        title="Kembali ke Menu Pilihan Fitur"
      >
        <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        <span>{backLabel}</span>
      </button>

      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
};
