import React, { useState } from 'react';
import {
  Truck,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  Plus,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { EximDocument, ProcurementOrder, ProcurementStage } from '../../types';
import { FinancialMask } from '../../components/ui/FinancialMask';
import { Can } from '../../components/rbac/Can';
import { ProcurementFormsModal } from '../../components/forms/ProcurementFormsModal';

const CONTENT = {
  id: {
    title: 'Supply Chain & Kepabeanan EXIM Kawasan Berikat',
    desc: 'Alur pengadaan 5-tahap (PR → PO → LOG → IQC → AP) dan kepatuhan berkas pabean BC 2.3, BC 2.7, BC 4.0 & SPPB',
    btnForm: 'Form Pengadaan / PO',
    tabKanban: 'Kanban Alur Pengadaan',
    tabExim: 'Dokumen Kepabeanan EXIM',
    emptyQueue: 'Tidak ada antrean',
    sku: 'SKU',
    dzTitle: 'Dropzone Berkas Kepabeanan Kawasan Berikat',
    dzDesc: 'Unggah dokumen BC 2.3 (Impor), BC 2.7 (Antar KB), BC 4.0 (Lokal), dan SPPB (Gate Pass Priok)',
    dzRestricted: 'Akses Upload Terbatas: Memerlukan Role Purchasing / EXIM Officer',
    btnUpload: 'Upload Dokumen Bea Cukai Baru',
    docList: 'Daftar Dokumen Pabean Terverifikasi',
    file: 'File:',
    date: 'Tanggal:',
    btnDownload: 'Unduh PDF',
    upTitle: 'Upload Berkas Dokumen Pabean Kawasan Berikat',
    upType: 'Jenis Dokumen Pabean:',
    upRef: 'Nomor Registrasi / Referensi Dokumen:',
    upRefPl: 'Contoh: BC23-CKR-2026-0914',
    upDesc: 'Deskripsi / Keterangan Muatan:',
    upDescPl: 'Keterangan bahan baku atau subkontrak slitting...',
    btnCancel: 'Batal',
    btnSaveLog: 'Simpan & Enkripsi Log',
    alertDl: 'Mengunduh salinan pabean',
  },
  en: {
    title: 'Supply Chain & Bonded Zone EXIM Customs',
    desc: '5-stage procurement flow (PR → PO → LOG → IQC → AP) and customs compliance for BC 2.3, BC 2.7, BC 4.0 & SPPB',
    btnForm: 'Procurement / PO Form',
    tabKanban: 'Procurement Flow Kanban',
    tabExim: 'EXIM Customs Documents',
    emptyQueue: 'No queue',
    sku: 'SKUs',
    dzTitle: 'Bonded Zone Customs Document Dropzone',
    dzDesc: 'Upload BC 2.3 (Import), BC 2.7 (Inter-Bonded), BC 4.0 (Local), and SPPB (Priok Gate Pass) documents',
    dzRestricted: 'Restricted Upload Access: Requires Purchasing / EXIM Officer Role',
    btnUpload: 'Upload New Customs Document',
    docList: 'Verified Customs Documents List',
    file: 'File:',
    date: 'Date:',
    btnDownload: 'Download PDF',
    upTitle: 'Upload Bonded Zone Customs Document',
    upType: 'Customs Document Type:',
    upRef: 'Registration / Document Reference Number:',
    upRefPl: 'Example: BC23-CKR-2026-0914',
    upDesc: 'Cargo Description / Notes:',
    upDescPl: 'Raw material details or slitting subcontracting...',
    btnCancel: 'Cancel',
    btnSaveLog: 'Save & Encrypt Log',
    alertDl: 'Downloading customs copy',
  }
};

export const ProcurementEximModule: React.FC = () => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const procurementOrders = useAppStore((state) => state.procurementOrders);
  const eximDocs = useAppStore((state) => state.eximDocs);
  const currentUser = useAppStore((state) => state.currentUser);

  const [activeTab, setActiveTab] = useState<'kanban' | 'exim_dropzone'>('kanban');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [procurementFormsOpen, setProcurementFormsOpen] = useState(false);
  const [procurementFormsTab, setProcurementFormsTab] = useState<'pr' | 'po' | 'log' | 'exim'>('pr');
  const [newDocType, setNewDocType] = useState<EximDocument['docType']>('BC 2.3');
  const [newRefNo, setNewRefNo] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filteredOrders = procurementOrders;
  const filteredEximDocs = eximDocs;

  const stages: { key: ProcurementStage; label: string; dept: string }[] = [
    { key: 'PR', label: '1. Purchase Request', dept: 'PPIC Planner' },
    { key: 'PO', label: '2. Purchase Order', dept: 'Purchasing' },
    { key: 'LOG', label: '3. In-Transit / Port', dept: 'Logistik Pergudangan' },
    { key: 'IQC', label: '4. IQC Incoming Test', dept: 'QC Lab' },
    { key: 'AP', label: '5. AP Reconciliation', dept: 'Finance / AP' },
  ];

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefNo.trim()) return;

    const newDoc: EximDocument = {
      id: `EXIM-${Date.now()}`,
      docType: newDocType,
      referenceNumber: newRefNo.trim(),
      referenceNo: newRefNo.trim(),
      registrationDate: new Date().toISOString().slice(0, 10),
      submissionDate: new Date().toISOString().slice(0, 10),
      status: 'VERIFIED',
      fileName: `${newDocType.replace(' ', '_')}_${newRefNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileSize: '2.4 MB',
      notes: newNotes.trim() || 'Dokumen kepabeanan resmi Kawasan Berikat ST. Morita Industries.',
    };

    appStore.addEximDoc(newDoc);
    setUploadModalOpen(false);
    setNewRefNo('');
    setNewNotes('');
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
                setProcurementFormsTab('pr');
                setProcurementFormsOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.btnForm}</span>
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'kanban'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {t.tabKanban}
          </button>
          <button
            onClick={() => setActiveTab('exim_dropzone')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'exim_dropzone'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t.tabExim}</span>
          </button>
        </div>
      </div>

      {/* Main Tab View */}
      {activeTab === 'kanban' ? (
        <div className="space-y-4">
          {/* Stepper / Kanban columns - Horizontal scrolling on mobile/tablet to avoid squishing */}
          <div className="flex md:grid md:grid-cols-5 gap-3.5 overflow-x-auto pb-4 md:pb-0 scrollbar-thin">
            {stages.map((stg) => {
              const ordersInStage = filteredOrders.filter((o) => o.stage === stg.key);
              return (
                <div
                  key={stg.key}
                  className="min-w-[240px] md:min-w-0 flex-1 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                        {stg.label}
                      </h3>
                      <div className="text-[10px] text-slate-400 truncate">{stg.dept}</div>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 ml-1.5">
                      {ordersInStage.length}
                    </span>
                  </div>

                  {/* Order Cards */}
                  <div className="space-y-2.5">
                    {ordersInStage.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-[11px] italic">
                        {t.emptyQueue}
                      </div>
                    ) : (
                      ordersInStage.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <span
                              className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 truncate min-w-0"
                              title={ord.poNumber}
                            >
                              {ord.poNumber}
                            </span>
                            <span
                              className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                (ord.status || (ord.stageProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS')) === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : (ord.status || '') === 'INSPECTING'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {ord.status || (ord.stageProgress === 100 ? 'COMPLETED' : 'ACTIVE')}
                            </span>
                          </div>

                          <div
                            className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
                            title={ord.vendorName}
                          >
                            {ord.vendorName}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="shrink-0">{ord.itemsCount} {t.sku}</span>
                            <span className="text-slate-800 dark:text-slate-200 text-xs truncate ml-1 text-right">
                              <FinancialMask value={ord.totalAmount} className="font-bold" />
                            </span>
                          </div>

                          {/* Customs doc indicator */}
                          {(ord.bcDocumentType || ord.stage === 'LOG' || ord.stage === 'IQC') && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] gap-1">
                              <span
                                className="font-mono font-bold text-slate-600 dark:text-slate-400 truncate"
                                title={ord.bcDocumentType || 'BC 2.3 Pabean'}
                              >
                                {ord.bcDocumentType || 'BC 2.3'}
                              </span>
                              <span
                                className={`shrink-0 flex items-center gap-1 font-bold ${
                                  (ord.bcDocStatus || 'COMPLETE') === 'COMPLETE'
                                    ? 'text-emerald-600'
                                    : 'text-amber-500'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    (ord.bcDocStatus || 'COMPLETE') === 'COMPLETE' ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                />
                                {ord.bcDocStatus || 'COMPLETE'}
                              </span>
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            ETA: {ord.etaDate || ord.estimatedArrival || ord.lastUpdate}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* EXIM Customs Dropzone & Regulatory Checklist */
        <div className="space-y-5">
          {/* Upload Dropzone Hero */}
          <div className="p-6 rounded-3xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {t.dzTitle}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-0.5">
                {t.dzDesc}
              </p>
            </div>

            <Can
              perform="exim:bc_doc:upload"
              fallback={
                <div className="text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl">
                  {t.dzRestricted}
                </div>
              }
            >
              <button
                onClick={() => setUploadModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t.btnUpload}</span>
              </button>
            </Can>
          </div>

          {/* Verification Checklist Table */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {t.docList}
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEximDocs.map((doc) => (
                <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 text-[10px]">
                          {doc.docType}
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {doc.referenceNo || doc.referenceNumber}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                            doc.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 font-medium mt-1">
                        {doc.notes}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {t.file} {doc.fileName} ({doc.fileSize}) • {t.date} {doc.submissionDate || doc.registrationDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`${t.alertDl} ${doc.fileName}`)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300"
                    >
                      {t.btnDownload}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload EXIM Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleUploadDocument}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {t.upTitle}
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t.upType}
              </label>
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value as any)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="BC 2.3">BC 2.3 — Impor Bahan Baku LDP ke Kawasan Berikat</option>
                <option value="BC 2.7">BC 2.7 — Pengeluaran/Pemasukan Antar Kawasan Berikat</option>
                <option value="BC 4.0">BC 4.0 — Pemasukan Barang Lokal (TLDDP) ke Kawasan Berikat</option>
                <option value="SPPB">SPPB — Surat Persetujuan Pengeluaran Barang (Gate Pass)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t.upRef}
              </label>
              <input
                type="text"
                required
                value={newRefNo}
                onChange={(e) => setNewRefNo(e.target.value)}
                placeholder={t.upRefPl}
                className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t.upDesc}
              </label>
              <textarea
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={t.upDescPl}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
              >
                {t.btnCancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                {t.btnSaveLog}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Procurement Forms Modal */}
      <ProcurementFormsModal
        isOpen={procurementFormsOpen}
        onClose={() => setProcurementFormsOpen(false)}
        defaultTab={procurementFormsTab}
      />
    </div>
  );
};
