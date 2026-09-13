import React, { useState } from 'react';
import { X, Receipt, CreditCard, AlertCircle, FileCheck, CheckCircle2, DollarSign, Building } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { EComplaintTicket, VendorInvoiceAp, ArPaymentRecord } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'complaint' | 'ap' | 'ar' | 'rma';
}

export const FinanceFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'complaint' }) => {
  const [activeTab, setActiveTab] = useState<'complaint' | 'ap' | 'ar' | 'rma'>(defaultTab);
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
  const currentUser = useAppStore((state) => state.currentUser);
  const customers = useAppStore((state) => state.customers);
  const suppliers = useAppStore((state) => state.suppliers);
  const complaints = useAppStore((state) => state.eComplaints);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form 1: E-Complaint state
  const [complaintTicket, setComplaintTicket] = useState(`CMP/SMI/2026/09/00${Math.floor(Math.random() * 90 + 10)}`);
  const [complaintCustomer, setComplaintCustomer] = useState(customers[0]?.companyName || 'PT Astra Daihatsu Motor');
  const [complaintDoRef, setComplaintDoRef] = useState('DO/SMI/2026/09/0112');
  const [complaintInvoiceRef, setComplaintInvoiceRef] = useState('INV/SMI/2026/09/0088');
  const [complaintCategory, setComplaintCategory] = useState<EComplaintTicket['complaintType']>('UNSUITABLE_QUALITY_NG');
  const [complaintDemandedSolution, setComplaintDemandedSolution] = useState<EComplaintTicket['correctiveActionRequested']>('REPLACEMENT_OF_GOODS');
  const [complaintDept, setComplaintDept] = useState<EComplaintTicket['targetDepartment']>('QC');
  const [complaintDescription, setComplaintDescription] = useState('Ditemukan 15 roll pita perekat mengalami pelelehan residu lem saat diaplikasikan di ruang oven cat 140°C.');

  // Form 2: RMA / Debit Note state
  const [selectedComplaintId, setSelectedComplaintId] = useState(complaints[0]?.id || '');
  const [rmaNumber, setRmaNumber] = useState(`RMA/SMI/2026/09/00${Math.floor(Math.random() * 90 + 10)}`);
  const [debitNoteNumber, setDebitNoteNumber] = useState(`DN/SMI/2026/09/00${Math.floor(Math.random() * 90 + 10)}`);
  const [qcInvestigation, setQcInvestigation] = useState('Hasil analisa lab mengonfirmasi curing agen pada lot tersebut kurang 0.3%. Disetujui retur dan ganti barang batch baru.');

  // Form 3: AP Voucher state
  const [apInvoiceNo, setApInvoiceNo] = useState(`INV-SUPP-2026-${Math.floor(Math.random() * 9000 + 1000)}`);
  const [apSupplier, setApSupplier] = useState(suppliers[0]?.supplierName || 'Nippon Polymer & Chemical Corp Tokyo');
  const [apPoRef, setApPoRef] = useState('PO/PUR/2026/09/0142');
  const [apDpp, setApDpp] = useState(250000000);
  const [apDueDate, setApDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

  // Form 4: AR Receipt state
  const [arReceiptNo, setArReceiptNo] = useState(`REC/AR/2026/09/00${Math.floor(Math.random() * 90 + 10)}`);
  const [arCustomer, setArCustomer] = useState(customers[0]?.companyName || 'PT Astra Daihatsu Motor');
  const [arInvoiceRef, setArInvoiceRef] = useState('INV/SMI/2026/08/0342');
  const [arAmount, setArAmount] = useState(387500000);
  const [arMethod, setArMethod] = useState<ArPaymentRecord['paymentMethod']>('BCA_VIRTUAL_ACCOUNT');
  const [arRefCode, setArRefCode] = useState(`TRX-BCA-${Math.floor(Math.random() * 9000000 + 1000000)}`);

  if (!isOpen) return null;

  const handleComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDescription.trim()) return;

    const newCmp: EComplaintTicket = {
      id: `CMP-${Date.now()}`,
      ticketNumber: complaintTicket.trim(),
      customerName: complaintCustomer.trim(),
      deliveryOrderNumber: complaintDoRef.trim(),
      invoiceNumber: complaintInvoiceRef.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      complaintType: complaintCategory,
      correctiveActionRequested: complaintDemandedSolution,
      status: 'OPEN',
      description: complaintDescription.trim(),
      targetDepartment: complaintDept,
      qcReinspectionStatus: 'PENDING_INSPECTION',
      businessUnit: currentUnit,
    };

    appStore.addEComplaint(newCmp);
    setSuccessMessage(`Tiket E-Complaint ${complaintTicket} berhasil didaftarkan dan didisposisikan ke divisi ${complaintDept}.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleRmaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) return;

    appStore.resolveEComplaint(selectedComplaintId, rmaNumber.trim(), debitNoteNumber.trim());
    setSuccessMessage(`Tiket Komplain berhasil diselesaikan. RMA ${rmaNumber} dan Debit Note ${debitNoteNumber} resmi diterbitkan.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleApSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apInvoiceNo.trim()) return;

    const ppn = Math.round(apDpp * 0.11);
    const total = apDpp + ppn;

    const newAp: VendorInvoiceAp = {
      id: `AP-${Date.now()}`,
      invoiceNumber: apInvoiceNo.trim(),
      supplierName: apSupplier.trim(),
      poNumber: apPoRef.trim(),
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: apDueDate,
      totalAmount: total,
      taxAmount: ppn,
      status: 'UNPAID',
      paymentTerm: 'Net 30 Days',
      businessUnit: currentUnit,
    };

    appStore.addVendorInvoice(newAp);
    setSuccessMessage(`Faktur Hutang (AP) ${apInvoiceNo} dari ${apSupplier} senilai IDR ${total.toLocaleString()} berhasil dicatat.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleArSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arReceiptNo.trim()) return;

    const newAr: ArPaymentRecord = {
      id: `AR-${Date.now()}`,
      receiptNumber: arReceiptNo.trim(),
      customerName: arCustomer.trim(),
      invoiceNumber: arInvoiceRef.trim(),
      paymentDate: new Date().toISOString().slice(0, 10),
      amountPaid: Number(arAmount) || 0,
      paymentMethod: arMethod,
      bankRef: arRefCode.trim(),
      reconciled: true,
      notes: 'Pembayaran pelunasan piutang telah diverifikasi masuk ke rekening koran perusahaan.',
      businessUnit: currentUnit,
    };

    appStore.addArPayment(newAr);
    setSuccessMessage(`Penerimaan Piutang (AR) ${arReceiptNo} dari ${arCustomer} senilai IDR ${arAmount.toLocaleString()} berhasil direkonsiliasi.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>Formulir Keuangan & Rekonsiliasi Komplain (Finance & E-Complaint)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              E-Complaint Pelanggan (DO/Invoice Ref), Disposisi RMA/Debit Note, Faktur Hutang AP, & Penerimaan Piutang AR
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('complaint')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'complaint'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>1. Tiket E-Complaint</span>
          </button>
          <button
            onClick={() => setActiveTab('rma')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'rma'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>2. Disposisi RMA & Debit Note</span>
          </button>
          <button
            onClick={() => setActiveTab('ap')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'ap'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>3. Faktur Hutang (AP)</span>
          </button>
          <button
            onClick={() => setActiveTab('ar')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'ar'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>4. Penerimaan Piutang (AR)</span>
          </button>
        </div>

        {/* Form Body with Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. E-Complaint Ticket Form */}
          {activeTab === 'complaint' && (
            <form onSubmit={handleComplaintSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Tiket E-Complaint</label>
                  <input
                    type="text"
                    required
                    value={complaintTicket}
                    onChange={(e) => setComplaintTicket(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Perusahaan Pelanggan</label>
                  <select
                    value={complaintCustomer}
                    onChange={(e) => setComplaintCustomer(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.companyName}>
                        {c.companyName} ({c.customerCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Referensi DO / Surat Jalan</label>
                  <input
                    type="text"
                    required
                    value={complaintDoRef}
                    onChange={(e) => setComplaintDoRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Faktur Penjualan (Invoice Ref)</label>
                  <input
                    type="text"
                    required
                    value={complaintInvoiceRef}
                    onChange={(e) => setComplaintInvoiceRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Ketidaksesuaian</label>
                  <select
                    value={complaintCategory}
                    onChange={(e) => setComplaintCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="UNSUITABLE_QUALITY">Kualitas / NG Teknis (Quality)</option>
                    <option value="UNSUITABLE_DOCUMENT">Dokumen Tidak Sesuai (Pajak/SJ)</option>
                    <option value="UNSUITABLE_QUANTITY">Selisih Kuantitas Kurang/Lebih</option>
                    <option value="UNSUITABLE_COLOR">Penyimpangan Warna / Visual</option>
                    <option value="UNSUITABLE_SIZE">Penyimpangan Ukuran (Lebar/Panjang)</option>
                    <option value="DELIVERY_DELAY">Keterlambatan Pengiriman (Delay)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tuntutan Solusi Pelanggan</label>
                  <select
                    value={complaintDemandedSolution}
                    onChange={(e) => setComplaintDemandedSolution(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="REPLACE_GOODS">Penggantian Barang (Replace)</option>
                    <option value="DEBIT_NOTE">Penerbitan Debit Note (Potong Tagihan)</option>
                    <option value="REVISE_DOCUMENT">Revisi Dokumen Faktur/Pajak</option>
                    <option value="MEETING_DISCUSSION">Klarifikasi & Meeting Teknis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Divisi Penanggung Jawab</label>
                  <select
                    value={complaintDept}
                    onChange={(e) => setComplaintDept(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="QC">QC (Penyimpangan Kualitas)</option>
                    <option value="MARKETING">Marketing (Komersial/Harga)</option>
                    <option value="LOGISTICS">Logistik (Pengiriman & Armada)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Uraian Detail Masalah Komplain</label>
                <textarea
                  rows={2}
                  required
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Daftarkan Tiket E-Complaint
                </button>
              </div>
            </form>
          )}

          {/* 2. Disposisi RMA & Debit Note */}
          {activeTab === 'rma' && (
            <form onSubmit={handleRmaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Tiket Komplain yang Memerlukan Disposisi
                </label>
                <select
                  value={selectedComplaintId}
                  onChange={(e) => setSelectedComplaintId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                >
                  {complaints
                    .filter((c) => c.status !== 'RESOLVED' && c.businessUnit === currentUnit)
                    .map((cmp) => (
                      <option key={cmp.id} value={cmp.id}>
                        {cmp.ticketNumber} - {cmp.customerName} ({cmp.complaintType})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor RMA Resmi (Return Merchandise)</label>
                  <input
                    type="text"
                    required
                    value={rmaNumber}
                    onChange={(e) => setRmaNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Debit Note Finansial</label>
                  <input
                    type="text"
                    required
                    value={debitNoteNumber}
                    onChange={(e) => setDebitNoteNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Investigasi Teknis QC & Kesepakatan Solusi
                </label>
                <textarea
                  rows={3}
                  required
                  value={qcInvestigation}
                  onChange={(e) => setQcInvestigation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Terbitkan RMA & Selesaikan Komplain
                </button>
              </div>
            </form>
          )}

          {/* 3. Faktur Hutang AP */}
          {activeTab === 'ap' && (
            <form onSubmit={handleApSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Faktur Supplier</label>
                  <input
                    type="text"
                    required
                    value={apInvoiceNo}
                    onChange={(e) => setApInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Referensi Purchase Order (PO)</label>
                  <input
                    type="text"
                    required
                    value={apPoRef}
                    onChange={(e) => setApPoRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilihan Vendor / Supplier</label>
                <select
                  value={apSupplier}
                  onChange={(e) => setApSupplier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.supplierName}>
                      {s.supplierName} ({s.bankName} - {s.bankAccountNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dasar Pengenaan Pajak (DPP IDR)</label>
                  <input
                    type="number"
                    required
                    value={apDpp}
                    onChange={(e) => setApDpp(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jatuh Tempo Pembayaran</label>
                  <input
                    type="date"
                    required
                    value={apDueDate}
                    onChange={(e) => setApDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <span>PPN 11%: <strong>IDR {Math.round(apDpp * 0.11).toLocaleString()}</strong></span>
                <span className="font-bold text-indigo-700">Total Tagihan: IDR {Math.round(apDpp * 1.11).toLocaleString()}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Catat Voucher Hutang (AP)
                </button>
              </div>
            </form>
          )}

          {/* 4. Penerimaan Piutang AR */}
          {activeTab === 'ar' && (
            <form onSubmit={handleArSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Bukti Penerimaan (AR Receipt)</label>
                  <input
                    type="text"
                    required
                    value={arReceiptNo}
                    onChange={(e) => setArReceiptNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Referensi Faktur Penjualan</label>
                  <input
                    type="text"
                    required
                    value={arInvoiceRef}
                    onChange={(e) => setArInvoiceRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Perusahaan Pelanggan</label>
                <select
                  value={arCustomer}
                  onChange={(e) => setArCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.companyName}>
                      {c.companyName} ({c.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Pembayaran Masuk (IDR)</label>
                  <input
                    type="number"
                    required
                    value={arAmount}
                    onChange={(e) => setArAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={arMethod}
                    onChange={(e) => setArMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="BANK_TRANSFER_BCA">BCA Virtual Account</option>
                    <option value="GIRO_MANDIRI">Giro Mandiri Kliring</option>
                    <option value="PERMATA_ESCROW">Permata Virtual Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ref / No Transaksi Bank</label>
                  <input
                    type="text"
                    required
                    value={arRefCode}
                    onChange={(e) => setArRefCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Simpan Penerimaan Piutang (AR)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
