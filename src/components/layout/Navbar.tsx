import React, { useState } from 'react';
import {
  Building2,
  Shield,
  Scan,
  Search,
  Sun,
  Moon,
  Keyboard,
  FileCheck,
  CheckCircle2,
  ChevronDown,
  Rows3,
  UserPlus,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAppStore, appStore, DEMO_USERS } from '../../store/useAppStore';
import { ROLE_DEFINITIONS, getTierBadge, canManageUsers } from '../../utils/rbac';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
  const themeMode = useAppStore((state) => state.themeMode);
  const isHighDensity = useAppStore((state) => state.isHighDensity);
  const currentUser = useAppStore((state) => state.currentUser);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const tierMeta = getTierBadge(currentUser.tier);
  const isUserAdmin = canManageUsers(currentUser);

  return (
    <header className="sticky top-0 z-30 w-full border-b transition-colors bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-3 lg:px-6 h-16">
        {/* Left Section: Company Brand */}
        <div className="flex items-center gap-3">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md bg-blue-900 shadow-blue-900/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                ST. Morita Industries
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Enterprise ERP Portal
              </div>
            </div>
          </div>

          {/* Plant Badge */}
          <div className="hidden md:flex items-center gap-2 ml-1 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Kawasan Industri Cikarang</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded uppercase font-bold tracking-wider bg-blue-200/60 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              Adhesive Tapes
            </span>
          </div>
        </div>

        {/* Middle Section: Quick Command Bar & Scanner Launcher */}
        <div className="hidden lg:flex items-center gap-2 max-w-md w-full mx-4">
          <button
            id="open-command-palette-btn"
            onClick={() => appStore.setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 text-slate-400 dark:text-slate-400 text-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Cari DO, Batch QC, Faktur, Dokumen EXIM...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-300">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Section: Tools, RBAC Active User Switcher & Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick link to User Management for Admin */}
          <button
            id="navbar-admin-users-btn"
            onClick={() => appStore.setActiveModule('users')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs font-bold transition-colors"
            title="Kelola Akun Pegawai & RBAC"
          >
            <UserPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden md:inline">Akun Pegawai</span>
          </button>

          {/* Handheld Barcode Scanner Modal Trigger */}
          <button
            id="quick-barcode-scanner-btn"
            onClick={() => appStore.setBarcodeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
            title="Handheld Barcode Scanner PWA (Alt+B)"
          >
            <Scan className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>

          {/* High Density Table View Toggle */}
          <button
            id="toggle-high-density-btn"
            onClick={() => appStore.setHighDensity(!isHighDensity)}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              isHighDensity
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isHighDensity ? 'Mode Kerapatan: Padat/Compact' : 'Mode Kerapatan: Standar'}
          >
            <Rows3 className="w-4 h-4" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            id="toggle-theme-mode-btn"
            onClick={() => appStore.toggleThemeMode()}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Ubah Tema Gelap / Terang (Alt+T)"
          >
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Audit Logs Compliance Drawer Trigger */}
          <button
            id="open-audit-logs-btn"
            onClick={() => appStore.setAuditLogsOpen(true)}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors"
            title="Buka Audit Log & Kepatuhan Enkripsi SHA-256"
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-mono">SHA-256</span>
          </button>

          {/* Keyboard Shortcuts Dialog Trigger */}
          <button
            id="open-shortcuts-help-btn"
            onClick={() => appStore.setKeyboardShortcutsOpen(true)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Daftar Pintasan Keyboard (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Live RBAC Role Switcher & Profile Card */}
          <div className="relative ml-1">
            <button
              id="role-switcher-dropdown-btn"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800/80 transition-colors"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-300 dark:ring-slate-600"
              />
              <div className="text-left hidden xl:block">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                  <span className="truncate max-w-[130px]">{currentUser.name}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${tierMeta.badgeClass}`}>
                    L{currentUser.tier}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                  {ROLE_DEFINITIONS[currentUser.role]?.label || currentUser.role}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Role Switcher & Session Menu */}
            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-84 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      Simulasi Pengujian RBAC (4 Level)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Ganti profil untuk menguji filtering, masking & approval
                    </div>
                  </div>
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>

                <div className="max-h-72 overflow-y-auto py-1 space-y-1 mt-1">
                  {(Object.keys(ROLE_DEFINITIONS) as UserRole[]).map((roleKey) => {
                    const def = ROLE_DEFINITIONS[roleKey];
                    const isCurrent = currentUser.role === roleKey;
                    const tierBadge = getTierBadge(def.tier);
                    return (
                      <button
                        key={roleKey}
                        onClick={() => {
                          appStore.setCurrentUserRole(roleKey);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-start gap-2.5 ${
                          isCurrent
                            ? 'bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-[10px] font-extrabold ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          L{def.tier}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold truncate">{def.label}</span>
                            {isCurrent ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <span className={`text-[9px] px-1 py-0.2 rounded border font-mono font-bold ${tierBadge.badgeClass}`}>
                                L{def.tier}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {def.department}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Actions: Admin Management & Logout */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <button
                    onClick={() => {
                      appStore.setActiveModule('users');
                      setRoleDropdownOpen(false);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Buka Manajemen Akun Pegawai</span>
                    </span>
                    <span className="text-[10px] font-mono">Admin</span>
                  </button>

                  <button
                    id="navbar-logout-btn"
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      appStore.logout();
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar & Kembali ke Halaman Login</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
