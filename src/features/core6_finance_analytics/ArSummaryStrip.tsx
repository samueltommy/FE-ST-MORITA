import React from 'react';
import { Receipt, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getArSummaryApi } from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';

export const ArSummaryStrip: React.FC = () => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['financeArSummary'],
    queryFn: getArSummaryApi,
  });

  const cards = [
    {
      label: 'Total Tagihan (Billed)',
      value: isLoading ? '...' : formatIDR(summary?.totalBilled ?? 0),
      sub: `${summary?.totalInvoices ?? 0} Invoice aktif`,
      icon: Receipt,
      tone: 'border-slate-200 bg-white',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Terbayar',
      value: isLoading ? '...' : formatIDR(summary?.totalPaid ?? 0),
      sub: 'Akumulasi pelunasan masuk',
      icon: CheckCircle2,
      tone: 'border-emerald-200 bg-emerald-50/40',
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Sisa Tagihan / Outstanding AR',
      value: isLoading ? '...' : formatIDR(summary?.totalOutstanding ?? 0),
      sub: `${summary?.unpaidCount ?? 0} Unpaid • ${summary?.partiallyPaidCount ?? 0} Partial`,
      icon: Clock,
      tone: 'border-amber-200 bg-amber-50/40',
      iconBg: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Mutasi Belum Direkonsiliasi',
      value: isLoading ? '...' : `${summary?.unreconciledPaymentsCount ?? 0} Mutasi`,
      sub: 'Menunggu verifikasi kas/bank',
      icon: AlertCircle,
      tone: (summary?.unreconciledPaymentsCount ?? 0) > 0 ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white',
      iconBg: (summary?.unreconciledPaymentsCount ?? 0) > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600',
    },
  ];

  return (
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
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">{c.sub}</div>
            </div>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
