import React from 'react';
import { LucideIcon, Home, Calendar, UserCheck, ArrowRight } from 'lucide-react';
import { appStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

export type QuickActionTone = 'blue' | 'green';

export interface QuickActionItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** blue / green = tombol aksi utama (Primary), slate = aksi sekunder */
  tone?: QuickActionTone | 'slate';
  badge?: string | number;
  onClick: () => void;
}

export interface QuickActionGroup {
  title: string;
  items: QuickActionItem[];
}

interface QuickActionDashboardProps {
  moduleCode: string;
  moduleName: string;
  moduleDescription?: string;
  /** Tombol besar utama (mis. "+ BUAT PO BARU", "LIHAT DAFTAR PO") */
  primaryActions: QuickActionItem[];
  /** Tile sekunder, dikelompokkan (opsional) */
  groups?: QuickActionGroup[];
  onBackToHome?: () => void;
}

const TONE_STYLES = {
  blue: {
    card: 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-700 shadow-blue-600/25',
    icon: 'bg-white/20 text-white',
  },
  green: {
    card: 'bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-700 shadow-emerald-600/25',
    icon: 'bg-white/20 text-white',
  },
} as const;

export const QuickActionDashboard: React.FC<QuickActionDashboardProps> = ({
  moduleCode,
  moduleName,
  moduleDescription,
  primaryActions,
  groups = [],
  onBackToHome,
}) => {
  const authUser = useAuthStore((s) => s.user);
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-4 space-y-6 animate-in fade-in duration-200">
      {/* Info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-600 font-semibold">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{today}</span>
          <span className="text-slate-300">|</span>
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-800 font-bold">{authUser?.name || 'Operator ST. Morita'}</span>
        </div>
        <button
          type="button"
          onClick={() => (onBackToHome ? onBackToHome() : appStore.setActiveModule('home'))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          Ke Menu Utama (Beranda)
        </button>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {moduleCode}
          </span>
          <h1 className="text-lg sm:text-2xl font-black uppercase tracking-wide text-slate-900">{moduleName}</h1>
        </div>
        {moduleDescription && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{moduleDescription}</p>}
      </div>

      {/* Primary big action buttons */}
      <section aria-label="Aksi cepat" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {primaryActions.map((a) => {
          const Icon = a.icon;
          const tone = TONE_STYLES[(a.tone === 'green' ? 'green' : 'blue') as QuickActionTone];
          return (
            <button
              key={a.id}
              id={`quick-action-${a.id}`}
              type="button"
              onClick={a.onClick}
              className={`group relative overflow-hidden text-left rounded-2xl p-6 sm:p-7 min-h-[150px] text-white shadow-lg ${tone.card} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-blue-300`}
            >
              <Icon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 group-hover:text-white/15 transition-transform duration-300" />
              <div className="relative flex flex-col h-full justify-between gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${tone.icon}`}>
                  <Icon className="w-8 h-8" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black tracking-wide uppercase">{a.label}</span>
                    {a.badge !== undefined && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/25">{a.badge}</span>
                    )}
                  </div>
                  {a.description && <p className="text-sm text-white/85 mt-1 font-medium">{a.description}</p>}
                </div>
                <ArrowRight className="absolute top-0 right-0 w-6 h-6 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </section>

      {/* Secondary tiles */}
      {groups.map((g) => (
        <section key={g.title} className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">{g.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {g.items.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={it.id}
                  id={`quick-tile-${it.id}`}
                  type="button"
                  onClick={it.onClick}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-4 text-left shadow-sm hover:shadow-md hover:border-emerald-500 hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="mt-3 text-sm font-black uppercase tracking-wide text-slate-800 group-hover:text-emerald-700">
                    {it.label}
                  </div>
                  {it.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{it.description}</div>}
                  {it.badge !== undefined && (
                    <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {it.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
