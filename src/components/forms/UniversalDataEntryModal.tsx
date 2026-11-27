import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  PlusCircle,
  Users,
  Boxes,
  Truck,
  ShieldCheck,
  FileSpreadsheet,
  Calculator,
  FlaskConical,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { useRBAC } from '../../hooks/useRBAC';
import type { ActiveModule } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickEntryItem {
  label: string;
  subFeatureId: string;
}

interface QuickEntryCategory {
  moduleId: ActiveModule;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
  items: QuickEntryItem[];
}

export const UniversalDataEntryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const language = useAppStore((state) => state.language);
  const { canAccessModule, isSuperAdmin, isExecutive, userDivision } = useRBAC();

  if (!isOpen) return null;

  const isHrdAdmin = isSuperAdmin || isExecutive || userDivision === 'HRD';
  const isEn = language === 'en';

  const allCategories: QuickEntryCategory[] = [
    {
      moduleId: 'sales',
      title: 'Sales & Marketing',
      desc: isEn
        ? 'Customers, Quotations, Customer PO/IO, SDA, Forecasts, & E-Complaints'
        : 'Master Customer, Quotation, PO Customer/IO, SDA, Forecast, & E-Complaint',
      icon: FileSpreadsheet,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'SALES',
      items: [
        { label: 'Master Customer', subFeatureId: 'customers' },
        { label: 'Quotation & Approval', subFeatureId: 'quotations' },
        { label: 'PO Customer & IO', subFeatureId: 'customer_pos' },
        { label: 'SDA & Sampel (Win/Lose)', subFeatureId: 'daily_activities' },
        { label: 'Entertain Sales', subFeatureId: 'entertainments' },
        { label: 'Forecasting Customer', subFeatureId: 'forecasts' },
        { label: 'E-Complaint & CA', subFeatureId: 'complaints' },
      ],
    },
    {
      moduleId: 'delivery',
      title: 'Delivery & RM Stock',
      desc: isEn
        ? 'Delivery Plan, Request DO (RDO), Surat Jalan DO, E-Tracking, & RM Stock Transfer'
        : 'Delivery Plan, Request DO (RDO), Surat Jalan DO, E-Tracking, & Mutasi RM Stock',
      icon: Truck,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      badge: 'DELIVERY',
      items: [
        { label: 'Delivery Plan', subFeatureId: 'delivery_plans' },
        { label: 'Request DO (RDO)', subFeatureId: 'delivery_requests' },
        { label: 'Delivery Order / Surat Jalan', subFeatureId: 'delivery_orders' },
        { label: 'E-Tracking Terpadu', subFeatureId: 'e_tracking' },
        { label: 'RM Stock & Transfer', subFeatureId: 'rm_stocks' },
      ],
    },
    {
      moduleId: 'warehouse_ppic',
      title: 'Warehouse & PPIC',
      desc: isEn
        ? 'Goods Receipts (LOG), Waste Logs, Work Orders (SPK), & Master Items'
        : 'Penerimaan Barang (LOG), Limbah / Waste, SPK Produksi, & Master Item',
      icon: Boxes,
      color: 'bg-sky-50 text-sky-700 border-sky-200',
      badge: 'WAREHOUSE_PPIC',
      items: [
        { label: 'Penerimaan Barang (Receiving LOG)', subFeatureId: 'goods_receipts' },
        { label: 'Pencatatan Limbah / Waste', subFeatureId: 'waste_logs' },
        { label: 'SPK Produksi / Work Orders', subFeatureId: 'work_orders' },
        { label: 'Master Item & Stok', subFeatureId: 'items' },
      ],
    },
    {
      moduleId: 'produksi_qc',
      title: isEn ? 'Production & QA/QC' : 'Produksi & QA/QC',
      desc: isEn
        ? 'PPIC Planning & SPK, Output, HOLD Stock, IQC/PQC/OQC, Rework, R&D Dev, & Wastes'
        : 'Planning & SPK, Output Produksi, Stok HOLD, IQC/PQC/OQC, Rework, & Limbah CAPA',
      icon: ShieldCheck,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      badge: 'PRODUKSI_QC',
      items: [
        { label: 'Planning & SPK', subFeatureId: 'plans' },
        { label: 'Output Produksi', subFeatureId: 'outputs' },
        { label: 'Incoming QC (IQC)', subFeatureId: 'iqc' },
        { label: 'In-Process QC (PQC)', subFeatureId: 'pqc' },
        { label: 'Rework / Repair', subFeatureId: 'reworks' },
        { label: 'Outgoing QC / COA', subFeatureId: 'oqc' },
        { label: 'Pengembangan Produk', subFeatureId: 'product_developments' },
        { label: 'RM & Product Wastes', subFeatureId: 'wastes' },
      ],
    },
    {
      moduleId: 'purchasing',
      title: isEn ? 'Purchasing & Exim' : 'Pembelian (Purchasing)',
      desc: isEn
        ? 'Purchase Requests (PR), Purchase Orders (PO), Exim Customs Docs, & Suppliers'
        : 'Purchase Request (PR), Purchase Order (PO), Dokumen Exim, & Master Supplier',
      icon: ShoppingCart,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badge: 'PURCHASING',
      items: [
        { label: 'Purchase Request (PR)', subFeatureId: 'purchase_requests' },
        { label: 'Purchase Order (PO)', subFeatureId: 'purchase_orders' },
        { label: 'Dokumen Exim / Bea Cukai', subFeatureId: 'exim_docs' },
        { label: 'Master Supplier', subFeatureId: 'suppliers' },
      ],
    },
    {
      moduleId: 'finance',
      title: 'Finance & Accounting',
      desc: isEn
        ? 'Sales Invoice, AR Payments, AP Supplier Invoices, PO/IO, Commissions, & RMA/CN/DN'
        : 'Sales Invoice (13 Rumus), Pelunasan AR, AP Hutang, Komisi, Entertain, & RMA',
      icon: Calculator,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'FINANCE',
      items: [
        { label: 'Sales Invoice (13 Rumus)', subFeatureId: 'invoices' },
        { label: 'Pelunasan & Rekonsiliasi AR', subFeatureId: 'payments' },
        { label: 'Account Payable (AP / Hutang)', subFeatureId: 'ap' },
        { label: 'PO Customer & IO', subFeatureId: 'customer_pos' },
        { label: 'Komisi Sales', subFeatureId: 'commissions' },
        { label: 'Entertain Sales', subFeatureId: 'entertainments' },
        { label: 'E-Complaint & RMA / CN / DN', subFeatureId: 'complaints_rma' },
      ],
    },
    {
      moduleId: 'rnd',
      title: 'R&D / Product Development',
      desc: isEn
        ? 'R&D Trial Formula, BOM Conversion, E-Catalog Publication, & Sample Requests'
        : 'Trial Formula R&D, Konversi Master BOM, Publikasi E-Katalog, & Permintaan Sampel',
      icon: FlaskConical,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      badge: 'RND',
      items: [
        { label: 'R&D Trial Formula', subFeatureId: 'rnd_trials' },
        { label: 'Konversi Formula ke Master BOM', subFeatureId: 'convert_bom' },
        { label: 'Publikasi E-Katalog', subFeatureId: 'e_catalog' },
        { label: 'Permintaan Sampel', subFeatureId: 'sample_requests' },
      ],
    },
    {
      moduleId: 'hrd',
      title: 'HRD & Personalia',
      desc: isEn
        ? 'Employee Database, Leave Requests, Sick/Permits, Exit Permits, Vehicles, & Visits'
        : 'Database Karyawan, Cuti, Sakit/Izin, Keluar Kantor, Kendaraan, & Visit Luar Kota',
      icon: Users,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      badge: 'HRD',
      items: [
        ...(isHrdAdmin ? [{ label: 'Database Karyawan', subFeatureId: 'employees' }] : []),
        { label: 'Pengajuan Cuti', subFeatureId: 'cuti' },
        { label: 'Sakit / Izin Lainnya', subFeatureId: 'sakit_izin' },
        { label: 'Izin Meninggalkan Tempat Kerja', subFeatureId: 'exit_permits' },
        { label: 'Kendaraan Kantor', subFeatureId: 'vehicles' },
        { label: 'Visit Luar Kota', subFeatureId: 'out_of_town_visits' },
      ],
    },
  ];
  const categories = allCategories.filter((cat) => canAccessModule(cat.moduleId));

  const handleNavigate = (moduleId: ActiveModule, subFeatureId: string) => {
    appStore.navigateToFeature(moduleId, subFeatureId);
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2.5">
              <PlusCircle className="w-5 h-5 text-blue-600 shrink-0" />
              <span>
                {isEn
                  ? 'Enterprise Data Entry Center (8 Divisions)'
                  : 'Pusat Input Data Baru (8 Divisi Operasional)'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'Jump directly to the live module page to create new records with real-time backend validation'
                : 'Pilih modul tujuan untuk langsung masuk ke halaman input data riil yang terhubung ke backend'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dedicated Scroll Container wrapping the Grid (prevents top clipping & aligns all cards cleanly) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-slate-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.moduleId}
                  className="rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all p-3.5 flex flex-col"
                >
                  {/* Card Header (fixed clean layout, top-aligned) */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`p-2 rounded-xl border shrink-0 ${cat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 truncate">
                      {cat.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{cat.title}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mt-1 min-h-[2.25rem]">
                    {cat.desc}
                  </p>

                  {/* Items List — starts right below divider (no awkward empty gap) */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-0.5">
                    {cat.items.map((sub) => (
                      <button
                        key={`${cat.moduleId}-${sub.subFeatureId}`}
                        type="button"
                        onClick={() => handleNavigate(cat.moduleId, sub.subFeatureId)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between gap-2 transition-colors group cursor-pointer"
                      >
                        <span className="truncate">{sub.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            {isEn
              ? 'All menus are synced 1:1 with the live 8-division ERP routes and RBAC permissions.'
              : 'Seluruh pintasan tersinkron 1:1 dengan halaman aktif 8 divisi dan hak akses RBAC Anda.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            {isEn ? 'Close' : 'Tutup'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
};
