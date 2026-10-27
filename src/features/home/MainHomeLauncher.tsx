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

  const { canAccessModule, canAccessAdminUsers, canAccessTool, isSuperAdmin, isExecutive, hasPermission } = useRBAC();
  const isHrdAdmin = isSuperAdmin || isExecutive || hasPermission('hrd:employee:read') || hasPermission('hrd:attendance:write');

  const tierMeta = getTierBadge(authUser?.tier ?? 3);

  // Active alerts count
  const activeQcHoldCount = qcRecords.filter((r) => r.status === 'HOLD').length;
  const pendingCostControlCount = quotations.filter((q) => q.status === 'PENDING_COST_CONTROL').length;

  const isIndo = language === 'id';

  // Option Cards List
  const options = [
    {
      id: 'finance',
      title: isIndo ? 'Keuangan & Faktur Penjualan' : 'Finance & Sales Invoices',
      subtitle: isIndo
        ? 'Pilih surat jalan (DO), kalkulasi pajak PPN 11% / PPh 23, dan cetak faktur komersial resmi'
        : 'Select delivery orders (DO), calculate VAT/WHT tax, and generate commercial sales invoices',
      icon: Calculator,
      badge: isIndo ? 'Core 6' : 'Core 6',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      iconBg: 'bg-emerald-600 text-white shadow-emerald-600/30',
      cardHover: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      actionText: isIndo ? 'Masuk ke Keuangan' : 'Open Finance',
      allowed: canAccessModule('finance'),
    },
    {
      id: 'qc',
      title: isIndo ? 'Produksi & Quality Control (QC)' : 'Production & Quality Control',
      subtitle: isIndo
        ? 'Inspeksi lot slitting pita perekat, sertifikat analisis (COA), dan cekal transfer otomatis (QC Hold)'
        : 'Tape slitting lot inspection, Certificate of Analysis (COA), and automatic transfer lockout (QC Hold)',
      icon: ShieldCheck,
      badge: activeQcHoldCount > 0 ? `${activeQcHoldCount} HOLD` : 'Core 4',
      badgeColor: activeQcHoldCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-100 text-rose-800 border-rose-300',
      iconBg: 'bg-rose-600 text-white shadow-rose-600/30',
      cardHover: 'hover:border-rose-500 hover:shadow-rose-500/10',
      actionText: isIndo ? 'Masuk ke QC & Produksi' : 'Open QC & Production',
      allowed: canAccessModule('qc'),
    },
    {
      id: 'procurement',
      title: isIndo ? 'Pengadaan & Bea Cukai (EXIM)' : 'Procurement & Customs (EXIM)',
      subtitle: isIndo
        ? 'Alur pesanan pembelian (PR → PO → IQC) dan kepatuhan dokumen pabean BC 2.3, 2.7, 4.0 Kawasan Berikat'
        : 'Purchase requisition to PO flow, and customs compliance for BC 2.3, 2.7, 4.0 Bonded Zone',
      icon: Truck,
      badge: isIndo ? 'Core 3' : 'Core 3',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      iconBg: 'bg-indigo-600 text-white shadow-indigo-600/30',
      cardHover: 'hover:border-indigo-500 hover:shadow-indigo-500/10',
      actionText: isIndo ? 'Masuk ke Pengadaan' : 'Open Procurement',
      allowed: canAccessModule('procurement'),
    },
    {
      id: 'sales',
      title: isIndo ? 'Penjualan & Lacak Pengiriman' : 'Sales Orders & Delivery Tracking',
      subtitle: isIndo
        ? 'Persetujuan penawaran harga (Quotation Margin Gating) dan pemantauan pengiriman pesanan real-time'
        : 'Quotation approval with margin gating and live barcode delivery status tracking',
      icon: FileSpreadsheet,
      badge: pendingCostControlCount > 0 ? `${pendingCostControlCount} Gated` : 'Core 5',
      badgeColor: pendingCostControlCount > 0 ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800 border-amber-300',
      iconBg: 'bg-amber-600 text-white shadow-amber-600/30',
      cardHover: 'hover:border-amber-500 hover:shadow-amber-500/10',
      actionText: isIndo ? 'Masuk ke Penjualan' : 'Open Sales',
      allowed: canAccessModule('sales'),
    },
    {
      id: 'master_data',
      title: isIndo ? 'Master Data & Label Zebra' : 'Master Catalog & Zebra Labels',
      subtitle: isIndo
        ? 'Katalog SKU bahan baku pita perekat, lokasi rak gudang, dan cetak label barcode printer Zebra'
        : 'Raw materials & adhesive tape SKU catalog, storage racks, and Zebra barcode thermal labels',
      icon: Boxes,
      badge: isIndo ? 'Core 2' : 'Core 2',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      iconBg: 'bg-sky-600 text-white shadow-sky-600/30',
      cardHover: 'hover:border-sky-500 hover:shadow-sky-500/10',
      actionText: isIndo ? 'Masuk ke Master Data' : 'Open Master Data',
      allowed: canAccessModule('master_data'),
    },
    {
      id: 'hrd',
      title: isHrdAdmin ? (isIndo ? 'HRD, Armada & Pengajuan Cuti' : 'HR, Fleet & Leave Requests') : (isIndo ? 'Pengajuan Cuti & Izin Pegawai' : 'Employee Leave Requests'),
      subtitle: isHrdAdmin
        ? (isIndo
            ? 'Presensi kehadiran shift staf, jadwal mobil dinas/truk armada, dan persetujuan cuti kerja'
            : 'Shift staff attendance, vehicle fleet booking schedule, and employee leave approvals')
        : (isIndo
            ? 'Formulir pengajuan cuti tahunan, izin sakit, dan cek status persetujuan atasan'
            : 'Annual leave, sick permit submission form, and manager approval tracking'),
      icon: Users,
      badge: isIndo ? 'Core 1' : 'Core 1',
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-300',
      iconBg: 'bg-violet-600 text-white shadow-violet-600/30',
      cardHover: 'hover:border-violet-500 hover:shadow-violet-500/10',
      actionText: isIndo ? 'Masuk ke HRD' : 'Open HR Module',
      allowed: canAccessModule('hrd'),
    },
    {
      id: 'users',
      title: isIndo ? 'Manajemen Akun Pegawai (RBAC)' : 'Employee User Accounts (RBAC)',
      subtitle: isIndo
        ? 'Pembuatan akun pegawai baru, penugasan level akses L0-L3, dan audit keamanan sistem ERP'
        : 'Create new employee credentials, assign role tiers (Level 0 - 3), and manage security access',
      icon: UserPlus,
      badge: isIndo ? 'Admin' : 'Admin',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      iconBg: 'bg-purple-600 text-white shadow-purple-600/30',
      cardHover: 'hover:border-purple-500 hover:shadow-purple-500/10',
      actionText: isIndo ? 'Kelola Akun Pegawai' : 'Manage User Accounts',
      allowed: canAccessAdminUsers(),
    },
  ].filter((opt) => opt.allowed);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* ─── Hero Welcome Header: Clean, Simple, Friendly for Elderly Staff ─── */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-blue-700/40 relative overflow-hidden">
        {/* Subtle decorative background circle */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-4 w-60 h-60 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-xs sm:text-sm font-semibold">
              <Building2 className="w-4 h-4 text-sky-300" />
              <span>PT ST. Morita Industries &bull; Portal ERP Manufaktur</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {isIndo ? 'Selamat Datang,' : 'Welcome,'}{' '}
              <span className="text-sky-300 underline decoration-sky-400/50 underline-offset-4">
                {authUser?.name || 'Bapak/Ibu'}
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-blue-100 font-medium leading-relaxed">
              {isIndo
                ? 'Halaman ini telah disederhanakan. Silakan tekan tombol opsi di bawah ini untuk memilih pekerjaan yang ingin Anda buka.'
                : 'This main page is simplified. Please choose an option button below to access the module or activity you want.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs sm:text-sm text-blue-200">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 border border-white/15 font-semibold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                {authUser?.department || 'Departemen Manufaktur'}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-xl font-bold border ${tierMeta.badgeClass}`}>
                Level {authUser?.tier ?? 3} &bull; {tierMeta.label}
              </span>
              {authUser?.plantLocation && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/10 font-medium">
                  📍 {authUser.plantLocation}
                </span>
              )}
            </div>
          </div>

          {/* Quick Font Size Switcher for Senior Staff */}
          <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col gap-2 min-w-[220px]">
            <div className="text-xs sm:text-sm font-bold text-white flex items-center justify-between">
              <span>👓 Ukuran Huruf / Text:</span>
              <span className="text-sky-300 font-extrabold">
                {fontSizeMode === 'xlarge' ? 'Sangat Besar' : fontSizeMode === 'large' ? 'Besar (Lansia)' : 'Normal'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => appStore.setFontSizeMode('normal')}
                className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  fontSizeMode === 'normal'
                    ? 'bg-white text-blue-900 shadow-md font-extrabold'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title="Ukuran Font Normal"
              >
                A Normal
              </button>
              <button
                type="button"
                onClick={() => appStore.setFontSizeMode('large')}
                className={`py-2 text-sm sm:text-base font-bold rounded-xl transition-all cursor-pointer ${
                  fontSizeMode === 'large'
                    ? 'bg-sky-400 text-blue-950 shadow-md font-black ring-2 ring-white'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title="Ukuran Font Besar (Rekomendasi Lansia)"
              >
                A Besar
              </button>
              <button
                type="button"
                onClick={() => appStore.setFontSizeMode('xlarge')}
                className={`py-2 text-base sm:text-lg font-bold rounded-xl transition-all cursor-pointer ${
                  fontSizeMode === 'xlarge'
                    ? 'bg-amber-300 text-slate-900 shadow-md font-black ring-2 ring-white'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title="Ukuran Font Ekstra Besar"
              >
                A+ Ekstra
              </button>
            </div>
            <p className="text-[11px] text-blue-200 mt-0.5 text-center font-medium">
              Mode ramah lansia: huruf lebih besar & mudah dibaca
            </p>
          </div>
        </div>
      </div>

      {/* ─── Main Section Title ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shrink-0" />
            {isIndo ? 'Pilih Menu Opsi Yang Ingin Dikerjakan' : 'Select an Option Below'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            {isIndo
              ? 'Klik salah satu tombol kotak di bawah untuk membuka halaman yang dituju. Anda dapat kembali ke menu ini kapan saja.'
              : 'Click any option button below to open its page. You can return to this menu at any time.'}
          </p>
        </div>
      </div>

      {/* ─── The Big Option Buttons Grid ("Button of Option") ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              id={`home-option-btn-${opt.id}`}
              type="button"
              onClick={() => appStore.setActiveModule(opt.id as any)}
              className={`group text-left bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col justify-between min-h-[220px] relative overflow-hidden ${opt.cardHover}`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform ${opt.iconBg}`}
                >
                  <Icon className="w-8 h-8 sm:w-9 sm:h-9" />
                </div>
                <span className={`text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full border shadow-2xs ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </div>

              {/* Middle: Big Title & Clear Description */}
              <div className="my-4 space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                  {opt.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                  {opt.subtitle}
                </p>
              </div>

              {/* Bottom: Big Action Button Trigger */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm sm:text-base font-bold text-blue-600 group-hover:text-blue-700">
                <span className="flex items-center gap-1.5 font-extrabold underline-offset-4 group-hover:underline">
                  {opt.actionText}
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-2xs">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Extra Quick Tools Row: Large, Clear Buttons for Direct Tools ─── */}
      <div className="bg-slate-100/90 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {isIndo ? 'Alat Pintas & Bantuan Lapangan' : 'Quick Actions & Field Tools'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {isIndo
                ? 'Tombol cepat untuk melakukan aksi langsung tanpa harus membuka modul satu per satu'
                : 'Direct action shortcuts without browsing each module one by one'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Universal Data Entry Button */}
          <button
            type="button"
            onClick={() => {
              const btn = document.getElementById('navbar-universal-data-entry-btn');
              if (btn) btn.click();
            }}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left shadow-xs cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-blue-700">
                {isIndo ? 'Input Data Baru' : 'New Data Entry'}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium">
                {isIndo ? 'Buka formulir input cepat' : 'Open quick entry forms'}
              </div>
            </div>
          </button>

          {/* Barcode Scanner PWA */}
          <button
            type="button"
            onClick={() => appStore.setBarcodeModalOpen(true)}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left shadow-xs cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-amber-700">
                {isIndo ? 'Scanner Barcode' : 'Barcode Scanner'}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium">
                {isIndo ? 'Pindai kode lot & gulungan pita' : 'Scan tape lot & carton barcodes'}
              </div>
            </div>
          </button>

          {/* Compliance Audit Trail */}
          <button
            type="button"
            onClick={() => appStore.setAuditLogsOpen(true)}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left shadow-xs cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-700">
                {isIndo ? 'Audit Trail Log' : 'Audit Trail Logs'}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium">
                {isIndo ? 'Riwayat aktivitas terenkripsi' : 'SHA-256 cryptographically verified logs'}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
