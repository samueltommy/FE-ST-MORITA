import React, { useEffect } from 'react';
import { useAppStore, appStore } from './store/useAppStore';
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
import { CommandPalette } from './components/shared/CommandPalette';
import { BarcodeScannerModal } from './components/shared/BarcodeScannerModal';
import { AuditLogsDrawer } from './components/shared/AuditLogsDrawer';
import { KeyboardShortcutsModal } from './components/shared/KeyboardShortcutsModal';

export default function App() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const activeModule = useAppStore((state) => state.activeModule);
  const themeMode = useAppStore((state) => state.themeMode);
  const isHighDensity = useAppStore((state) => state.isHighDensity);

  // Ensure light mode is consistently applied across the app
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, []);

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

  // If user is not authenticated, present the enterprise LoginPage directly
  if (!isAuthenticated) {
    return <LoginPage />;
  }

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
            {activeModule === 'finance' && <FinanceAnalyticsModule />}
            {activeModule === 'qc' && <ProductionQcModule />}
            {activeModule === 'procurement' && <ProcurementEximModule />}
            {activeModule === 'sales' && <SalesTrackingModule />}
            {activeModule === 'master_data' && <MasterDataModule />}
            {activeModule === 'hrd' && <HrdModule />}
            {activeModule === 'users' && <UserManagementModule />}
          </div>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CommandPalette />
      <BarcodeScannerModal />
      <AuditLogsDrawer />
      <KeyboardShortcutsModal />
    </div>
  );
}
