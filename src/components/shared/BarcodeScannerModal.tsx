import React, { useState } from 'react';
import {
  Scan,
  X,
  Camera,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Package,
  Layers,
  MapPin,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { MasterItem, QcInspectionRecord } from '../../types';

export const BarcodeScannerModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isBarcodeModalOpen);
  const items = useAppStore((state) => state.items);
  const qcRecords = useAppStore((state) => state.qcRecords);

  const [scannedInput, setScannedInput] = useState('');
  const [matchedItem, setMatchedItem] = useState<MasterItem | null>(null);
  const [matchedQc, setMatchedQc] = useState<QcInspectionRecord | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);

  if (!isOpen) return null;

  const handleLookup = (codeOrLot: string) => {
    const trimmed = codeOrLot.trim();
    if (!trimmed) return;

    const item = items.find(
      (i) =>
        i.barcode === trimmed ||
        i.lotNumber.toLowerCase() === trimmed.toLowerCase() ||
        i.code.toLowerCase() === trimmed.toLowerCase()
    );

    if (item) {
      setMatchedItem(item);
      const qc = qcRecords.find(
        (q) => q.lotNumber.toLowerCase() === item.lotNumber.toLowerCase()
      );
      setMatchedQc(qc || null);
    } else {
      setMatchedItem(null);
      setMatchedQc(null);
    }
  };

  const simulateSampleScan = (barcode: string) => {
    setScannedInput(barcode);
    handleLookup(barcode);
  };

  const isHold = matchedQc?.status === 'HOLD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                Scanner Barcode & LOT Lapangan
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 uppercase tracking-wider">
                  PWA Mobile
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Pabrik Cikarang - Staging, Handheld Zebra & QC Gate
              </p>
            </div>
          </div>
          <button
            onClick={() => appStore.setBarcodeModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Camera Simulator */}
        <div className="relative bg-slate-950 p-6 flex flex-col items-center justify-center min-h-[200px] sm:min-h-[220px] text-white">
          {/* Viewfinder Target Frame */}
          <div className="relative w-64 h-32 border-2 border-dashed border-amber-400/80 rounded-xl flex items-center justify-center overflow-hidden">
            {/* Red Laser scan line animation */}
            <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-lg shadow-red-500 animate-pulse top-1/2 -translate-y-1/2 w-full" />
            <div className="text-[11px] text-amber-300 font-mono tracking-wider uppercase font-bold bg-black/60 px-2 py-1 rounded">
              Arahkan ke Barcode / QR
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-3 flex items-center gap-2">
            <Camera className="w-3.5 h-3.5" />
            <span>Kamera Terkalibrasi (Handheld Sensor 1D/2D Zebra)</span>
          </div>

          {/* Quick Demo Scan Buttons for tester convenience */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[10px] text-slate-400">Scan Cepat Demo:</span>
            <button
              onClick={() => simulateSampleScan('899341200101')}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono border border-slate-700"
            >
              Jumbo Roll Tape (PASS)
            </button>
            <button
              onClick={() => simulateSampleScan('899341200108')}
              className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-mono border border-rose-800 font-bold"
            >
              Acrylic Polymer (HOLD Lock!)
            </button>
            <button
              onClick={() => simulateSampleScan('899723500201')}
              className="text-[10px] px-2 py-0.5 rounded bg-teal-950/80 hover:bg-teal-900 text-teal-300 font-mono border border-teal-800"
            >
              Serum Niacinamide
            </button>
          </div>
        </div>

        {/* Input Bar for manual / hardware laser input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup(scannedInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="barcode-manual-input"
                type="text"
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                placeholder="Scan dengan laser Zebra atau ketik No. LOT / Barcode..."
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            >
              Cari
            </button>
          </form>
        </div>

        {/* Scanned Result Details Card */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {matchedItem ? (
            <div className="space-y-3 animate-in fade-in zoom-in-98 duration-100">
              {/* Critical QC Hold Alert if status is HOLD */}
              {isHold && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-900 dark:text-rose-200 qc-hold-pulse">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-rose-700 dark:text-rose-300">
                        <span>LOCKED BY QC INSPECTION (HOLD AKTIF)</span>
                      </div>
                      <p className="text-xs mt-1 font-semibold">
                        {matchedQc?.defectReason || 'Kualitas tidak memenuhi spesifikasi pabrik.'}
                      </p>
                      <div className="mt-2 text-[11px] p-2 rounded-lg bg-white/80 dark:bg-black/40 font-mono text-rose-800 dark:text-rose-300">
                        ⚠ SISTEM MENGUNCI: Pemindahan stok & assignment ke SPK/DO DILARANG tanpa persetujuan QC Manager!
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Item Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {matchedItem.category}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                      {matchedItem.name}
                    </h3>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">
                      Kode: {matchedItem.code}
                    </div>
                  </div>

                  {/* QC Status Badge */}
                  <div className="shrink-0">
                    {matchedQc ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          matchedQc.status === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : matchedQc.status === 'HOLD'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-400 font-black animate-pulse'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        }`}
                      >
                        {matchedQc.status === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {matchedQc.status === 'HOLD' && <Lock className="w-3.5 h-3.5" />}
                        {matchedQc.status === 'REWORK' && <AlertTriangle className="w-3.5 h-3.5" />}
                        [{matchedQc.status}]
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        SIAP INSPEKSI
                      </span>
                    )}
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">No. LOT Batch</span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {matchedItem.lotNumber}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Stok Fisik Gudang</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {matchedItem.stockQty} {matchedItem.unit}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Lokasi Rak Cikarang</span>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      {matchedItem.locationRack}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Barcode EAN-13</span>
                    <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {matchedItem.barcode}
                    </div>
                  </div>
                </div>

                {/* Action Buttons based on status */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    disabled={isHold}
                    onClick={() => {
                      alert(`Berhasil memvalidasi penerimaan Lot ${matchedItem.lotNumber} ke Staging Area Gudang.`);
                      appStore.setBarcodeModalOpen(false);
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                      isHold
                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed border border-dashed border-slate-300 dark:border-slate-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isHold ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-rose-500" />
                        Terkunci oleh QC (Transfer Dicekal)
                      </>
                    ) : (
                      <>
                        <Package className="w-3.5 h-3.5" />
                        Konfirmasi Terima ke Staging
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      appStore.setBarcodeModalOpen(false);
                      appStore.setActiveModule('qc');
                    }}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Buka Histori QC
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Belum ada data barang yang di-scan
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Gunakan tombol "Scan Cepat Demo" di atas atau ketik nomor LOT/barcode
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
