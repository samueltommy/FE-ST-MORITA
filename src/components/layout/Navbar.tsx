import React, { useState } from 'react';
import {
  Building2,
  Shield,
  Search,
  CheckCircle2,
  ChevronDown,
  UserPlus,
  LogOut,
  PlusCircle,
  Menu,
  User,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLE_DEFINITIONS, getTierBadge, canManageUsers } from '../../utils/rbac';
import { UserRole } from '../../types';
import { UniversalDataEntryModal } from '../forms/UniversalDataEntryModal';

const CONTENT = {
  id: {
    searchPh: 'Cari DO, Batch QC, Faktur, Dokumen EXIM...',
    newDataBtn: 'Input Data Baru',
    newDataBtnMobile: 'Input',
    manageAccounts: 'Kelola Akun',
    manageAccountsFull: 'Manajemen Pegawai',
    userAccount: 'Akun Pengguna',
    genEmployee: 'General Employee',
    language: 'Bahasa / Language',
    logoutBtn: 'Keluar & Kembali ke Login',
  },
  en: {
    searchPh: 'Search DO, QC Batch, Invoice, EXIM Docs...',
    newDataBtn: 'New Data Entry',
    newDataBtnMobile: 'New',
    manageAccounts: 'Manage Accounts',
    manageAccountsFull: 'Employee Management',
    userAccount: 'User Account',
    genEmployee: 'General Employee',
    language: 'Bahasa / Language',
    logoutBtn: 'Sign Out & Return to Login',
  }
};

export const Navbar: React.FC = () => {
  const authUser = useAuthStore((state) => state.user);
  const authLogout = useAuthStore((state) => state.logout);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [dataEntryModalOpen, setDataEntryModalOpen] = useState(false);
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language];

  // Use authUser (real backend)
  const displayName = authUser?.name;
  const displayRole = authUser?.role;
  const displayTier = authUser?.tier;
  const displayAvatar = authUser?.avatar;
  const displayDepartment = authUser?.department;

  const tierMeta = getTierBadge(displayTier ?? 3);
  const isUserAdmin = canManageUsers(authUser as any);

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur-md border-slate-200 shadow-xs shrink-0">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 w-full">
        {/* Left Section: Mobile Menu Toggle + Clean Company Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => appStore.toggleMobileSidebar()}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Buka Menu Navigasi"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm bg-blue-700 shadow-blue-700/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight tracking-tight">
              ST. Morita Industries
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 hidden sm:block">
              Enterprise ERP Portal
            </div>
          </div>
        </div>

        {/* Middle Section: Clean, Spacious Search Bar */}
        <div className="hidden md:flex items-center max-w-md w-full mx-6">
          <button
            id="open-command-palette-btn"
            onClick={() => appStore.setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-500 text-xs hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <span>{t.searchPh}</span>
            </span>
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Section: Universal + Input Data Baru, Profile & Role Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Universal Data Entry Button */}
          <button
            id="navbar-universal-data-entry-btn"
            onClick={() => setDataEntryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
            title="Buka Formulir Input Data Transaksi untuk Semua Modul"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t.newDataBtn}</span>
            <span className="sm:hidden">{t.newDataBtnMobile}</span>
          </button>

          {/* Quick link to User Management for Admin */}
          {isUserAdmin && (
            <button
              id="navbar-admin-users-btn"
              onClick={() => appStore.setActiveModule('users')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition-colors cursor-pointer"
              title="Kelola Akun Pegawai & RBAC"
            >
              <UserPlus className="w-3.5 h-3.5 text-purple-600" />
              <span>{t.manageAccounts}</span>
            </button>
          )}

          {/* User Profile & Dropdown */}
          <div className="relative">
            <button
              id="role-switcher-dropdown-btn"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/80 transition-all cursor-pointer"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold ring-1 ring-blue-500">
                  {displayName?.charAt(0)?.toUpperCase() || <User className="w-3.5 h-3.5" />}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                  <span className="truncate max-w-[120px]">{displayName}</span>
                  {displayTier != null && (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${tierMeta.badgeClass}`}>
                      L{displayTier}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                  {displayDepartment || t.genEmployee}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Session Dropdown Menu */}
            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      {t.userAccount}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {authUser?.email || displayDepartment}
                    </div>
                  </div>
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>

                {/* Language Toggle */}
                <div className="py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{t.language}</span>
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                    <button
                      onClick={() => appStore.setLanguage('id')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        language === 'id' 
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      ID
                    </button>
                    <button
                      onClick={() => appStore.setLanguage('en')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        language === 'en' 
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {/* Bottom Actions: Admin Management & Logout */}
                <div className="mt-2 pt-1 space-y-1.5">
                  {isUserAdmin && (
                    <button
                      onClick={() => {
                        appStore.setActiveModule('users');
                        setRoleDropdownOpen(false);
                      }}
                      className="w-full py-2 px-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{t.manageAccountsFull}</span>
                      </span>
                    </button>
                  )}

                  <button
                    id="navbar-logout-btn"
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      authLogout();
                    }}
                    className="w-full py-2 px-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.logoutBtn}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Universal Data Entry Modal */}
      <UniversalDataEntryModal
        isOpen={dataEntryModalOpen}
        onClose={() => setDataEntryModalOpen(false)}
      />
    </header>
  );
};
