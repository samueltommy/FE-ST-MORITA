import React from 'react';
import {
  Calculator,
  ShieldCheck,
  Truck,
  Boxes,
  Users,
  FileSpreadsheet,
  ScanLine,
  History,
  UserPlus,
  LogOut,
  Shield,
  Key,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { canManageUsers, getTierBadge } from '../../utils/rbac';

export const Sidebar: React.FC = () => {
  const activeModule = useAppStore((state) => state.activeModule);
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
  const currentUser = useAppStore((state) => state.currentUser);
  const qcRecords = useAppStore((state) => state.qcRecords);
  const quotations = useAppStore((state) => state.quotations);

  // Count active QC Hold batches
  const activeQcHoldCount = qcRecords.filter(
    (r) => r.status === 'HOLD' && r.businessUnit === currentUnit
  ).length;

  // Count quotations pending cost control
  const pendingCostControlCount = quotations.filter(
    (q) => q.status === 'PENDING_COST_CONTROL' && q.businessUnit === currentUnit
  ).length;

  const isUserAdmin = canManageUsers(currentUser);
  const tierMeta = getTierBadge(currentUser.tier);

  const modules = [
    {
      id: 'finance',
      code: 'Core 6',
      label: 'Finance & Analytics',
      sublabel: '13-Rumus Sales Invoice Multi-DO',
      icon: Calculator,
      shortcut: 'Alt+6',
      color: 'text-emerald-500',
    },
    {
      id: 'qc',
      code: 'Core 4',
      label: 'Production & QC Hold',
      sublabel: 'Shop-Floor Lockout & COA',
      icon: ShieldCheck,
      shortcut: 'Alt+4',
      badge: activeQcHoldCount > 0 ? `${activeQcHoldCount} HOLD` : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
      color: 'text-rose-500',
    },
    {
      id: 'procurement',
      code: 'Core 3',
      label: 'Supply Chain & EXIM',
      sublabel: 'Kanban Pabean BC 2.3/2.7/4.0',
      icon: Truck,
      shortcut: 'Alt+3',
      color: 'text-indigo-500',
    },
    {
      id: 'sales',
      code: 'Core 5',
      label: 'Sales & E-Tracking',
      sublabel: 'Gating Margin & Barcode Timeline',
      icon: FileSpreadsheet,
      shortcut: 'Alt+5',
      badge: pendingCostControlCount > 0 ? `${pendingCostControlCount} Gated` : undefined,
      badgeColor: 'bg-amber-500 text-white',
      color: 'text-amber-500',
    },
    {
      id: 'master_data',
      code: 'Core 2',
      label: 'Master Data (MDM)',
      sublabel: 'Zebra LOT & Barcode Label',
      icon: Boxes,
      shortcut: 'Alt+2',
      color: 'text-sky-500',
    },
    {
      id: 'hrd',
      code: 'Core 1',
      label: 'HRD & Cikarang Plant',
      sublabel: 'Armada Pabrik & GPS Visit Sales',
      icon: Users,
      shortcut: 'Alt+1',
      color: 'text-violet-500',
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hidden md:flex flex-col justify-between py-3">
      {/* Top Section: Navigation Links */}
      <div className="space-y-4 px-3 overflow-y-auto">
        {/* Active Business Unit indicator pill */}
        <div className="p-2.5 rounded-xl border flex items-center justify-between transition-all bg-blue-50/70 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              ST. Morita Industries
            </div>
            <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span>Pabrik Cikarang (Adhesive Tapes)</span>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
        </div>

        {/* Modules List */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
            Modul Operasional ERP
          </div>
          <nav className="space-y-1">
            {modules.map((m) => {
              const Icon = m.icon;
              const isActive = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  id={`nav-module-${m.id}`}
                  onClick={() => appStore.setActiveModule(m.id as any)}
                  className={`w-full text-left p-2 rounded-xl flex items-center justify-between group transition-all text-xs ${
                    isActive
                      ? 'bg-blue-900 text-white font-bold shadow-md shadow-blue-900/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-teal-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate flex items-center gap-1.5">
                        <span>{m.label}</span>
                        {m.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${m.badgeColor}`}
                          >
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive
                            ? 'text-white/80'
                            : 'text-slate-400 dark:text-slate-400'
                        }`}
                      >
                        {m.sublabel}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-1 py-0.5 rounded opacity-70 ${
                      isActive
                        ? 'bg-black/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {m.shortcut}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Administration & RBAC Section */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
            <span>Administrasi & Akses</span>
            <span className="text-[9px] text-blue-500 font-bold">RBAC v2.0</span>
          </div>

          <div className="space-y-1">
            {/* User Account Management (Admin & HRD) */}
            <button
              id="sidebar-nav-users-btn"
              onClick={() => appStore.setActiveModule('users')}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between group transition-all text-xs ${
                activeModule === 'users'
                  ? 'bg-purple-900 text-white font-bold shadow-md shadow-purple-900/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    activeModule === 'users'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate flex items-center gap-1.5">
                    <span>Akun Pegawai & RBAC</span>
                    {isUserAdmin && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider bg-purple-500 text-white">
                        Admin
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      activeModule === 'users' ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    Daftar & Hak Akses Level 0-3
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded opacity-70 bg-slate-100 dark:bg-slate-800 text-slate-400">
                Alt+7
              </span>
            </button>
          </div>
        </div>

        {/* Operational Utilities */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
            Alat Lapangan & Audit
          </div>
          <div className="space-y-1">
            {/* Handheld PWA Scanner */}
            <button
              id="sidebar-pwa-scanner-btn"
              onClick={() => appStore.setBarcodeModalOpen(true)}
              className="w-full text-left p-2 rounded-xl flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold">Scanner Barcode PWA</div>
                  <div className="text-[10px] text-slate-400">Pabrik & Gudang Cikarang</div>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                Alt+B
              </span>
            </button>

            {/* Audit Logs Trail */}
            <button
              id="sidebar-audit-trail-btn"
              onClick={() => appStore.setAuditLogsOpen(true)}
              className="w-full text-left p-2 rounded-xl flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold">Audit Trail Kepatuhan</div>
                  <div className="text-[10px] text-slate-400">Enkripsi Log SHA-256</div>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                SEC
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Active User Context & Logout */}
      <div className="px-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex items-center justify-between">
            <span
              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${tierMeta.badgeClass}`}
            >
              {tierMeta.pillText} &bull; L{currentUser.tier}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Aktif
            </span>
          </div>
          <div className="mt-1 font-bold text-slate-900 dark:text-white truncate">
            {currentUser.name}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {currentUser.nik} &bull; {currentUser.role}
          </div>
        </div>

        {/* Logout Button */}
        <button
          id="sidebar-logout-btn"
          onClick={() => appStore.logout()}
          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar dari Portal ERP</span>
        </button>
      </div>
    </aside>
  );
};
