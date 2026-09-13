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
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { Quotation, SalesTrackingOrder } from '../../types';
import { formatIDR } from '../../utils/invoiceCalculator';
import { Can } from '../../components/rbac/Can';
import { SalesFormsModal } from '../../components/forms/SalesFormsModal';

export const SalesTrackingModule: React.FC = () => {
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
  const quotations = useAppStore((state) => state.quotations);
  const trackingOrders = useAppStore((state) => state.salesTrackingOrders);
  const currentUser = useAppStore((state) => state.currentUser);

  const [activeTab, setActiveTab] = useState<'quotation_gating' | 'e_tracking'>('quotation_gating');
  const [selectedTracking, setSelectedTracking] = useState<SalesTrackingOrder>(trackingOrders[0]);
  const [salesFormsOpen, setSalesFormsOpen] = useState(false);
  const [salesFormsTab, setSalesFormsTab] = useState<'quotation' | 'do' | 'tracking'>('quotation');

  const filteredQuotes = quotations.filter((q) => q.businessUnit === currentUnit);

  const handleApproveMargin = (quoteId: string) => {
    appStore.approveQuotation(quoteId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Sales Order, Cost Control Gating & Barcode E-Tracking
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Core 5 Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Persetujuan penawaran harga 2-tahap (Gating Cost Control) & visual timeline pelacakan pengiriman barcode
          </p>
        </div>

        {/* Action buttons & Tab switcher */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSalesFormsTab('quotation');
              setSalesFormsOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Penawaran</span>
          </button>
          <button
            onClick={() => {
              setSalesFormsTab('do');
              setSalesFormsOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Terbitkan DO</span>
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('quotation_gating')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'quotation_gating'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quotation Gating Cost Control
            </button>
            <button
              onClick={() => setActiveTab('e_tracking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'e_tracking'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Barcode className="w-3.5 h-3.5 text-amber-500" />
              <span>Timeline E-Tracking Barcode</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'quotation_gating' ? (
        /* Quotation Cost Control 2-Stage Gating */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong className="font-bold">Ketentuan Gating Margin PT St. Morita Group:</strong>
              <div className="text-[11px] mt-0.5 opacity-90">
                Setiap draft Quotation yang diajukan oleh Sales Executive secara otomatis dikunci sistem hingga Cost Control memvalidasi kalkulasi HPP dan menyetujui batas minimum gross margin (≥ 18.0%).
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Daftar Penawaran Harga (Quotation) & Status Gating
            </h3>

            <div className="space-y-3">
              {filteredQuotes.map((q) => {
                const isPending = q.status === 'PENDING_COST_CONTROL';
                const isLowMargin = q.grossMarginPercent < 18.0;

                return (
                  <div
                    key={q.id}
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
                            {q.status === 'APPROVED' || (q.status as string) === 'APPROVED_OFFICIAL' ? '✓ APPROVED OFFICIAL' : 'PENDING COST CONTROL'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {q.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500">{q.itemSummary || q.productName}</div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {formatIDR(q.totalValue || (q.targetPrice * q.quantity) || 0)}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-slate-400 text-[11px]">Gross Margin:</span>
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
                        Sales Rep: <strong>{q.salesRep || q.salesRepresentative}</strong> • Diajukan: {q.submittedAt || q.createdDate}
                      </div>

                      {isPending ? (
                        /* Gating Button with <Can perform="cost_control:margin:approve"> */
                        <Can
                          perform="cost_control:margin:approve"
                          fallback={
                            <span className="text-amber-600 font-semibold italic">
                              Menunggu Approval Cost Control
                            </span>
                          }
                        >
                          <button
                            onClick={() => handleApproveMargin(q.id)}
                            className="px-4 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs"
                          >
                            Approve Margin & Unlock Official Quotation
                          </button>
                        </Can>
                      ) : (
                        <div className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Disetujui: {q.approvedBy || 'Cost Control & Direksi'}</span>
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
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">
                Pelacakan Pesanan Real-Time
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {selectedTracking.customerName}
              </h3>
              <div className="text-xs text-slate-500 font-mono">
                SO: {selectedTracking.soNumber} • IO: {selectedTracking.ioNumber}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <Barcode className="w-8 h-8 text-slate-800 dark:text-white" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">No. LOT / Barcode</div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {selectedTracking.barcode}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Stepper Visual */}
          <div className="relative py-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {selectedTracking.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border text-xs space-y-2 relative transition-all ${
                    step.completed
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                      Step 0{idx + 1}
                    </span>
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {step.stage}
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    {step.timestamp}
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Lokasi: <strong>{step.location}</strong>
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Operator: {step.operator}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Estimasi Tiba (ETA Klien): <strong>{selectedTracking.eta}</strong></span>
            </div>
            <button
              onClick={() => alert(`Memperbarui koordinat GPS armada pengiriman ${selectedTracking.ioNumber}...`)}
              className="font-bold underline text-blue-600 hover:text-blue-700"
            >
              Refresh GPS Pengiriman
            </button>
          </div>
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
