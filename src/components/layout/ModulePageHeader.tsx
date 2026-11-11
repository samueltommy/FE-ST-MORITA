import React from 'react';
import { ArrowLeft, Home, LucideIcon } from 'lucide-react';
import { appStore } from '../../store/useAppStore';

export interface PageOptionItem {
  id: string;
  label: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
}

interface ModulePageHeaderProps {
  moduleCode: string; // e.g. "HRD", "SALES", "FINANCE"
  title: string;
  description: string;
  badgeColor?: string;
  actionButtons?: React.ReactNode;
  options?: PageOptionItem[];
  activeOption?: string;
  onSelectOption?: (optionId: string) => void;
  onBackToMenu?: () => void;
  menuName?: string;
}

export const ModulePageHeader: React.FC<ModulePageHeaderProps> = ({
  moduleCode,
  title,
  description: _description,
  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200',
  actionButtons,
  options,
  activeOption,
  onSelectOption,
  onBackToMenu,
  menuName,
}) => {
  return (
    <div className="w-full pb-3 border-b border-slate-200 mb-4 space-y-2.5">
      {/* ─── Compact Single Row: Back Button + Module Badge + Title + Action Buttons ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              title={`Kembali ke Pilihan Fitur ${menuName || ''}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
          )}

          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
            {moduleCode}
          </span>

          <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actionButtons}
        </div>
      </div>

      {/* ─── Sleek Sub-Feature Tab Strip (No Big Box, No Description, No Extra Scroll) ─── */}
      {options && options.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeOption === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectOption && onSelectOption(opt.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{opt.label.replace(/\s*\(\/.*\)/g, '')}</span>
                {opt.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
