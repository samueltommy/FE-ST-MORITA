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
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Building2,
  Keyboard,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { canManageUsers, getTierBadge } from '../../utils/rbac';

export const Sidebar: React.FC = () => {
  const activeModule = useAppStore((state) => state.activeModule);
  const currentUser = useAppStore((state) => state.currentUser);
  const qcRecords = useAppStore((state) => state.qcRecords);
  const quotations = useAppStore((state) => state.quotations);
  const isSidebarCollapsed = useAppStore((state) => state.isSidebarCollapsed);
  const isMobileSidebarOpen = useAppStore((state) => state.isMobileSidebarOpen);

  // Count active QC Hold batches
  const activeQcHoldCount = qcRecords.filter(
    (r) => r.status === 'HOLD'
  ).length;

  // Count quotations pending cost control
  const pendingCostControlCount = quotations.filter(
    (q) => q.status === 'PENDING_COST_CONTROL'
  ).length;

  const isUserAdmin = canManageUsers(currentUser);
  const tierMeta = getTierBadge(currentUser.tier);

  const modules = [
    {
      id: 'finance',
      code: 'Core 6',
      label: 'Finance & Analytics',
      sublabel: '13-Rumus Sales Invoice',
      icon: Calculator,
      shortcut: 'Alt+6',
      color: 'text-emerald-600',
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
      color: 'text-rose-600',
    },
    {
      id: 'procurement',
      code: 'Core 3',
      label: 'Supply Chain & EXIM',
      sublabel: 'Pabean BC 2.3/2.7/4.0',
      icon: Truck,
      shortcut: 'Alt+3',
      color: 'text-indigo-600',
    },
    {
      id: 'sales',
      code: 'Core 5',
      label: 'Sales & E-Tracking',
      sublabel: 'Gating Margin & Barcode',
      icon: FileSpreadsheet,
      shortcut: 'Alt+5',
      badge: pendingCostControlCount > 0 ? `${pendingCostControlCount} Gated` : undefined,
      badgeColor: 'bg-amber-500 text-white',
      color: 'text-amber-600',
    },
    {
      id: 'master_data',
      code: 'Core 2',
      label: 'Master Data (MDM)',
      sublabel: 'Zebra LOT & Barcode Label',
      icon: Boxes,
      shortcut: 'Alt+2',
      color: 'text-sky-600',
    },
    {
      id: 'hrd',
      code: 'Core 1',
      label: 'HRD & Fasilitas',
      sublabel: 'Armada & GPS Visit Sales',
      icon: Users,
      shortcut: 'Alt+1',
      color: 'text-violet-600',
    },
  ];

  const handleSelectModule = (id: any) => {
    appStore.setActiveModule(id);
    if (isMobileSidebarOpen) {
      appStore.setMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          onClick={() => appStore.setMobileSidebarOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. DESKTOP SIDEBAR (Independent scroll, statis tanpa scroll di layar standar) */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 h-full border-r border-slate-200 bg-white transition-all duration-200 ease-in-out select-none z-20 shadow-xs ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Top Header & Collapse/Expand Toggle */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">
                Menu Navigasi
              </span>
              <button
                id="sidebar-collapse-btn"
                onClick={() => appStore.toggleSidebar()}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Kecilkan Menu / Lebarkan Tampilan"
                aria-label="Kecilkan Menu"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <button
                id="sidebar-expand-btn"
                onClick={() => appStore.toggleSidebar()}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Lebarkan Menu Navigasi"
                aria-label="Lebarkan Menu"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Body (Compact & Statis tanpa scroll di layar standar) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-3">
          {/* Core Modules List */}
          <div>
            {!isSidebarCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                Modul Operasional
              </div>
            )}
            <nav className="space-y-1">
              {modules.map((m) => {
                const Icon = m.icon;
                const isActive = activeModule === m.id;
                return (
                  <button
                    key={m.id}
                    id={`nav-module-${m.id}`}
                    onClick={() => handleSelectModule(m.id)}
                    title={`${m.label} (${m.shortcut})`}
                    className={`w-full text-left rounded-xl flex items-center transition-all cursor-pointer relative group ${
                      isSidebarCollapsed
                        ? 'p-2 justify-center'
                        : 'px-2.5 py-2 justify-between'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/25'
                        : 'text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600 group-hover:text-blue-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="min-w-0">
                          <div className="text-xs flex items-center gap-1.5 leading-tight min-w-0">
                            <span className="truncate">{m.label}</span>
                            {m.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${m.badgeColor}`}
                              >
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] truncate leading-tight mt-0.5 ${
                              isActive ? 'text-white/80' : 'text-slate-400'
                            }`}
                          >
                            {m.sublabel}
                          </div>
                        </div>
                      )}
                    </div>
                    {isSidebarCollapsed && m.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Administration & RBAC Section */}
          <div className="pt-2 border-t border-slate-100">
            {!isSidebarCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
                <span>Administrasi</span>
                <span className="text-[9px] text-purple-600 font-bold">RBAC</span>
              </div>
            )}
            <button
              id="sidebar-nav-users-btn"
              onClick={() => handleSelectModule('users')}
              title="Akun Pegawai & RBAC"
              className={`w-full text-left rounded-xl flex items-center transition-all cursor-pointer ${
                isSidebarCollapsed
                  ? 'p-2 justify-center'
                  : 'px-2.5 py-2 justify-between'
              } ${
                activeModule === 'users'
                  ? 'bg-purple-700 text-white font-bold shadow-sm shadow-purple-700/25'
                  : 'text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    activeModule === 'users'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-50 text-purple-600'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <div className="text-xs flex items-center gap-1.5 leading-tight min-w-0">
                      <span>Akun Pegawai & RBAC</span>
                      {isUserAdmin && (
                        <span className="text-[9px] px-1 py-0.5 rounded-full font-bold uppercase bg-purple-500 text-white">
                          Admin
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] truncate leading-tight mt-0.5 ${
                        activeModule === 'users' ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      Hak Akses Level 0-3
                    </div>
                  </div>
                )}
              </div>
              
            </button>
          </div>

          {/* Operational Tools Section */}
          <div className="pt-2 border-t border-slate-100">
            {!isSidebarCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                Alat Lapangan
              </div>
            )}
            <div className="space-y-1">
              <button
                id="sidebar-pwa-scanner-btn"
                onClick={() => appStore.setBarcodeModalOpen(true)}
                title="Scanner Barcode PWA"
                className={`w-full text-left rounded-xl flex items-center text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
                  isSidebarCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="min-w-0">
                      <div className="font-semibold truncate leading-tight text-xs">Scanner Barcode</div>
                      <div className="text-[10px] text-slate-400 truncate leading-tight">Pabrik & Gudang</div>
                    </div>
                  )}
                </div>
                
              </button>

              <button
                id="sidebar-audit-trail-btn"
                onClick={() => appStore.setAuditLogsOpen(true)}
                title="Audit Trail Kepatuhan SHA-256"
                className={`w-full text-left rounded-xl flex items-center text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
                  isSidebarCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <History className="w-4 h-4" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="min-w-0">
                      <div className="font-semibold truncate leading-tight text-xs">Audit Trail</div>
                      <div className="text-[10px] text-slate-400 truncate leading-tight">Enkripsi SHA-256</div>
                    </div>
                  )}
                </div>
                
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Active User Context & Logout */}
        <div className="shrink-0 p-2.5 border-t border-slate-200 bg-slate-50/70 space-y-1.5">
          {!isSidebarCollapsed ? (
            <>
              <div
                title={`${currentUser.name} (${currentUser.role} - L${currentUser.tier})`}
                className="w-full text-left rounded-xl flex items-center gap-2.5 p-2"
              >
                <div className="relative">
                  <img src={currentUser.avatar} alt="User Avatar" className="w-8 h-8 rounded-lg object-cover ring-2 ring-white shadow-sm" />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium truncate">{currentUser.department}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                <button
                  onClick={() => appStore.logout()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
                <button
                  onClick={() => appStore.setKeyboardShortcutsOpen(true)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Keyboard Shortcuts"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div
                title={`${currentUser.name} (${currentUser.role} - L${currentUser.tier})`}
                className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 shrink-0"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                id="sidebar-collapsed-logout-btn"
                onClick={() => appStore.logout()}
                title="Keluar dari Portal ERP"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE DRAWER SIDEBAR (Off-canvas slide-in untuk tampilan layar kecil) */}
      {/* ========================================================================= */}
      {isMobileSidebarOpen && (
        <aside
          className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col justify-between py-4 border-r border-slate-200 md:hidden animate-in slide-in-from-left duration-200"
        >
          {/* Mobile Header */}
          <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900 leading-tight">ST. Morita Industries</div>
                <div className="text-[10px] text-slate-500">Enterprise ERP Portal</div>
              </div>
            </div>
            <button
              onClick={() => appStore.setMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Modul Operasional ERP
              </div>
              <nav className="space-y-1">
                {modules.map((m) => {
                  const Icon = m.icon;
                  const isActive = activeModule === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectModule(m.id)}
                      className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors text-xs ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold">{m.label}</div>
                          <div className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                            {m.sublabel}
                          </div>
                        </div>
                      </div>
                      {m.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${m.badgeColor}`}>
                          {m.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile RBAC */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Administrasi & Akses
              </div>
              <button
                onClick={() => handleSelectModule('users')}
                className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs ${
                  activeModule === 'users'
                    ? 'bg-purple-700 text-white font-bold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Akun Pegawai & RBAC</div>
                    <div className="text-[10px] text-slate-400">Hak Akses Level 0-3</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Mobile Tools */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Alat Lapangan
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    appStore.setMobileSidebarOpen(false);
                    appStore.setBarcodeModalOpen(true);
                  }}
                  className="w-full text-left p-2 rounded-xl flex items-center gap-2.5 text-xs text-slate-700 hover:bg-slate-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Scanner Barcode PWA</div>
                    <div className="text-[10px] text-slate-400">Pabrik & Gudang Manufaktur</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    appStore.setMobileSidebarOpen(false);
                    appStore.setAuditLogsOpen(true);
                  }}
                  className="w-full text-left p-2 rounded-xl flex items-center gap-2.5 text-xs text-slate-700 hover:bg-slate-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Audit Trail Kepatuhan</div>
                    <div className="text-[10px] text-slate-400">Enkripsi Log SHA-256</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Footer User */}
          <div className="px-4 pt-3 border-t border-slate-200 space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="font-bold text-slate-900">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500">{currentUser.nik} &bull; {currentUser.role}</div>
            </div>
            <button
              onClick={() => appStore.logout()}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Portal</span>
            </button>
          </div>
        </aside>
      )}
    </>
  );
};
