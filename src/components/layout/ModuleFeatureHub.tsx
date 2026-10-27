import React from 'react';
import { LucideIcon, ArrowLeft, ChevronRight, Home, Calendar, UserCheck } from 'lucide-react';
import { appStore, useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

export interface ModuleFeatureHubItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  badge?: string | number;
  badgeColor?: string;
  onClick: () => void;
}

interface ModuleFeatureHubProps {
  moduleCode: string; // e.g. "Core 3"
  moduleName: string; // e.g. "PEMBELIAN"
  moduleDescription?: string;
  headerBgColor?: string; // e.g. "bg-emerald-600"
  headerTextColor?: string;
  items: ModuleFeatureHubItem[];
  onBackToHome?: () => void;
}

export const ModuleFeatureHub: React.FC<ModuleFeatureHubProps> = ({
  moduleCode,
  moduleName,
  moduleDescription = 'Pilih salah satu fitur atau menu di bawah ini untuk membuka data dan transaksi terkait.',
  headerBgColor = 'bg-emerald-600',
  headerTextColor = 'text-white',
  items,
  onBackToHome,
}) => {
  const authUser = useAuthStore((state) => state.user);

  // Format today's date in Indonesian friendly format (e.g., "Rabu, 07 Okt 2026")
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const handleBackToHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      appStore.setActiveModule('home');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-4 sm:py-8 px-2 sm:px-4 animate-in fade-in duration-200">
      {/* ─── Top Info Bar: Date, Operator & Quick Home Link ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-1 text-xs sm:text-sm text-slate-600 font-semibold">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{todayFormatted}</span>
          <span className="text-slate-300">|</span>
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-800 font-bold">{authUser?.name || 'Operator ST. Morita'}</span>
        </div>

        <button
          type="button"
          onClick={handleBackToHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
        >
          <Home className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span>Ke Menu Utama (Beranda)</span>
        </button>
      </div>

      {/* ─── The Simple Selection Menu Box (Sesuai Referensi Client) ─── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border-2 border-slate-200 overflow-hidden">
        {/* Header Band (Light Green / Brand Bar) */}
        <div className={`${headerBgColor} ${headerTextColor} px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between shadow-xs`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/15 text-white">
                {moduleCode}
              </span>
              <h2 className="text-base sm:text-xl font-black uppercase tracking-wider">
                {moduleName}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-white/90 mt-1 font-medium max-w-xl">
              {moduleDescription}
            </p>
          </div>
        </div>

        {/* List of Feature Options */}
        <div className="divide-y divide-slate-100">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id || idx}
                type="button"
                onClick={item.onClick}
                className="w-full px-5 sm:px-7 py-4 sm:py-4.5 flex items-center justify-between gap-4 text-left hover:bg-blue-50/60 active:bg-blue-100/70 transition-all cursor-pointer group focus:outline-hidden focus:bg-blue-50/80"
              >
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                    <Icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${item.iconColor || 'text-slate-700'} group-hover:text-white transition-colors`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-black text-slate-800 group-hover:text-blue-700 uppercase tracking-wide truncate">
                      {item.label}
                    </div>
                    {item.subtitle && (
                      <div className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        item.badgeColor || 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}

          {/* Bottom "KEMBALI KE MENU UTAMA" Row */}
          <button
            type="button"
            onClick={handleBackToHome}
            className="w-full px-5 sm:px-7 py-4 flex items-center gap-3 text-left hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer text-slate-600 hover:text-slate-900 font-extrabold uppercase tracking-wide text-xs sm:text-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Menu Utama</span>
          </button>
        </div>
      </div>
    </div>
  );
};
