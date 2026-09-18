import React, { useState } from 'react';
import { X, FileText, ShoppingCart, Truck, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { PurchaseRequest, ProcurementOrder, GoodsReceiptLog, EximDocument } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'pr' | 'po' | 'log' | 'exim';
}

const CONTENT = {
  id: {
    title: 'Formulir Pengadaan & Rantai Pasok (Procurement to LOG)',
    desc: 'Alur 5-tahap: Purchase Request (PR) PPIC → PO Supplier → Penerimaan Fisik LOG (Trigger IQC) → Dokumen Pabean EXIM',
    tabPr: '1. Purchase Request (PR)',
    tabPo: '2. Purchase Order (PO)',
    tabLog: '3. Penerimaan Fisik (LOG & IQC)',
    tabExim: '4. Dokumen Pabean EXIM',
    prNum: 'Nomor Purchase Request (PR)',
    prPriority: 'Prioritas Kebutuhan',
    prPriNormal: 'NORMAL (Jadwal Reguler)',
    prPriHigh: 'HIGH (Stok Menipis < Buffer)',
    prPriUrgent: 'URGENT (Jadwal SPK Mendesak)',
    prCode: 'Kode Bahan Baku',
    prName: 'Nama Material / Spesifikasi',
    prQty: 'Kuantitas Dibutuhkan',
    prUnit: 'Satuan',
    prDate: 'Tanggal Dibutuhkan di Pabrik',
    prNotes: 'Tujuan / Catatan PPIC Planner',
    btnCancel: 'Batal',
    btnPrSubmit: 'Terbitkan Purchase Request',
    poNum: 'Nomor Purchase Order (PO)',
    poPrRef: 'Referensi PR PPIC',
    poSupplier: 'Pilihan Vendor / Supplier',
    poQty: 'Kuantitas PO',
    poPrice: 'Harga Satuan (IDR)',
    poEta: 'Estimasi Tiba (ETA)',
    poTotal: 'Total Nilai Purchase Order:',
    btnPoSubmit: 'Terbitkan Purchase Order',
    logNum: 'Nomor Penerimaan Gudang (LOG)',
    logDn: 'Nomor Surat Jalan Vendor',
    logPoRef: 'Referensi PO',
    logTruck: 'Plat Truk Pengangkut',
    logDriver: 'Nama Supir Pengantar',
    logLot: 'Nomor Lot Kedatangan',
    logQty: 'Kuantitas Diterima Fisik',
    logUnit: 'Satuan',
    logIqcTrigger: 'Mekanisme Cekal QC (QC Hold Trigger):',
    logIqcDesc: 'Centang untuk secara otomatis mengirim notifikasi dan antrean uji Incoming Quality Control (IQC) ke Lab QC. Stok lot ini berstatus [HOLD] hingga lulus uji IQC.',
    btnLogSubmit: 'Simpan Penerimaan Gudang (LOG)',
    eximType: 'Jenis Dokumen Pabean BC',
    eximBc23: 'BC 2.3 - Pemasukan Barang Impor Kawasan Berikat',
    eximBc27: 'BC 2.7 - Transfer Antar Kawasan Berikat (Subkontrak)',
    eximBc40: 'BC 4.0 - Pemasukan Bahan Kemasan Lokal TLDDP',
    eximSppb: 'SPPB - Surat Persetujuan Pengeluaran Barang',
    eximRef: 'Nomor Registrasi Pabean',
    eximNotes: 'Catatan Kepatuhan Pabean',
    btnEximSubmit: 'Simpan & Verifikasi Dokumen Pabean',
    msgPrSuccess: 'berhasil diterbitkan.',
    msgPoSuccess: 'berhasil diterbitkan kepada',
    msgLogSuccess: 'berhasil disimpan.',
    msgLogAutoIqc: 'Antrean uji IQC otomatis aktif!',
    msgEximSuccess: 'berhasil diverifikasi.',
  },
  en: {
    title: 'Procurement & Supply Chain Forms (Procurement to LOG)',
    desc: '5-stage flow: PPIC Purchase Request (PR) → Supplier PO → Physical Receipt LOG (Trigger IQC) → EXIM Customs Documents',
    tabPr: '1. Purchase Request (PR)',
    tabPo: '2. Purchase Order (PO)',
    tabLog: '3. Physical Receipt (LOG & IQC)',
    tabExim: '4. EXIM Customs Documents',
    prNum: 'Purchase Request (PR) Number',
    prPriority: 'Requirement Priority',
    prPriNormal: 'NORMAL (Regular Schedule)',
    prPriHigh: 'HIGH (Low Stock < Buffer)',
    prPriUrgent: 'URGENT (Urgent Work Order Schedule)',
    prCode: 'Raw Material Code',
    prName: 'Material Name / Specification',
    prQty: 'Required Quantity',
    prUnit: 'Unit',
    prDate: 'Required Date at Factory',
    prNotes: 'Purpose / PPIC Planner Notes',
    btnCancel: 'Cancel',
    btnPrSubmit: 'Issue Purchase Request',
    poNum: 'Purchase Order (PO) Number',
    poPrRef: 'PPIC PR Reference',
    poSupplier: 'Vendor / Supplier Selection',
    poQty: 'PO Quantity',
    poPrice: 'Unit Price (IDR)',
    poEta: 'Estimated Time of Arrival (ETA)',
    poTotal: 'Total Purchase Order Value:',
    btnPoSubmit: 'Issue Purchase Order',
    logNum: 'Warehouse Receipt Number (LOG)',
    logDn: 'Vendor Delivery Note Number',
    logPoRef: 'PO Reference',
    logTruck: 'Carrier Truck Plate',
    logDriver: 'Delivery Driver Name',
    logLot: 'Arrival Lot Number',
    logQty: 'Physical Quantity Received',
    logUnit: 'Unit',
    logIqcTrigger: 'QC Hold Trigger Mechanism:',
    logIqcDesc: 'Check to automatically send notification and Incoming Quality Control (IQC) test queue to QC Lab. This lot stock status is [HOLD] until passing IQC test.',
    btnLogSubmit: 'Save Warehouse Receipt (LOG)',
    eximType: 'Customs Document Type',
    eximBc23: 'BC 2.3 - Import Goods Entry to Bonded Zone',
    eximBc27: 'BC 2.7 - Transfer Between Bonded Zones (Subcontract)',
    eximBc40: 'BC 4.0 - Local Packaging Material Entry (TLDDP)',
    eximSppb: 'SPPB - Goods Release Approval Letter',
    eximRef: 'Customs Registration Number',
    eximNotes: 'Customs Compliance Notes',
    btnEximSubmit: 'Save & Verify Customs Document',
    msgPrSuccess: 'successfully issued.',
    msgPoSuccess: 'successfully issued to',
    msgLogSuccess: 'successfully saved.',
    msgLogAutoIqc: 'Automatic IQC test queue activated!',
    msgEximSuccess: 'successfully verified.',
  }
};

