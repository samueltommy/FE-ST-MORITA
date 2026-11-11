import React from 'react';
import {
  Calculator,
  ShieldCheck,
  Truck,
  FileSpreadsheet,
  Boxes,
  Users,
  UserPlus,
  ArrowRight,
  Building2,
  FlaskConical,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useRBAC } from '../../hooks/useRBAC';
import { getTierBadge } from '../../utils/rbac';

export const MainHomeLauncher: React.FC = () => {
  const language = useAppStore((state) => state.language);
  const qcRecords = useAppStore((state) => state.qcRecords);
  const quotations = useAppStore((state) => state.quotations);

  const { canAccessModule, canAccessAdminUsers } = useRBAC();

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
        ? 'Quotation Penawaran, Incoming Order (IO), Kunjungan Lapangan, & Master Pelanggan'
        : 'Quotations, Incoming Orders (IO), Outdoor Sales Visits, & Customer Master Data',
      icon: FileSpreadsheet,
      badge: pendingCostControlCount > 0 ? `${pendingCostControlCount} Gated` : 'SALES',
      badgeColor: pendingCostControlCount > 0 ? 'bg-amber-500 text-white font-bold' : 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
      iconBg: 'bg-amber-600 text-white shadow-sm',
      cardHover: 'hover:border-amber-500 hover:bg-amber-50/20',
      actionText: isIndo ? 'Buka Modul Sales' : 'Open Sales',
      allowed: canAccessModule('sales'),
    },
    {
      id: 'delivery',
      title: isIndo ? '2. Divisi Delivery' : '2. Delivery Division',
      subtitle: isIndo
        ? 'Surat Jalan (DO), E-Tracking Barcode & GPS, serta Peminjaman Kendaraan Operasional'
        : 'Delivery Orders (DO), Barcode/GPS Tracking, & Vehicle Fleet Bookings',
      icon: Truck,
      badge: 'DELIVERY',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300 font-semibold',
      iconBg: 'bg-cyan-600 text-white shadow-sm',
      cardHover: 'hover:border-cyan-500 hover:bg-cyan-50/20',
      actionText: isIndo ? 'Buka Modul Delivery' : 'Open Delivery',
      allowed: canAccessModule('delivery'),
    },
    {
      id: 'warehouse_ppic',
      title: isIndo ? '3. Divisi Warehouse & PPIC' : '3. Warehouse & PPIC Division',
      subtitle: isIndo
        ? 'Penerimaan Barang (LOG), Pencatatan Limbah/Scrap, SPK Produksi, & Stok Item'
        : 'Goods Receiving Log, Waste Records, SPK Work Orders, & Item Inventory',
      icon: Boxes,
      badge: 'WAREHOUSE_PPIC',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300 font-semibold',
      iconBg: 'bg-sky-600 text-white shadow-sm',
      cardHover: 'hover:border-sky-500 hover:bg-sky-50/20',
      actionText: isIndo ? 'Buka Modul Warehouse' : 'Open Warehouse',
      allowed: canAccessModule('warehouse_ppic'),
    },
    {
      id: 'produksi_qc',
      title: isIndo ? '4. Divisi Produksi & QC' : '4. Production & QC Division',
      subtitle: isIndo
        ? 'Input Hasil Produksi, Inspeksi (IQC/PQC/OQC), Rekam QC, & Otorisasi Release Hold'
        : 'Production Outputs, Inspections (IQC/PQC/OQC), QC Records, & Hold Release Override',
      icon: ShieldCheck,
      badge: activeQcHoldCount > 0 ? `${activeQcHoldCount} HOLD` : 'PRODUKSI_QC',
      badgeColor: activeQcHoldCount > 0 ? 'bg-rose-500 text-white font-bold animate-pulse' : 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
      iconBg: 'bg-rose-600 text-white shadow-sm',
      cardHover: 'hover:border-rose-500 hover:bg-rose-50/20',
      actionText: isIndo ? 'Buka Modul Produksi & QC' : 'Open Production & QC',
      allowed: canAccessModule('produksi_qc'),
    },
    {
      id: 'purchasing',
      title: isIndo ? '5. Divisi Pembelian (Purchasing)' : '5. Purchasing Division',
      subtitle: isIndo
        ? 'Purchase Request (PR), Purchase Order (PO), Dokumen Bea Cukai EXIM, & Supplier'
        : 'Purchase Requests (PR), PO Vendor, Customs EXIM Docs, & Supplier Master',
      icon: Truck,
      badge: 'PURCHASING',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold',
      iconBg: 'bg-indigo-600 text-white shadow-sm',
      cardHover: 'hover:border-indigo-500 hover:bg-indigo-50/20',
      actionText: isIndo ? 'Buka Modul Purchasing' : 'Open Purchasing',
      allowed: canAccessModule('purchasing'),
    },
    {
      id: 'finance',
      title: isIndo ? '6. Divisi Finance' : '6. Finance Division',
      subtitle: isIndo
        ? 'Validasi Biaya Cost Control, Kalkulasi Faktur/Invoice, Piutang AR, & E-Complaint'
        : 'Cost Control Validation, 13-Formula Invoicing, AR Payments, & E-Complaints',
      icon: Calculator,
      badge: 'FINANCE',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
      iconBg: 'bg-emerald-600 text-white shadow-sm',
      cardHover: 'hover:border-emerald-500 hover:bg-emerald-50/20',
      actionText: isIndo ? 'Buka Modul Finance' : 'Open Finance',
      allowed: canAccessModule('finance'),
    },
    {
      id: 'rnd',
      title: isIndo ? '7. Divisi RND' : '7. R&D Division',
      subtitle: isIndo
        ? 'Formulasi Trial R&D, Konversi ke Master BOM PPIC, E-Katalog, & Sampel Produk'
        : 'Trial Formulas, BOM Conversion, Product Digital Catalog, & Sample Requests',
      icon: FlaskConical,
      badge: 'RND',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 font-semibold',
      iconBg: 'bg-teal-600 text-white shadow-sm',
      cardHover: 'hover:border-teal-500 hover:bg-teal-50/20',
      actionText: isIndo ? 'Buka Modul RND' : 'Open R&D',
      allowed: canAccessModule('rnd'),
    },
    {
      id: 'hrd',
      title: isIndo ? '8. Divisi HRD' : '8. HRD Division',
      subtitle: isIndo
        ? 'Master Data Karyawan (17 Grup Field), Pengajuan Cuti & Izin, Presensi Harian'
        : 'Employee Master Database, Leave/Permit Approvals, & Daily Staff Attendance',
      icon: Users,
      badge: 'HRD',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 font-semibold',
      iconBg: 'bg-purple-600 text-white shadow-sm',
      cardHover: 'hover:border-purple-500 hover:bg-purple-50/20',
      actionText: isIndo ? 'Buka Modul HRD' : 'Open HRD',
      allowed: canAccessModule('hrd'),
    },
  ].filter((opt) => opt.allowed);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {/* Header Sederhana & Bersih - Tanpa Banner Besar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {isIndo ? 'Menu Utama ERP (8 Divisi Operasional)' : 'ERP Main Menu (8 Operational Divisions)'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-normal">
            {isIndo
              ? 'Silakan klik salah satu divisi di bawah untuk membuka modul kerja dan alur transaksi.'
              : 'Click any division below to access your operational workflow and records.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
            {options.length} {isIndo ? 'Divisi Aktif Tersedia' : 'Active Divisions'}
          </span>
        </div>
      </div>

      {/* Grid Kartu Divisi - Kompak & Terbaca Jelas oleh Semua Usia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => {
                appStore.setActiveModule(opt.id as any);
              }}
              className={`group text-left bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500 flex flex-col justify-between cursor-pointer ${opt.cardHover}`}
            >
              <div className="space-y-2.5 w-full">
                {/* Baris Atas: Icon Divisi & Badge Singkat */}
                <div className="flex items-center justify-between w-full">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${opt.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.2 rounded-md border ${opt.badgeColor}`}>
                    {opt.badge}
                  </span>
                </div>

                {/* Judul & Keterangan Modul */}
                <div className="space-y-0.5">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                    {opt.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-normal leading-relaxed">
                    {opt.subtitle}
                  </p>
                </div>
              </div>

              {/* Baris Bawah: Tombol Aksi Jelas */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between w-full">
                <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700">
                  {opt.actionText}
                </span>
                <div className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-500 transition-colors shrink-0">
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
