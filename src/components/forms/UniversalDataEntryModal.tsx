import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  PlusCircle,
  Users,
  Boxes,
  Truck,
  ShieldAlert,
  FileSpreadsheet,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { HrdFormsModal } from './HrdFormsModal';
import { MasterDataFormsModal } from './MasterDataFormsModal';
import { ProcurementFormsModal } from './ProcurementFormsModal';
import { ProductionQcFormsModal } from './ProductionQcFormsModal';
import { SalesFormsModal } from './SalesFormsModal';
import { FinanceFormsModal } from './FinanceFormsModal';
import { useAppStore } from '../../store/useAppStore';

const CONTENT = {
  id: {
    modalTitle: 'Pusat Input Data Enterprise (Data Entry Center)',
    modalDesc: 'Pilih formulir entri data transaksi yang ingin Anda masukkan untuk masing-masing bidang operasional',
    footerTxt: 'Setiap entri data otomatis divalidasi dan dicatat ke dalam audit trail SHA-256',
    btnClose: 'Tutup',
    hrdTitle: 'HRD & Administrasi Lapangan',
    hrdDesc: 'Formulir Pengajuan Cuti/Izin, Pemesanan Truk Operasional, Check-in GPS Sales, & Pendaftaran Karyawan',
    hrdItems: { leave: 'Pengajuan Cuti / Izin', vehicle: 'Peminjaman Armada Truk', visit: 'Check-in Sales GPS', employee: 'Registrasi Pegawai' },
    mdmTitle: 'Master Data (MDM) & Limbah',
    mdmDesc: 'Registrasi Pelanggan (NPWP & Kode Pajak 01-09), Supplier/Vendor, Item Pita Perekat, & Tiket Limbah',
    mdmItems: { customer: 'Pelanggan & Kode Pajak', supplier: 'Master Vendor/Supplier', item: 'Item & Satuan Produk', waste: 'Pelaporan Tiket Limbah' },
    scmTitle: 'Pengadaan & Rantai Pasok (SCM)',
    scmDesc: 'Purchase Request PPIC, Penerbitan PO Vendor, Penerimaan Fisik Gudang (LOG + Auto IQC), & EXIM Bea Cukai',
    scmItems: { pr: 'Purchase Request (PR)', po: 'Purchase Order (PO)', log: 'Penerimaan LOG & IQC', exim: 'Dokumen Pabean BC' },
    prodTitle: 'Lantai Produksi & Kontrol Mutu',
    prodDesc: 'Penerbitan SPK (validasi blokir lot hold), Input Pengujian Lab IQC/PQC, & Otorisasi Release Hold',
    prodItems: { spk: 'Penerbitan SPK (Work Order)', qc_test: 'Input Pengujian QC Lab', hold_override: 'Otorisasi Release Hold' },
    salesTitle: 'Penjualan & Distribusi Lapangan',
    salesDesc: 'Kalkulator Margin Penawaran (Lockout <18%), Penerbitan Surat Jalan DO/RDO, & Update E-Tracking',
    salesItems: { quotation: 'Kalkulator Margin Quotation', do: 'Surat Jalan DO & RDO', tracking: 'Update Checkpoint Barcode' },
    finTitle: 'Keuangan, Faktur & E-Complaint',
    finDesc: 'Pencatatan E-Complaint Pelanggan, Disposisi RMA & Debit Note, Faktur Hutang AP, & Penerimaan Piutang AR',
    finItems: { complaint: 'Tiket E-Complaint Pelanggan', rma: 'Disposisi RMA & Debit Note', ap: 'Voucher Faktur Hutang (AP)', ar: 'Penerimaan Piutang (AR)' }
  },
  en: {
    modalTitle: 'Enterprise Data Entry Center',
    modalDesc: 'Select the transaction data entry form you want to input for each operational area',
    footerTxt: 'Each data entry is automatically validated and recorded in the SHA-256 audit trail',
    btnClose: 'Close',
    hrdTitle: 'HRD & Field Administration',
    hrdDesc: 'Leave/Permit Request Form, Operational Truck Booking, Sales GPS Check-in, & Employee Registration',
    hrdItems: { leave: 'Leave / Permit Request', vehicle: 'Fleet Truck Borrowing', visit: 'Sales GPS Check-in', employee: 'Employee Registration' },
    mdmTitle: 'Master Data (MDM) & Waste',
    mdmDesc: 'Customer Registration (NPWP & Tax Code 01-09), Supplier/Vendor, Adhesive Tape Item, & Waste Ticket',
    mdmItems: { customer: 'Customer & Tax Code', supplier: 'Vendor/Supplier Master', item: 'Item & Product Unit', waste: 'Waste Ticket Reporting' },
    scmTitle: 'Procurement & Supply Chain (SCM)',
    scmDesc: 'PPIC Purchase Request, Vendor PO Issuance, Physical Warehouse Receipt (LOG + Auto IQC), & Customs EXIM',
    scmItems: { pr: 'Purchase Request (PR)', po: 'Purchase Order (PO)', log: 'LOG Receipt & IQC', exim: 'Customs Documents' },
    prodTitle: 'Production Floor & Quality Control',
    prodDesc: 'SPK Issuance (hold lot block validation), IQC/PQC Lab Testing Input, & Release Hold Authorization',
    prodItems: { spk: 'SPK Issuance (Work Order)', qc_test: 'QC Lab Test Input', hold_override: 'Release Hold Authorization' },
    salesTitle: 'Sales & Field Distribution',
    salesDesc: 'Quotation Margin Calculator (<18% Lockout), DO/RDO Delivery Order Issuance, & E-Tracking Update',
    salesItems: { quotation: 'Quotation Margin Calculator', do: 'DO & RDO Delivery Order', tracking: 'Update Barcode Checkpoint' },
    finTitle: 'Finance, Invoice & E-Complaint',
    finDesc: 'Customer E-Complaint Recording, RMA & Debit Note Disposition, AP Payable Invoice, & AR Receivable Receipt',
    finItems: { complaint: 'Customer E-Complaint Ticket', rma: 'RMA & Debit Note Disposition', ap: 'AP Payable Invoice Voucher', ar: 'AR Receivable Receipt' }
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type FormCategory = 'hrd' | 'master' | 'procurement' | 'production' | 'sales' | 'finance' | null;

export const UniversalDataEntryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const [activeSubModal, setActiveSubModal] = useState<FormCategory>(null);
  const [subModalTab, setSubModalTab] = useState<string | undefined>(undefined);

  if (!isOpen && !activeSubModal) return null;

  const openForm = (cat: FormCategory, tab?: string) => {
    setSubModalTab(tab);
    setActiveSubModal(cat);
  };

  const closeSubModal = () => {
    setActiveSubModal(null);
    setSubModalTab(undefined);
    onClose();
  };

  const formCategories = [
    {
      id: 'hrd',
      title: t.hrdTitle,
      desc: t.hrdDesc,
      icon: Users,
      color: 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400',
      badge: 'Core 1',
      items: [
        { label: t.hrdItems.leave, tab: 'leave' },
        { label: t.hrdItems.vehicle, tab: 'vehicle' },
        { label: t.hrdItems.visit, tab: 'visit' },
        { label: t.hrdItems.employee, tab: 'employee' },
      ],
    },
    {
      id: 'master',
      title: t.mdmTitle,
      desc: t.mdmDesc,
      icon: Boxes,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400',
      badge: 'Core 2',
      items: [
        { label: t.mdmItems.customer, tab: 'customer' },
        { label: t.mdmItems.supplier, tab: 'supplier' },
        { label: t.mdmItems.item, tab: 'item' },
        { label: t.mdmItems.waste, tab: 'waste' },
      ],
    },
    {
      id: 'procurement',
      title: t.scmTitle,
      desc: t.scmDesc,
      icon: Truck,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400',
      badge: 'Core 3',
      items: [
        { label: t.scmItems.pr, tab: 'pr' },
        { label: t.scmItems.po, tab: 'po' },
        { label: t.scmItems.log, tab: 'log' },
        { label: t.scmItems.exim, tab: 'exim' },
      ],
    },
    {
      id: 'production',
      title: t.prodTitle,
      desc: t.prodDesc,
      icon: ShieldAlert,
      color: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400',
      badge: 'Core 4',
      items: [
        { label: t.prodItems.spk, tab: 'spk' },
        { label: t.prodItems.qc_test, tab: 'qc_test' },
        { label: t.prodItems.hold_override, tab: 'hold_override' },
      ],
    },
    {
      id: 'sales',
      title: t.salesTitle,
      desc: t.salesDesc,
      icon: FileSpreadsheet,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
      badge: 'Core 5',
      items: [
        { label: t.salesItems.quotation, tab: 'quotation' },
        { label: t.salesItems.do, tab: 'do' },
        { label: t.salesItems.tracking, tab: 'tracking' },
      ],
    },
    {
      id: 'finance',
      title: t.finTitle,
      desc: t.finDesc,
      icon: Receipt,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
      badge: 'Core 6',
      items: [
        { label: t.finItems.complaint, tab: 'complaint' },
        { label: t.finItems.rma, tab: 'rma' },
        { label: t.finItems.ap, tab: 'ap' },
        { label: t.finItems.ar, tab: 'ar' },
      ],
    },
  ];

  const modalContent = (
    <>
      {isOpen && !activeSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                  <PlusCircle className="w-6 h-6 text-blue-600" />
                  <span>{t.modalTitle}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t.modalDesc}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of 6 Core Modules Input Options */}
            <div className="flex-1 min-h-0 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2.5 rounded-xl border ${cat.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">{cat.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {cat.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-1.5">
                      {cat.items.map((sub) => (
                        <button
                          key={sub.tab}
                          onClick={() => openForm(cat.id as FormCategory, sub.tab)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors group cursor-pointer"
                        >
                          <span>{sub.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>{t.footerTxt}</span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                {t.btnClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-form Modals */}
      {activeSubModal === 'hrd' && (
        <HrdFormsModal
          isOpen={true}
          onClose={closeSubModal}
          defaultTab={subModalTab as any}
        />
      )}

      {activeSubModal === 'master' && (
        <MasterDataFormsModal
          isOpen={true}
          onClose={closeSubModal}
          defaultTab={subModalTab as any}
        />
      )}

      {activeSubModal === 'procurement' && (
        <ProcurementFormsModal
          isOpen={true}
          onClose={closeSubModal}
          defaultTab={subModalTab as any}
        />
      )}

      {activeSubModal === 'production' && (
        <ProductionQcFormsModal
          isOpen={true}
          onClose={closeSubModal}
          defaultTab={subModalTab as any}
        />
      )}

      {activeSubModal === 'sales' && (
        <SalesFormsModal
          isOpen={true}
          onClose={closeSubModal}
          defaultTab={subModalTab as any}
        />
      )}

      {activeSubModal === 'finance' && (
        <FinanceFormsModal
          isOpen={true}
          onClose={closeSubModal}
          defaultTab={subModalTab as any}
        />
      )}
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
};