export const ProcurementFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'pr' }) => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const [activeTab, setActiveTab] = useState<'pr' | 'po' | 'log' | 'exim'>(defaultTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const suppliers = useAppStore((state) => state.suppliers);
  const purchaseRequests = useAppStore((state) => state.purchaseRequests);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultTab]);

  // Form 1: PR state
  const [prNumber, setPrNumber] = useState(`PR/PPIC/2026/09/00${Math.floor(Math.random() * 90 + 10)}`);
  const [prItemCode, setPrItemCode] = useState('RM-BOPP-JMB');
  const [prItemName, setPrItemName] = useState('BOPP Jumbo Roll Film 1280mm x 4000m (50 µm)');
  const [prQty, setPrQty] = useState(20);
  const [prUnit, setPrUnit] = useState('Jumbo Roll');
  const [prRequiredDate, setPrRequiredDate] = useState(new Date().toISOString().slice(0, 10));
  const [prPriority, setPrPriority] = useState<PurchaseRequest['priority']>('HIGH');
  const [prPurpose, setPrPurpose] = useState('Buffer pengaman pemenuhan jadwal produksi order Daihatsu');

  // Form 2: PO state
  const [poNumber, setPoNumber] = useState(`PO/PUR/2026/09/01${Math.floor(Math.random() * 90 + 10)}`);
  const [poSupplierName, setPoSupplierName] = useState(suppliers[0]?.supplierName || 'Nippon Polymer & Chemical Corp Tokyo');
  const [poPrRef, setPoPrRef] = useState(purchaseRequests[0]?.prNumber || 'PR/PPIC/2026/09/0081');
  const [poQty, setPoQty] = useState(15);
  const [poUnitPrice, setPoUnitPrice] = useState(18500000);
  const [poEta, setPoEta] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [poDownPayment, setPoDownPayment] = useState(30); // 30%

  // Form 3: LOG / Goods Receipt state
  const [logNumber, setLogNumber] = useState(`LOG/WH/2026/09/01${Math.floor(Math.random() * 90 + 10)}`);
  const [logPoRef, setLogPoRef] = useState('PO/PUR/2026/09/0142');
  const [logSupplier, setLogSupplier] = useState('Nippon Polymer & Chemical Corp');
  const [logDeliveryNote, setLogDeliveryNote] = useState(`SJ-VND-2026-${Math.floor(Math.random() * 9000 + 1000)}`);
  const [logTruckPlate, setLogTruckPlate] = useState('B 9812 UYX');
  const [logDriver, setLogDriver] = useState('Pak Dedi (Trans Express)');
  const [logItemCode, setLogItemCode] = useState('RM-BOPP-JMB');
  const [logItemName, setLogItemName] = useState('BOPP Jumbo Roll Film 1280mm x 4000m (50 µm)');
  const [logLotNumber, setLogLotNumber] = useState(`LOT-IMP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 90 + 10)}`);
  const [logQty, setLogQty] = useState(10);
  const [logUnit, setLogUnit] = useState('Jumbo Roll');
  const [triggerIqc, setTriggerIqc] = useState(true);

  // Form 4: EXIM state
  const [eximDocType, setEximDocType] = useState<EximDocument['docType']>('BC 2.3');
  const [eximRefNo, setEximRefNo] = useState(`00${Math.floor(Math.random() * 9000 + 1000)}/BC23/KPU-TP/2026`);
  const [eximNotes, setEximNotes] = useState('Pemasukan barang impor bahan baku polimer ke kawasan berikat.');

  if (!isOpen) return null;

  const handlePrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prItemName.trim()) return;

    const newPr: PurchaseRequest = {
      id: `PR-${Date.now()}`,
      prNumber: prNumber.trim(),
      requestedBy: currentUser.name,
      department: currentUser.department,
      itemCode: prItemCode.trim(),
      itemName: prItemName.trim(),
      quantity: Number(prQty) || 1,
      unit: prUnit.trim(),
      requiredDate: prRequiredDate,
      priority: prPriority,
      status: 'REQUESTED',
      purpose: prPurpose.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    appStore.addPurchaseRequest(newPr);
    setSuccessMessage(`Purchase Request ${prNumber} ${t.msgPrSuccess}`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handlePoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierName.trim()) return;

    const total = Number(poQty) * Number(poUnitPrice);

    const newPo: ProcurementOrder = {
      id: `PO-${Date.now()}`,
      prNumber: poPrRef.trim(),
      poNumber: poNumber.trim(),
      vendorName: poSupplierName.trim(),
      itemsCount: 1,
      itemName: prItemName,
      quantity: Number(poQty) || 1,
      unit: prUnit,
      unitPrice: Number(poUnitPrice) || 0,
      totalAmount: total,
      stage: 'PO',
      stageProgress: 40,
      lastUpdate: new Date().toISOString().slice(0, 10),
      estimatedArrival: poEta,
    };

    appStore.addProcurementOrder(newPo);
    setSuccessMessage(`Purchase Order ${poNumber} ${t.msgPoSuccess} ${poSupplierName}`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDeliveryNote.trim()) return;

    const newLog: GoodsReceiptLog = {
      id: `LOG-${Date.now()}`,
      logNumber: logNumber.trim(),
      poNumber: logPoRef.trim(),
      supplierName: logSupplier.trim(),
      deliveryNoteNumber: logDeliveryNote.trim(),
      vendorTruckPlate: logTruckPlate.trim(),
      driverName: logDriver.trim(),
      receiptDate: `${new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      receivedBy: currentUser.name,
      itemCode: logItemCode.trim(),
      itemName: logItemName.trim(),
      lotNumber: logLotNumber.trim(),
      qtyDelivered: Number(logQty) || 1,
      unit: logUnit.trim(),
      isIqcTriggered: triggerIqc,
      iqcStatus: triggerIqc ? 'PENDING' : 'PASS',
    };

    appStore.addGoodsReceiptLog(newLog);
    setSuccessMessage(`(LOG) ${logNumber} ${t.msgLogSuccess} ${triggerIqc ? t.msgLogAutoIqc : ''}`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleEximSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eximRefNo.trim()) return;

    const newExim: EximDocument = {
      id: `EXIM-${Date.now()}`,
      docType: eximDocType,
      referenceNumber: eximRefNo.trim(),
      registrationDate: new Date().toISOString().slice(0, 10),
      status: 'VERIFIED',
      fileName: `${eximDocType.replace(' ', '_')}_${eximRefNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileSize: '2.8 MB',
      notes: eximNotes.trim(),
    };

    appStore.addEximDoc(newExim);
    setSuccessMessage(`EXIM ${eximDocType} No: ${eximRefNo} ${t.msgEximSuccess}`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
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
            onClick={() => setActiveTab('pr')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'pr'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.tabPr}</span>
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'po'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{t.tabPo}</span>
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'log'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{t.tabLog}</span>
          </button>
          <button
            onClick={() => setActiveTab('exim')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'exim'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t.tabExim}</span>
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

          {/* 1. Purchase Request */}
          {activeTab === 'pr' && (
            <form onSubmit={handlePrSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.prNum}</label>
                  <input
                    type="text"
                    required
                    value={prNumber}
                    onChange={(e) => setPrNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.prPriority}</label>
                  <select
                    value={prPriority}
                    onChange={(e) => setPrPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="NORMAL">{t.prPriNormal}</option>
                    <option value="HIGH">{t.prPriHigh}</option>
                    <option value="URGENT">{t.prPriUrgent}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.prCode}</label>
                  <input
                    type="text"
                    required
                    value={prItemCode}
                    onChange={(e) => setPrItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.prName}</label>
                  <input
                    type="text"
                    required
                    value={prItemName}
                    onChange={(e) => setPrItemName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.prQty}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prQty}
                    onChange={(e) => setPrQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.prUnit}</label>
                  <input
                    type="text"
                    required
                    value={prUnit}
                    onChange={(e) => setPrUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.prDate}</label>
                  <input
                    type="date"
                    required
                    value={prRequiredDate}
                    onChange={(e) => setPrRequiredDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.prNotes}</label>
                <textarea
                  rows={2}
                  value={prPurpose}
                  onChange={(e) => setPrPurpose(e.target.value)}
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
                  {t.btnPrSubmit}
                </button>
              </div>
            </form>
          )}

          {/* 2. Purchase Order */}
          {activeTab === 'po' && (
            <form onSubmit={handlePoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.poNum}</label>
                  <input
                    type="text"
                    required
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.poPrRef}</label>
                  <select
                    value={poPrRef}
                    onChange={(e) => setPoPrRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                  >
                    {purchaseRequests.map((pr) => (
                      <option key={pr.id} value={pr.prNumber}>
                        {pr.prNumber} - {pr.itemName} ({pr.quantity} {pr.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.poSupplier}</label>
                <select
                  value={poSupplierName}
                  onChange={(e) => setPoSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.supplierName}>
                      {s.supplierName} ({s.supplierCode}) - {s.paymentTerm}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.poQty}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={poQty}
                    onChange={(e) => setPoQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.poPrice}</label>
                  <input
                    type="number"
                    required
                    value={poUnitPrice}
                    onChange={(e) => setPoUnitPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.poEta}</label>
                  <input
                    type="date"
                    required
                    value={poEta}
                    onChange={(e) => setPoEta(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                <span>{t.poTotal}</span>
                <strong className="font-mono text-sm font-black">
                  IDR {(poQty * poUnitPrice).toLocaleString()}
                </strong>
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
                  {t.btnPoSubmit}
                </button>
              </div>
            </form>
          )}

          {/* 3. Penerimaan Fisik (LOG & Trigger IQC) */}
          {activeTab === 'log' && (
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.logNum}</label>
                  <input
                    type="text"
                    required
                    value={logNumber}
                    onChange={(e) => setLogNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.logDn}</label>
                  <input
                    type="text"
                    required
                    value={logDeliveryNote}
                    onChange={(e) => setLogDeliveryNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.logPoRef}</label>
                  <input
                    type="text"
                    required
                    value={logPoRef}
                    onChange={(e) => setLogPoRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.logTruck}</label>
                  <input
                    type="text"
                    required
                    value={logTruckPlate}
                    onChange={(e) => setLogTruckPlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.logDriver}</label>
                  <input
                    type="text"
                    required
                    value={logDriver}
                    onChange={(e) => setLogDriver(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.logLot}</label>
                  <input
                    type="text"
                    required
                    value={logLotNumber}
                    onChange={(e) => setLogLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.logQty}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={logQty}
                    onChange={(e) => setLogQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.logUnit}</label>
                  <input
                    type="text"
                    required
                    value={logUnit}
                    onChange={(e) => setLogUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="triggerIqc"
                  checked={triggerIqc}
                  onChange={(e) => setTriggerIqc(e.target.checked)}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="triggerIqc" className="text-xs text-amber-900 cursor-pointer">
                  <strong className="font-bold">{t.logIqcTrigger}</strong>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    {t.logIqcDesc}
                  </div>
                </label>
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
                  {t.btnLogSubmit}
                </button>
              </div>
            </form>
          )}

          {/* 4. Dokumen Pabean EXIM */}
          {activeTab === 'exim' && (
            <form onSubmit={handleEximSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.eximType}</label>
                  <select
                    value={eximDocType}
                    onChange={(e) => setEximDocType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="BC 2.3">{t.eximBc23}</option>
                    <option value="BC 2.7">{t.eximBc27}</option>
                    <option value="BC 4.0">{t.eximBc40}</option>
                    <option value="SPPB Gate-Pass">{t.eximSppb}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.eximRef}</label>
                  <input
                    type="text"
                    required
                    value={eximRefNo}
                    onChange={(e) => setEximRefNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.eximNotes}</label>
                <textarea
                  rows={2}
                  value={eximNotes}
                  onChange={(e) => setEximNotes(e.target.value)}
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
                  {t.btnEximSubmit}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
