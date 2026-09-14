import React, { useState } from 'react';
import { X, FileText, ShoppingCart, Truck, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { PurchaseRequest, ProcurementOrder, GoodsReceiptLog, EximDocument } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'pr' | 'po' | 'log' | 'exim';
}

export const ProcurementFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'pr' }) => {
  const [activeTab, setActiveTab] = useState<'pr' | 'po' | 'log' | 'exim'>(defaultTab);
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
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
      businessUnit: currentUnit,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    appStore.addPurchaseRequest(newPr);
    setSuccessMessage(`Purchase Request ${prNumber} berhasil diterbitkan.`);
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
      businessUnit: currentUnit,
    };

    appStore.addProcurementOrder(newPo);
    setSuccessMessage(`Purchase Order ${poNumber} kepada ${poSupplierName} berhasil diterbitkan.`);
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
      businessUnit: currentUnit,
    };

    appStore.addGoodsReceiptLog(newLog);
    setSuccessMessage(`Penerimaan Gudang (LOG) ${logNumber} berhasil disimpan. ${triggerIqc ? 'Antrean uji IQC otomatis aktif!' : ''}`);
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
      businessUnit: currentUnit,
    };

    appStore.addEximDoc(newExim);
    setSuccessMessage(`Dokumen Pabean ${eximDocType} No: ${eximRefNo} berhasil diverifikasi.`);
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
              <span>Formulir Pengadaan & Rantai Pasok (Procurement to LOG)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Alur 5-tahap: Purchase Request (PR) PPIC → PO Supplier → Penerimaan Fisik LOG (Trigger IQC) → Dokumen Pabean EXIM
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
            <span>1. Purchase Request (PR)</span>
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
            <span>2. Purchase Order (PO)</span>
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
            <span>3. Penerimaan Fisik (LOG & IQC)</span>
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
            <span>4. Dokumen Pabean EXIM</span>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Purchase Request (PR)</label>
                  <input
                    type="text"
                    required
                    value={prNumber}
                    onChange={(e) => setPrNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prioritas Kebutuhan</label>
                  <select
                    value={prPriority}
                    onChange={(e) => setPrPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="NORMAL">NORMAL (Jadwal Reguler)</option>
                    <option value="HIGH">HIGH (Stok Menipis &lt; Buffer)</option>
                    <option value="URGENT">URGENT (Jadwal SPK Mendesak)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Bahan Baku</label>
                  <input
                    type="text"
                    required
                    value={prItemCode}
                    onChange={(e) => setPrItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Material / Spesifikasi</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kuantitas Dibutuhkan</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={prUnit}
                    onChange={(e) => setPrUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Dibutuhkan di Pabrik</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tujuan / Catatan PPIC Planner</label>
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Terbitkan Purchase Request
                </button>
              </div>
            </form>
          )}

          {/* 2. Purchase Order */}
          {activeTab === 'po' && (
            <form onSubmit={handlePoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Purchase Order (PO)</label>
                  <input
                    type="text"
                    required
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Referensi PR PPIC</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilihan Vendor / Supplier</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kuantitas PO</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Harga Satuan (IDR)</label>
                  <input
                    type="number"
                    required
                    value={poUnitPrice}
                    onChange={(e) => setPoUnitPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimasi Tiba (ETA)</label>
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
                <span>Total Nilai Purchase Order:</span>
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Terbitkan Purchase Order
                </button>
              </div>
            </form>
          )}

          {/* 3. Penerimaan Fisik (LOG & Trigger IQC) */}
          {activeTab === 'log' && (
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Penerimaan Gudang (LOG)</label>
                  <input
                    type="text"
                    required
                    value={logNumber}
                    onChange={(e) => setLogNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Surat Jalan Vendor</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Referensi PO</label>
                  <input
                    type="text"
                    required
                    value={logPoRef}
                    onChange={(e) => setLogPoRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plat Truk Pengangkut</label>
                  <input
                    type="text"
                    required
                    value={logTruckPlate}
                    onChange={(e) => setLogTruckPlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Supir Pengantar</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Lot Kedatangan</label>
                  <input
                    type="text"
                    required
                    value={logLotNumber}
                    onChange={(e) => setLogLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kuantitas Diterima Fisik</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
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
                  <strong className="font-bold">Mekanisme Cekal QC (QC Hold Trigger):</strong>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Centang untuk secara otomatis mengirim notifikasi dan antrean uji Incoming Quality Control (IQC) ke Lab QC. Stok lot ini berstatus [HOLD] hingga lulus uji IQC.
                  </div>
                </label>
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
                  Simpan Penerimaan Gudang (LOG)
                </button>
              </div>
            </form>
          )}

          {/* 4. Dokumen Pabean EXIM */}
          {activeTab === 'exim' && (
            <form onSubmit={handleEximSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Dokumen Pabean BC</label>
                  <select
                    value={eximDocType}
                    onChange={(e) => setEximDocType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="BC 2.3">BC 2.3 - Pemasukan Barang Impor Kawasan Berikat</option>
                    <option value="BC 2.7">BC 2.7 - Transfer Antar Kawasan Berikat (Subkontrak)</option>
                    <option value="BC 4.0">BC 4.0 - Pemasukan Bahan Kemasan Lokal TLDDP</option>
                    <option value="SPPB Gate-Pass">SPPB - Surat Persetujuan Pengeluaran Barang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Registrasi Pabean</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Kepatuhan Pabean</label>
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Simpan & Verifikasi Dokumen Pabean
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
