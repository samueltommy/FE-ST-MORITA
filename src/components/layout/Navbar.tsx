import React, { useState } from 'react';
import {
  Building2,
  Shield,
  Search,
  CheckCircle2,
  ChevronDown,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { ROLE_DEFINITIONS, getTierBadge, canManageUsers } from '../../utils/rbac';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const tierMeta = getTierBadge(currentUser.tier);
  const isUserAdmin = canManageUsers(currentUser);

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur-md border-slate-200 shadow-xs">
      <div className="flex items-center justify-between px-4 lg:px-8 h-16 max-w-7xl mx-auto w-full">
        {/* Left Section: Clean Company Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm bg-blue-700 shadow-blue-700/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900 leading-tight tracking-tight">
                ST. Morita Industries
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Enterprise ERP Portal
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Clean, Spacious Search Bar */}
        <div className="hidden md:flex items-center max-w-md w-full mx-8">
          <button
            id="open-command-palette-btn"
            onClick={() => appStore.setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-500 text-xs hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <span>Cari DO, Batch QC, Faktur, Dokumen EXIM...</span>
            </span>
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Section: Clean Profile & Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Quick link to User Management for Admin */}
          {isUserAdmin && (
            <button
              id="navbar-admin-users-btn"
              onClick={() => appStore.setActiveModule('users')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition-colors cursor-pointer"
              title="Kelola Akun Pegawai & RBAC"
            >
              <UserPlus className="w-3.5 h-3.5 text-purple-600" />
              <span>Kelola Akun</span>
            </button>
          )}

          {/* User Profile & Role Switcher Dropdown */}
          <div className="relative">
            <button
              id="role-switcher-dropdown-btn"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/80 transition-all cursor-pointer"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                  <span className="truncate max-w-[120px]">{currentUser.name}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${tierMeta.badgeClass}`}>
                    L{currentUser.tier}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                  {ROLE_DEFINITIONS[currentUser.role]?.label || currentUser.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Role Switcher & Session Dropdown Menu */}
            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      Ganti Pengguna & Hak Akses
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Uji simulasi 4 level RBAC sistem
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
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-start gap-2.5 cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50 border border-blue-200 text-blue-950 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-[10px] font-extrabold ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          L{def.tier}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="truncate">{def.label}</span>
                            {isCurrent ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold ${tierBadge.badgeClass}`}>
                                L{def.tier}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate font-normal">
                            {def.department}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Actions: Admin Management & Logout */}
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                  <button
                    onClick={() => {
                      appStore.setActiveModule('users');
                      setRoleDropdownOpen(false);
                    }}
                    className="w-full py-2 px-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Manajemen Akun Pegawai</span>
                    </span>
                    <span className="text-[10px] font-mono">Admin</span>
                  </button>

                  <button
                    id="navbar-logout-btn"
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      appStore.logout();
                    }}
                    className="w-full py-2 px-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
