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
  Home,
  ChevronDown,
  FileText,
  Award,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Calendar,
  Lock,
  Plus,
  Barcode,
  FlaskConical,
  BookOpen,
  Send,
  Trash2,
  FileCheck2,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { canManageUsers, getTierBadge } from '../../utils/rbac';
import { useRBAC } from '../../hooks/useRBAC';

interface ModuleChildItem {
  id: string;
  label: string;
  icon: any;
  endpoint?: string;
  badge?: string;
  badgeColor?: string;
}

/**
 * 8 Divisi Sub-menu sesuai spesifikasi Backend API:
 * 1. Sales (SALES)
 * 2. Delivery (DELIVERY)
 * 3. Warehouse & PPIC (WAREHOUSE_PPIC)
 * 4. Produksi & QC (PRODUKSI_QC)
 * 5. Pembelian / Purchasing (PURCHASING)
 * 6. Finance (FINANCE)
 * 7. RND (RND)
 * 8. HRD (HRD)
 */
const MODULE_CHILDREN: Record<string, ModuleChildItem[]> = {
  sales: [
    { id: 'quotations', label: 'Quotation (/sales/quotations)', icon: FileSpreadsheet },
    { id: 'incoming_orders', label: 'Incoming Order / IO (/sales/incoming-orders)', icon: FileText },
    { id: 'sales_activities', label: 'Aktivitas & Kunjungan Sales / SDA', icon: Navigation },
    { id: 'customers', label: 'Master Customer (/mdm/customers)', icon: Users },
  ],
  delivery: [
    { id: 'delivery_orders', label: 'Delivery Order / Surat Jalan', icon: Truck, endpoint: '/logistics/delivery-orders' },
    { id: 'e_tracking', label: 'E-Tracking Barcode/GPS', icon: Barcode, endpoint: '/tracking/barcode/{id}' },
    { id: 'vehicle_bookings', label: 'Peminjaman Kendaraan Dinas', icon: Building2, endpoint: '/hrd/vehicle-bookings' },
  ],
  warehouse_ppic: [
    { id: 'goods_receipts', label: 'Penerimaan Barang / Receiving LOG', icon: Truck, endpoint: '/warehouse/goods-receipts' },
    { id: 'waste_logs', label: 'Pencatatan Limbah / Waste', icon: Trash2, endpoint: '/warehouse/waste-logs' },
    { id: 'work_orders', label: 'SPK Produksi / Work Orders', icon: FileSpreadsheet, endpoint: '/production/work-orders' },
    { id: 'items', label: 'Master Item & Stok (/mdm/items)', icon: Boxes, endpoint: '/mdm/items' },
  ],
  produksi_qc: [
    { id: 'production_outputs', label: 'Input Hasil Produksi', icon: FileText, endpoint: '/production/outputs' },
    { id: 'qc_inspections', label: 'Inspeksi QC IQC/PQC/OQC', icon: ShieldCheck, endpoint: '/qc/inspections' },
    { id: 'qc_records', label: 'Rekam QC (/production/qc-records)', icon: CheckCircle2, endpoint: '/production/qc-records' },
    { id: 'hold_release', label: 'Otorisasi Release Hold QC', icon: ShieldAlert, endpoint: '/qc/hold-lockout/release', badge: 'HOLD', badgeColor: 'bg-rose-500 text-white' },
  ],
  purchasing: [
    { id: 'purchase_requests', label: 'Purchase Request / PR', icon: FileText, endpoint: '/procurement/purchase-requests' },
    { id: 'purchase_orders', label: 'Purchase Order / PO', icon: Truck, endpoint: '/procurement/purchase-orders' },
    { id: 'exim_docs', label: 'Dokumen Exim (/procurement/exim-docs)', icon: ShieldCheck, endpoint: '/procurement/exim-docs' },
    { id: 'suppliers', label: 'Master Supplier (/mdm/suppliers)', icon: Building2, endpoint: '/mdm/suppliers' },
  ],
  finance: [
    { id: 'cost_control', label: 'Validasi Cost Control Quotation', icon: ShieldCheck, endpoint: '/cost-control/quotations/{id}/validate' },
    { id: 'invoices', label: 'Kalkulasi & Sales Invoice 13 Rumus', icon: Calculator, endpoint: '/finance/invoices' },
    { id: 'ar_payments', label: 'Piutang AR & Pembayaran', icon: FileSpreadsheet, endpoint: '/finance/account-receivables/{id}/payments' },
    { id: 'complaints', label: 'E-Complaint & RMA (/complaints)', icon: AlertCircle, endpoint: '/complaints' },
  ],
  rnd: [
    { id: 'rnd_trials', label: 'R&D Trial Formula (/rnd/trials)', icon: FlaskConical, endpoint: '/rnd/trials' },
    { id: 'convert_bom', label: 'Konversi Formula ke Master BOM', icon: FileCheck2, endpoint: '/rnd/trials/{id}/convert-to-bom' },
    { id: 'e_catalog', label: 'Publikasi E-Katalog (/marketing/catalog)', icon: BookOpen, endpoint: '/marketing/catalog' },
    { id: 'sample_requests', label: 'Permintaan Sampel (/public/request-sample)', icon: Send, endpoint: '/public/request-sample' },
  ],
  hrd: [
    { id: 'employees', label: 'Master Data Karyawan (/hrd/employees)', icon: Users, endpoint: '/hrd/employees' },
    { id: 'requests', label: 'Pengajuan & Approval Cuti/Izin', icon: Calendar, endpoint: '/hrd/requests' },
    { id: 'attendance', label: 'Presensi / Kehadiran Harian', icon: CheckCircle2, endpoint: '/hrd/attendance' },
  ],
  users: [
    { id: 'list', label: 'Daftar Akun Pegawai & RBAC', icon: Users },
    { id: 'new_user', label: 'Buat Akun Pegawai Baru', icon: UserPlus },
  ],
};

