import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Wallet,
  Printer,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesCommissionsApi,
  createSalesCommissionApi,
  updateSalesCommissionApi,
  deleteSalesCommissionApi,
  approveSalesCommissionApi,
  markPaidSalesCommissionApi,
  listSalesEmployeesApi,
  printFinanceHtmlReport,
  extractFinanceErrorMessage,
  SalesCommissionRecord,
  SalesCommissionPayload,
} from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const now = new Date();

const emptyDraft = (): SalesCommissionPayload => ({
  employeeId: '',
  periodMonth: now.getMonth() + 1,
  periodYear: now.getFullYear(),
  existingSalesAmount: 0,
  existingSalesRate: 1,
  newCustomerSalesAmount: 0,
  newCustomerRate: 2,
  newCustomerCount: 0,
  bonusAmount: 0,
  deductionAmount: 0,
  notes: '',
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const SalesCommissionsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canInputEditDelete = isSuperAdmin || isExecutive || userDivision === 'FINANCE' || userDivision === 'SALES';
  const canApproveOrPay = isSuperAdmin || isExecutive || userDivision === 'FINANCE';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesCommissionPayload>(emptyDraft);
  const [voidTarget, setVoidTarget] = useState<SalesCommissionRecord | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['financeCommissions', page, statusFilter, employeeFilter],
    queryFn: () =>
      listSalesCommissionsApi({
        page,
        limit: 20,
        status: statusFilter,
        employeeId: employeeFilter,
      }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['salesEmployeesDropdown'],
    queryFn: listSalesEmployeesApi,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['financeCommissions'] });

  const createMutation = useMutation({
    mutationFn: (payload: SalesCommissionPayload) => createSalesCommissionApi(payload),
    onSuccess: () => {
      toast.success('Komisi Sales berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyimpan komisi sales')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SalesCommissionPayload> }) =>
      updateSalesCommissionApi(id, payload),
    onSuccess: () => {
      toast.success('Komisi Sales berhasil diperbarui');
      setEditingId(null);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui komisi sales')),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveSalesCommissionApi(id),
    onSuccess: () => {
      toast.success('Komisi Sales disetujui Finance');
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyetujui komisi')),
  });

  const paidMutation = useMutation({
    mutationFn: (id: string) => markPaidSalesCommissionApi(id),
    onSuccess: () => {
      toast.success('Komisi Sales ditandai LUNAS (Paid)');
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menandai lunas')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSalesCommissionApi(id),
    onSuccess: () => {
      toast.success('Komisi Sales berhasil dibatalkan');
      setVoidTarget(null);
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan komisi')),
  });

  const calcTotalCommission = (d: SalesCommissionPayload) =>
    Math.round(
      (Number(d.existingSalesAmount || 0) * Number(d.existingSalesRate || 0)) / 100 +
        (Number(d.newCustomerSalesAmount || 0) * Number(d.newCustomerRate || 0)) / 100 +
        Number(d.bonusAmount || 0) -
        Number(d.deductionAmount || 0)
    );

  const startAdd = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setIsAdding(true);
  };

  const startEdit = (c: SalesCommissionRecord) => {
    setIsAdding(false);
    setEditingId(c.id);
    setDraft({
      employeeId: c.employeeId,
      periodMonth: c.periodMonth,
      periodYear: c.periodYear,
      existingSalesAmount: c.existingSalesAmount,
      existingSalesRate: c.existingSalesRate,
      newCustomerSalesAmount: c.newCustomerSalesAmount,
      newCustomerRate: c.newCustomerRate,
      newCustomerCount: c.newCustomerCount,
      bonusAmount: c.bonusAmount,
      deductionAmount: c.deductionAmount,
      notes: c.notes || '',
    });
  };

  const handleSave = () => {
    if (!draft.employeeId) return toast.error('Pilih Sales Person terlebih dahulu');
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: draft });
    } else {
      createMutation.mutate(draft);
    }
  };

  const renderInlineEditor = (isNew: boolean) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-3 py-2.5 min-w-[180px]">
          <select
            value={draft.employeeId}
            onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}
            className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
          >
            <option value="">-- Pilih Sales Person --</option>
            {salesEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} {emp.nik ? `(${emp.nik})` : ''}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2.5 flex gap-1">
          <select
            value={draft.periodMonth}
            onChange={(e) => setDraft({ ...draft, periodMonth: Number(e.target.value) })}
            className="px-1.5 py-1 rounded border border-slate-300 bg-white text-xs"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={draft.periodYear}
            onChange={(e) => setDraft({ ...draft, periodYear: Number(e.target.value) })}
            className="w-16 px-1.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono"
          />
        </td>
        <td className="px-3 py-2.5 space-y-1">
          <input
            type="number"
            placeholder="Existing Sales"
            value={draft.existingSalesAmount}
            onChange={(e) => setDraft({ ...draft, existingSalesAmount: Number(e.target.value) })}
            className="w-28 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right"
          />
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>Rate %:</span>
            <input
              type="number"
              step="0.1"
              value={draft.existingSalesRate}
              onChange={(e) => setDraft({ ...draft, existingSalesRate: Number(e.target.value) })}
              className="w-14 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-right"
            />
          </div>
        </td>
        <td className="px-3 py-2.5 space-y-1">
          <input
            type="number"
            placeholder="New Cust Sales"
            value={draft.newCustomerSalesAmount}
            onChange={(e) => setDraft({ ...draft, newCustomerSalesAmount: Number(e.target.value) })}
            className="w-28 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right"
          />
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>Rate %:</span>
            <input
              type="number"
              step="0.1"
              value={draft.newCustomerRate}
              onChange={(e) => setDraft({ ...draft, newCustomerRate: Number(e.target.value) })}
              className="w-12 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-right"
            />
            <span>Qty:</span>
            <input
              type="number"
              value={draft.newCustomerCount}
              onChange={(e) => setDraft({ ...draft, newCustomerCount: Number(e.target.value) })}
              className="w-10 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-right"
            />
          </div>
        </td>
        <td className="px-3 py-2.5 space-y-1">
          <input
            type="number"
            placeholder="Bonus"
            value={draft.bonusAmount}
            onChange={(e) => setDraft({ ...draft, bonusAmount: Number(e.target.value) })}
            className="w-24 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right"
          />
          <input
            type="number"
            placeholder="Potongan"
            value={draft.deductionAmount}
            onChange={(e) => setDraft({ ...draft, deductionAmount: Number(e.target.value) })}
            className="w-24 px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px] font-mono text-right text-rose-600"
          />
        </td>
        <td className="px-3 py-2.5 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
          {formatIDR(calcTotalCommission(draft))}
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
            {isNew ? 'BARU' : 'EDIT'}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Batal
            </button>
          </div>
        </td>
      </tr>
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td colSpan={8} className="px-3 py-2">
          <input
            type="text"
            placeholder="Catatan komisi sales (opsional)..."
            value={draft.notes || ''}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            className="w-full px-2.5 py-1 rounded border border-slate-300 bg-white text-xs"
          />
        </td>
      </tr>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={employeeFilter}
            onChange={(e) => {
              setEmployeeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="ALL">Semua Sales Person</option>
            {salesEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PAID">PAID</option>
          </select>
        </div>

        {canInputEditDelete && (
          <button
            type="button"
            onClick={startAdd}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Komisi</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">Sales Person</th>
                <th className="px-3 py-2.5">Periode</th>
                <th className="px-3 py-2.5 text-right">Existing Sales</th>
                <th className="px-3 py-2.5 text-right">New Customer</th>
                <th className="px-3 py-2.5 text-right">Bonus / Potongan</th>
                <th className="px-3 py-2.5 text-right">Total Komisi</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canInputEditDelete && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Komisi Sales...
                  </td>
                </tr>
              ) : list.length === 0 && !isAdding ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Belum ada data Komisi Sales.
                  </td>
                </tr>
              ) : (
                list.map((c) => {
                  if (editingId === c.id) return <React.Fragment key={c.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isPaid = c.status === 'PAID';
                  const isApproved = c.status === 'APPROVED';
                  const isVoid = c.status === 'CANCELLED' || c.status === 'VOID';

                  return (
                    <tr key={c.id} className={`hover:bg-slate-50/80 ${isVoid ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800">{c.employeeName}</div>
                        <div className="text-[11px] text-slate-400">{c.employeeNik || c.commissionNumber || '-'}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                        {MONTHS[(c.periodMonth || 1) - 1] || c.periodMonth} {c.periodYear}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <div>{formatIDR(c.existingSalesAmount)}</div>
                        <div className="text-[10px] text-slate-400">Rate {c.existingSalesRate}%</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <div>{formatIDR(c.newCustomerSalesAmount)}</div>
                        <div className="text-[10px] text-slate-400">
                          {c.newCustomerRate}% ({c.newCustomerCount} Cust)
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <div className="text-emerald-700">+{formatIDR(c.bonusAmount)}</div>
                        {c.deductionAmount > 0 && <div className="text-rose-600 text-[10px]">-{formatIDR(c.deductionAmount)}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                        {formatIDR(c.totalCommission)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-700'
                              : isApproved
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {canApproveOrPay && !isApproved && !isPaid && !isVoid && (
                            <button
                              type="button"
                              onClick={() => approveMutation.mutate(c.id)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                          )}
                          {canApproveOrPay && isApproved && !isPaid && (
                            <button
                              type="button"
                              onClick={() => paidMutation.mutate(c.id)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              <Wallet className="w-3 h-3" /> Tandai Paid
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              printFinanceHtmlReport(`/finance/commissions/${c.id}/print`).catch((e) =>
                                toast.error(e?.message || 'Gagal mencetak slip komisi')
                              )
                            }
                            title="Cetak Slip Komisi"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {canInputEditDelete && !isPaid && !isVoid && (
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              title="Edit Inline"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canInputEditDelete && !isPaid && !isVoid && (
                            <button
                              type="button"
                              onClick={() => setVoidTarget(c)}
                              title="Batal / Void"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
        title="Batalkan Komisi Sales?"
        message={`Anda yakin ingin membatalkan komisi untuk ${voidTarget?.employeeName || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
