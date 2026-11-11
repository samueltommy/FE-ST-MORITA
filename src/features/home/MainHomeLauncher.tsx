import React from 'react';
import {
  Calculator,
  ShieldCheck,
  Truck,
  FileSpreadsheet,
  Boxes,
  Users,
  UserPlus,
  ScanLine,
  History,
  PlusCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldAlert,
  Barcode,
  FlaskConical,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useRBAC } from '../../hooks/useRBAC';
import { getTierBadge } from '../../utils/rbac';

export const MainHomeLauncher: React.FC = () => {
  const authUser = useAuthStore((state) => state.user);
  const language = useAppStore((state) => state.language);
  const fontSizeMode = useAppStore((state) => state.fontSizeMode);
  const qcRecords = useAppStore((state) => state.qcRecords);
  const quotations = useAppStore((state) => state.quotations);

  const { canAccessModule, canAccessAdminUsers, isSuperAdmin, isExecutive } = useRBAC();

  const tierMeta = getTierBadge(authUser?.tier ?? 3);

  // Active alerts count
  const activeQcHoldCount = qcRecords.filter((r) => r.status === 'HOLD').length;
  const pendingCostControlCount = quotations.filter((q) => q.status === 'PENDING_COST_CONTROL').length;

  const isIndo = language === 'id';

  /**
   * 8 Divisi Resmi ST-Morita:
   * 1. Sales (SALES)
   * 2. Delivery (DELIVERY)
   * 3. Warehouse & PPIC (WAREHOUSE_PPIC)
   * 4. Produksi & QC (PRODUKSI_QC)
   * 5. Pembelian / Purchasing (PURCHASING)
   * 6. Finance (FINANCE)
   * 7. RND (RND)
   * 8. HRD (HRD)
   */
  const options = [
    {
      id: 'sales',
      title: isIndo ? '1. Divisi Sales' : '1. Sales Division',
      subtitle: isIndo
        ? 'Quotation (/sales/quotations), Incoming Order IO (/sales/incoming-orders), Aktivitas Kunjungan SDA, & Master Customer'
        : 'Quotations, Incoming Orders (IO), Outdoor Sales Visits, and Customer Master Data',
      icon: FileSpreadsheet,
      badge: pendingCostControlCount > 0 ? `${pendingCostControlCount} Gated` : 'SALES',
      badgeColor: pendingCostControlCount > 0 ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800 border-amber-300',
      iconBg: 'bg-amber-600 text-white shadow-amber-600/30',
      cardHover: 'hover:border-amber-500 hover:shadow-amber-500/10',
      actionText: isIndo ? 'Masuk ke Sales' : 'Open Sales',
      allowed: canAccessModule('sales'),
    },
    {
      id: 'delivery',
      title: isIndo ? '2. Divisi Delivery' : '2. Delivery Division',
      subtitle: isIndo
        ? 'Delivery Order Surat Jalan (/logistics/delivery-orders), E-Tracking Barcode/GPS (/tracking/barcode/{id}), Peminjaman Kendaraan Dinas'
        : 'Delivery Orders, Real-time Barcode & GPS Tracking, and Vehicle Fleet Bookings',
      icon: Truck,
      badge: 'DELIVERY',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      iconBg: 'bg-cyan-600 text-white shadow-cyan-600/30',
      cardHover: 'hover:border-cyan-500 hover:shadow-cyan-500/10',
      actionText: isIndo ? 'Masuk ke Delivery' : 'Open Delivery',
      allowed: canAccessModule('delivery'),
    },
    {
      id: 'warehouse_ppic',
      title: isIndo ? '3. Divisi Warehouse & PPIC' : '3. Warehouse & PPIC Division',
      subtitle: isIndo
        ? 'Penerimaan Barang Receiving LOG (/warehouse/goods-receipts), Pencatatan Limbah/Waste, SPK Work Orders, & Master Item Stok'
        : 'Receiving Dock LOG, Waste Scrap Records, SPK Work Orders, and SKU Stock Master',
      icon: Boxes,
      badge: 'WAREHOUSE_PPIC',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      iconBg: 'bg-sky-600 text-white shadow-sky-600/30',
      cardHover: 'hover:border-sky-500 hover:shadow-sky-500/10',
      actionText: isIndo ? 'Masuk ke Warehouse & PPIC' : 'Open Warehouse & PPIC',
      allowed: canAccessModule('warehouse_ppic'),
    },
    {
      id: 'produksi_qc',
      title: isIndo ? '4. Divisi Produksi & QC' : '4. Production & QC Division',
      subtitle: isIndo
        ? 'Input Hasil Produksi (/production/outputs), Inspeksi QC IQC/PQC/OQC, Rekam QC, & Otorisasi Release Hold QC'
        : 'Production Outputs, QC Inspections (IQC/PQC/OQC), QC Records, and Hold Release Override',
      icon: ShieldCheck,
      badge: activeQcHoldCount > 0 ? `${activeQcHoldCount} HOLD` : 'PRODUKSI_QC',
      badgeColor: activeQcHoldCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-100 text-rose-800 border-rose-300',
      iconBg: 'bg-rose-600 text-white shadow-rose-600/30',
      cardHover: 'hover:border-rose-500 hover:shadow-rose-500/10',
      actionText: isIndo ? 'Masuk ke Produksi & QC' : 'Open Production & QC',
      allowed: canAccessModule('produksi_qc'),
    },
    {
      id: 'purchasing',
      title: isIndo ? '5. Divisi Pembelian (Purchasing)' : '5. Purchasing Division',
      subtitle: isIndo
        ? 'Purchase Request PR (/procurement/purchase-requests), Purchase Order PO, Dokumen Exim BC, & Master Supplier Rekanan'
        : 'Purchase Requests (PR), PO Vendor, Customs EXIM Bonded Zone Docs, and Supplier Master',
      icon: Truck,
      badge: 'PURCHASING',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      iconBg: 'bg-indigo-600 text-white shadow-indigo-600/30',
      cardHover: 'hover:border-indigo-500 hover:shadow-indigo-500/10',
      actionText: isIndo ? 'Masuk ke Purchasing' : 'Open Purchasing',
      allowed: canAccessModule('purchasing'),
    },
    {
      id: 'finance',
      title: isIndo ? '6. Divisi Finance' : '6. Finance Division',
      subtitle: isIndo
        ? 'Validasi Cost Control Quotation, Kalkulasi & Sales Invoice 13 Rumus (/finance/invoices), Piutang AR & E-Complaint RMA'
        : 'Cost Control Validation, 13-Formula Invoicing, AR Payments Reconciliation, and E-Complaints',
      icon: Calculator,
      badge: 'FINANCE',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      iconBg: 'bg-emerald-600 text-white shadow-emerald-600/30',
      cardHover: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      actionText: isIndo ? 'Masuk ke Finance' : 'Open Finance',
      allowed: canAccessModule('finance'),
    },
    {
      id: 'rnd',
      title: isIndo ? '7. Divisi RND' : '7. R&D Division',
      subtitle: isIndo
        ? 'R&D Trial Formula (/rnd/trials), Konversi Formula ke Master BOM PPIC, Publikasi E-Katalog, & Permintaan Sampel Prospek'
        : 'Adhesive Trial Formulas, Bill of Materials Conversion, Digital Catalog, and Sample Requests',
      icon: FlaskConical,
      badge: 'RND',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      iconBg: 'bg-teal-600 text-white shadow-teal-600/30',
      cardHover: 'hover:border-teal-500 hover:shadow-teal-500/10',
      actionText: isIndo ? 'Masuk ke RND' : 'Open R&D',
      allowed: canAccessModule('rnd'),
    },
    {
      id: 'hrd',
      title: isIndo ? '8. Divisi HRD' : '8. HRD Division',
      subtitle: isIndo
        ? 'Master Data Karyawan (/hrd/employees), Pengajuan & Approval Cuti/Izin (/hrd/requests), Presensi Kehadiran Harian'
        : 'Employee Master Database, Leave/Permit Approvals, and Daily Staff Attendance',
      icon: Users,
      badge: 'HRD',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      iconBg: 'bg-purple-600 text-white shadow-purple-600/30',
      cardHover: 'hover:border-purple-500 hover:shadow-purple-500/10',
      actionText: isIndo ? 'Masuk ke HRD' : 'Open HRD',
      allowed: canAccessModule('hrd'),
    },
    {
      id: 'users',
      title: isIndo ? 'Administrasi Akun Pegawai (RBAC)' : 'Employee User Accounts (RBAC)',
      subtitle: isIndo
        ? 'Pembuatan akun pegawai baru, penugasan level akses L0-L4, matrix izin granular, dan audit sistem'
        : 'Create new employee credentials, assign role tiers (Level 0 - 4), and manage security access',
      icon: UserPlus,
      badge: 'ADMIN',
      badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
      iconBg: 'bg-slate-700 text-white shadow-slate-700/30',
      cardHover: 'hover:border-slate-500 hover:shadow-slate-500/10',
      actionText: isIndo ? 'Kelola Akun Pegawai' : 'Manage User Accounts',
      allowed: canAccessAdminUsers(),
    },
  ].filter((opt) => opt.allowed);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-blue-700/40 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-4 w-60 h-60 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs sm:text-sm font-semibold tracking-wide">
              <Building2 className="w-4 h-4 text-sky-300" />
              <span>PT ST. Morita Industries &bull; Enterprise ERP 8 Divisi</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {isIndo ? 'Selamat Datang,' : 'Welcome back,'}{' '}
              <span className="text-sky-300 underline decoration-sky-400/40">{authUser?.name || 'User'}</span>
            </h1>

            <p className="text-sm sm:text-base text-blue-100 font-medium leading-relaxed max-w-2xl">
              {isIndo
                ? 'Portal ERP tersinkronisasi dengan 8 Divisi Backend API. Pilih divisi di bawah untuk membuka alur transaksi operasional Anda.'
                : 'ERP portal synchronized with 8 Backend Divisions API. Select your division below to access operational transaction flows.'}
            </p>
          </div>

          {/* User info card badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex flex-col gap-2 shrink-0 self-start md:self-auto min-w-[240px]">
            <div className="text-xs uppercase tracking-wider text-blue-200 font-bold">
              {isIndo ? 'Peran Pengguna Aktif' : 'Active User Role'}
            </div>
            <div className="text-base sm:text-lg font-black text-white">{authUser?.role || 'User'}</div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tierMeta.badgeClass}`}>
                {tierMeta.pillText}
              </span>
              <span className="text-xs text-blue-200 truncate">{authUser?.department || 'ST-Morita'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Division Cards Launcher */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>{isIndo ? 'Pilih Divisi Operasional' : 'Select Operational Division'}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-extrabold uppercase">
                {options.length} {isIndo ? 'Divisi Aktif' : 'Divisions'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isIndo
                ? 'Akses difilter otomatis berdasarkan hak akses divisi Anda (user.allowed_divisions)'
                : 'Access is filtered automatically based on your division privileges'}
            </p>
          </div>
        </div>

        {/* The Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  appStore.setActiveModule(opt.id as any);
                }}
                className={`group text-left bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between cursor-pointer ${opt.cardHover}`}
              >
                <div className="space-y-4 w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${opt.iconBg}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${opt.badgeColor}`}>
                      {opt.badge}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                      {opt.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                      {opt.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm font-extrabold text-blue-600 group-hover:text-blue-700">
                    {opt.actionText}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-500 transition-all shrink-0">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