const CONTENT = {
  id: {
    navMenu: 'Menu Navigasi (8 Divisi)',
    modules: '8 Divisi Operasional',
    admin: 'Administrasi',
    adminSub: 'RBAC',
    manageUsers: 'Akun Pegawai & RBAC',
    manageUsersSub: 'Hak Akses Level 0-3',
    tools: 'Alat Lapangan',
    scanner: 'Scanner Barcode PWA',
    scannerSub: 'Pabrik & Gudang Manufaktur',
    audit: 'Audit Trail Kepatuhan',
    auditSub: 'Enkripsi Log SHA-256',
    signOut: 'Sign Out',
    moduleNames: {
      home: 'Menu Utama (Beranda)',
      homeSub: 'Launcher 8 Divisi',
      sales: '1. Sales',
      salesSub: 'Quotation, IO, SDA, Customer',
      delivery: '2. Delivery',
      deliverySub: 'Surat Jalan, E-Tracking, Armada',
      warehouse_ppic: '3. Warehouse & PPIC',
      warehouse_ppicSub: 'LOG, Limbah, SPK, Master Item',
      produksi_qc: '4. Produksi & QC',
      produksi_qcSub: 'Output, Inspeksi QC, Release Hold',
      purchasing: '5. Pembelian (Purchasing)',
      purchasingSub: 'PR, PO, Exim Docs, Supplier',
      finance: '6. Finance',
      financeSub: 'Cost Control, Invoice 13 Rumus, AR',
      rnd: '7. RND',
      rndSub: 'Trial Formula, BOM, E-Katalog, Sampel',
      hrd: '8. HRD',
      hrdSub: 'Data Karyawan, Cuti/Izin, Presensi',
    },
  },
  en: {
    navMenu: 'Navigation Menu (8 Divisions)',
    modules: '8 Operational Divisions',
    admin: 'Administration',
    adminSub: 'RBAC',
    manageUsers: 'Employee Accounts & RBAC',
    manageUsersSub: 'Access Rights Level 0-3',
    tools: 'Field Tools',
    scanner: 'PWA Barcode Scanner',
    scannerSub: 'Manufacturing Factory & Warehouse',
    audit: 'Compliance Audit Trail',
    auditSub: 'SHA-256 Log Encryption',
    signOut: 'Sign Out',
    moduleNames: {
      home: 'Main Menu (Home)',
      homeSub: '8 Divisions Launcher',
      sales: '1. Sales',
      salesSub: 'Quotation, IO, SDA, Customer',
      delivery: '2. Delivery',
      deliverySub: 'Delivery Order, Tracking, Fleet',
      warehouse_ppic: '3. Warehouse & PPIC',
      warehouse_ppicSub: 'LOG, Waste, SPK, Master Items',
      produksi_qc: '4. Production & QC',
      produksi_qcSub: 'Output, Inspections, Hold Release',
      purchasing: '5. Purchasing',
      purchasingSub: 'PR, PO, Exim Docs, Suppliers',
      finance: '6. Finance',
      financeSub: 'Cost Control, 13 Invoicing, AR',
      rnd: '7. RND',
      rndSub: 'Trial Formula, BOM, Catalog, Samples',
      hrd: '8. HRD',
      hrdSub: 'Employees, Leaves, Attendance',
    },
  },
};

