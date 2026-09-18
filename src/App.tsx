import React, { useEffect, useState } from 'react';
import { useAppStore, appStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { FinanceAnalyticsModule } from './features/core6_finance_analytics/FinanceAnalyticsModule';
import { ProductionQcModule } from './features/core4_production_qc/ProductionQcModule';
import { ProcurementEximModule } from './features/core3_procurement_exim/ProcurementEximModule';
import { SalesTrackingModule } from './features/core5_sales_tracking/SalesTrackingModule';
import { MasterDataModule } from './features/core2_master_data/MasterDataModule';
import { HrdModule } from './features/core1_hrd/HrdModule';
import { UserManagementModule } from './features/admin_users/UserManagementModule';
import { LoginPage } from './features/auth/LoginPage';
import { ActivationPage } from './features/auth/ActivationPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { CompleteProfilePage } from './features/auth/CompleteProfilePage';
import { CommandPalette } from './components/shared/CommandPalette';
import { BarcodeScannerModal } from './components/shared/BarcodeScannerModal';
import { AuditLogsDrawer } from './components/shared/AuditLogsDrawer';
import { KeyboardShortcutsModal } from './components/shared/KeyboardShortcutsModal';
import { useRBAC } from './hooks/useRBAC';
import { Lock } from 'lucide-react';

type AuthPage = 'login' | 'activation' | 'forgot-password' | 'reset-password' | 'complete-profile';

export default function App() {
  const activeModule = useAppStore((state) => state.activeModule);
  const themeMode = useAppStore((state) => state.themeMode);

  // Auth state from Zustand
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialize = useAuthStore((state) => state.initialize);

  // Auth page routing (for unauthenticated screens)
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  
  // Session expiry modal state
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Ensure light mode is consistently applied across the app
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, []);

  // Listen for global auth:expired event from apiClient
  useEffect(() => {
    const handleSessionExpired = () => {
      setIsSessionExpired(true);
    };
    window.addEventListener('auth:expired', handleSessionExpired);
    return () => window.removeEventListener('auth:expired', handleSessionExpired);
  }, []);

  // Initialize auth on mount — check for persisted token & rehydrate session
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Ctrl/Cmd + K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        appStore.setCommandPaletteOpen(true);
      }

      // Ctrl/Cmd + B: Barcode Scanner
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        appStore.setBarcodeModalOpen(true);
      }

      // Ctrl/Cmd + L: Audit Logs
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        appStore.setAuditLogsOpen(true);
      }

      // ?: Help / Shortcuts modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        appStore.setKeyboardShortcutsOpen(true);
      }

      // Alt + S or Ctrl/Cmd + [: Toggle Sidebar
      if ((e.altKey && e.key.toLowerCase() === 's') || ((e.ctrlKey || e.metaKey) && e.key === '[')) {
        e.preventDefault();
        appStore.toggleSidebar();
      }

      // Alt + 1 through 7 for Fast Module Jump
      if (e.altKey && ['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        e.preventDefault();
        const moduleMap: Record<string, any> = {
          '1': 'hrd',
          '2': 'master_data',
          '3': 'procurement',
          '4': 'qc',
          '5': 'sales',
          '6': 'finance',
          '7': 'users',
        };
        appStore.setActiveModule(moduleMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { canAccessModule, isSuperAdmin, isExecutive } = useRBAC();

  // Auto-redirect to first available module if current one is not allowed
  useEffect(() => {
    if (isAuthenticated && !canAccessModule(activeModule)) {
      const allModules = ['finance', 'qc', 'procurement', 'sales', 'master_data', 'hrd', 'users'];
      const firstAllowed = allModules.find(m => canAccessModule(m));
      if (firstAllowed) {
        appStore.setActiveModule(firstAllowed as any);
      }
    }
  }, [activeModule, isAuthenticated, canAccessModule]);

  // ─── Loading: Auth Initialization ──────────────────────────
  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          {/* ST. Morita Logo */}
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 p-0.5 shadow-xl shadow-blue-600/20 flex items-center justify-center">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
              <circle cx="24" cy="24" r="19" stroke="white" strokeWidth="2.5" strokeOpacity="0.4" strokeDasharray="3 3" />
              <path
                d="M12 28C12 21.3726 17.3726 16 24 16C28.5 16 32.5 18.5 34.5 22C36.5 25.5 35 30 31.5 32C28 34 23 33 20 30"
                stroke="white"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle cx="24" cy="24" r="4.5" fill="white" />
              <path
                d="M27 24C27 27 24 30 20 30C16 30 14 26 14 22"
                stroke="#BAE6FD"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  // ─── Unauthenticated: Show Auth Pages ──────────────────────
  if (!isAuthenticated) {
    switch (authPage) {
      case 'activation':
        return <ActivationPage onNavigate={setAuthPage} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={setAuthPage} />;
      case 'reset-password':
        return <ResetPasswordPage onNavigate={setAuthPage} />;
      case 'complete-profile':
        return <CompleteProfilePage onNavigate={setAuthPage} />;
      default:
        return <LoginPage onNavigate={setAuthPage} />;
    }
  }

  // ─── Authenticated: Main Application Layout ────────────────
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden select-none">
      {/* Top Navigation - Fixed height */}
      <Navbar />

      {/* Body Area with Independent Sidebar + Content Viewport */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Responsive Independent Left Sidebar (Statis & Collapsible) */}
        <Sidebar />

        {/* Main Content Area - Completely Independent Scroll */}
        <main
          id="main-content-viewport"
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 sm:p-6 lg:p-8 select-text focus:outline-hidden"
        >
          <div className="w-full max-w-7xl mx-auto pb-12">
            {!canAccessModule(activeModule) ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <Lock className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-600">Akses Ditolak</h2>
                <p className="mt-2 text-sm text-center max-w-md">
                  Anda tidak memiliki izin (RBAC) untuk mengakses modul ini. Silakan hubungi IT Administrator (Level 0) jika ini adalah sebuah kesalahan.
                </p>
              </div>
            ) : (
              <>
                {activeModule === 'finance' && <FinanceAnalyticsModule />}
                {activeModule === 'qc' && <ProductionQcModule />}
                {activeModule === 'procurement' && <ProcurementEximModule />}
                {activeModule === 'sales' && <SalesTrackingModule />}
                {activeModule === 'master_data' && <MasterDataModule />}
                {activeModule === 'hrd' && <HrdModule />}
                {activeModule === 'users' && <UserManagementModule />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CommandPalette />
      <BarcodeScannerModal />
      <AuditLogsDrawer />
      <KeyboardShortcutsModal />

      {/* Session Expired Modal */}
      {isSessionExpired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full space-y-5 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Sesi Berakhir</h3>
                <p className="text-sm text-slate-500 mt-1">Sesi login Anda telah kedaluwarsa atau tidak valid. Silakan masuk kembali untuk melanjutkan aktivitas Anda.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsSessionExpired(false);
                useAuthStore.getState().logout();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              Masuk Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
