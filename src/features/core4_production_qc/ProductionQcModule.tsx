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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQcRecordsApi, overrideQcHoldApi } from '../../services/productionService';

const CONTENT = {
  id: {
    title: 'Production Floor & Quality Control (QC Hold Lockout)',
    desc: 'Inspeksi lot bahan baku & hasil slitting roll pita perekat, mekanisme cekal transfer otomatis (QC Hold), dan penerbitan COA',
    btnForm: 'Form Produksi & QC',
    btnScan: 'Scan Lot',
    lblPass: '[PASS] Lulus Standar QC',
    batch: 'Batch',
    lblPassDesc: 'Bebas ditransfer ke Gudang & dialokasikan ke SPK',
    lblHold: '[HOLD] Dicekal QC (Terkunci)',
    lblHoldDesc: 'Transfer gudang & SPK diblokir sistem secara mutlak',
    lblRework: '[REWORK] Proses Pembersihan / Ulang',
    lblReworkDesc: 'Tahap treatment ulang sebelum uji ulang lab',
    searchPl: 'Cari nomor lot batch, kode bahan baku, nama item...',
    roleActive: 'Role Aktif:',
    authOverride: '✓ Punya Hak Override Hold',
    noOverride: '✕ Tanpa Izin Override',
    inspector: 'Inspektur:',
    date: 'Tanggal:',
    defect: 'Catatan Ketidaksesuaian Mutu:',
    overrideHist: 'Histori Override Otoritas:',
    overrideDesc: 'Diloloskan oleh',
    overrideReason: 'dengan alasan:',
    labResult: 'Hasil Uji Laboratorium QC',
    btnBlocked: 'Transfer Stok Dicekal',
    btnBlockedTitle: 'Tindakan dicekal karena status batch sedang HOLD oleh QC',
    btnNoAccess: '[Terkunci: Memerlukan Role QC Manager]',
    btnReleaseHold: 'Release Hold Lock',
    btnTransfer: 'Transfer ke Produksi / SPK',
    btnViewCoa: 'Lihat COA',
    btnGenCoa: 'Generate COA',
    alertTransfer: 'Berhasil mentransfer Lot',
    alertTransferTo: 'ke Staging Line Produksi.',
    modalTitle: 'Otorisasi Override QC Hold Lockout',
    modalDesc: 'Wewenang Khusus QC Manager (ISO 9001 / BPOM Compliance)',
    lot: 'Lot:',
    item: 'Item:',
    initDefect: 'Alasan Cekal Awal:',
    lblReason: 'Alasan Otorisasi Supervisor / Disposisi Khusus (Wajib Diisi):',
    plReason: 'Contoh: Telah melalui pengenceran terkontrol 2% & re-test lolos spesifikasi, aman untuk aplikasi masking tape line 2...',
    btnCancel: 'Batal',
    btnConfirm: 'Konfirmasi Release Hold',
    coaTitle: 'CERTIFICATE OF ANALYSIS (COA)',
    coaSubtitle: 'Laboratorium Quality Control & Jaminan Mutu Terpadu',
    coaStatus: 'Status: CERTIFIED PASS',
    coaProductName: 'Nama Produk:',
    coaLotNo: 'No. LOT:',
    coaBatchSize: 'Ukuran Batch:',
    coaReleaseDate: 'Tgl Rilis:',
    coaParam: 'Parameter Uji',
    coaStandard: 'Standar Baku',
    coaResult: 'Hasil Analisis',
    coaStatusCol: 'Status',
    coaApprovedBy: 'Disetujui oleh:',
    btnColse: 'Tutup',
    btnPrint: 'Cetak Dokumen COA',
  },
  en: {
    title: 'Production Floor & Quality Control (QC Hold Lockout)',
    desc: 'Raw material & slitting roll inspection, automatic transfer hold mechanism (QC Hold), and COA issuance',
    btnForm: 'Production & QC Form',
    btnScan: 'Scan Lot',
    lblPass: '[PASS] QC Standard Passed',
    batch: 'Batches',
    lblPassDesc: 'Free to transfer to Warehouse & allocate to SPK',
    lblHold: '[HOLD] QC Hold (Locked)',
    lblHoldDesc: 'Warehouse & SPK transfer strictly blocked by system',
    lblRework: '[REWORK] Cleaning / Rework Process',
    lblReworkDesc: 'Re-treatment stage before lab re-test',
    searchPl: 'Search batch lot number, item code, item name...',
    roleActive: 'Active Role:',
    authOverride: '✓ Has Override Hold Rights',
    noOverride: '✕ No Override Permission',
    inspector: 'Inspector:',
    date: 'Date:',
    defect: 'Quality Non-conformance Note:',
    overrideHist: 'Authority Override History:',
    overrideDesc: 'Cleared by',
    overrideReason: 'with reason:',
    labResult: 'QC Laboratory Test Results',
    btnBlocked: 'Stock Transfer Blocked',
    btnBlockedTitle: 'Action blocked because batch status is HOLD by QC',
    btnNoAccess: '[Locked: Requires QC Manager Role]',
    btnReleaseHold: 'Release Hold Lock',
    btnTransfer: 'Transfer to Production / SPK',
    btnViewCoa: 'View COA',
    btnGenCoa: 'Generate COA',
    alertTransfer: 'Successfully transferred Lot',
    alertTransferTo: 'to Production Staging Line.',
    modalTitle: 'QC Hold Lockout Override Authorization',
    modalDesc: 'Special Authority of QC Manager (ISO 9001 / BPOM Compliance)',
    lot: 'Lot:',
    item: 'Item:',
    initDefect: 'Initial Hold Reason:',
    lblReason: 'Supervisor Authorization / Special Disposition Reason (Required):',
    plReason: 'Example: Has undergone 2% controlled dilution & re-test passed specification, safe for line 2 masking tape application...',
    btnCancel: 'Cancel',
    btnConfirm: 'Confirm Release Hold',
    coaTitle: 'CERTIFICATE OF ANALYSIS (COA)',
    coaSubtitle: 'Quality Control & Integrated Quality Assurance Laboratory',
    coaStatus: 'Status: CERTIFIED PASS',
    coaProductName: 'Product Name:',
    coaLotNo: 'LOT No.:',
    coaBatchSize: 'Batch Size:',
    coaReleaseDate: 'Release Date:',
    coaParam: 'Test Parameter',
    coaStandard: 'Standard',
    coaResult: 'Analysis Result',
    coaStatusCol: 'Status',
    coaApprovedBy: 'Approved by:',
    btnColse: 'Close',
    btnPrint: 'Print COA Document',
  }
};