export const Sidebar: React.FC = () => {
  const activeModule = useAppStore((state) => state.activeModule);
  const activeSubFeature = useAppStore((state) => state.activeSubFeature);
  const authUser = useAuthStore((state) => state.user);
  const authLogout = useAuthStore((state) => state.logout);
  const qcRecords = useAppStore((state) => state.qcRecords);
  const quotations = useAppStore((state) => state.quotations);
  const isSidebarCollapsed = useAppStore((state) => state.isSidebarCollapsed);
  const isMobileSidebarOpen = useAppStore((state) => state.isMobileSidebarOpen);
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;
  const { canAccessModule, canAccessAdminUsers, canAccessTool, isSuperAdmin, isExecutive } = useRBAC();

  const [expandedModules, setExpandedModules] = React.useState<Record<string, boolean>>({
    sales: true,
    delivery: true,
    warehouse_ppic: true,
    produksi_qc: true,
    purchasing: true,
    finance: true,
    rnd: true,
    hrd: true,
    users: true,
  });

  const toggleExpand = (modId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const handleSelectChild = (moduleId: any, childId: string) => {
    appStore.navigateToFeature(moduleId, childId);
    if (isMobileSidebarOpen) {
      appStore.setMobileSidebarOpen(false);
    }
  };

  const activeQcHoldCount = qcRecords.filter((r) => r.status === 'HOLD').length;
  const pendingCostControlCount = quotations.filter((q) => q.status === 'PENDING_COST_CONTROL').length;

  const isUserAdmin = canManageUsers(authUser as any);

  // 8 Divisi Utama
  const modules = [
    {
      id: 'home',
      code: 'HOME',
      label: t.moduleNames.home,
      sublabel: t.moduleNames.homeSub,
      icon: Home,
      shortcut: 'Alt+0',
      color: 'text-blue-600',
    },
    {
      id: 'sales',
      code: 'SALES',
      label: t.moduleNames.sales,
      sublabel: t.moduleNames.salesSub,
      icon: FileSpreadsheet,
      shortcut: 'Alt+1',
      badge: pendingCostControlCount > 0 ? `${pendingCostControlCount} Gated` : undefined,
      badgeColor: 'bg-amber-500 text-white',
      color: 'text-amber-600',
    },
    {
      id: 'delivery',
      code: 'DELIVERY',
      label: t.moduleNames.delivery,
      sublabel: t.moduleNames.deliverySub,
      icon: Truck,
      shortcut: 'Alt+2',
      color: 'text-cyan-600',
    },
    {
      id: 'warehouse_ppic',
      code: 'WAREHOUSE_PPIC',
      label: t.moduleNames.warehouse_ppic,
      sublabel: t.moduleNames.warehouse_ppicSub,
      icon: Boxes,
      shortcut: 'Alt+3',
      color: 'text-sky-600',
    },
    {
      id: 'produksi_qc',
      code: 'PRODUKSI_QC',
      label: t.moduleNames.produksi_qc,
      sublabel: t.moduleNames.produksi_qcSub,
      icon: ShieldCheck,
      shortcut: 'Alt+4',
      badge: activeQcHoldCount > 0 ? `${activeQcHoldCount} HOLD` : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
      color: 'text-rose-600',
    },
    {
      id: 'purchasing',
      code: 'PURCHASING',
      label: t.moduleNames.purchasing,
      sublabel: t.moduleNames.purchasingSub,
      icon: Truck,
      shortcut: 'Alt+5',
      color: 'text-indigo-600',
    },
    {
      id: 'finance',
      code: 'FINANCE',
      label: t.moduleNames.finance,
      sublabel: t.moduleNames.financeSub,
      icon: Calculator,
      shortcut: 'Alt+6',
      color: 'text-emerald-600',
    },
    {
      id: 'rnd',
      code: 'RND',
      label: t.moduleNames.rnd,
      sublabel: t.moduleNames.rndSub,
      icon: FlaskConical,
      shortcut: 'Alt+7',
      color: 'text-teal-600',
    },
    {
      id: 'hrd',
      code: 'HRD',
      label: t.moduleNames.hrd,
      sublabel: t.moduleNames.hrdSub,
      icon: Users,
      shortcut: 'Alt+8',
      color: 'text-purple-600',
    },
  ].filter((m) => canAccessModule(m.id));

  const hasAnySidebarItems = modules.length > 0 || canAccessAdminUsers() || canAccessTool('barcode') || canAccessTool('audit');

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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-150"
          onClick={() => appStore.setMobileSidebarOpen(false)}
        />
      )}

      {/* 1. DESKTOP SIDEBAR */}
      <aside
        className={`compact-chrome hidden lg:flex flex-col justify-between shrink-0 h-full border-r border-slate-200 bg-white transition-all duration-200 ease-in-out select-none z-20 shadow-xs ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Top Header & Collapse/Expand Toggle */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <>
              {hasAnySidebarItems && (
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">
                  {t.navMenu}
                </span>
              )}
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

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-3">
          {modules.length > 0 && (
            <div>
              {!isSidebarCollapsed && (
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                  <span>{t.modules}</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 font-extrabold border border-blue-200">
                    8 DIVISI
                  </span>
                </div>
              )}
              <nav className="space-y-1">
                {modules.map((m) => {
                  const Icon = m.icon;
                  const isActive = activeModule === m.id;
                  const children = MODULE_CHILDREN[m.id];
                  const isExpanded = !isSidebarCollapsed && (expandedModules[m.id] ?? true);

                  return (
                    <div key={m.id} className="space-y-1">
                      <button
                        id={`nav-module-${m.id}`}
                        onClick={() => handleSelectModule(m.id)}
                        title={`${m.label} (${m.shortcut})`}
                        className={`text-left rounded-xl flex items-center transition-all cursor-pointer relative group ${
                          isSidebarCollapsed
                            ? 'w-10 h-10 mx-auto justify-center p-0'
                            : 'w-full px-2.5 py-2 justify-between'
                        } ${
                          isActive
                            ? isSidebarCollapsed
                              ? ''
                              : 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                            : 'text-slate-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                              isActive
                                ? isSidebarCollapsed
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                  : 'bg-white/20 text-white'
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
                                    className={`text-xs px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${m.badgeColor}`}
                                  >
                                    {m.badge}
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-xs truncate leading-tight mt-0.5 ${
                                  isActive ? 'text-white/80' : 'text-slate-400'
                                }`}
                              >
                                {m.sublabel}
                              </div>
                            </div>
                          )}
                        </div>

                        {!isSidebarCollapsed && children && children.length > 0 && (
                          <div
                            onClick={(e) => toggleExpand(m.id, e)}
                            className="p-1 hover:bg-black/10 rounded-md transition-colors"
                            title="Tampilkan / Sembunyikan Sub-Fitur"
                          >
                            {isExpanded ? (
                              <ChevronDown className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            ) : (
                              <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            )}
                          </div>
                        )}

                        {isSidebarCollapsed && m.badge && (
                          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                        )}
                      </button>

                      {/* Sub-features under division */}
                      {!isSidebarCollapsed && isExpanded && children && children.length > 0 && (
                        <div className="ml-5 pl-2.5 border-l-2 border-slate-200 space-y-0.5 my-1">
                          {children.map((child) => {
                            const isChildActive = activeModule === m.id && activeSubFeature?.[m.id] === child.id;
                            const ChildIcon = child.icon;
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => handleSelectChild(m.id, child.id)}
                                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                                  isChildActive
                                    ? 'bg-blue-100 text-blue-900 font-extrabold shadow-2xs'
                                    : 'text-slate-600 hover:text-blue-700 hover:bg-slate-100 font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <ChildIcon
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      isChildActive ? 'text-blue-700' : 'text-slate-400'
                                    }`}
                                  />
                                  <span className="truncate">{child.label}</span>
                                </div>
                                {child.badge && (
                                  <span
                                    className={`text-xs px-1 py-0.2 rounded-full font-bold uppercase shrink-0 ${
                                      child.badgeColor || 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {child.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Administration & RBAC Section */}
          {canAccessAdminUsers() && (
            <div className="pt-2 border-t border-slate-100">
              {!isSidebarCollapsed && (
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
                  <span>{t.admin}</span>
                  <span className="text-xs text-purple-600 font-bold">{t.adminSub}</span>
                </div>
              )}
              <button
                id="sidebar-nav-users-btn"
                onClick={() => handleSelectModule('users')}
                title="Akun Pegawai & RBAC"
                className={`text-left rounded-xl flex items-center transition-all cursor-pointer ${
                  isSidebarCollapsed
                    ? 'w-10 h-10 mx-auto justify-center p-0'
                    : 'w-full px-2.5 py-2 justify-between'
                } ${
                  activeModule === 'users'
                    ? isSidebarCollapsed
                      ? ''
                      : 'bg-purple-700 text-white font-bold shadow-md shadow-purple-700/20'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      activeModule === 'users'
                        ? isSidebarCollapsed
                          ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20'
                          : 'bg-white/20 text-white'
                        : 'bg-purple-50 text-purple-600'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="min-w-0">
                      <div className="text-xs flex items-center gap-1.5 leading-tight min-w-0">
                        <span>{t.manageUsers}</span>
                        {isUserAdmin && (
                          <span className="text-xs px-1 py-0.5 rounded-full font-bold uppercase bg-purple-500 text-white">
                            Admin
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-xs truncate leading-tight mt-0.5 ${
                          activeModule === 'users' ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        {t.manageUsersSub}
                      </div>
                    </div>
                  )}
                </div>

                {!isSidebarCollapsed && (
                  <div
                    onClick={(e) => toggleExpand('users', e)}
                    className="p-1 hover:bg-black/10 rounded-md transition-colors"
                  >
                    {expandedModules.users ? (
                      <ChevronDown className={`w-3.5 h-3.5 ${activeModule === 'users' ? 'text-white' : 'text-slate-400'}`} />
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 ${activeModule === 'users' ? 'text-white' : 'text-slate-400'}`} />
                    )}
                  </div>
                )}
              </button>

              {!isSidebarCollapsed && expandedModules.users && (
                <div className="ml-5 pl-2.5 border-l-2 border-purple-200 space-y-0.5 my-1">
                  {MODULE_CHILDREN.users.map((child) => {
                    const isChildActive = activeModule === 'users' && activeSubFeature?.users === child.id;
                    const ChildIcon = child.icon;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => handleSelectChild('users', child.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                          isChildActive
                            ? 'bg-purple-100 text-purple-900 font-extrabold shadow-2xs'
                            : 'text-slate-600 hover:text-purple-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChildIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isChildActive ? 'text-purple-700' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{child.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Operational Tools Section */}
          {(canAccessTool('barcode') || canAccessTool('audit')) && (
            <div className="pt-2 border-t border-slate-100">
              {!isSidebarCollapsed && (
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                  {t.tools}
                </div>
              )}
              <div className="space-y-1">
                {canAccessTool('barcode') && (
                  <button
                    id="sidebar-pwa-scanner-btn"
                    onClick={() => appStore.setBarcodeModalOpen(true)}
                    title="Scanner Barcode PWA"
                    className={`text-left rounded-xl flex items-center text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
                      isSidebarCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'w-full px-2.5 py-1.5 justify-between'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <ScanLine className="w-4 h-4" />
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="min-w-0">
                          <div className="font-semibold truncate leading-tight text-xs">{t.scanner}</div>
                          <div className="text-xs text-slate-400 truncate leading-tight">{t.scannerSub}</div>
                        </div>
                      )}
                    </div>
                  </button>
                )}

                {canAccessTool('audit') && (
                  <button
                    id="sidebar-audit-trail-btn"
                    onClick={() => appStore.setAuditLogsOpen(true)}
                    title="Audit Trail Kepatuhan SHA-256"
                    className={`text-left rounded-xl flex items-center text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
                      isSidebarCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'w-full px-2.5 py-1.5 justify-between'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="min-w-0">
                          <div className="font-semibold truncate leading-tight text-xs">{t.audit}</div>
                          <div className="text-xs text-slate-400 truncate leading-tight">{t.auditSub}</div>
                        </div>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: Active User Context & Logout */}
        <div className="shrink-0 p-2.5 border-t border-slate-200 bg-slate-50/70 space-y-1.5">
          {!isSidebarCollapsed ? (
            <>
              <div
                title={`${authUser?.name} (${authUser?.role} - L${authUser?.tier})`}
                className="w-full text-left rounded-xl flex items-center gap-2.5 p-2"
              >
                <div className="relative">
                  {authUser?.avatar ? (
                    <img src={authUser.avatar} alt="User Avatar" className="w-8 h-8 rounded-lg object-cover ring-2 ring-white shadow-sm" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold ring-2 ring-white shadow-sm">
                      {authUser?.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{authUser?.name}</div>
                  <div className="text-xs text-slate-500 font-medium truncate">{authUser?.department}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                <button
                  onClick={() => authLogout()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t.signOut}
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
                title={`${authUser?.name} (${authUser?.role} - L${authUser?.tier})`}
                className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 shrink-0"
              >
                {authUser?.avatar ? (
                  <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {authUser?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <button
                id="sidebar-collapsed-logout-btn"
                onClick={() => authLogout()}
                title="Keluar dari Portal ERP"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MOBILE DRAWER SIDEBAR */}
      {isMobileSidebarOpen && (
        <aside className="compact-chrome fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col justify-between py-4 border-r border-slate-200 lg:hidden animate-in slide-in-from-left duration-200">
          <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900 leading-tight">ST. Morita Industries</div>
                <div className="text-xs text-slate-500">8 Divisi ERP Portal</div>
              </div>
            </div>
            <button
              onClick={() => appStore.setMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {modules.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
                  <span>8 Divisi Operasional</span>
                </div>
                <nav className="space-y-1.5">
                  {modules.map((m) => {
                    const Icon = m.icon;
                    const isActive = activeModule === m.id;
                    const children = MODULE_CHILDREN[m.id];
                    const isExpanded = expandedModules[m.id] ?? true;

                    return (
                      <div key={m.id} className="space-y-1">
                        <button
                          onClick={() => handleSelectModule(m.id)}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors text-xs ${
                            isActive ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-700 hover:bg-slate-100 font-medium'
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
                              <div className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                {m.sublabel}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {m.badge && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold uppercase ${m.badgeColor}`}>
                                {m.badge}
                              </span>
                            )}
                            {children && children.length > 0 && (
                              <div onClick={(e) => toggleExpand(m.id, e)} className="p-1">
                                {isExpanded ? (
                                  <ChevronDown className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                ) : (
                                  <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                )}
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Mobile Children */}
                        {isExpanded && children && children.length > 0 && (
                          <div className="ml-5 pl-2.5 border-l-2 border-slate-200 space-y-0.5 my-1">
                            {children.map((child) => {
                              const isChildActive = activeModule === m.id && activeSubFeature?.[m.id] === child.id;
                              const ChildIcon = child.icon;
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => handleSelectChild(m.id, child.id)}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                    isChildActive ? 'bg-blue-100 text-blue-900 font-extrabold' : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${isChildActive ? 'text-blue-700' : 'text-slate-400'}`} />
                                    <span className="truncate">{child.label}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
};
