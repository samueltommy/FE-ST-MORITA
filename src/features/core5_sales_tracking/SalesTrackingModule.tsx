import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Barcode,
  Truck,
  Package,
  ShieldAlert,
  ChevronRight,
  Plus,
  Send,
  Navigation,
  RefreshCw,
  Lock,
  Users,
  Download,
  Building2,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { Quotation, SalesTrackingOrder } from '../../types';
import { FinancialMask } from '../../components/ui/FinancialMask';
import { Can } from '../../components/rbac/Can';
import { SalesFormsModal } from '../../components/forms/SalesFormsModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuotationsApi, getSalesOrdersApi, approveQuotationApi } from '../../services/salesService';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';

const CONTENT = {
  id: {
    title: 'Sales Order, Cost Control Gating & Barcode E-Tracking',
    desc: 'Persetujuan penawaran harga 2-tahap (Gating Cost Control) & visual timeline pelacakan pengiriman barcode',
    btnForm: 'Form Penjualan & DO',
    tabQuotation: 'Quotation Gating Cost Control',
    tabTracking: 'Timeline E-Tracking Barcode',
    gatingRule: 'Ketentuan Gating Margin PT St. Morita Group:',
    gatingDesc: 'Setiap draft Quotation yang diajukan oleh Sales Executive secara otomatis dikunci sistem hingga Cost Control memvalidasi kalkulasi HPP dan menyetujui batas minimum gross margin (≥ 18.0%).',
    quoteList: 'Daftar Penawaran Harga (Quotation) & Status Gating',
    approvedOff: '✓ APPROVED OFFICIAL',
    pendingCC: 'PENDING COST CONTROL',
    grossMargin: 'Gross Margin:',
    salesRep: 'Sales Rep:',
    submitted: 'Diajukan:',
    waitCC: 'Menunggu Approval Cost Control',
    approveBtn: 'Approve Margin & Unlock Official Quotation',
    approvedBy: 'Disetujui:',
    selectTracking: 'Pilih Pesanan Pengiriman:',
    trackingRealtime: 'Pelacakan Pesanan Real-Time',
    lotBarcode: 'No. LOT / Barcode',
    step: 'Step',
    location: 'Lokasi:',
    operator: 'Operator:',
    eta: 'Estimasi Tiba (ETA Klien):',
    refreshGps: 'Refresh GPS Pengiriman',
    noTracking: 'Belum ada data pengiriman aktif.',
    alertGps: 'Status GPS armada pesanan',
    alertGpsEnd: 'terkonfirmasi aktif.',
  },
  en: {
    title: 'Sales Order, Cost Control Gating & Barcode E-Tracking',
    desc: '2-stage quotation approval (Cost Control Gating) & barcode delivery tracking visual timeline',
    btnForm: 'Sales & DO Forms',
    tabQuotation: 'Quotation Gating Cost Control',
    tabTracking: 'Barcode E-Tracking Timeline',
    gatingRule: 'PT St. Morita Group Margin Gating Rules:',
    gatingDesc: 'Every draft Quotation submitted by Sales Executives is automatically locked by the system until Cost Control validates the COGS calculation and approves the minimum gross margin limit (≥ 18.0%).',
    quoteList: 'Price Quotation List & Gating Status',
    approvedOff: '✓ APPROVED OFFICIAL',
    pendingCC: 'PENDING COST CONTROL',
    grossMargin: 'Gross Margin:',
    salesRep: 'Sales Rep:',
    submitted: 'Submitted:',
    waitCC: 'Waiting for Cost Control Approval',
    approveBtn: 'Approve Margin & Unlock Official Quotation',
    approvedBy: 'Approved by:',
    selectTracking: 'Select Delivery Order:',
    trackingRealtime: 'Real-Time Order Tracking',
    lotBarcode: 'LOT / Barcode No.',
    step: 'Step',
    location: 'Location:',
    operator: 'Operator:',
    eta: 'Estimated Time of Arrival (ETA):',
    refreshGps: 'Refresh Delivery GPS',
    noTracking: 'No active delivery tracking data.',
    alertGps: 'Fleet GPS status for order',
    alertGpsEnd: 'is confirmed active.',
  }
};

