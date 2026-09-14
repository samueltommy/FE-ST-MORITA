import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  ChevronRight,
  Sparkles,
  Award,
  QrCode,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { QcInspectionRecord, QcStatus } from '../../types';
import { Can } from '../../components/rbac/Can';
import { ProductionQcFormsModal } from '../../components/forms/ProductionQcFormsModal';

export const ProductionQcModule: React.FC = () => {
  const qcRecords = useAppStore((state) => state.qcRecords);
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
  const currentUser = useAppStore((state) => state.currentUser);

  const [selectedRecord, setSelectedRecord] = useState<QcInspectionRecord | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [supervisorReason, setSupervisorReason] = useState('');
  const [coaModalRecord, setCoaModalRecord] = useState<QcInspectionRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [qcFormsOpen, setQcFormsOpen] = useState(false);
  const [qcFormsTab, setQcFormsTab] = useState<'spk' | 'qc_test' | 'hold_override'>('spk');

  // Filter records by unit
  const filteredRecords = qcRecords.filter(
    (r) =>
      r.businessUnit === currentUnit &&
      (r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.itemCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenOverride = (rec: QcInspectionRecord) => {
    setSelectedRecord(rec);
    setSupervisorReason('');
    setOverrideModalOpen(true);
  };

  const handleConfirmOverride = () => {
    if (!selectedRecord || !supervisorReason.trim()) return;
    appStore.overrideQcHold(selectedRecord.id, supervisorReason.trim());
    setOverrideModalOpen(false);
    setSelectedRecord(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Production Floor & Quality Control (QC Hold Lockout)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Inspeksi lot bahan baku & hasil slitting roll pita perekat, mekanisme cekal transfer otomatis (QC Hold), dan penerbitan COA
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setQcFormsTab('spk');
                setQcFormsOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Form Produksi & QC</span>
            </button>
            <button
              onClick={() => appStore.setBarcodeModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-sm font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan Lot</span>
            </button>
          </div>
        </div>
      </div>

      {/* QC Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
              [PASS] Lulus Standar QC
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
            {qcRecords.filter((r) => r.status === 'PASS' && r.businessUnit === currentUnit).length} Batch
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            Bebas ditransfer ke Gudang & dialokasikan ke SPK
          </div>
        </div>

        <div className="p-4 rounded-2xl border-2 border-rose-400 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 qc-hold-pulse">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              [HOLD] Dicekal QC (Terkunci)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">
            {qcRecords.filter((r) => r.status === 'HOLD' && r.businessUnit === currentUnit).length} Batch
          </div>
          <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 font-semibold">
            Transfer gudang & SPK diblokir sistem secara mutlak
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
              [REWORK] Proses Pembersihan / Ulang
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
            {qcRecords.filter((r) => r.status === 'REWORK' && r.businessUnit === currentUnit).length} Batch
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
            Tahap treatment ulang sebelum uji ulang lab
          </div>
        </div>
      </div>

      {/* Main Records Table Card */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor lot batch, kode bahan baku, nama item..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Role Aktif: <strong>{currentUser.role}</strong></span>
            {currentUser.permissions.includes('qc:hold:override') || currentUser.permissions.includes('*') ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px] font-bold">
                ✓ Punya Hak Override Hold
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono text-[10px]">
                ✕ Tanpa Izin Override
              </span>
            )}
          </div>
        </div>

        {/* Inspections List */}
        <div className="space-y-3">
          {filteredRecords.map((rec) => {
            const isHold = rec.status === 'HOLD';
            return (
              <div
                key={rec.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isHold
                    ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-800'
                    : rec.status === 'REWORK'
                    ? 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  {/* Left Specs Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                          rec.status === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : isHold
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-400 animate-pulse'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        }`}
                      >
                        {rec.status === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isHold && <Lock className="w-3.5 h-3.5" />}
                        {rec.status === 'REWORK' && <AlertTriangle className="w-3.5 h-3.5" />}
                        [{rec.status}]
                      </span>

                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                        {rec.lotNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ID: {rec.id} • Batch: {rec.batchSize} {rec.unit}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {rec.itemName} ({rec.itemCode})
                    </h3>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Inspektur: <strong>{rec.inspectorName}</strong> • Tanggal: {rec.inspectionDate}
                    </div>

                    {/* Defect warning or override trail */}
                    {rec.defectReason && (
                      <div className="p-2.5 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <strong>Catatan Ketidaksesuaian Mutu:</strong> {rec.defectReason}
                        </div>
                      </div>
                    )}

                    {rec.overrideBy && (
                      <div className="p-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-xs text-emerald-900 dark:text-emerald-200">
                        <strong>Histori Override Otoritas:</strong> Diloloskan oleh{' '}
                        <strong>{rec.overrideBy}</strong> dengan alasan: "{rec.overrideReason}"
                      </div>
                    )}
                  </div>

                  {/* Right Side: Tested Parameters Table & Actions */}
                  <div className="lg:w-96 space-y-2 shrink-0">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs space-y-1">
                      <div className="font-bold text-slate-500 uppercase text-[10px] mb-1">
                        Hasil Uji Laboratorium QC
                      </div>
                      {rec.testedParameters.map((param, pIdx) => (
                        <div key={pIdx} className="flex justify-between text-[11px] py-0.5">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                            {param.name}:
                          </span>
                          <span className="font-mono text-slate-500">{param.standard}</span>
                          <span
                            className={`font-mono font-bold ${
                              param.result === 'OK' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {param.actual}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Action Bar based on QC Hold Status */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {isHold ? (
                        <>
                          {/* CRITICAL QC HOLD LOCKOUT: Disable transfer & SPK assignment buttons */}
                          <button
                            disabled
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold cursor-not-allowed border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5"
                            title="Tindakan dicekal karena status batch sedang HOLD oleh QC"
                          >
                            <Lock className="w-3.5 h-3.5 text-rose-500" />
                            Transfer Stok Dicekal
                          </button>

                          {/* Override Button protected by <Can perform="qc:hold:override"> */}
                          <Can
                            perform="qc:hold:override"
                            fallback={
                              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold px-2 py-1">
                                [Terkunci: Memerlukan Role QC Manager]
                              </div>
                            }
                          >
                            <button
                              onClick={() => handleOpenOverride(rec)}
                              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              Release Hold Lock
                            </button>
                          </Can>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              alert(`Berhasil mentransfer Lot ${rec.lotNumber} ke Staging Line Produksi.`)
                            }
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                          >
                            Transfer ke Produksi / SPK
                          </button>

                          {rec.coaNumber ? (
                            <button
                              onClick={() => setCoaModalRecord(rec)}
                              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                            >
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              Lihat COA
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const coaNo = `COA/SM/${new Date().getFullYear()}/09/${Math.floor(
                                  Math.random() * 9000 + 1000
                                )}`;
                                rec.coaNumber = coaNo;
                                setCoaModalRecord(rec);
                              }}
                              className="py-2 px-3 rounded-xl border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              Generate COA
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supervisor Override Modal */}
      {overrideModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Otorisasi Override QC Hold Lockout
                </h3>
                <p className="text-xs text-slate-500">
                  Wewenang Khusus QC Manager (ISO 9001 / BPOM Compliance)
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div>
                Lot: <strong>{selectedRecord.lotNumber}</strong>
              </div>
              <div>
                Item: <strong>{selectedRecord.itemName}</strong>
              </div>
              <div className="text-rose-600 dark:text-rose-400">
                Alasan Cekal Awal: {selectedRecord.defectReason}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Alasan Otorisasi Supervisor / Disposisi Khusus (Wajib Diisi):
              </label>
              <textarea
                rows={3}
                value={supervisorReason}
                onChange={(e) => setSupervisorReason(e.target.value)}
                placeholder="Contoh: Telah melalui pengenceran terkontrol 2% & re-test lolos spesifikasi, aman untuk aplikasi masking tape line 2..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmOverride}
                disabled={!supervisorReason.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold"
              >
                Konfirmasi Release Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COA Certificate Modal */}
      {coaModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">
                  CERTIFICATE OF ANALYSIS (COA)
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ST. Morita Industries
                </h3>
                <div className="text-xs text-slate-500">
                  Laboratorium Quality Control & Jaminan Mutu Terpadu
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-blue-600">{coaModalRecord.coaNumber}</div>
                <div className="text-slate-400">Status: CERTIFIED PASS</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div>
                <span className="text-slate-400">Nama Produk: </span>
                <strong>{coaModalRecord.itemName}</strong>
              </div>
              <div>
                <span className="text-slate-400">No. LOT: </span>
                <strong className="font-mono">{coaModalRecord.lotNumber}</strong>
              </div>
              <div>
                <span className="text-slate-400">Ukuran Batch: </span>
                <strong>{coaModalRecord.batchSize} {coaModalRecord.unit}</strong>
              </div>
              <div>
                <span className="text-slate-400">Tgl Rilis: </span>
                <strong>{coaModalRecord.inspectionDate}</strong>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2">Parameter Uji</th>
                    <th className="p-2">Standar Baku</th>
                    <th className="p-2">Hasil Analisis</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {coaModalRecord.testedParameters.map((p, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-sans">{p.name}</td>
                      <td className="p-2">{p.standard}</td>
                      <td className="p-2 font-bold">{p.actual}</td>
                      <td className="p-2 text-center text-emerald-600 font-bold">PASSED</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-[11px] text-slate-400">
                Disetujui oleh: <strong>{coaModalRecord.inspectorName}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCoaModalRecord(null)}
                  className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Dokumen COA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production & QC Forms Modal */}
      <ProductionQcFormsModal
        isOpen={qcFormsOpen}
        onClose={() => setQcFormsOpen(false)}
        defaultTab={qcFormsTab}
      />
    </div>
  );
};
