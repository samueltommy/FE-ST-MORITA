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
import { formatIDR } from '../../utils/invoiceCalculator';
import { Can } from '../../components/rbac/Can';
import { ProcurementFormsModal } from '../../components/forms/ProcurementFormsModal';

export const ProcurementEximModule: React.FC = () => {
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
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

  const filteredOrders = procurementOrders.filter((o) => o.businessUnit === currentUnit);
  const filteredEximDocs = eximDocs.filter((d) => d.businessUnit === currentUnit);

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
      businessUnit: currentUnit,
    };

    appStore.addEximDoc(newDoc);
    setUploadModalOpen(false);
    setNewRefNo('');
    setNewNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Supply Chain & Kepabeanan EXIM Kawasan Berikat
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
              Core 3 Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Alur pengadaan 5-tahap (PR → PO → LOG → IQC → AP) dan kepatuhan berkas pabean BC 2.3, BC 2.7, BC 4.0 & SPPB
          </p>
        </div>

        {/* Action button & Tab switchers */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setProcurementFormsTab('pr');
              setProcurementFormsOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Form Pengadaan / PO</span>
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kanban Alur Pengadaan
            </button>
            <button
              onClick={() => setActiveTab('exim_dropzone')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'exim_dropzone'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Dokumen Kepabeanan EXIM</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab View */}
      {activeTab === 'kanban' ? (
        <div className="space-y-4">
          {/* Stepper / Kanban columns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stages.map((stg) => {
              const ordersInStage = filteredOrders.filter((o) => o.stage === stg.key);
              return (
                <div
                  key={stg.key}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {stg.label}
                      </h3>
                      <div className="text-[10px] text-slate-400">{stg.dept}</div>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
                      {ordersInStage.length}
                    </span>
                  </div>

                  {/* Order Cards */}
                  <div className="space-y-2.5">
                    {ordersInStage.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-[11px] italic">
                        Tidak ada antrean
                      </div>
                    ) : (
                      ordersInStage.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {ord.poNumber}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
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

                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {ord.vendorName}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{ord.itemsCount} Item SKU</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatIDR(ord.totalAmount)}
                            </span>
                          </div>

                          {/* Customs doc indicator */}
                          {(ord.bcDocumentType || ord.stage === 'LOG' || ord.stage === 'IQC') && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                              <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                                Berkas: {ord.bcDocumentType || 'BC 2.3 Pabean'}
                              </span>
                              <span
                                className={`flex items-center gap-1 font-bold ${
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

                          <div className="text-[10px] text-slate-400 font-mono">
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
                Dropzone Berkas Kepabeanan Kawasan Berikat
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-0.5">
                Unggah dokumen BC 2.3 (Impor), BC 2.7 (Antar KB), BC 4.0 (Lokal), dan SPPB (Gate Pass Priok)
              </p>
            </div>

            <Can
              perform="exim:bc_doc:upload"
              fallback={
                <div className="text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl">
                  Akses Upload Terbatas: Memerlukan Role Purchasing / EXIM Officer
                </div>
              }
            >
              <button
                onClick={() => setUploadModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Dokumen Bea Cukai Baru</span>
              </button>
            </Can>
          </div>

          {/* Verification Checklist Table */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Daftar Dokumen Pabean Terverifikasi
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
                        File: {doc.fileName} ({doc.fileSize}) • Tanggal: {doc.submissionDate || doc.registrationDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Mengunduh salinan pabean ${doc.fileName}`)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300"
                    >
                      Unduh PDF
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
              Upload Berkas Dokumen Pabean Kawasan Berikat
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Jenis Dokumen Pabean:
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
                Nomor Registrasi / Referensi Dokumen:
              </label>
              <input
                type="text"
                required
                value={newRefNo}
                onChange={(e) => setNewRefNo(e.target.value)}
                placeholder="Contoh: BC23-CKR-2026-0914"
                className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Deskripsi / Keterangan Muatan:
              </label>
              <textarea
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Keterangan bahan baku atau subkontrak slitting..."
                className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                Simpan & Enkripsi Log
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