export const ProductionQcModule: React.FC = () => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;
  const queryClient = useQueryClient();

  const { data: qcRecords = [] } = useQuery({
    queryKey: ['qcRecords'],
    queryFn: getQcRecordsApi,
  });

  const currentUser = useAppStore((state) => state.currentUser);

  const [selectedRecord, setSelectedRecord] = useState<QcInspectionRecord | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [supervisorReason, setSupervisorReason] = useState('');
  const [coaModalRecord, setCoaModalRecord] = useState<QcInspectionRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [qcFormsOpen, setQcFormsOpen] = useState(false);
  const [qcFormsTab, setQcFormsTab] = useState<'spk' | 'qc_test' | 'hold_override'>('spk');

  // Filter records by unit
  const q = (searchQuery || '').toLowerCase();
  const filteredRecords = qcRecords.filter(
    (r) =>
      ((r.itemName || '').toLowerCase().includes(q) ||
        (r.lotNumber || '').toLowerCase().includes(q) ||
        (r.itemCode || '').toLowerCase().includes(q))
  );

  const handleOpenOverride = (rec: QcInspectionRecord) => {
    setSelectedRecord(rec);
    setSupervisorReason('');
    setOverrideModalOpen(true);
  };

  const overrideHoldMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => overrideQcHoldApi(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qcRecords'] });
      setOverrideModalOpen(false);
      setSelectedRecord(null);
    }
  });

  const handleConfirmOverride = () => {
    if (!selectedRecord || !supervisorReason.trim()) return;
    overrideHoldMutation.mutate({ id: selectedRecord.id, reason: supervisorReason.trim() });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {t.desc}
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
              <span>{t.btnForm}</span>
            </button>
            <button
              onClick={() => appStore.setBarcodeModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-sm font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>{t.btnScan}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QC Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
              {t.lblPass}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
            {qcRecords.filter((r) => r.status === 'PASS').length} {t.batch}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            {t.lblPassDesc}
          </div>
        </div>

        <div className="p-4 rounded-2xl border-2 border-rose-400 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 qc-hold-pulse">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              {t.lblHold}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">
            {qcRecords.filter((r) => r.status === 'HOLD').length} {t.batch}
          </div>
          <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 font-semibold">
            {t.lblHoldDesc}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
              {t.lblRework}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
            {qcRecords.filter((r) => r.status === 'REWORK').length} {t.batch}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
            {t.lblReworkDesc}
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
              placeholder={t.searchPl}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>{t.roleActive} <strong>{currentUser.role}</strong></span>
            {currentUser.permissions.includes('qc:hold:override') || currentUser.permissions.includes('*') ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px] font-bold">
                {t.authOverride}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono text-[10px]">
                {t.noOverride}
              </span>
            )}
          </div>
        </div>

        {/* Inspections List */}
        <div className="space-y-3">
          {filteredRecords.map((rec, recIdx) => {
            const isHold = rec.status === 'HOLD';
            return (
              <div
                key={rec.id || rec.lotNumber || `qc-rec-${recIdx}`}
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
                      {t.inspector} <strong>{rec.inspectorName}</strong> • {t.date} {rec.inspectionDate}
                    </div>

                    {/* Defect warning or override trail */}
                    {rec.defectReason && (
                      <div className="p-2.5 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <strong>{t.defect}</strong> {rec.defectReason}
                        </div>
                      </div>
                    )}

                    {rec.overrideBy && (
                      <div className="p-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-xs text-emerald-900 dark:text-emerald-200">
                        <strong>{t.overrideHist}</strong> {t.overrideDesc}{' '}
                        <strong>{rec.overrideBy}</strong> {t.overrideReason} "{rec.overrideReason}"
                      </div>
                    )}
                  </div>

                  {/* Right Side: Tested Parameters Table & Actions */}
                  <div className="lg:w-96 space-y-2 shrink-0">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs space-y-1">
                      <div className="font-bold text-slate-500 uppercase text-[10px] mb-1">
                        {t.labResult}
                      </div>
                      {(rec.testedParameters || []).map((param, pIdx) => (
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
                            title={t.btnBlockedTitle}
                          >
                            <Lock className="w-3.5 h-3.5 text-rose-500" />
                            {t.btnBlocked}
                          </button>

                          {/* Override Button protected by <Can perform="qc:hold:override"> */}
                          <Can
                            perform="qc:hold:override"
                            fallback={
                              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold px-2 py-1">
                                {t.btnNoAccess}
                              </div>
                            }
                          >
                            <button
                              onClick={() => handleOpenOverride(rec)}
                              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              {t.btnReleaseHold}
                            </button>
                          </Can>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              alert(`${t.alertTransfer} ${rec.lotNumber} ${t.alertTransferTo}`)
                            }
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                          >
                            {t.btnTransfer}
                          </button>

                          {rec.coaNumber ? (
                            <button
                              onClick={() => setCoaModalRecord(rec)}
                              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                            >
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              {t.btnViewCoa}
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
                              {t.btnGenCoa}
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
                  {t.modalTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {t.modalDesc}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div>
                {t.lot} <strong>{selectedRecord.lotNumber}</strong>
              </div>
              <div>
                {t.item} <strong>{selectedRecord.itemName}</strong>
              </div>
              <div className="text-rose-600 dark:text-rose-400">
                {t.initDefect} {selectedRecord.defectReason}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t.lblReason}
              </label>
              <textarea
                rows={3}
                value={supervisorReason}
                onChange={(e) => setSupervisorReason(e.target.value)}
                placeholder={t.plReason}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t.btnCancel}
              </button>
              <button
                onClick={handleConfirmOverride}
                disabled={!supervisorReason.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold"
              >
                {t.btnConfirm}
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
                  {t.coaTitle}
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ST. Morita Industries
                </h3>
                <div className="text-xs text-slate-500">
                  {t.coaSubtitle}
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-blue-600">{coaModalRecord.coaNumber}</div>
                <div className="text-slate-400">{t.coaStatus}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div>
                <span className="text-slate-400">{t.coaProductName} </span>
                <strong>{coaModalRecord.itemName}</strong>
              </div>
              <div>
                <span className="text-slate-400">{t.coaLotNo} </span>
                <strong className="font-mono">{coaModalRecord.lotNumber}</strong>
              </div>
              <div>
                <span className="text-slate-400">{t.coaBatchSize} </span>
                <strong>{coaModalRecord.batchSize} {coaModalRecord.unit}</strong>
              </div>
              <div>
                <span className="text-slate-400">{t.coaReleaseDate} </span>
                <strong>{coaModalRecord.inspectionDate}</strong>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2">{t.coaParam}</th>
                    <th className="p-2">{t.coaStandard}</th>
                    <th className="p-2">{t.coaResult}</th>
                    <th className="p-2 text-center">{t.coaStatusCol}</th>
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
                {t.coaApprovedBy} <strong>{coaModalRecord.inspectorName}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCoaModalRecord(null)}
                  className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  {t.btnColse}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {t.btnPrint}
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
