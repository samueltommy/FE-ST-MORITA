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
  moduleCode: string; // e.g. "Core 6"
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
  description,
  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200',
  actionButtons,
  options,
  activeOption,
  onSelectOption,
  onBackToMenu,
  menuName,
}) => {
  return (
    <div className="w-full space-y-6 pb-2">
      {/* ─── Top Bar: Navigation Back Buttons ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-sm sm:text-base font-black shadow-xs transition-all cursor-pointer group"
              title={`Kembali ke Pilihan Fitur ${menuName || ''}`}
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5] group-hover:-translate-x-0.5 transition-transform" />
              <span>&larr; Pilihan Fitur {menuName ? `(${menuName})` : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => appStore.setActiveModule('home')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer group"
            title="Kembali ke Halaman Menu Utama Beranda"
          >
            <Home className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
            <span>Menu Utama (Beranda)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {actionButtons}
        </div>
      </div>

      {/* ─── Title & Description (Large, High Contrast) ─── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-2">
        <div className="flex items-center gap-2.5">
          <span className={`text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full border ${badgeColor}`}>
            {moduleCode}
          </span>
          <span className="text-xs sm:text-sm text-slate-500 font-semibold">
            ST. Morita Industries ERP
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-medium max-w-4xl leading-relaxed">
          {description}
        </p>

        {/* ─── Big Option Buttons ("Button of Option" on every page) ─── */}
        {options && options.length > 0 && (
          <div className="pt-4 border-t border-slate-100 mt-4 space-y-2.5">
            <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-500">
              Pilih Opsi Tampilan & Aktivitas:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {options.map((opt) => {
                const Icon = opt.icon;
                const isActive = activeOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectOption && onSelectOption(opt.id)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-md font-bold'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {Icon && (
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-extrabold truncate leading-tight">
                          {opt.label}
                        </div>
                        {opt.subtitle && (
                          <div className={`text-xs sm:text-sm font-medium truncate mt-0.5 ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {opt.badge && (
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold shrink-0 ${
                          opt.badgeColor || (isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700')
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
