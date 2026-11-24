import React, { useState } from 'react';
import {
  RefreshCw,
  Plus,
  Printer,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  Wallet,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  previewSalesCommissionSyncApi,
  syncSalesCommissionApi,
  listSalesCommissionsV2Api,
  createSalesCommissionV2Api,
  updateSalesCommissionV2Api,
  deleteSalesCommissionV2Api,
  printSalesCommissionV2Api,
  listSalesDropdownEmployeesApi,
  extractSalesErrorMessage,
  SalesCommissionSyncParams,
  SalesCommissionSyncPreview,
  SalesCommissionManualPayload,
  SalesCommissionRecordV2,
} from '../../services/salesService';
import { approveSalesCommissionApi, markPaidSalesCommissionApi } from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const now = new Date();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const emptySyncForm = (): SalesCommissionSyncParams => ({
  employeeId: '',
  periodMonth: now.getMonth() + 1,
  periodYear: now.getFullYear(),
  existingSalesRate: 1.0,
  newCustomerRate: 2.0,
  bonusPerNewCustomer: 0,
  targetAchievementBonus: 0,
  deductionAmount: 0,
  notes: '',
});

const emptyManualDraft = (): SalesCommissionManualPayload => ({
  employeeId: '',
  periodMonth: now.getMonth() + 1,
  periodYear: now.getFullYear(),
  existingSalesAmount: 0,
  existingSalesRate: 1.0,
  newCustomerSalesAmount: 0,
  newCustomerRate: 2.0,
  newCustomerCount: 0,
  bonusAmount: 0,
  deductionAmount: 0,
  notes: '',
});

export const SalesCommissionsAutoSyncTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canMutate = isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'FINANCE';
  const canApprovePay = isSuperAdmin || isExecutive || userDivision === 'FINANCE';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [empFilter, setEmpFilter] = useState('ALL');

  // Auto-Sync State
  const [syncOpen, setSyncOpen] = useState(true);
  const [syncForm, setSyncForm] = useState<SalesCommissionSyncParams>(emptySyncForm);
  const [previewData, setPreviewData] = useState<SalesCommissionSyncPreview | null>(null);

  // Manual Form State
  const [manualOpen, setManualOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualDraft, setManualDraft] = useState<SalesCommissionManualPayload>(emptyManualDraft);
  const [deleteTarget, setDeleteTarget] = useState<SalesCommissionRecordV2 | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['salesCommissionsV2', page, statusFilter, empFilter],
    queryFn: () =>
      listSalesCommissionsV2Api({
        page,
        limit: 20,
        status: statusFilter,
        employeeId: empFilter,
      }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['salesDropdownEmployees'],
    queryFn: listSalesDropdownEmployeesApi,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['salesCommissionsV2'] });
    queryClient.invalidateQueries({ queryKey: ['financeCommissions'] });
  };

  const previewMut = useMutation({
    mutationFn: () => {
      if (!syncForm.employeeId) throw new Error('Pilih Sales Person terlebih dahulu');
      return previewSalesCommissionSyncApi(syncForm);
    },
    onSuccess: (data) => {
      setPreviewData(data);
      toast.success('Preview sinkronisasi komisi dari SDA & Penjualan berhasil dihitung');
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghitung preview komisi')),
  });

  const syncMut = useMutation({
    mutationFn: () => {
      if (!syncForm.employeeId) throw new Error('Pilih Sales Person terlebih dahulu');
      return syncSalesCommissionApi(syncForm);
    },
    onSuccess: () => {
      toast.success('Komisi Sales berhasil disinkronisasi & disimpan otomatis dari SDA!');
      invalidate();
      setPreviewData(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyinkronkan komisi')),
  });

  const saveManualMut = useMutation({
    mutationFn: async () => {
      if (editingId) return updateSalesCommissionV2Api(editingId, manualDraft);
      return createSalesCommissionV2Api(manualDraft);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Data komisi diperbarui' : 'Data komisi manual disimpan');
      invalidate();
      setManualOpen(false);
      setEditingId(null);
      setManualDraft(emptyManualDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan komisi')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSalesCommissionV2Api(id),
    onSuccess: () => {
      toast.success('Data komisi dihapus');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus komisi')),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveSalesCommissionApi(id),
    onSuccess: () => {
      toast.success('Komisi disetujui (APPROVED)');
      invalidate();
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal approve komisi')),
  });

  const paidMut = useMutation({
    mutationFn: (id: string) => markPaidSalesCommissionApi(id),
    onSuccess: () => {
      toast.success('Komisi ditandai PAID');
      invalidate();
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menandai komisi PAID')),
  });

  return (
    <div className="space-y-4">
      {/* AUTO-SYNC PANEL (6.3 — Sync dari SDA & Penjualan) */}
      {canMutate && (
        <div className="bg-white rounded-2xl border-2 border-purple-200 overflow-hidden shadow-xs">
          <div className="bg-purple-50/70 px-4 py-3 border-b border-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs sm:text-sm font-black text-purple-950">
                6.3 Sinkronisasi Otomatis Komisi Sales dari Kinerja Harian (SDA) &amp; Invoice
              </h3>
            </div>
            <button
              onClick={() => setSyncOpen((v) => !v)}
              className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
            >
              {syncOpen ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>

          {syncOpen && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sales Person *</label>
                  <select
                    value={syncForm.employeeId}
                    onChange={(e) => setSyncForm({ ...syncForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">-- Pilih Sales Person --</option>
                    {salesEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.fullName} {emp.nik ? `(${emp.nik})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Periode Bulan &amp; Tahun</label>
                  <div className="flex gap-1.5">
                    <select
                      value={syncForm.periodMonth}
                      onChange={(e) => setSyncForm({ ...syncForm, periodMonth: Number(e.target.value) })}
                      className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <input
                      type="number"
                      value={syncForm.periodYear}
                      onChange={(e) => setSyncForm({ ...syncForm, periodYear: Number(e.target.value) || now.getFullYear() })}
                      className="w-24 px-2.5 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rate Existing (%) / New Cust (%)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={syncForm.existingSalesRate}
                      onChange={(e) => setSyncForm({ ...syncForm, existingSalesRate: Number(e.target.value) || 0 })}
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={syncForm.newCustomerRate}
                      onChange={(e) => setSyncForm({ ...syncForm, newCustomerRate: Number(e.target.value) || 0 })}
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bonus / New Cust &amp; Bonus Target</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={0}
                      placeholder="Per New"
                      value={syncForm.bonusPerNewCustomer}
                      onChange={(e) => setSyncForm({ ...syncForm, bonusPerNewCustomer: Number(e.target.value) || 0 })}
                      className="w-1/2 px-2 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Target"
                      value={syncForm.targetAchievementBonus}
                      onChange={(e) => setSyncForm({ ...syncForm, targetAchievementBonus: Number(e.target.value) || 0 })}
                      className="w-1/2 px-2 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <label className="font-bold text-slate-600">Potongan (IDR):</label>
                  <input
                    type="number"
                    min={0}
                    value={syncForm.deductionAmount}
                    onChange={(e) => setSyncForm({ ...syncForm, deductionAmount: Number(e.target.value) || 0 })}
                    className="w-36 px-2.5 py-1.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={previewMut.isPending}
                    onClick={() => previewMut.mutate()}
                    className="px-4 py-2 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {previewMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Preview Sinkronisasi</span>
                  </button>
                  <button
                    type="button"
                    disabled={syncMut.isPending}
                    onClick={() => syncMut.mutate()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {syncMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Sinkronisasi &amp; Simpan</span>
                  </button>
                </div>
              </div>

              {/* Preview Box */}
              {previewData && (
                <div className="p-4 rounded-xl bg-slate-50 border border-purple-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-black text-purple-900 uppercase text-[11px]">Ringkasan SDA ({previewData.sourceMode})</div>
                    <div>Hari Lapor: <strong>{previewData.sdaSummary.totalDaysReported}</strong></div>
                    <div>Target SDA: <strong className="font-mono">{formatIDR(previewData.sdaSummary.targetSalesAmount)}</strong></div>
                    <div>Actual SDA: <strong className="font-mono">{formatIDR(previewData.sdaSummary.actualSalesAmount)}</strong> ({previewData.sdaSummary.achievementPercent}%)</div>
                    <div>Visit/Call/NewCo: <strong>{previewData.sdaSummary.visitingCount} / {previewData.sdaSummary.callingCount} / {previewData.sdaSummary.newCompanyCount}</strong></div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-black text-slate-800 uppercase text-[11px]">Rincian Komisi</div>
                    <div>Existing ({previewData.existingSalesRate}%): <strong className="font-mono">{formatIDR(previewData.existingSalesCommission)}</strong></div>
                    <div>New Cust ({previewData.newCustomerRate}% × {previewData.newCustomerCount} klien): <strong className="font-mono">{formatIDR(previewData.newCustomerCommission)}</strong></div>
                    <div>Bonus: <strong className="font-mono text-emerald-700">{formatIDR(previewData.bonusAmount)}</strong></div>
                    <div>Potongan: <strong className="font-mono text-rose-600">-{formatIDR(previewData.deductionAmount)}</strong></div>
                  </div>
                  <div className="flex flex-col justify-center items-end bg-white p-3 rounded-xl border border-purple-200">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Total Estimasi Komisi</div>
                    <div className="text-lg font-black font-mono text-purple-700">{formatIDR(previewData.totalCommission)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={empFilter} onChange={(e) => { setEmpFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold">
            <option value="ALL">Semua Sales Person</option>
            {salesEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold">
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
        {canMutate && (
          <button
            onClick={() => {
              setEditingId(null);
              setManualDraft(emptyManualDraft());
              setManualOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Komisi Manual</span>
          </button>
        )}
      </div>

      {/* Manual Form */}
      {manualOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!manualDraft.employeeId) {
              toast.error('Pilih Sales Person');
              return;
            }
            saveManualMut.mutate();
          }}
          className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-slate-900">{editingId ? 'Edit Komisi Sales' : 'Input Komisi Sales Manual (6.3)'}</h3>
            <button type="button" onClick={() => setManualOpen(false)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sales Person *</label>
              <select
                required
                disabled={Boolean(editingId)}
                value={manualDraft.employeeId}
                onChange={(e) => setManualDraft({ ...manualDraft, employeeId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="">-- Pilih Sales --</option>
                {salesEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Periode (Bulan / Tahun)</label>
              <div className="flex gap-1.5">
                <select value={manualDraft.periodMonth} onChange={(e) => setManualDraft({ ...manualDraft, periodMonth: Number(e.target.value) })} className="flex-1 px-2 py-2 rounded-xl border border-slate-300 bg-white">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" value={manualDraft.periodYear} onChange={(e) => setManualDraft({ ...manualDraft, periodYear: Number(e.target.value) || now.getFullYear() })} className="w-24 px-2 py-2 rounded-xl border border-slate-300 font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Existing Sales (IDR) &amp; Rate (%)</label>
              <div className="flex gap-1.5">
                <input type="number" min={0} value={manualDraft.existingSalesAmount} onChange={(e) => setManualDraft({ ...manualDraft, existingSalesAmount: Number(e.target.value) || 0 })} className="flex-1 px-2 py-2 rounded-xl border border-slate-300 font-mono" />
                <input type="number" step="0.1" min={0} value={manualDraft.existingSalesRate} onChange={(e) => setManualDraft({ ...manualDraft, existingSalesRate: Number(e.target.value) || 0 })} className="w-16 px-2 py-2 rounded-xl border border-slate-300 font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">New Cust Sales (IDR) &amp; Rate (%)</label>
              <div className="flex gap-1.5">
                <input type="number" min={0} value={manualDraft.newCustomerSalesAmount} onChange={(e) => setManualDraft({ ...manualDraft, newCustomerSalesAmount: Number(e.target.value) || 0 })} className="flex-1 px-2 py-2 rounded-xl border border-slate-300 font-mono" />
                <input type="number" step="0.1" min={0} value={manualDraft.newCustomerRate} onChange={(e) => setManualDraft({ ...manualDraft, newCustomerRate: Number(e.target.value) || 0 })} className="w-16 px-2 py-2 rounded-xl border border-slate-300 font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Jml New Customer</label>
              <input type="number" min={0} value={manualDraft.newCustomerCount} onChange={(e) => setManualDraft({ ...manualDraft, newCustomerCount: Number(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bonus (IDR)</label>
              <input type="number" min={0} value={manualDraft.bonusAmount} onChange={(e) => setManualDraft({ ...manualDraft, bonusAmount: Number(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Potongan (IDR)</label>
              <input type="number" min={0} value={manualDraft.deductionAmount} onChange={(e) => setManualDraft({ ...manualDraft, deductionAmount: Number(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Catatan</label>
              <input type="text" value={manualDraft.notes || ''} onChange={(e) => setManualDraft({ ...manualDraft, notes: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setManualOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
            <button type="submit" disabled={saveManualMut.isPending} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5">
              {saveManualMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Komisi</span>
            </button>
          </div>
        </form>
      )}

      {/* Commission Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">No. Komisi &amp; Periode</th>
                <th className="p-3">Sales Person</th>
                <th className="p-3 text-right">Existing Sales</th>
                <th className="p-3 text-right">New Customer</th>
                <th className="p-3 text-right">Bonus / Potongan</th>
                <th className="p-3 text-right">Total Komisi</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat Komisi Sales...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Belum ada data komisi sales.</td></tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="p-3">
                      <div className="font-mono font-bold text-blue-700">{c.commissionNumber}</div>
                      <div className="text-[11px] text-slate-500">{MONTHS[(c.periodMonth || 1) - 1]} {c.periodYear}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{c.employeeName}</div>
                      {c.notes && <div className="text-[11px] text-slate-500 max-w-xs truncate">{c.notes}</div>}
                    </td>
                    <td className="p-3 text-right font-mono">
                      <div>{formatIDR(c.existingSalesAmount)}</div>
                      <div className="text-[11px] text-emerald-700">({c.existingSalesRate}%) = {formatIDR(c.existingSalesCommission)}</div>
                    </td>
                    <td className="p-3 text-right font-mono">
                      <div>{formatIDR(c.newCustomerSalesAmount)} ({c.newCustomerCount} klien)</div>
                      <div className="text-[11px] text-emerald-700">({c.newCustomerRate}%) = {formatIDR(c.newCustomerCommission)}</div>
                    </td>
                    <td className="p-3 text-right font-mono">
                      <div className="text-emerald-700">+{formatIDR(c.bonusAmount)}</div>
                      {c.deductionAmount > 0 && <div className="text-rose-600">-{formatIDR(c.deductionAmount)}</div>}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-purple-800">{formatIDR(c.totalCommission)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          c.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => printSalesCommissionV2Api(c.id).catch((e) => toast.error(extractSalesErrorMessage(e)))}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          title="Cetak Slip Komisi"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canApprovePay && c.status === 'DRAFT' && (
                          <button onClick={() => approveMut.mutate(c.id)} className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 cursor-pointer" title="Approve Finance">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {canApprovePay && c.status === 'APPROVED' && (
                          <button onClick={() => paidMut.mutate(c.id)} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Tandai PAID">
                            <Wallet className="w-4 h-4" />
                          </button>
                        )}
                        {canMutate && c.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setManualDraft({
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
                              setManualOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canMutate && c.status !== 'PAID' && (
                          <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer">
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

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Komisi Sales"
        message={`Yakin ingin menghapus data komisi ${deleteTarget?.commissionNumber || ''}?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
};

