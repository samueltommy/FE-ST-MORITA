import React, { useState } from 'react';
import { X, Calculator, Truck, QrCode, CheckCircle2, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { Quotation, DeliveryOrder, SalesTrackingOrder } from '../../types';

const CONTENT = {
  id: {
    title: 'Formulir Penjualan & Distribusi (Sales to Dispatch)',
    desc: 'Kalkulator Margin Penawaran (Lockout <18%), Penerbitan Surat Jalan (DO/RDO), & Update E-Tracking Barcode',
    tabQuotation: 'Kalkulator Margin Quotation',
    tabDo: 'Penerbitan Surat Jalan (DO/RDO)',
    tabTracking: 'Update Checkpoint E-Tracking',
    qNum: 'Nomor Penawaran (Quotation)',
    qCust: 'Target Perusahaan Pelanggan',
    qItemCode: 'Kode Item',
    qItemName: 'Nama Produk yang Ditawarkan',
    qQty: 'Kuantitas',
    qUnit: 'Satuan',
    qCost: 'HPP Unit Cost (IDR)',
    qPrice: 'Target Harga Jual (IDR)',
    qMarginTitle: 'Kalkulasi Gross Margin (Threshold: 18.0%):',
    qMarginLow: '⚠️ Margin di bawah ambang batas standar (18%). Pengajuan ini akan berstatus [PENDING APPROVAL] dan membutuhkan persetujuan formal Cost Control & Direksi sebelum IO dapat diproses ke PPIC!',
    qMarginOk: '✓ Margin memenuhi standar kelayakan bisnis (≥ 18%). Penawaran harga ini akan langsung berstatus [APPROVED] untuk dicetak ke klien.',
    qTotalEst: 'Estimasi Total Nilai Penawaran:',
    btnCancel: 'Batal',
    btnQuote: 'Ajukan Penawaran Harga (Quotation)',
    doNum: 'Nomor Delivery Order (DO)',
    rdoNum: 'Nomor RDO (Surat Jalan)',
    doCust: 'Tujuan Perusahaan Pelanggan',
    doPlate: 'Plat Armada Truk Pengangkut',
    doDriver: 'Nama Driver / Supir Logistik',
    doLot: 'Pilih Batch Lot Barang Jadi (Hanya Lot PASS QC)',
    doQty: 'Kuantitas Pengiriman (Roll)',
    btnDo: 'Terbitkan Surat Jalan (DO)',
    trackBarcode: 'Barcode / Nomor Internal Order (IO)',
    trackStage: 'Tahap Checkpoint Saat Ini',
    trackLoc: 'Titik Lokasi Pemindaian',
    trackNotes: 'Catatan Lapangan / Keterangan Ekstra',
    btnTrack: 'Update Checkpoint Status',
    msgQuoteLow: 'berhasil dibuat dengan margin',
    msgQuoteLowDesc: '%. PERINGATAN: Karena margin < 18%, status dikunci PENDING COST CONTROL APPROVAL!',
    msgQuoteOk: 'dengan margin sehat',
    msgQuoteOkDesc: '% berhasil diterbitkan dan otomatis APPROVED.',
    errQcHold: 'ERROR CEKAL MUTU: Lot',
    errQcHoldDesc: 'saat ini berstatus QC HOLD! Sistem mengunci pengiriman produk yang belum lolos uji lab.',
    msgDoSuccess: 'Surat Jalan (DO)',
    msgDoSuccessDesc: 'berhasil diterbitkan dengan validasi QC PASSED.',
    msgTrackSuccess: 'Checkpoint E-Tracking',
    msgTrackSuccessDesc: 'untuk Barcode',
    msgTrackSuccessEnd: 'berhasil diperbarui.',
    trackOptions: {
      io: 'IO Diterbitkan',
      slit: 'Proses Slitting & Rewinding Mesin',
      qc: 'Inspeksi Lab QC & Penerbitan COA',
      pack: 'Pengemasan Karton di Gudang FG',
      gate: 'Gate Dispatch (Keberangkatan Truk)',
      deliv: 'Delivered (Tiba di Pabrik Pelanggan)'
    }
  },
  en: {
    title: 'Sales & Distribution Forms (Sales to Dispatch)',
    desc: 'Quotation Margin Calculator (<18% Lockout), Delivery Order (DO/RDO) Issuance, & E-Tracking Barcode Update',
    tabQuotation: 'Quotation Margin Calculator',
    tabDo: 'Delivery Order (DO/RDO) Issuance',
    tabTracking: 'Update E-Tracking Checkpoint',
    qNum: 'Quotation Number',
    qCust: 'Target Customer Company',
    qItemCode: 'Item Code',
    qItemName: 'Offered Product Name',
    qQty: 'Quantity',
    qUnit: 'Unit',
    qCost: 'Unit Cost COGS (IDR)',
    qPrice: 'Target Selling Price (IDR)',
    qMarginTitle: 'Gross Margin Calculation (Threshold: 18.0%):',
    qMarginLow: '⚠️ Margin is below the standard threshold (18%). This submission will be [PENDING APPROVAL] and requires formal Cost Control & Director approval before IO can be processed to PPIC!',
    qMarginOk: '✓ Margin meets business feasibility standard (≥ 18%). This quotation will immediately be [APPROVED] for printing to client.',
    qTotalEst: 'Estimated Total Quotation Value:',
    btnCancel: 'Cancel',
    btnQuote: 'Submit Price Quotation',
    doNum: 'Delivery Order (DO) Number',
    rdoNum: 'RDO Number',
    doCust: 'Target Customer Company Destination',
    doPlate: 'Delivery Truck License Plate',
    doDriver: 'Driver Name',
    doLot: 'Select Finished Goods Batch Lot (PASS QC Lots Only)',
    doQty: 'Delivery Quantity (Rolls)',
    btnDo: 'Issue Delivery Order (DO)',
    trackBarcode: 'Barcode / Internal Order (IO) Number',
    trackStage: 'Current Checkpoint Stage',
    trackLoc: 'Scanning Location Point',
    trackNotes: 'Field Notes / Extra Remarks',
    btnTrack: 'Update Checkpoint Status',
    msgQuoteLow: 'successfully created with margin',
    msgQuoteLowDesc: '%. WARNING: Because margin < 18%, status is locked to PENDING COST CONTROL APPROVAL!',
    msgQuoteOk: 'with healthy margin',
    msgQuoteOkDesc: '% successfully issued and automatically APPROVED.',
    errQcHold: 'QC HOLD ERROR: Lot',
    errQcHoldDesc: 'is currently on QC HOLD! The system locks delivery of products that have not passed lab tests.',
    msgDoSuccess: 'Delivery Order (DO)',
    msgDoSuccessDesc: 'successfully issued with QC PASSED validation.',
    msgTrackSuccess: 'E-Tracking Checkpoint',
    msgTrackSuccessDesc: 'for Barcode',
    msgTrackSuccessEnd: 'successfully updated.',
    trackOptions: {
      io: 'IO Issued',
      slit: 'Machine Slitting & Rewinding Process',
      qc: 'QC Lab Inspection & COA Issuance',
      pack: 'Carton Packaging in FG Warehouse',
      gate: 'Gate Dispatch (Truck Departure)',
      deliv: 'Delivered (Arrived at Customer Factory)'
    }
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'quotation' | 'do' | 'tracking';
}

export const SalesFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'quotation' }) => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const [activeTab, setActiveTab] = useState<'quotation' | 'do' | 'tracking'>(defaultTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const customers = useAppStore((state) => state.customers);
  const items = useAppStore((state) => state.items);
  const qcRecords = useAppStore((state) => state.qcRecords);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultTab]);

  // Form 1: Quotation state
  const [quotationNo, setQuotationNo] = useState(`SQ/SALES/2026/09/01${Math.floor(Math.random() * 90 + 10)}`);
  const [customerName, setCustomerName] = useState(customers[0]?.companyName || 'PT Astra Daihatsu Motor');
  const [itemName, setItemName] = useState('Automotive Masking Tape High-Temp 150°C 24mm x 50m');
  const [itemCode, setItemCode] = useState('SM-MSK-KFT24');
  const [quantity, setQuantity] = useState(2500);
  const [unit, setUnit] = useState('Roll');
  const [unitCost, setUnitCost] = useState(145000);
  const [sellingPrice, setSellingPrice] = useState(195000);

  // Calculated gross margin
  const marginPercent = sellingPrice > 0 ? Number((((sellingPrice - unitCost) / sellingPrice) * 100).toFixed(1)) : 0;
  const isMarginLow = marginPercent < 18.0;

  // Form 2: DO state
  const [doNumber, setDoNumber] = useState(`DO/SMI/2026/09/01${Math.floor(Math.random() * 90 + 10)}`);
  const [rdoNumber, setRdoNumber] = useState(`RDO/SMI/2026/09/01${Math.floor(Math.random() * 90 + 10)}`);
  const [doCustomer, setDoCustomer] = useState(customers[0]?.companyName || 'PT Astra Daihatsu Motor');
  const [doTruckPlate, setDoTruckPlate] = useState('B 9128 UXT');
  const [doDriver, setDoDriver] = useState('Pak Sutrisno');
  const [doLotNumber, setDoLotNumber] = useState('LOT-IND-202609-08');
  const [doQty, setDoQty] = useState(1200);

  // Form 3: Tracking state
  const [trackBarcode, setTrackBarcode] = useState('IO/SMI/2026/09/0235');
  const [trackStage, setTrackStage] = useState<'PRODUCTION' | 'STAGING' | 'QC_OUT' | 'IN_TRANSIT' | 'DELIVERED'>('IN_TRANSIT');
  const [trackLocation, setTrackLocation] = useState('Main Gate Guardhouse - Pos 1 Kawasan Berikat');
  const [trackNotes, setTrackNotes] = useState('Truk armada B 9128 UXT telah meninggalkan pos gerbang pabrik menuju plant Sunter.');

  if (!isOpen) return null;

  const handleQuotationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !itemName.trim()) return;

    const newQuotation: Quotation = {
      id: `QUOT-${Date.now()}`,
      quotationNumber: quotationNo.trim(),
      customerName: customerName.trim(),
      salesRepresentative: currentUser.name,
      productName: itemName.trim(),
      quantity: Number(quantity) || 1,
      unit: unit.trim(),
      currency: 'IDR',
      hppUnitCost: Number(unitCost) || 0,
      targetPrice: Number(sellingPrice) || 0,
      grossMarginPercent: marginPercent,
      status: isMarginLow ? 'PENDING_COST_CONTROL' : 'APPROVED',
      createdDate: new Date().toISOString().slice(0, 10),
    };

    appStore.addQuotation(newQuotation);

    if (isMarginLow) {
      setSuccessMessage(
        `Quotation ${quotationNo} ${t.msgQuoteLow} ${marginPercent}${t.msgQuoteLowDesc}`
      );
    } else {
      setSuccessMessage(`Quotation ${quotationNo} ${t.msgQuoteOk} ${marginPercent}${t.msgQuoteOkDesc}`);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleDoSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if lot is in QC hold
    const isLotOnHold = qcRecords.some((r) => r.lotNumber === doLotNumber && r.status === 'HOLD');
    if (isLotOnHold) {
      alert(`${t.errQcHold} ${doLotNumber} ${t.errQcHoldDesc}`);
      return;
    }

    const newDo: DeliveryOrder = {
      id: `DO-${Date.now()}`,
      doNumber: doNumber.trim(),
      customerName: doCustomer.trim(),
      customerAddress: 'Kawasan Industri MM2100 Blok C-2',
      dispatchDate: new Date().toISOString().slice(0, 10),
      truckArmada: `${doTruckPlate.trim()} (${doDriver.trim()})`,
      truckPlate: doTruckPlate.trim(),
      totalGrossValue: (Number(doQty) || 100) * 150000,
      selectedForInvoice: false,
      items: [
        {
          itemCode,
          itemName,
          lotNumber: doLotNumber.trim(),
          quantity: Number(doQty) || 100,
          unit,
          unitPrice: 150000,
        },
      ],
    };

    appStore.addDeliveryOrder(newDo);
    setSuccessMessage(`${t.msgDoSuccess} ${doNumber} ${t.msgDoSuccessDesc}`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackBarcode.trim()) return;

    appStore.updateTrackingStage(trackBarcode.trim(), trackStage, trackLocation.trim(), currentUser.name);
    setSuccessMessage(`${t.msgTrackSuccess} [${trackStage}] ${t.msgTrackSuccessDesc} ${trackBarcode} ${t.msgTrackSuccessEnd}`);
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
              <Calculator className="w-5 h-5 text-indigo-600" />
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
            onClick={() => setActiveTab('quotation')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'quotation'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>{t.tabQuotation}</span>
          </button>
          <button
            onClick={() => setActiveTab('do')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'do'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{t.tabDo}</span>
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'tracking'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{t.tabTracking}</span>
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

          {/* 1. Quotation Form with Live Margin Calculator */}
          {activeTab === 'quotation' && (
            <form onSubmit={handleQuotationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qNum}</label>
                  <input
                    type="text"
                    required
                    value={quotationNo}
                    onChange={(e) => setQuotationNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qCust}</label>
                  <select
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.companyName}>
                        {c.companyName} ({c.customerCode}) - PPh {c.taxTransactionCode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qItemCode}</label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qItemName}</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qQty}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qUnit}</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qCost}</label>
                  <input
                    type="number"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qPrice}</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Real-time Profit Margin Indicator Box */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isMarginLow
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isMarginLow ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                    <span className="text-xs font-bold">{t.qMarginTitle}</span>
                  </div>
                  <strong className="text-lg font-mono font-black">
                    {marginPercent}%
                  </strong>
                </div>

                <div className="text-xs leading-relaxed">
                  {isMarginLow ? (
                    <span className="font-semibold text-amber-800">
                      {t.qMarginLow}
                    </span>
                  ) : (
                    <span className="text-emerald-800">
                      {t.qMarginOk}
                    </span>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono">
                  <span>{t.qTotalEst}</span>
                  <strong className="font-bold">IDR {(quantity * sellingPrice).toLocaleString()}</strong>
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
                  {t.btnQuote}
                </button>
              </div>
            </form>
          )}

          {/* 2. DO & RDO Dispatch Form */}
          {activeTab === 'do' && (
            <form onSubmit={handleDoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.doNum}</label>
                  <input
                    type="text"
                    required
                    value={doNumber}
                    onChange={(e) => setDoNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.rdoNum}</label>
                  <input
                    type="text"
                    required
                    value={rdoNumber}
                    onChange={(e) => setRdoNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.doCust}</label>
                <select
                  value={doCustomer}
                  onChange={(e) => setDoCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.companyName}>
                      {c.companyName} - {c.shippingAddress || c.billingAddress}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.doPlate}</label>
                  <input
                    type="text"
                    required
                    value={doTruckPlate}
                    onChange={(e) => setDoTruckPlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.doDriver}</label>
                  <input
                    type="text"
                    required
                    value={doDriver}
                    onChange={(e) => setDoDriver(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.doLot}
                  </label>
                  <select
                    value={doLotNumber}
                    onChange={(e) => setDoLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono font-bold"
                  >
                    {qcRecords
                      .filter((r) => r.status === 'PASS')
                      .map((lot) => (
                        <option key={lot.id} value={lot.lotNumber}>
                          {lot.lotNumber} - {lot.itemName} (COA: {lot.coaNumber || 'Terlampir'})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.doQty}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={doQty}
                    onChange={(e) => setDoQty(Number(e.target.value) || 1)}
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
                  {t.btnDo}
                </button>
              </div>
            </form>
          )}

          {/* 3. Update E-Tracking Checkpoint */}
          {activeTab === 'tracking' && (
            <form onSubmit={handleTrackingSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.trackBarcode}</label>
                  <input
                    type="text"
                    required
                    value={trackBarcode}
                    onChange={(e) => setTrackBarcode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.trackStage}</label>
                  <select
                    value={trackStage}
                    onChange={(e) => setTrackStage(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="IO_CREATED">{t.trackOptions.io}</option>
                    <option value="SLITTING_PROGRESS">{t.trackOptions.slit}</option>
                    <option value="QC_INSPECTION">{t.trackOptions.qc}</option>
                    <option value="WAREHOUSE_PACKAGING">{t.trackOptions.pack}</option>
                    <option value="GATE_DISPATCH">{t.trackOptions.gate}</option>
                    <option value="DELIVERED">{t.trackOptions.deliv}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.trackLoc}</label>
                <input
                  type="text"
                  required
                  value={trackLocation}
                  onChange={(e) => setTrackLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.trackNotes}</label>
                <textarea
                  rows={2}
                  value={trackNotes}
                  onChange={(e) => setTrackNotes(e.target.value)}
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
                  {t.btnTrack}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
