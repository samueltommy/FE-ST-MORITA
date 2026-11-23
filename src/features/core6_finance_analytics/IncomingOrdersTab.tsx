import React, { useState } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listIncomingOrdersApi,
  createIncomingOrderApi,
  deleteIncomingOrderApi,
  confirmIoManagerMarketingApi,
  confirmIoCostControlApi,
  listCustomerPosApi,
  extractFinanceErrorMessage,
  IncomingOrderRecord,
} from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

export const IncomingOrdersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canCreateOrDelete = isSuperAdmin || isExecutive || userDivision === 'FINANCE';
  const canConfirmMgrMkt = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'SALES');
  const canConfirmCostControl = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'FINANCE');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [draftPoId, setDraftPoId] = useState('');
  const [draftDate, setDraftDate] = useState(todayStr());
  const [draftEstDelivery, setDraftEstDelivery] = useState('');
  const [draftNotes, setDraftNotes] = useState('');

  const [voidTarget, setVoidTarget] = useState<IncomingOrderRecord | null>(null);

  const { data: ioRes, isLoading } = useQuery({
    queryKey: ['financeIncomingOrders', page, search, statusFilter],
    queryFn: () =>
      listIncomingOrdersApi({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      }),
  });
  const orders = ioRes?.data || [];
  const totalPages = ioRes?.meta?.totalPages || ioRes?.meta?.total_pages || 1;

  const { data: posRes } = useQuery({
    queryKey: ['financeCustomerPosDropdown'],
    queryFn: () => listCustomerPosApi({ page: 1, limit: 100 }),
  });
  const convertiblePos = (posRes?.data || []).filter(
    (po) => po.status !== 'CONVERTED_TO_IO' && po.status !== 'CANCELLED' && po.status !== 'VOID'
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['financeIncomingOrders'] });
    queryClient.invalidateQueries({ queryKey: ['financeCustomerPos'] });
    queryClient.invalidateQueries({ queryKey: ['financeCustomerPosDropdown'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createIncomingOrderApi({
        customerPoId: draftPoId,
        date: draftDate,
        estimatedDeliveryDate: draftEstDelivery || null,
        notes: draftNotes || null,
      }),
    onSuccess: () => {
      toast.success('Incoming Order (IO) berhasil diterbitkan dari PO Customer');
      setIsAdding(false);
      setDraftPoId('');
      setDraftNotes('');
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menerbitkan Incoming Order')),
  });

  const confirmMktMutation = useMutation({
    mutationFn: (id: string) => confirmIoManagerMarketingApi(id),
    onSuccess: () => {
      toast.success('Konfirmasi Manager Marketing berhasil');
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal konfirmasi Manager Marketing')),
  });

  const confirmCcMutation = useMutation({
    mutationFn: (id: string) => confirmIoCostControlApi(id),
    onSuccess: () => {
      toast.success('Konfirmasi Cost Control berhasil');
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal konfirmasi Cost Control')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteIncomingOrderApi(id),
    onSuccess: () => {
      toast.success('Incoming Order berhasil di-void');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan Incoming Order')),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. IO / No. PO / Customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="OPEN">OPEN</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        {canCreateOrDelete && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Terbitkan IO dari PO</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. IO</th>
                <th className="px-3 py-2.5">No. PO &amp; Customer</th>
                <th className="px-3 py-2.5">Tanggal IO</th>
                <th className="px-3 py-2.5">Est. Kirim</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-center">Konfirmasi Manager Mkt</th>
                <th className="px-3 py-2.5 text-center">Konfirmasi Cost Control</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canCreateOrDelete && isAdding && (
                <tr className="bg-blue-50 border-b border-blue-200">
                  <td className="px-3 py-2.5 font-mono font-bold text-blue-700">AUTO-IO</td>
                  <td className="px-3 py-2.5 min-w-[220px]">
                    <select
                      value={draftPoId}
                      onChange={(e) => setDraftPoId(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                    >
                      <option value="">-- Pilih PO Customer --</option>
                      {convertiblePos.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.poNumber} — {po.customerName} ({formatIDR(po.totalAmount)})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="date"
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                      className="px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="date"
                      value={draftEstDelivery}
                      onChange={(e) => setDraftEstDelivery(e.target.value)}
                      className="px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                    />
                  </td>
                  <td className="px-3 py-2.5" colSpan={3}>
                    <input
                      type="text"
                      placeholder="Catatan IO (opsional)..."
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">BARU</span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!draftPoId) return toast.error('Pilih PO Customer terlebih dahulu');
                          createMutation.mutate();
                        }}
                        disabled={createMutation.isPending}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Batal
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Incoming Order...
                  </td>
                </tr>
              ) : orders.length === 0 && !isAdding ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Belum ada data Incoming Order (IO).
                  </td>
                </tr>
              ) : (
                orders.map((io) => {
                  const isVoid = io.status === 'CANCELLED' || io.status === 'VOID';
                  return (
                    <tr key={io.id} className={`hover:bg-slate-50/80 ${isVoid ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">{io.ioNumber}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800">{io.customerName}</div>
                        <div className="text-[11px] font-mono text-slate-400">PO: {io.poNumber}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{io.date}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{io.estimatedDeliveryDate || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap">{formatIDR(io.totalAmount)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {io.managerMarketingConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> CONFIRMED
                          </span>
                        ) : canConfirmMgrMkt && !isVoid ? (
                          <button
                            type="button"
                            onClick={() => confirmMktMutation.mutate(io.id)}
                            disabled={confirmMktMutation.isPending}
                            className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold cursor-pointer"
                          >
                            ✓ Konfirmasi Mkt
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">PENDING</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {io.costControlConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> CONFIRMED
                          </span>
                        ) : canConfirmCostControl && !isVoid ? (
                          <button
                            type="button"
                            onClick={() => confirmCcMutation.mutate(io.id)}
                            disabled={confirmCcMutation.isPending}
                            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                          >
                            ✓ Konfirmasi CC
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">PENDING</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          {io.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {canCreateOrDelete && !isVoid && (
                          <button
                            type="button"
                            onClick={() => setVoidTarget(io)}
                            title="Void / Batal IO"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex gap-1.5">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">Prev</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">Next</button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(voidTarget)}
        title="Batalkan / Void Incoming Order?"
        message={`Anda yakin ingin membatalkan Incoming Order ${voidTarget?.ioNumber || ''}?`}
        confirmLabel="Ya, Void IO"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