export const SalesTrackingModule: React.FC = () => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;
  const queryClient = useQueryClient();

  const [quotePage, setQuotePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { data: quoteRes, error: quoteError } = useQuery({
    queryKey: ['quotations', quotePage, pageSize],
    queryFn: () => getQuotationsApi(quotePage, pageSize),
  });
  const quotations: any[] = quoteRes?.data || [];
  const quoteTotalPages = quoteRes?.meta?.totalPages || quoteRes?.meta?.total_pages || 1;
  const isQuoteForbidden = (quoteError as any)?.response?.status === 403;

  const { data: trackingRes, error: trackingError } = useQuery({
    queryKey: ['salesTrackingOrders'],
    queryFn: () => getSalesOrdersApi(1, 100),
  });
  const trackingOrders = trackingRes?.data || [];
  const isTrackingForbidden = (trackingError as any)?.response?.status === 403;

  const currentUser = useAppStore((state) => state.currentUser);

  const [activeTab, setActiveTab] = useState<'quotation_gating' | 'e_tracking'>('quotation_gating');
  const [selectedTrackingId, setSelectedTrackingId] = useState<string>('');
  const [salesFormsOpen, setSalesFormsOpen] = useState(false);
  const [salesFormsTab, setSalesFormsTab] = useState<'quotation' | 'do' | 'tracking'>('quotation');

  const filteredQuotes = quotations;

  // Synchronize or find selected tracking order safely
  const activeTracking =
    trackingOrders.find((t) => t.id === selectedTrackingId || t.ioNumber === selectedTrackingId) ||
    trackingOrders[0] ||
    null;

  const approveMutation = useMutation({
    mutationFn: approveQuotationApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    }
  });

  const handleApproveMargin = (quoteId: string) => {
    approveMutation.mutate(quoteId);
  };

  if (isQuoteForbidden && isTrackingForbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Lock className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-600">Akses Terbatas</h2>
        <p className="mt-2 text-sm text-center max-w-md">
          Anda tidak memiliki izin (role) yang memadai untuk mengakses modul Sales & E-Tracking.
        </p>
      </div>
    );
  }

  const pageOptions: PageOptionItem[] = [
    {
      id: 'quotation_gating',
      label: '1. Penawaran Harga (Quotation & Gating)',
      subtitle: `${quotations.length} Penawaran & Kontrol Margin`,
      icon: FileSpreadsheet,
      badge: quotations.filter((q) => q.status === 'PENDING_COST_CONTROL').length > 0
        ? `${quotations.filter((q) => q.status === 'PENDING_COST_CONTROL').length} Gated`
        : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'e_tracking',
      label: '2. Lacak Pengiriman Armada (Live GPS)',
      subtitle: `${trackingOrders.length} Pesanan Sedang Dikirim`,
      icon: Truck,
      badge: `${trackingOrders.length} Kirim`,
      badgeColor: 'bg-blue-600 text-white',
    },
  ];

  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.sales);
  const customers = useAppStore((state) => state.customers) || [];
  const gatedCount = quotations.filter((q) => q.status === 'PENDING_COST_CONTROL').length;

  // When no feature is selected yet, render simple selection menu hub (matches client reference screenshot 1)
  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'quotation_gating',
        label: 'Persetujuan Penawaran Harga (Quotation Gating)',
        subtitle: `Validasi margin HPP (≥ 18.0%) & kontrol harga jual (${quotations.length} Penawaran)`,
        icon: FileSpreadsheet,
        iconColor: 'text-amber-600',
        badge: gatedCount > 0 ? `${gatedCount} Gated` : undefined,
        badgeColor: 'bg-amber-500 text-white font-black',
        onClick: () => appStore.setActiveSubFeature('sales', 'quotation_gating'),
      },
      {
        id: 'e_tracking',
        label: 'Pelacakan Pengiriman Barcode (Live GPS)',
        subtitle: `Timeline status pengiriman armada truk ST. Morita (${trackingOrders.length} Pesanan)`,
        icon: Truck,
        iconColor: 'text-blue-600',
        badge: `${trackingOrders.length} Kirim`,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'e_tracking'),
      },
      {
        id: 'sales_report',
        label: 'Laporan Penjualan (Sales Report : Incoming Order)',
        subtitle: 'Rekapitulasi pesanan masuk pelanggan per tahun (2021 - 2026)',
        icon: FileSpreadsheet,
        iconColor: 'text-emerald-600',
        badge: 'Laporan',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'sales_report'),
      },
      {
        id: 'customer',
        label: 'Daftar Pelanggan & Klien (Customer Master)',
        subtitle: `Database pelanggan industri manufaktur dan distribusi (${customers.length} Klien)`,
        icon: Users,
        iconColor: 'text-purple-600',
        badge: `${customers.length} Customer`,
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'customer'),
      },
      {
        id: 'form',
        label: 'Buat Penawaran / Form Penjualan & DO',
        subtitle: 'Formulir input draft Quotation resmi, SO, dan Surat Jalan (DO)',
        icon: Plus,
        iconColor: 'text-sky-600',
        badge: 'Input Baru',
        badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
        onClick: () => {
          setSalesFormsTab('quotation');
          setSalesFormsOpen(true);
        },
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="Core 5"
        moduleName="PENJUALAN (SALES & E-TRACKING)"
        moduleDescription="Pusat kontrol penawaran harga, persetujuan batas margin HPP, laporan incoming order, dan pelacakan pengiriman barcode."
        headerBgColor="bg-amber-600"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const currentTab = activeSubFeature === 'e_tracking' ? 'e_tracking' : activeSubFeature === 'sales_report' ? 'sales_report' : activeSubFeature === 'customer' ? 'customer' : 'quotation_gating';

  return (
    <div className="space-y-6">
      {/* ─── Module Page Header with Senior-Friendly Options ─── */}
      <ModulePageHeader
        moduleCode="Core 5"
        title={t.title}
        description={t.desc}
        badgeColor="bg-amber-50 text-amber-800 border-amber-300"
        options={pageOptions}
        activeOption={currentTab}
        onSelectOption={(optId) => appStore.setActiveSubFeature('sales', optId)}
        onBackToMenu={() => appStore.setActiveSubFeature('sales', null)}
        menuName="Penjualan"
        actionButtons={
          <>
            <button
              onClick={() => {
                setSalesFormsTab('quotation');
                setSalesFormsOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm sm:text-base font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.btnForm}</span>
            </button>
          </>
        }
      />

      {activeTab === 'quotation_gating' ? (
        /* Quotation Cost Control 2-Stage Gating */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong className="font-bold">{t.gatingRule}</strong>
              <div className="text-xs mt-0.5 opacity-90">
                {t.gatingDesc}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {t.quoteList}
            </h3>

            {isQuoteForbidden ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Lock className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">Akses Terbatas</h4>
                <p className="text-xs text-center max-w-sm mt-1">Anda tidak memiliki izin (role) yang memadai untuk melihat daftar Penawaran Harga ini.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 overflow-auto max-h-[60vh] 2xl:max-h-[70vh] pr-1">
                  {filteredQuotes.map((q, qIdx) => {
                    const isPending = q.status === 'PENDING_COST_CONTROL';
                    const isLowMargin = q.grossMarginPercent < 18.0;

                return (
                  <div
                    key={q.id || q.quotationNumber || `quote-${qIdx}`}
                    className={`p-4 rounded-2xl border transition-all text-xs space-y-2.5 ${
                      isPending
                        ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-800'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {q.quoteNumber || q.quotationNumber}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                              q.status === 'APPROVED' || (q.status as string) === 'APPROVED_OFFICIAL'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black animate-pulse'
                            }`}
                          >
                            {q.status === 'APPROVED' || (q.status as string) === 'APPROVED_OFFICIAL' ? t.approvedOff : t.pendingCC}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {q.customerName}
                        </div>
                        <div className="text-xs text-slate-500">{q.itemSummary || q.productName}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-slate-900 dark:text-white">
                          <FinancialMask value={q.totalValue || (q.targetPrice * q.quantity) || 0} className="font-bold" />
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-slate-400 text-xs">{t.grossMargin}</span>
                          <span
                            className={`font-mono font-bold ${
                              isLowMargin ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {q.grossMarginPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {q.costControlNotes && (
                      <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-medium">
                        {q.costControlNotes}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                      <div>
                        {t.salesRep} <strong>{q.salesRep || q.salesRepresentative}</strong> • {t.submitted} {q.submittedAt || q.createdDate}
                      </div>

                      {isPending ? (
                        /* Gating Button with <Can perform="cost_control:margin:approve"> */
                        <Can
                          perform="cost_control:margin:approve"
                          fallback={
                            <span className="text-amber-600 font-semibold italic">
                              {t.waitCC}
                            </span>
                          }
                        >
                          <button
                            onClick={() => handleApproveMargin(q.id)}
                            className="px-4 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs"
                          >
                            {t.approveBtn}
                          </button>
                        </Can>
                      ) : (
                        <div className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.approvedBy} {q.approvedBy || 'Cost Control & Direksi'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* KONTROL PAGINATION QUOTATIONS */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 font-medium">
                  Halaman {quotePage} dari {quoteTotalPages}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setQuotePage(1);
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
                  disabled={quotePage === 1}
                  onClick={() => setQuotePage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Sebelumnya
                </button>
                <button 
                  disabled={quotePage >= quoteTotalPages}
                  onClick={() => setQuotePage(p => p + 1)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      ) : (
        /* Barcode E-Tracking Visual Timeline */
        <div className="space-y-4">
          {/* Tracking Order Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {t.selectTracking}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {trackingOrders.map((t, tIdx) => (
                <button
                  key={t.id || t.ioNumber || `track-${tIdx}`}
                  onClick={() => setSelectedTrackingId(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTracking?.id === t.id || activeTracking?.ioNumber === t.ioNumber
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.customerName} ({t.soNumber || t.ioNumber})
                </button>
              ))}
            </div>
          </div>

          {isTrackingForbidden ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <Lock className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">Akses Terbatas</h4>
              <p className="text-xs text-center max-w-sm mt-1">Anda tidak memiliki izin (role) yang memadai untuk melihat pelacakan pesanan (E-Tracking).</p>
            </div>
          ) : activeTracking ? (
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">
                    {t.trackingRealtime}
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {activeTracking.customerName}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    SO: {activeTracking.soNumber || activeTracking.id} • IO: {activeTracking.ioNumber}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <Barcode className="w-8 h-8 text-slate-800 dark:text-white" />
                  <div>
                    <div className="text-xs text-slate-400 uppercase font-bold">{t.lotBarcode}</div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {activeTracking.barcode || `899${activeTracking.ioNumber?.replace(/\D/g, '') || '002849182'}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Stepper Visual */}
              <div className="relative py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 relative">
                  {(activeTracking.steps && activeTracking.steps.length > 0 ? activeTracking.steps : [
                    { stage: 'SO Confirmed', timestamp: '08:30 WIB', completed: true, location: 'Sales Office', operator: 'Sales Admin' },
                    { stage: 'Slitting Production', timestamp: '11:15 WIB', completed: true, location: 'Line Slitter 02', operator: 'Budi (Operator)' },
                    { stage: 'QC Inspection', timestamp: '13:45 WIB', completed: true, location: 'Lab QA', operator: 'Siti (QC)' },
                    { stage: 'Surat Jalan / DO', timestamp: '14:20 WIB', completed: true, location: 'Dispatch Area', operator: 'Gudang FG' },
                    { stage: 'In Transit Delivery', timestamp: '15:10 WIB (Sedang Jalan)', completed: false, location: 'Armada Truk #04', operator: 'Supir Logistik' },
                  ]).map((step, idx) => (
                    <div
                      key={step.stage || `step-${idx}`}
                      className={`p-4 rounded-2xl border text-xs space-y-2 relative transition-all ${
                        step.completed
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
                          {t.step} 0{idx + 1}
                        </span>
                        {step.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        )}
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {step.stage}
                      </div>

                      <div className="text-xs text-slate-500 font-mono">
                        {step.timestamp}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t.location} <strong className="text-slate-700 dark:text-slate-200">{step.location}</strong>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t.operator} {step.operator}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>{t.eta} <strong>{activeTracking.eta || 'Hari ini, 17:00 WIB'}</strong></span>
                </div>
                <button
                  onClick={() => alert(`${t.alertGps} ${activeTracking.soNumber || activeTracking.ioNumber} ${t.alertGpsEnd}`)}
                  className="font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  {t.refreshGps}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{t.noTracking}</p>
            </div>
          )}
        </div>
      )}

      {/* Sales Report : Incoming Order (Sesuai Referensi Client Screenshot 3) */}
      {currentTab === 'sales_report' && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 overflow-hidden shadow-sm space-y-4">
          <div className="bg-emerald-100/80 px-6 py-3.5 border-b border-emerald-200 flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
              Sales Report : Incoming Order
            </h3>
            <span className="text-xs bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded-md">
              Data Tahunan (2021 - 2026)
            </span>
          </div>

          <div className="p-4 sm:p-6 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-50 text-slate-800 font-bold border-y border-emerald-200 text-xs">
                  <th className="p-2.5 border-r border-slate-200 w-12 text-center">No</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[220px]">CUSTOMER</th>
                  <th className="p-2.5 border-r border-slate-200 text-right text-blue-700 font-bold">2021</th>
                  <th className="p-2.5 border-r border-slate-200 text-right text-blue-700 font-bold">2022</th>
                  <th className="p-2.5 border-r border-slate-200 text-right text-blue-700 font-bold">2023</th>
                  <th className="p-2.5 border-r border-slate-200 text-right text-blue-700 font-bold">2024</th>
                  <th className="p-2.5 border-r border-slate-200 text-right text-blue-700 font-bold">2025</th>
                  <th className="p-2.5 text-right text-blue-700 font-bold">2026</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {[
                  { no: 106, name: 'Arkos Jaya Mandiri CV', y21: '67,646,904', y22: '49,542,840', y23: '18,680,976', y24: '', y25: '', y26: '' },
                  { no: 107, name: 'ARLENE JAYAMANDIRI PT', y21: '', y22: '', y23: '', y24: '', y25: '', y26: '9,212,500' },
                  { no: 108, name: 'ARSYRAJA INDO GLOBAL PT', y21: '', y22: '', y23: '', y24: '27,640,800', y25: '7,632,000', y26: '10,944,000' },
                  { no: 109, name: 'Arta Kencana', y21: '', y22: '14,412,168', y23: '', y24: '', y25: '', y26: '' },
                  { no: 110, name: 'Arta Mulya Gemilang PT', y21: '', y22: '', y23: '', y24: '', y25: '2,882,883', y26: '2,400,000' },
                  { no: 111, name: 'ARTEMI ZENITH INTERNATIONAL PT.', y21: '', y22: '3,650,000', y23: '', y24: '', y25: '', y26: '' },
                  { no: 112, name: 'ARTHA JAYA CV', y21: '1,000,000', y22: '', y23: '', y24: '', y25: '', y26: '' },
                  { no: 113, name: 'ARTHA UTAMA PLASINDO PT', y21: '4,750,000', y22: '4,825,000', y23: '', y24: '', y25: '', y26: '' },
                  { no: 114, name: 'ARTHAWENASAKTI GEMILANG PT', y21: '2,040,000', y22: '1,080,000', y23: '', y24: '', y25: '', y26: '' },
                  { no: 115, name: 'Arthawena Sakti Gemilang PT', y21: '', y22: '', y23: '2,160,000', y24: '3,240,000', y25: '2,160,000', y26: '' },
                  { no: 116, name: 'ART WIRE PT', y21: '', y22: '1,120,300', y23: '240,000', y24: '1,170,000', y25: '', y26: '1,900,800' },
                  { no: 117, name: 'ARWANA GEMILANG SEJAHTERA PT', y21: '', y22: '', y23: '', y24: '21,750,000', y25: '185,600,000', y26: '' },
                  { no: 118, name: 'ARYA DIGITAL TECHNOLOGY', y21: '14,665,104', y22: '9,730,800', y23: '', y24: '', y25: '', y26: '' },
                  { no: 119, name: 'Ary Motor', y21: '1,656,000', y22: '1,548,000', y23: '1,440,000', y24: '1,440,000', y25: '2,520,000', y26: '2,592,000' },
                  { no: 120, name: 'ASAHAN METALINDO PERKASA PT', y21: '14,545,440', y22: '25,977,260', y23: '', y24: '', y25: '', y26: '' },
                  { no: 121, name: 'ASAHAN SAKTI CV', y21: '58,681,818', y22: '121,907,453', y23: '43,327,027', y24: '25,600,000', y25: '', y26: '' },
                  { no: 122, name: 'ASATHA USAHA MANDIRI CV', y21: '5,310,000', y22: '', y23: '', y24: '', y25: '', y26: '' },
                  { no: 123, name: 'ASH-SHIDDIIQ STORE', y21: '18,354,528', y22: '8,781,696', y23: '', y24: '', y25: '', y26: '' },
                  { no: 124, name: 'ASIAN ISUZU CASTING CENTER PT', y21: '12,453,600', y22: '', y23: '', y24: '', y25: '', y26: '' },
                  { no: 125, name: 'Asia Sakti Wahid Foods Manufacture (ASW Foods) PT', y21: '', y22: '', y23: '', y24: '', y25: '4,400,000', y26: '' },
                ].map((row) => (
                  <tr key={row.no} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center font-sans font-bold text-slate-500">{row.no}</td>
                    <td className="p-2 border-r border-slate-200 font-sans font-bold text-slate-800">{row.name}</td>
                    <td className="p-2 border-r border-slate-200 text-right">{row.y21 || '-'}</td>
                    <td className="p-2 border-r border-slate-200 text-right">{row.y22 || '-'}</td>
                    <td className="p-2 border-r border-slate-200 text-right">{row.y23 || '-'}</td>
                    <td className="p-2 border-r border-slate-200 text-right">{row.y24 || '-'}</td>
                    <td className="p-2 border-r border-slate-200 text-right">{row.y25 || '-'}</td>
                    <td className="p-2 text-right">{row.y26 || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-100 text-slate-900 font-black text-xs border-t-2 border-emerald-300">
                  <td colSpan={2} className="p-3 text-center uppercase tracking-wider font-sans">
                    TOTAL KONSOLIDASI
                  </td>
                  <td className="p-3 text-right font-mono">62,623,227,450</td>
                  <td className="p-3 text-right font-mono">61,820,309,570</td>
                  <td className="p-3 text-right font-mono">51,943,405,536</td>
                  <td className="p-3 text-right font-mono">68,855,103,087</td>
                  <td className="p-3 text-right font-mono">68,756,430,232</td>
                  <td className="p-3 text-right font-mono">66,755,634,613</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Customer Master View */}
      {currentTab === 'customer' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Daftar Pelanggan (Customer Master)</h3>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full">{customers.length} Terdaftar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                <tr>
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama Customer</th>
                  <th className="p-3">Segmen Industri</th>
                  <th className="p-3">PIC / Telepon</th>
                  <th className="p-3">Plafon Kredit</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {customers.map((c, idx) => (
                  <tr key={c.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-600">{c.code}</td>
                    <td className="p-3 font-bold text-slate-800">{c.name}</td>
                    <td className="p-3">{c.industrySegment || 'Automotive OEM'}</td>
                    <td className="p-3">{c.picPhone || c.phone || '-'}</td>
                    <td className="p-3 font-bold font-mono text-slate-800">
                      Rp {((c.creditLimit || 500000000)).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {c.status || 'ACTIVE'}
                      </span>
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
        onBack={() => appStore.setActiveSubFeature('sales', null)}
        backLabel="BACK (KEMBALI KE MENU PENJUALAN)"
        actions={
          <>
            <button
              onClick={() => {
                alert('Mengekspor Laporan Penjualan ke Excel (.xlsx)...');
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>EXCEL ▾</span>
            </button>
            <button
              onClick={() => {
                setSalesFormsTab('quotation');
                setSalesFormsOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Form Penjualan Baru</span>
            </button>
          </>
        }
      />

      {/* Sales & Delivery Forms Modal */}
      <SalesFormsModal
        isOpen={salesFormsOpen}
        onClose={() => setSalesFormsOpen(false)}
        defaultTab={salesFormsTab}
      />
    </div>
  );
};
