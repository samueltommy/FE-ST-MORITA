import React, { useState } from 'react';
import { X, Calculator, Truck, QrCode, CheckCircle2, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { Quotation, DeliveryOrder, SalesTrackingOrder } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'quotation' | 'do' | 'tracking';
}

export const SalesFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'quotation' }) => {
  const [activeTab, setActiveTab] = useState<'quotation' | 'do' | 'tracking'>(defaultTab);
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
  const currentUser = useAppStore((state) => state.currentUser);
  const customers = useAppStore((state) => state.customers);
  const items = useAppStore((state) => state.items);
  const qcRecords = useAppStore((state) => state.qcRecords);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      businessUnit: currentUnit,
    };

    appStore.addQuotation(newQuotation);

    if (isMarginLow) {
      setSuccessMessage(
        `Quotation ${quotationNo} berhasil dibuat dengan margin ${marginPercent}%. PERINGATAN: Karena margin < 18%, status dikunci PENDING COST CONTROL APPROVAL!`
      );
    } else {
      setSuccessMessage(`Quotation ${quotationNo} dengan margin sehat ${marginPercent}% berhasil diterbitkan dan otomatis APPROVED.`);
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
      alert(`ERROR CEKAL MUTU: Lot ${doLotNumber} saat ini berstatus QC HOLD! Sistem mengunci pengiriman produk yang belum lolos uji lab.`);
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
      businessUnit: currentUnit,
    };

    appStore.addDeliveryOrder(newDo);
    setSuccessMessage(`Surat Jalan (DO) ${doNumber} berhasil diterbitkan dengan validasi QC PASSED.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackBarcode.trim()) return;

    appStore.updateTrackingStage(trackBarcode.trim(), trackStage, trackLocation.trim(), currentUser.name);
    setSuccessMessage(`Checkpoint E-Tracking [${trackStage}] untuk Barcode ${trackBarcode} berhasil diperbarui.`);
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
              <span>Formulir Penjualan & Distribusi (Sales to Dispatch)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kalkulator Margin Penawaran (Lockout &lt;18%), Penerbitan Surat Jalan (DO/RDO), & Update E-Tracking Barcode
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
            <span>Kalkulator Margin Quotation</span>
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
            <span>Penerbitan Surat Jalan (DO/RDO)</span>
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
            <span>Update Checkpoint E-Tracking</span>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Penawaran (Quotation)</label>
                  <input
                    type="text"
                    required
                    value={quotationNo}
                    onChange={(e) => setQuotationNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Perusahaan Pelanggan</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Item</label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk yang Ditawarkan</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kuantitas</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HPP Unit Cost (IDR)</label>
                  <input
                    type="number"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Harga Jual (IDR)</label>
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
                    <span className="text-xs font-bold">Kalkulasi Gross Margin (Threshold: 18.0%):</span>
                  </div>
                  <strong className="text-lg font-mono font-black">
                    {marginPercent}%
                  </strong>
                </div>

                <div className="text-xs leading-relaxed">
                  {isMarginLow ? (
                    <span className="font-semibold text-amber-800">
                      ⚠️ Margin di bawah ambang batas standar (18%). Pengajuan ini akan berstatus{' '}
                      <strong>[PENDING APPROVAL]</strong> dan membutuhkan persetujuan formal Cost Control & Direksi sebelum IO dapat diproses ke PPIC!
                    </span>
                  ) : (
                    <span className="text-emerald-800">
                      ✓ Margin memenuhi standar kelayakan bisnis (≥ 18%). Penawaran harga ini akan langsung berstatus{' '}
                      <strong>[APPROVED]</strong> untuk dicetak ke klien.
                    </span>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono">
                  <span>Estimasi Total Nilai Penawaran:</span>
                  <strong className="font-bold">IDR {(quantity * sellingPrice).toLocaleString()}</strong>
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
                  Ajukan Penawaran Harga (Quotation)
                </button>
              </div>
            </form>
          )}

          {/* 2. DO & RDO Dispatch Form */}
          {activeTab === 'do' && (
            <form onSubmit={handleDoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Delivery Order (DO)</label>
                  <input
                    type="text"
                    required
                    value={doNumber}
                    onChange={(e) => setDoNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor RDO (Surat Jalan)</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tujuan Perusahaan Pelanggan</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plat Armada Truk Pengangkut</label>
                  <input
                    type="text"
                    required
                    value={doTruckPlate}
                    onChange={(e) => setDoTruckPlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Driver / Supir Logistik</label>
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
                    Pilih Batch Lot Barang Jadi (Hanya Lot PASS QC)
                  </label>
                  <select
                    value={doLotNumber}
                    onChange={(e) => setDoLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono font-bold"
                  >
                    {qcRecords
                      .filter((r) => r.status === 'PASS' && r.businessUnit === currentUnit)
                      .map((lot) => (
                        <option key={lot.id} value={lot.lotNumber}>
                          {lot.lotNumber} - {lot.itemName} (COA: {lot.coaNumber || 'Terlampir'})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kuantitas Pengiriman (Roll)</label>
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Terbitkan Surat Jalan (DO)
                </button>
              </div>
            </form>
          )}

          {/* 3. Update E-Tracking Checkpoint */}
          {activeTab === 'tracking' && (
            <form onSubmit={handleTrackingSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode / Nomor Internal Order (IO)</label>
                  <input
                    type="text"
                    required
                    value={trackBarcode}
                    onChange={(e) => setTrackBarcode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tahap Checkpoint Saat Ini</label>
                  <select
                    value={trackStage}
                    onChange={(e) => setTrackStage(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  >
                    <option value="IO_CREATED">IO Diterbitkan</option>
                    <option value="SLITTING_PROGRESS">Proses Slitting & Rewinding Mesin</option>
                    <option value="QC_INSPECTION">Inspeksi Lab QC & Penerbitan COA</option>
                    <option value="WAREHOUSE_PACKAGING">Pengemasan Karton di Gudang FG</option>
                    <option value="GATE_DISPATCH">Gate Dispatch (Keberangkatan Truk)</option>
                    <option value="DELIVERED">Delivered (Tiba di Pabrik Pelanggan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titik Lokasi Pemindaian</label>
                <input
                  type="text"
                  required
                  value={trackLocation}
                  onChange={(e) => setTrackLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Lapangan / Keterangan Ekstra</label>
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Update Checkpoint Status
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
