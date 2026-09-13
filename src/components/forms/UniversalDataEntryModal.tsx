import React, { useState } from 'react';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type FormCategory = 'hrd' | 'master' | 'procurement' | 'production' | 'sales' | 'finance' | null;

export const UniversalDataEntryModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
      title: 'HRD & Administrasi Lapangan',
      desc: 'Formulir Pengajuan Cuti/Izin, Pemesanan Truk Operasional, Check-in GPS Sales, & Pendaftaran Karyawan',
      icon: Users,
      color: 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400',
      badge: 'Core 1',
      items: [
        { label: 'Pengajuan Cuti / Izin', tab: 'leave' },
        { label: 'Peminjaman Armada Truk', tab: 'vehicle' },
        { label: 'Check-in Sales GPS', tab: 'visit' },
        { label: 'Registrasi Pegawai', tab: 'employee' },
      ],
    },
    {
      id: 'master',
      title: 'Master Data (MDM) & Limbah',
      desc: 'Registrasi Pelanggan (NPWP & Kode Pajak 01-09), Supplier/Vendor, Item Pita Perekat, & Tiket Limbah',
      icon: Boxes,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400',
      badge: 'Core 2',
      items: [
        { label: 'Pelanggan & Kode Pajak', tab: 'customer' },
        { label: 'Master Vendor/Supplier', tab: 'supplier' },
        { label: 'Item & Satuan Produk', tab: 'item' },
        { label: 'Pelaporan Tiket Limbah', tab: 'waste' },
      ],
    },
    {
      id: 'procurement',
      title: 'Pengadaan & Rantai Pasok (SCM)',
      desc: 'Purchase Request PPIC, Penerbitan PO Vendor, Penerimaan Fisik Gudang (LOG + Auto IQC), & EXIM Bea Cukai',
      icon: Truck,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400',
      badge: 'Core 3',
      items: [
        { label: 'Purchase Request (PR)', tab: 'pr' },
        { label: 'Purchase Order (PO)', tab: 'po' },
        { label: 'Penerimaan LOG & IQC', tab: 'log' },
        { label: 'Dokumen Pabean BC', tab: 'exim' },
      ],
    },
    {
      id: 'production',
      title: 'Lantai Produksi & Kontrol Mutu',
      desc: 'Penerbitan SPK (validasi blokir lot hold), Input Pengujian Lab IQC/PQC, & Otorisasi Release Hold',
      icon: ShieldAlert,
      color: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400',
      badge: 'Core 4',
      items: [
        { label: 'Penerbitan SPK (Work Order)', tab: 'spk' },
        { label: 'Input Pengujian QC Lab', tab: 'qc_test' },
        { label: 'Otorisasi Release Hold', tab: 'hold_override' },
      ],
    },
    {
      id: 'sales',
      title: 'Penjualan & Distribusi Lapangan',
      desc: 'Kalkulator Margin Penawaran (Lockout <18%), Penerbitan Surat Jalan DO/RDO, & Update E-Tracking',
      icon: FileSpreadsheet,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
      badge: 'Core 5',
      items: [
        { label: 'Kalkulator Margin Quotation', tab: 'quotation' },
        { label: 'Surat Jalan DO & RDO', tab: 'do' },
        { label: 'Update Checkpoint Barcode', tab: 'tracking' },
      ],
    },
    {
      id: 'finance',
      title: 'Keuangan, Faktur & E-Complaint',
      desc: 'Pencatatan E-Complaint Pelanggan, Disposisi RMA & Debit Note, Faktur Hutang AP, & Penerimaan Piutang AR',
      icon: Receipt,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
      badge: 'Core 6',
      items: [
        { label: 'Tiket E-Complaint Pelanggan', tab: 'complaint' },
        { label: 'Disposisi RMA & Debit Note', tab: 'rma' },
        { label: 'Voucher Faktur Hutang (AP)', tab: 'ap' },
        { label: 'Penerimaan Piutang (AR)', tab: 'ar' },
      ],
    },
  ];

  return (
    <>
      {isOpen && !activeSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                  <PlusCircle className="w-6 h-6 text-blue-600" />
                  <span>Pusat Input Data Enterprise (Data Entry Center)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih formulir entri data transaksi yang ingin Anda masukkan untuk masing-masing bidang operasional
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
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {cat.badge}
                        </span>
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
              <span>Setiap entri data otomatis divalidasi dan dicatat ke dalam audit trail SHA-256</span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Tutup
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
};
