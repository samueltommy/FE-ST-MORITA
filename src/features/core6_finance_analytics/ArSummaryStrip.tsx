import React from 'react';
import { Receipt, CheckCircle2, Clock, AlertCircle, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getArSummaryApi, getApSummaryApi } from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';

export const ArSummaryStrip: React.FC = () => {
  const { data: arSummary, isLoading: isArLoading } = useQuery({
    queryKey: ['financeArSummary'],
    queryFn: getArSummaryApi,
  });

  const { data: apSummary, isLoading: isApLoading } = useQuery({
    queryKey: ['financeApSummary'],
    queryFn: getApSummaryApi,
  });

  const loading = isArLoading || isApLoading;
  const totalUnreconciled =
    (arSummary?.unreconciledPaymentsCount ?? 0) + (apSummary?.unreconciledPaymentsCount ?? 0);
  const hasOverdueAp = (apSummary?.overdueCount ?? 0) > 0;

  const cards = [
    {
      label: 'Piutang (AR) Outstanding',
      value: loading ? '...' : formatIDR(arSummary?.totalOutstanding ?? 0),
      sub: `${arSummary?.unpaidCount ?? 0} Unpaid • ${arSummary?.partiallyPaidCount ?? 0} Partial (${arSummary?.totalInvoices ?? 0} Inv)`,
      icon: Clock,
      tone: 'border-amber-200 bg-amber-50/40',
      iconBg: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Hutang (AP) Outstanding',
      value: loading ? '...' : formatIDR(apSummary?.totalOutstanding ?? 0),
      sub: hasOverdueAp
        ? `⚠ ${apSummary?.overdueCount} Invoice Overdue (${formatIDR(apSummary?.overdueAmount ?? 0)})`
        : `${apSummary?.totalInvoices ?? 0} Invoice Vendor • Aman`,
      icon: Building2,
      tone: hasOverdueAp ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 bg-white',
      iconBg: hasOverdueAp ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Mutasi Belum Rekonsiliasi',
      value: loading ? '...' : `${totalUnreconciled} Mutasi`,
      sub: `AR: ${arSummary?.unreconciledPaymentsCount ?? 0} • AP: ${apSummary?.unreconciledPaymentsCount ?? 0}`,
      icon: AlertCircle,
      tone: totalUnreconciled > 0 ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white',
      iconBg: totalUnreconciled > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600',
    },
    {
      label: 'Total Tagihan & Terbayar AR',
      value: loading ? '...' : formatIDR(arSummary?.totalPaid ?? 0),
      sub: `Dari Total Billed ${formatIDR(arSummary?.totalBilled ?? 0)}`,
      icon: arSummary?.totalPaid ? CheckCircle2 : Receipt,
      tone: 'border-emerald-200 bg-emerald-50/40',
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
  ];

  const agingBuckets = [
    { label: 'Belum JT (Current)', ar: arSummary?.agingCurrent ?? 0, ap: apSummary?.agingCurrent ?? 0, tone: 'text-emerald-700' },
    { label: '1 – 30 Hari', ar: arSummary?.aging130 ?? 0, ap: apSummary?.aging130 ?? 0, tone: 'text-amber-700' },
    { label: '31 – 60 Hari', ar: arSummary?.aging3160 ?? 0, ap: apSummary?.aging3160 ?? 0, tone: 'text-orange-700' },
    { label: '61 – 90 Hari', ar: arSummary?.aging6190 ?? 0, ap: apSummary?.aging6190 ?? 0, tone: 'text-rose-600' },
    { label: '> 90 Hari', ar: arSummary?.agingOver90 ?? 0, ap: apSummary?.agingOver90 ?? 0, tone: 'text-rose-800 font-black' },
  ];

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`rounded-xl border p-3.5 shadow-2xs flex items-start justify-between gap-3 ${c.tone}`}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                  {c.label}
                </div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1 font-mono truncate">
                  {c.value}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 truncate">{c.sub}</div>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Aging 5 Bucket Strip (AR & AP) */}
      <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {agingBuckets.map((b) => (
            <div key={b.label} className="sm:pl-3 first:pl-0 pt-1.5 sm:pt-0">
              <div className="text-[10px] font-bold uppercase text-slate-400">{b.label}</div>
              <div className={`text-xs font-mono font-bold mt-0.5 ${b.tone}`}>
                AR: {loading ? '...' : formatIDR(b.ar)}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                AP: {loading ? '...' : formatIDR(b.ap)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
