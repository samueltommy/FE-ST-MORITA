import React, { useState } from 'react';
import { X, Receipt, CreditCard, AlertCircle, FileCheck, CheckCircle2, DollarSign, Building } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { EComplaintTicket, VendorInvoiceAp, ArPaymentRecord } from '../../types';

const CONTENT = {
  id: {
    title: 'Formulir Keuangan & Rekonsiliasi Komplain (Finance & E-Complaint)',
    desc: 'E-Complaint Pelanggan (DO/Invoice Ref), Disposisi RMA/Debit Note, Faktur Hutang AP, & Penerimaan Piutang AR',
    tabComplaint: '1. Tiket E-Complaint',
    tabRma: '2. Disposisi RMA & Debit Note',
    tabAp: '3. Faktur Hutang (AP)',
    tabAr: '4. Penerimaan Piutang (AR)',
    cTicket: 'Nomor Tiket E-Complaint',
    cCust: 'Nama Perusahaan Pelanggan',
    cDoRef: 'Nomor Referensi DO / Surat Jalan',
    cInvRef: 'Nomor Faktur Penjualan (Invoice Ref)',
    cCat: 'Kategori Ketidaksesuaian',
    cSol: 'Tuntutan Solusi Pelanggan',
    cDept: 'Divisi Penanggung Jawab',
    cDesc: 'Uraian Detail Masalah Komplain',
    btnCancel: 'Batal',
    btnCSubmit: 'Daftarkan Tiket E-Complaint',
    msgCSuccess: 'berhasil didaftarkan dan didisposisikan ke divisi',
    rmaSelect: 'Pilih Tiket Komplain yang Memerlukan Disposisi',
    rmaNo: 'Nomor RMA Resmi (Return Merchandise)',
    rmaDn: 'Nomor Debit Note Finansial',
    rmaNotes: 'Catatan Investigasi Teknis QC & Kesepakatan Solusi',
    btnRma: 'Terbitkan RMA & Selesaikan Komplain',
    msgRmaSuccess: 'Tiket Komplain berhasil diselesaikan. RMA',
    msgRmaSuccessDn: 'dan Debit Note',
    msgRmaSuccessEnd: 'resmi diterbitkan.',
    apInv: 'Nomor Faktur Supplier',
    apPo: 'Referensi Purchase Order (PO)',
    apSupp: 'Pilihan Vendor / Supplier',
    apDpp: 'Dasar Pengenaan Pajak (DPP IDR)',
    apDue: 'Jatuh Tempo Pembayaran',
    apPpn: 'PPN 11%:',
    apTotal: 'Total Tagihan: IDR',
    btnAp: 'Catat Voucher Hutang (AP)',
    msgApSuccess: 'Faktur Hutang (AP)',
    msgApSuccessFrom: 'dari',
    msgApSuccessValue: 'senilai IDR',
    msgApSuccessEnd: 'berhasil dicatat.',
    arRec: 'Nomor Bukti Penerimaan (AR Receipt)',
    arInvRef: 'Nomor Referensi Faktur Penjualan',
    arCust: 'Nama Perusahaan Pelanggan',
    arAmount: 'Nominal Pembayaran Masuk (IDR)',
    arMethod: 'Metode Pembayaran',
    arRef: 'Ref / No Transaksi Bank',
    btnAr: 'Simpan Penerimaan Piutang (AR)',
    msgArSuccess: 'Penerimaan Piutang (AR)',
    msgArSuccessFrom: 'dari',
    msgArSuccessValue: 'senilai IDR',
    msgArSuccessEnd: 'berhasil direkonsiliasi.',
    catOptions: {
      ng: 'Kualitas / NG Teknis (Quality)',
      doc: 'Dokumen Tidak Sesuai (Pajak/SJ)',
      qty: 'Selisih Kuantitas Kurang/Lebih',
      color: 'Penyimpangan Warna / Visual',
      size: 'Penyimpangan Ukuran (Lebar/Panjang)',
      delay: 'Keterlambatan Pengiriman (Delay)'
    },
    solOptions: {
      rep: 'Penggantian Barang (Replace)',
      dn: 'Penerbitan Debit Note (Potong Tagihan)',
      rev: 'Revisi Dokumen Faktur/Pajak',
      meet: 'Klarifikasi & Meeting Teknis'
    },
    deptOptions: {
      qc: 'QC (Penyimpangan Kualitas)',
      mkt: 'Marketing (Komersial/Harga)',
      log: 'Logistik (Pengiriman & Armada)'
    }
  },
  en: {
    title: 'Finance & Complaint Reconciliation Forms',
    desc: 'Customer E-Complaint (DO/Invoice Ref), RMA/Debit Note Disposition, AP Invoices, & AR Receipts',
    tabComplaint: '1. E-Complaint Ticket',
    tabRma: '2. RMA & Debit Note Disposition',
    tabAp: '3. Account Payable (AP)',
    tabAr: '4. Account Receivable (AR)',
    cTicket: 'E-Complaint Ticket Number',
    cCust: 'Customer Company Name',
    cDoRef: 'DO / Delivery Order Reference Number',
    cInvRef: 'Sales Invoice Reference Number',
    cCat: 'Discrepancy Category',
    cSol: 'Demanded Customer Solution',
    cDept: 'Responsible Division',
    cDesc: 'Detailed Problem Description',
    btnCancel: 'Cancel',
    btnCSubmit: 'Register E-Complaint Ticket',
    msgCSuccess: 'successfully registered and disposed to division',
    rmaSelect: 'Select Complaint Ticket Requiring Disposition',
    rmaNo: 'Official RMA Number',
    rmaDn: 'Financial Debit Note Number',
    rmaNotes: 'QC Technical Investigation Notes & Solution Agreement',
    btnRma: 'Issue RMA & Resolve Complaint',
    msgRmaSuccess: 'Complaint Ticket successfully resolved. RMA',
    msgRmaSuccessDn: 'and Debit Note',
    msgRmaSuccessEnd: 'officially issued.',
    apInv: 'Supplier Invoice Number',
    apPo: 'Purchase Order (PO) Reference',
    apSupp: 'Vendor / Supplier Selection',
    apDpp: 'Taxable Base (DPP IDR)',
    apDue: 'Payment Due Date',
    apPpn: 'VAT 11%:',
    apTotal: 'Total Billing: IDR',
    btnAp: 'Record AP Voucher',
    msgApSuccess: 'Account Payable (AP) Invoice',
    msgApSuccessFrom: 'from',
    msgApSuccessValue: 'valued at IDR',
    msgApSuccessEnd: 'successfully recorded.',
    arRec: 'AR Receipt Number',
    arInvRef: 'Sales Invoice Reference Number',
    arCust: 'Customer Company Name',
    arAmount: 'Incoming Payment Amount (IDR)',
    arMethod: 'Payment Method',
    arRef: 'Bank Transaction Ref No',
    btnAr: 'Save AR Receipt',
    msgArSuccess: 'Account Receivable (AR) Receipt',
    msgArSuccessFrom: 'from',
    msgArSuccessValue: 'valued at IDR',
    msgArSuccessEnd: 'successfully reconciled.',
    catOptions: {
      ng: 'Quality / Technical NG (Quality)',
      doc: 'Mismatched Document (Tax/DO)',
      qty: 'Quantity Discrepancy (Over/Under)',
      color: 'Color / Visual Deviation',
      size: 'Size Deviation (Width/Length)',
      delay: 'Delivery Delay'
    },
    solOptions: {
      rep: 'Goods Replacement',
      dn: 'Debit Note Issuance (Bill Deduction)',
      rev: 'Invoice/Tax Document Revision',
      meet: 'Clarification & Technical Meeting'
    },
    deptOptions: {
      qc: 'QC (Quality Deviation)',
      mkt: 'Marketing (Commercial/Price)',
      log: 'Logistics (Delivery & Fleet)'
    }
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'complaint' | 'ap' | 'ar' | 'rma';
}

export const FinanceFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'complaint' }) => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const [activeTab, setActiveTab] = useState<'complaint' | 'ap' | 'ar' | 'rma'>(defaultTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const customers = useAppStore((state) => state.customers);
  const suppliers = useAppStore((state) => state.suppliers);
  const complaints = useAppStore((state) => state.eComplaints);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultTab]);

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
    };

    appStore.addEComplaint(newCmp);
    setSuccessMessage(`Tiket E-Complaint ${complaintTicket} ${t.msgCSuccess} ${complaintDept}.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleRmaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) return;

    appStore.resolveEComplaint(selectedComplaintId, rmaNumber.trim(), debitNoteNumber.trim());
    setSuccessMessage(`${t.msgRmaSuccess} ${rmaNumber} ${t.msgRmaSuccessDn} ${debitNoteNumber} ${t.msgRmaSuccessEnd}`);
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
    };

    appStore.addVendorInvoice(newAp);
    setSuccessMessage(`${t.msgApSuccess} ${apInvoiceNo} ${t.msgApSuccessFrom} ${apSupplier} ${t.msgApSuccessValue} ${total.toLocaleString()} ${t.msgApSuccessEnd}`);
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
    };

    appStore.addArPayment(newAr);
    setSuccessMessage(`${t.msgArSuccess} ${arReceiptNo} ${t.msgArSuccessFrom} ${arCustomer} ${t.msgArSuccessValue} ${arAmount.toLocaleString()} ${t.msgArSuccessEnd}`);
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
              <span>{t.title}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.desc}
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
            <span>{t.tabComplaint}</span>
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
            <span>{t.tabRma}</span>
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
            <span>{t.tabAp}</span>
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
            <span>{t.tabAr}</span>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cTicket}</label>
                  <input
                    type="text"
                    required
                    value={complaintTicket}
                    onChange={(e) => setComplaintTicket(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cCust}</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cDoRef}</label>
                  <input
                    type="text"
                    required
                    value={complaintDoRef}
                    onChange={(e) => setComplaintDoRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cInvRef}</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cCat}</label>
                  <select
                    value={complaintCategory}
                    onChange={(e) => setComplaintCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="UNSUITABLE_QUALITY">{t.catOptions.ng}</option>
                    <option value="UNSUITABLE_DOCUMENT">{t.catOptions.doc}</option>
                    <option value="UNSUITABLE_QUANTITY">{t.catOptions.qty}</option>
                    <option value="UNSUITABLE_COLOR">{t.catOptions.color}</option>
                    <option value="UNSUITABLE_SIZE">{t.catOptions.size}</option>
                    <option value="DELIVERY_DELAY">{t.catOptions.delay}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cSol}</label>
                  <select
                    value={complaintDemandedSolution}
                    onChange={(e) => setComplaintDemandedSolution(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="REPLACE_GOODS">{t.solOptions.rep}</option>
                    <option value="DEBIT_NOTE">{t.solOptions.dn}</option>
                    <option value="REVISE_DOCUMENT">{t.solOptions.rev}</option>
                    <option value="MEETING_DISCUSSION">{t.solOptions.meet}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cDept}</label>
                  <select
                    value={complaintDept}
                    onChange={(e) => setComplaintDept(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="QC">{t.deptOptions.qc}</option>
                    <option value="MARKETING">{t.deptOptions.mkt}</option>
                    <option value="LOGISTICS">{t.deptOptions.log}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.cDesc}</label>
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
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {t.btnCSubmit}
                </button>
              </div>
            </form>
          )}

          {/* 2. Disposisi RMA & Debit Note */}
          {activeTab === 'rma' && (
            <form onSubmit={handleRmaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.rmaSelect}
                </label>
                <select
                  value={selectedComplaintId}
                  onChange={(e) => setSelectedComplaintId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                >
                  {complaints
                    .filter((c) => c.status !== 'RESOLVED')
                    .map((cmp) => (
                      <option key={cmp.id} value={cmp.id}>
                        {cmp.ticketNumber} - {cmp.customerName} ({cmp.complaintType})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.rmaNo}</label>
                  <input
                    type="text"
                    required
                    value={rmaNumber}
                    onChange={(e) => setRmaNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.rmaDn}</label>
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
                  {t.rmaNotes}
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
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {t.btnRma}
                </button>
              </div>
            </form>
          )}

          {/* 3. Faktur Hutang AP */}
          {activeTab === 'ap' && (
            <form onSubmit={handleApSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.apInv}</label>
                  <input
                    type="text"
                    required
                    value={apInvoiceNo}
                    onChange={(e) => setApInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.apPo}</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.apSupp}</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.apDpp}</label>
                  <input
                    type="number"
                    required
                    value={apDpp}
                    onChange={(e) => setApDpp(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.apDue}</label>
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
                <span>{t.apPpn} <strong>IDR {Math.round(apDpp * 0.11).toLocaleString()}</strong></span>
                <span className="font-bold text-indigo-700">{t.apTotal} {Math.round(apDpp * 1.11).toLocaleString()}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {t.btnAp}
                </button>
              </div>
            </form>
          )}

          {/* 4. Penerimaan Piutang AR */}
          {activeTab === 'ar' && (
            <form onSubmit={handleArSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.arRec}</label>
                  <input
                    type="text"
                    required
                    value={arReceiptNo}
                    onChange={(e) => setArReceiptNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.arInvRef}</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.arCust}</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.arAmount}</label>
                  <input
                    type="number"
                    required
                    value={arAmount}
                    onChange={(e) => setArAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.arMethod}</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.arRef}</label>
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
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {t.btnAr}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
