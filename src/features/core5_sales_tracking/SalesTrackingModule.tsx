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
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { Quotation, SalesTrackingOrder } from '../../types';
import { FinancialMask } from '../../components/ui/FinancialMask';
import { Can } from '../../components/rbac/Can';
import { SalesFormsModal } from '../../components/forms/SalesFormsModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuotationsApi, getSalesOrdersApi, approveQuotationApi } from '../../services/salesService';

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

  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations'],
    queryFn: getQuotationsApi,
  });

  const { data: trackingOrders = [] } = useQuery({
    queryKey: ['salesTrackingOrders'],
    queryFn: getSalesOrdersApi,
  });

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
                setSalesFormsTab('quotation');
                setSalesFormsOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.btnForm}</span>
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('quotation_gating')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'quotation_gating'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {t.tabQuotation}
          </button>
          <button
            onClick={() => setActiveTab('e_tracking')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'e_tracking'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Barcode className="w-4 h-4" />
            <span>{t.tabTracking}</span>
          </button>
        </div>
      </div>

      {activeTab === 'quotation_gating' ? (
        /* Quotation Cost Control 2-Stage Gating */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong className="font-bold">{t.gatingRule}</strong>
              <div className="text-[11px] mt-0.5 opacity-90">
                {t.gatingDesc}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {t.quoteList}
            </h3>

            <div className="space-y-3">
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
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
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
                        <div className="text-[11px] text-slate-500">{q.itemSummary || q.productName}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-slate-900 dark:text-white">
                          <FinancialMask value={q.totalValue || (q.targetPrice * q.quantity) || 0} className="font-bold" />
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-slate-400 text-[11px]">{t.grossMargin}</span>
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
                      <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[11px] font-medium">
                        {q.costControlNotes}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
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

          {activeTracking ? (
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
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{t.lotBarcode}</div>
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
                        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
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

                      <div className="text-[11px] text-slate-500 font-mono">
                        {step.timestamp}
                      </div>

                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t.location} <strong className="text-slate-700 dark:text-slate-200">{step.location}</strong>
                      </div>

                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
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

      {/* Sales & Delivery Forms Modal */}
      <SalesFormsModal
        isOpen={salesFormsOpen}
        onClose={() => setSalesFormsOpen(false)}
        defaultTab={salesFormsTab}
      />
    </div>
  );
};
