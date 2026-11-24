import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesForecastsApi,
  createSalesForecastApi,
  updateSalesForecastApi,
  approveSalesForecastApi,
  deleteSalesForecastApi,
  listSalesDropdownCustomersApi,
  listSalesDropdownItemsApi,
  listSalesDropdownEmployeesApi,
  extractSalesErrorMessage,
  SalesForecastPayload,
  SalesForecastRecord,
} from '../../services/salesService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const now = new Date();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const emptyDraft = (): SalesForecastPayload => ({
  customerId: '',
  salesPersonId: '',
  itemId: '',
  periodYear: now.getFullYear(),
  periodMonth: now.getMonth() + 1,
  forecastQty: 0,
  unit: 'Roll',
  estimatedUnitPrice: 0,
  forecastAmount: 0,
  actualQty: 0,
  actualAmount: 0,
  probabilityPercent: 70,
  notes: '',
});

export const SalesForecastsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canMutate = isSuperAdmin || isExecutive || userDivision === 'SALES';
  const canApprove = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'SALES');

  const [page, setPage] = useState(1);
  const [yearFilter, setYearFilter] = useState<number>(now.getFullYear());
  const [monthFilter, setMonthFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [custFilter, setCustFilter] = useState('ALL');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesForecastPayload>(emptyDraft);
  const [deleteTarget, setDeleteTarget] = useState<SalesForecastRecord | null>(null);

  const [approvalTarget, setApprovalTarget] = useState<{
    record: SalesForecastRecord;
    action: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const { data: res, isLoading } = useQuery({
    queryKey: ['salesForecasts', page, yearFilter, monthFilter, statusFilter, custFilter],
    queryFn: () =>
      listSalesForecastsApi({
        page,
        limit: 20,
        periodYear: yearFilter || undefined,
        periodMonth: monthFilter > 0 ? monthFilter : undefined,
        status: statusFilter,
        customerId: custFilter,
      }),
  });
  const forecasts = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({
    queryKey: ['salesDropdownCustomers'],
    queryFn: listSalesDropdownCustomersApi,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['salesDropdownItems'],
    queryFn: listSalesDropdownItemsApi,
  });
  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['salesDropdownEmployees'],
    queryFn: listSalesDropdownEmployeesApi,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['salesForecasts'] });

  const saveMut = useMutation({
    mutationFn: async () => {
      const calcAmt = draft.forecastAmount && draft.forecastAmount > 0
        ? draft.forecastAmount
        : (Number(draft.forecastQty) || 0) * (Number(draft.estimatedUnitPrice) || 0);
      const payload: SalesForecastPayload = {
        ...draft,
        salesPersonId: draft.salesPersonId || undefined,
        itemId: draft.itemId || null,
        forecastAmount: calcAmt,
      };
      if (editingId) return updateSalesForecastApi(editingId, payload);
      return createSalesForecastApi(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Forecasting customer diperbarui' : 'Forecasting customer berhasil dibuat (6.5.1)');
      invalidate();
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan forecasting')),
  });

  const approveMut = useMutation({
    mutationFn: () => {
      if (!approvalTarget) throw new Error('Data forecast belum dipilih');
      return approveSalesForecastApi(approvalTarget.record.id, approvalTarget.action, approvalNotes || undefined);
    },
    onSuccess: () => {
      toast.success(`Forecasting berhasil di-${approvalTarget?.action} (6.5.2)`);
      invalidate();
      setApprovalTarget(null);
      setApprovalNotes('');
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal memproses approval forecasting')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSalesForecastApi(id),
    onSuccess: () => {
      toast.success('Forecasting berhasil dihapus');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus forecasting')),
  });

  // Page summary totals
  const totalForecast = forecasts.reduce((s, f) => s + f.forecastAmount, 0);
  const totalWeighted = forecasts.reduce((s, f) => s + f.weightedForecastAmount, 0);
  const totalActual = forecasts.reduce((s, f) => s + f.actualAmount, 0);
  const pendingCount = forecasts.filter((f) => f.status === 'PENDING_APPROVAL' || f.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Forecast</div>
          <div className="text-base font-black font-mono text-slate-900 mt-1">{formatIDR(totalForecast)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Weighted Forecast</div>
          <div className="text-base font-black font-mono text-blue-700 mt-1">{formatIDR(totalWeighted)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Realisasi Aktual</div>
          <div className="text-base font-black font-mono text-emerald-700 mt-1">{formatIDR(totalActual)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="text-[11px] font-bold text-amber-800 uppercase">Menunggu Approval (6.5.2)</div>
          <div className="text-base font-black font-mono text-amber-800 mt-1">{pendingCount} Baris</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(Number(e.target.value) || now.getFullYear());
              setPage(1);
            }}
            className="w-24 px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold"
          />
          <select
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <option value={0}>Semua Bulan</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={custFilter}
            onChange={(e) => {
              setCustFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold max-w-[200px]"
          >
            <option value="ALL">Semua Customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {canMutate && (
          <button
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft());
              setFormOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Forecasting Customer (6.5.1)</span>
          </button>
        )}
      </div>

      {/* Form */}
      {formOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.customerId) {
              toast.error('Customer wajib dipilih');
              return;
            }
            saveMut.mutate();
          }}
          className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-slate-900">
              {editingId ? 'Edit Forecasting Customer' : 'Input Forecasting Customer Baru (6.5.1)'}
            </h3>
            <button type="button" onClick={() => setFormOpen(false)} className="p-1 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Customer *</label>
              <select
                required
                disabled={Boolean(editingId)}
                value={draft.customerId}
                onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Produk / Item (Opsional)</label>
              <select
                value={draft.itemId || ''}
                onChange={(e) => {
                  const iid = e.target.value;
                  const it = items.find((x) => x.id === iid);
                  setDraft({
                    ...draft,
                    itemId: iid,
                    unit: it?.unit || draft.unit,
                    estimatedUnitPrice: it?.sellingPrice || draft.estimatedUnitPrice,
                    forecastAmount: (Number(draft.forecastQty) || 0) * (it?.sellingPrice || draft.estimatedUnitPrice),
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="">-- Umum / Multi Produk --</option>
                {items.map((it) => <option key={it.id} value={it.id}>[{it.code}] {it.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sales Person</label>
              <select
                value={draft.salesPersonId || ''}
                onChange={(e) => setDraft({ ...draft, salesPersonId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="">(Otomatis User Login)</option>
                {salesEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Periode (Bulan / Tahun) *</label>
              <div className="flex gap-1.5">
                <select value={draft.periodMonth} onChange={(e) => setDraft({ ...draft, periodMonth: Number(e.target.value) })} className="flex-1 px-2 py-2 rounded-xl border border-slate-300 bg-white">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" value={draft.periodYear} onChange={(e) => setDraft({ ...draft, periodYear: Number(e.target.value) || now.getFullYear() })} className="w-24 px-2 py-2 rounded-xl border border-slate-300 font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Forecast Qty &amp; Satuan</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={draft.forecastQty}
                  onChange={(e) => {
                    const q = Number(e.target.value) || 0;
                    setDraft({ ...draft, forecastQty: q, forecastAmount: q * (Number(draft.estimatedUnitPrice) || 0) });
                  }}
                  className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 font-mono"
                />
                <input type="text" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="w-20 px-2 py-2 rounded-xl border border-slate-300" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Est. Harga Satuan (IDR)</label>
              <input
                type="number"
                min={0}
                value={draft.estimatedUnitPrice}
                onChange={(e) => {
                  const p = Number(e.target.value) || 0;
                  setDraft({ ...draft, estimatedUnitPrice: p, forecastAmount: (Number(draft.forecastQty) || 0) * p });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nilai Forecast (IDR) &amp; Probabilitas (%)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={draft.forecastAmount || 0}
                  onChange={(e) => setDraft({ ...draft, forecastAmount: Number(e.target.value) || 0 })}
                  className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.probabilityPercent}
                  onChange={(e) => setDraft({ ...draft, probabilityPercent: Number(e.target.value) || 0 })}
                  className="w-16 px-2 py-2 rounded-xl border border-slate-300 font-mono"
                  title="Probabilitas %"
                />
              </div>
            </div>
            {editingId && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Actual Qty</label>
                  <input type="number" min={0} value={draft.actualQty || 0} onChange={(e) => setDraft({ ...draft, actualQty: Number(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Actual Amount (IDR)</label>
                  <input type="number" min={0} value={draft.actualAmount || 0} onChange={(e) => setDraft({ ...draft, actualAmount: Number(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono" />
                </div>
              </>
            )}
            <div className="sm:col-span-4">
              <label className="block font-bold text-slate-700 mb-1">Catatan Forecasting</label>
              <input type="text" value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
            <button type="submit" disabled={saveMut.isPending} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Forecasting</span>
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">No. &amp; Periode</th>
                <th className="p-3">Customer &amp; Sales</th>
                <th className="p-3">Produk &amp; Qty</th>
                <th className="p-3 text-right">Forecast / Weighted</th>
                <th className="p-3 text-right">Actual</th>
                <th className="p-3">Status (6.5.2)</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat Forecasting...</td></tr>
              ) : forecasts.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada data forecasting customer.</td></tr>
              ) : (
                forecasts.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70">
                    <td className="p-3">
                      <div className="font-mono font-bold text-blue-700">{f.forecastNumber}</div>
                      <div className="text-[11px] text-slate-500">{MONTHS[(f.periodMonth || 1) - 1]} {f.periodYear}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{f.customerName}</div>
                      <div className="text-[11px] text-slate-500">Sales: {f.salesPersonName}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{f.itemName || 'Semua Produk'}</div>
                      <div className="text-[11px] font-mono text-slate-500">{f.forecastQty} {f.unit} ({f.probabilityPercent}%)</div>
                    </td>
                    <td className="p-3 text-right font-mono">
                      <div className="font-bold text-slate-900">{formatIDR(f.forecastAmount)}</div>
                      <div className="text-[11px] text-blue-700">W: {formatIDR(f.weightedForecastAmount)}</div>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      {formatIDR(f.actualAmount)}
                    </td>
                    <td className="p-3 space-y-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          f.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {f.status}
                      </span>
                      {f.approvedBy && <div className="text-[10px] text-slate-500">oleh {f.approvedBy}</div>}
                      {canApprove && (f.status === 'PENDING_APPROVAL' || f.status === 'PENDING') && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setApprovalTarget({ record: f, action: 'APPROVE' })}
                            className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setApprovalTarget({ record: f, action: 'REJECT' })}
                            className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {canMutate && (
                          <button
                            onClick={() => {
                              setEditingId(f.id);
                              setDraft({
                                customerId: f.customerId,
                                salesPersonId: f.salesPersonId,
                                itemId: f.itemId || '',
                                periodYear: f.periodYear,
                                periodMonth: f.periodMonth,
                                forecastQty: f.forecastQty,
                                unit: f.unit,
                                estimatedUnitPrice: f.estimatedUnitPrice,
                                forecastAmount: f.forecastAmount,
                                actualQty: f.actualQty,
                                actualAmount: f.actualAmount,
                                probabilityPercent: f.probabilityPercent,
                                notes: f.notes || '',
                              });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canMutate && (
                          <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong></span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Sebelumnya</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Selanjutnya</button>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {approvalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                {approvalTarget.action === 'APPROVE' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                <span>6.5.2 {approvalTarget.action} Forecasting Customer</span>
              </h3>
              <button onClick={() => setApprovalTarget(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-xs bg-slate-50 p-3 rounded-xl">
              <div><strong>No:</strong> {approvalTarget.record.forecastNumber}</div>
              <div><strong>Customer:</strong> {approvalTarget.record.customerName}</div>
              <div><strong>Nilai Forecast:</strong> {formatIDR(approvalTarget.record.forecastAmount)}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Approval</label>
              <textarea rows={2} value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setApprovalTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
              <button
                disabled={approveMut.isPending}
                onClick={() => approveMut.mutate()}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 ${
                  approvalTarget.action === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {approveMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Konfirmasi {approvalTarget.action}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Forecasting"
        message={`Yakin ingin menghapus forecasting ${deleteTarget?.forecastNumber || ''}?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
};

