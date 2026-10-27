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
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { EximDocument, ProcurementOrder, ProcurementStage } from '../../types';
import { FinancialMask } from '../../components/ui/FinancialMask';
import { Can } from '../../components/rbac/Can';
import { ProcurementFormsModal } from '../../components/forms/ProcurementFormsModal';
import { DataDetailModal } from '../../components/ui/DataDetailModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPurchaseOrdersApi, getEximDocsApi, uploadEximDocApi, createPurchaseOrderApi } from '../../services/procurementService';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { QuickActionDashboard } from '../../components/layout/QuickActionDashboard';
import { PurchaseOrderPaperForm } from './PurchaseOrderPaperForm';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';

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
  const queryClient = useQueryClient();

  const { data: poRes } = useQuery({
    queryKey: ['procurementOrders'],
    queryFn: () => getPurchaseOrdersApi(1, 100),
  });
  const procurementOrders = poRes?.data || [];

  const [eximPage, setEximPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: eximRes } = useQuery({
    queryKey: ['eximDocs', eximPage, pageSize],
    queryFn: () => getEximDocsApi(eximPage, pageSize),
  });
  const eximDocs = eximRes?.data || [];
  const eximTotalPages = eximRes?.meta?.totalPages || eximRes?.meta?.total_pages || 1;

  const currentUser = useAppStore((state) => state.currentUser);

  const [activeTab, setActiveTab] = useState<'kanban' | 'exim_dropzone'>('kanban');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [procurementFormsOpen, setProcurementFormsOpen] = useState(false);
  const [procurementFormsTab, setProcurementFormsTab] = useState<'pr' | 'po' | 'log' | 'exim'>('pr');
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
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

    uploadEximDocMutation.mutate(newDoc as EximDocument);
  };

  const uploadEximDocMutation = useMutation({
    mutationFn: uploadEximDocApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eximDocs'] });
      setUploadModalOpen(false);
      setNewRefNo('');
      setNewNotes('');
    }
  });

  const pageOptions: PageOptionItem[] = [
    {
      id: 'kanban',
      label: '1. Alur Pengadaan (Kanban PR → PO)',
      subtitle: `${procurementOrders.length} Pesanan Pengadaan Berjalan`,
      icon: Truck,
      badge: procurementOrders.length,
    },
    {
      id: 'exim_dropzone',
      label: '2. Dokumen Kepabeanan EXIM',
      subtitle: `${eximDocs.length} Berkas Pabean Kawasan Berikat`,
      icon: ShieldCheck,
      badge: `${eximDocs.length} Berkas`,
      badgeColor: 'bg-indigo-600 text-white',
    },
  ];

  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.procurement);
  const suppliers = useAppStore((state) => state.suppliers) || [];

  // Halaman input PO bergaya dokumen fisik (Paper-Replica)
  if (activeSubFeature === 'po_new') {
    return (
      <PurchaseOrderPaperForm
        onBack={() => appStore.setActiveSubFeature('procurement', null)}
        onSubmit={async (draft) => {
          await createPurchaseOrderApi({
            poNumber: draft.poNumber,
            vendorName: draft.supplierName,
            itemsCount: draft.items.length,
            totalAmount: draft.grandTotal,
            ...(draft as any),
          });
          queryClient.invalidateQueries({ queryKey: ['procurementOrders'] });
          appStore.setActiveSubFeature('procurement', 'kanban');
        }}
      />
    );
  }

  // Quick Action Dashboard: tombol besar langsung ke halaman yang dibutuhkan
  if (!activeSubFeature) {
    return (
      <QuickActionDashboard
        moduleCode="Core 3"
        moduleName="PEMBELIAN (SUPPLY CHAIN & EXIM)"
        moduleDescription="Pilih aksi di bawah untuk langsung menuju halaman yang Anda butuhkan."
        onBackToHome={() => appStore.setActiveModule('home')}
        primaryActions={[
          {
            id: 'po-new',
            label: '+ Buat PO Baru',
            description: 'Isi Purchase Order ke supplier langsung seperti bon kertas',
            icon: Plus,
            tone: 'green',
            onClick: () => appStore.setActiveSubFeature('procurement', 'po_new'),
          },
          {
            id: 'po-list',
            label: 'Lihat Daftar PO',
            description: 'Alur 5-tahap PR → PO → LOG → IQC → AP',
            icon: Truck,
            tone: 'blue',
            badge: `${procurementOrders.length} PO`,
            onClick: () => appStore.setActiveSubFeature('procurement', 'kanban'),
          },
        ]}
        groups={[
          {
            title: 'Menu Lainnya',
            items: [
              {
                id: 'exim',
                label: 'Dokumen EXIM',
                description: 'BC 2.3 / 2.7 / 4.0 & SPPB',
                icon: ShieldCheck,
                badge: `${eximDocs.length} Berkas`,
                onClick: () => appStore.setActiveSubFeature('procurement', 'exim_dropzone'),
              },
              {
                id: 'supplier',
                label: 'Daftar Supplier',
                description: 'Database pemasok & forwarder',
                icon: Building2,
                badge: `${suppliers.length}`,
                onClick: () => appStore.setActiveSubFeature('procurement', 'supplier'),
              },
              {
                id: 'pr-form',
                label: 'Form PR / Pabean',
                description: 'Purchase Requisition & dokumen Bea Cukai',
                icon: FileText,
                onClick: () => {
                  setProcurementFormsTab('pr');
                  setProcurementFormsOpen(true);
                },
              },
              {
                id: 'report',
                label: 'Rekap Laporan',
                description: 'Ringkasan status pengadaan',
                icon: FileSpreadsheet,
                onClick: () => appStore.setActiveSubFeature('procurement', 'report'),
              },
            ],
          },
        ]}
      />
    );
  }

  const currentTab = activeSubFeature === 'exim_dropzone' ? 'exim_dropzone' : activeSubFeature === 'supplier' ? 'supplier' : activeSubFeature === 'report' ? 'report' : 'kanban';

  return (
    <div className="space-y-6">
      {/* ─── Module Page Header with Senior-Friendly Options ─── */}
      <ModulePageHeader
        moduleCode="Core 3"
        title={t.title}
        description={t.desc}
        badgeColor="bg-indigo-50 text-indigo-800 border-indigo-300"
        options={pageOptions}
        activeOption={currentTab}
        onSelectOption={(optId) => appStore.setActiveSubFeature('procurement', optId)}
        onBackToMenu={() => appStore.setActiveSubFeature('procurement', null)}
        menuName="Pembelian"
        actionButtons={
          <>
            <button
              onClick={() => {
                setProcurementFormsTab('pr');
                setProcurementFormsOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm sm:text-base font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.btnForm}</span>
            </button>
          </>
        }
      />

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
                      <div className="text-xs text-slate-400 truncate">{stg.dept}</div>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 ml-1.5">
                      {ordersInStage.length}
                    </span>
                  </div>

                  {/* Order Cards */}
                  <div className="space-y-2.5">
                    {ordersInStage.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs italic">
                        {t.emptyQueue}
                      </div>
                    ) : (
                      ordersInStage.map((ord, ordIdx) => (
                        <div
                          key={ord.id || ord.poNumber || `ord-${ordIdx}`}
                          onClick={() => setSelectedDetailItem(ord)}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2 overflow-hidden cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <span
                              className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 truncate min-w-0"
                              title={ord.poNumber}
                            >
                              {ord.poNumber}
                            </span>
                            <span
                              className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded uppercase ${
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

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="shrink-0">{ord.itemsCount} {t.sku}</span>
                            <span className="text-slate-800 dark:text-slate-200 text-xs truncate ml-1 text-right">
                              <FinancialMask value={ord.totalAmount} className="font-bold" />
                            </span>
                          </div>

                          {/* Customs doc indicator */}
                          {(ord.bcDocumentType || ord.stage === 'LOG' || ord.stage === 'IQC') && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-1">
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

                          <div className="text-xs text-slate-400 font-mono truncate">
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

            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-auto max-h-[60vh] 2xl:max-h-[70vh] pr-1">
              {filteredEximDocs.map((doc, docIdx) => (
                <div 
                  key={doc.id || doc.referenceNumber || `doc-${docIdx}`} 
                  onClick={() => setSelectedDetailItem(doc)}
                  className="py-3 px-2 -mx-2 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 text-xs">
                          {doc.docType}
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {doc.referenceNo || doc.referenceNumber}
                        </span>
                        <span
                          className={`text-xs font-bold px-1.5 py-0.2 rounded-full uppercase ${
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
                      <div className="text-xs text-slate-400 mt-0.5">
                        {t.file} {doc.fileName} ({doc.fileSize}) • {t.date} {doc.submissionDate || doc.registrationDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`${t.alertDl} ${doc.fileName}`);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300"
                    >
                      {t.btnDownload}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* KONTROL PAGINATION EXIM */}
            <div className="flex justify-between items-center mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 font-medium">
                  Halaman {eximPage} dari {eximTotalPages}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setEximPage(1);
                  }}
                  className="text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <option value={10}>10 Baris</option>
                  <option value={20}>20 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={eximPage === 1}
                  onClick={() => setEximPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Sebelumnya
                </button>
                <button 
                  disabled={eximPage >= eximTotalPages}
                  onClick={() => setEximPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
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

      {/* Supplier List View */}
      {currentTab === 'supplier' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Daftar Supplier & Forwarder Rekanan</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">{suppliers.length} Terdaftar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                <tr>
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama Supplier</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Kontak / Telepon</th>
                  <th className="p-3">Alamat</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {suppliers.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-600">{s.code}</td>
                    <td className="p-3 font-bold text-slate-800">{s.name}</td>
                    <td className="p-3">{s.category}</td>
                    <td className="p-3">{s.phone || '-'}</td>
                    <td className="p-3 text-slate-500">{s.address || '-'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {s.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report View */}
      {currentTab === 'report' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Rekapitulasi Laporan Status Pengadaan</h3>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full">{procurementOrders.length} Pesanan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                <tr>
                  <th className="p-3">No. PO</th>
                  <th className="p-3">Vendor / Pemasok</th>
                  <th className="p-3">Tahap Berjalan</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3">Status Mutu</th>
                  <th className="p-3">Nilai Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {procurementOrders.map((ord, idx) => (
                  <tr key={ord.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-600">{ord.poNumber}</td>
                    <td className="p-3 font-bold text-slate-800">{ord.vendorName}</td>
                    <td className="p-3 font-bold">{ord.stage}</td>
                    <td className="p-3">{ord.stageProgress ?? 100}%</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {ord.status || 'IN_PROGRESS'}
                      </span>
                    </td>
                    <td className="p-3 font-bold font-mono">
                      Rp {((ord.totalAmount || 150000000)).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Client Standard Bottom Action Toolbar with prominent BACK Button ─── */}
      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('procurement', null)}
        backLabel="BACK (KEMBALI KE MENU PEMBELIAN)"
        actions={
          <button
            onClick={() => {
              setProcurementFormsTab('pr');
              setProcurementFormsOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Form Pengadaan / PO Baru</span>
          </button>
        }
      />

      {/* Procurement Forms Modal */}
      <ProcurementFormsModal
        isOpen={procurementFormsOpen}
        onClose={() => setProcurementFormsOpen(false)}
        defaultTab={procurementFormsTab}
      />
      {/* Data Detail Modal */}
      <DataDetailModal
        isOpen={selectedDetailItem !== null}
        onClose={() => setSelectedDetailItem(null)}
        title={activeTab === 'kanban' ? 'Detail Purchase Order' : 'Detail Dokumen Pabean'}
        data={selectedDetailItem}
      />
    </div>
  );
};
