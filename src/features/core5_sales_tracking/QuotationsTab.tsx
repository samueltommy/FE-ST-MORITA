import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Save,
  X,
  Printer,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesQuotationsApi,
  createSalesQuotationApi,
  updateSalesQuotationApi,
  deleteSalesQuotationApi,
  confirmQuotationManagerApi,
  confirmQuotationCostControlApi,
  printSalesQuotationApi,
  listSalesDropdownCustomersApi,
  listSalesDropdownItemsApi,
  listSalesDropdownEmployeesApi,
  extractSalesErrorMessage,
  SalesQuotationRecord,
  SalesQuotationPayload,
  QuotationItemPayload,
} from '../../services/salesService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

const addDaysStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const emptyQuotationDraft = (): SalesQuotationPayload => ({
  customerId: '',
  salesPersonId: '',
  date: todayStr(),
  validUntilDate: addDaysStr(14),
  currency: 'IDR',
  paymentTerm: 'NET 30',
  deliveryTerm: 'FRANCO PABRIK',
  taxIncluded: false,
  taxRate: 11,
  freightCost: 0,
  notes: '',
  items: [{ itemId: '', qty: 1, unitPrice: 0, discountPercent: 0, hppUnitCost: 0 }],
});

export const QuotationsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision, hasPermission } = useRBAC();

  const canCreateEdit = isSuperAdmin || isExecutive || userDivision === 'SALES';
  const canConfirmManager = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'SALES');
  const canConfirmCostControl =
    isSuperAdmin || isExecutive || userDivision === 'FINANCE' || hasPermission('cost_control:margin:approve');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesQuotationPayload>(emptyQuotationDraft);
  const [deleteTarget, setDeleteTarget] = useState<SalesQuotationRecord | null>(null);

  // Approval dialog state
  const [approvalModal, setApprovalModal] = useState<{
    quotation: SalesQuotationRecord;
    stage: 'MANAGER' | 'COST_CONTROL';
    action: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [creditOverride, setCreditOverride] = useState('');

  const { data: res, isLoading } = useQuery({
    queryKey: ['salesQuotations', page, search, statusFilter],
    queryFn: () =>
      listSalesQuotationsApi({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      }),
  });
  const quotations = res?.data || [];
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['salesQuotations'] });
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const cleanItems = draft.items.filter((i) => i.itemId);
      if (cleanItems.length === 0) throw new Error('Minimal 1 item produk harus dipilih');
      const payload: SalesQuotationPayload = {
        ...draft,
        salesPersonId: draft.salesPersonId || undefined,
        items: cleanItems,
      };
      if (editingId) return updateSalesQuotationApi(editingId, payload);
      return createSalesQuotationApi(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Quotation berhasil diperbarui' : 'Quotation baru berhasil dibuat');
      invalidate();
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyQuotationDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan quotation')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSalesQuotationApi(id),
    onSuccess: () => {
      toast.success('Quotation berhasil dibatalkan/dihapus');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus quotation')),
  });

  const approvalMut = useMutation({
    mutationFn: async () => {
      if (!approvalModal) return;
      const { quotation, stage, action } = approvalModal;
      if (stage === 'MANAGER') {
        return confirmQuotationManagerApi(quotation.id, { action, notes: approvalNotes || undefined });
      }
      return confirmQuotationCostControlApi(quotation.id, {
        action,
        notes: approvalNotes || undefined,
        costControlNotes: approvalNotes || undefined,
        adjustedCreditLimitOverride: creditOverride ? Number(creditOverride) : null,
      });
    },
    onSuccess: () => {
      toast.success(
        approvalModal?.stage === 'MANAGER'
          ? `Konfirmasi Manager Marketing (${approvalModal.action}) berhasil`
          : `Konfirmasi Cost Control (${approvalModal?.action}) berhasil`
      );
      invalidate();
      setApprovalModal(null);
      setApprovalNotes('');
      setCreditOverride('');
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal memproses konfirmasi quotation')),
  });

  // Live calculation for form
  const calcLines = draft.items.reduce(
    (acc, it) => {
      const gross = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
      const disc = gross * ((Number(it.discountPercent) || 0) / 100);
      const net = gross - disc;
      const hpp = (Number(it.qty) || 0) * (Number(it.hppUnitCost) || 0);
      return {
        subtotal: acc.subtotal + net,
        totalHpp: acc.totalHpp + hpp,
      };
    },
    { subtotal: 0, totalHpp: 0 }
  );
  const taxAmt = draft.taxIncluded ? 0 : calcLines.subtotal * ((Number(draft.taxRate) || 0) / 100);
  const grandTotal = calcLines.subtotal + taxAmt + (Number(draft.freightCost) || 0);
  const marginPct =
    calcLines.subtotal > 0 ? Number((((calcLines.subtotal - calcLines.totalHpp) / calcLines.subtotal) * 100).toFixed(2)) : 0;

  const updateLine = (idx: number, patch: Partial<QuotationItemPayload>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };

  const handleSelectItem = (idx: number, itemId: string) => {
    const found = items.find((x) => x.id === itemId);
    updateLine(idx, {
      itemId,
      unitPrice: found?.sellingPrice || 0,
      hppUnitCost: found?.hppCost || 0,
    });
  };

  const openEdit = (q: SalesQuotationRecord) => {
    setEditingId(q.id);
    setDraft({
      customerId: q.customerId,
      salesPersonId: q.salesPersonId || '',
      date: q.date,
      validUntilDate: q.validUntilDate || addDaysStr(14),
      currency: q.currency || 'IDR',
      paymentTerm: q.paymentTerm || 'NET 30',
      deliveryTerm: q.deliveryTerm || '',
      taxIncluded: q.taxIncluded,
      taxRate: q.taxRate,
      freightCost: q.freightCost,
      notes: q.notes || '',
      items:
        q.items.length > 0
          ? q.items.map((it) => ({
              itemId: it.itemId,
              qty: it.qty,
              unitPrice: it.unitPrice,
              discountPercent: it.discountPercent,
              hppUnitCost: it.hppUnitCost,
            }))
          : [{ itemId: '', qty: 1, unitPrice: 0, discountPercent: 0, hppUnitCost: 0 }],
    });
    setFormOpen(true);
  };

  const badgeTone = (st: string) => {
    const s = st.toUpperCase();
    if (s.includes('APPROVED')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('REJECTED')) return 'bg-rose-100 text-rose-800';
    if (s.includes('PENDING')) return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Info Banner 5.1 */}
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Alur Penawaran 3-Tahap (5.1.1 → 5.1.2 → 5.1.3):</strong> Input Quotation oleh Sales → Konfirmasi Manager
          Marketing → Konfirmasi Cost Control (Validasi Margin HPP & Plafon Kredit) → Cetak Quotation Resmi.
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nomor quotation / customer..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING_MANAGER">Pending Manager</option>
            <option value="PENDING_COST_CONTROL">Pending Cost Control</option>
            <option value="APPROVED">Approved Resmi</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {canCreateEdit && (
          <button
            onClick={() => {
              setEditingId(null);
              setDraft(emptyQuotationDraft());
              setFormOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Quotation Baru (5.1.1)</span>
          </button>
        )}
      </div>

      {/* Form Create/Edit Quotation */}
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
              {editingId ? 'Edit Quotation' : 'Input New Quotation (5.1.1)'}
            </h3>
            <button type="button" onClick={() => setFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer *</label>
              <select
                required
                value={draft.customerId}
                onChange={(e) => {
                  const cid = e.target.value;
                  const cust = customers.find((c) => c.id === cid);
                  setDraft({ ...draft, customerId: cid, paymentTerm: cust?.paymentTerm || draft.paymentTerm });
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sales Person</label>
              <select
                value={draft.salesPersonId || ''}
                onChange={(e) => setDraft({ ...draft, salesPersonId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="">(Otomatis User Login)</option>
                {salesEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mata Uang</label>
              <select
                value={draft.currency || 'IDR'}
                onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Quotation</label>
              <input
                type="date"
                value={draft.date || todayStr()}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Berlaku Sampai</label>
              <input
                type="date"
                value={draft.validUntilDate || ''}
                onChange={(e) => setDraft({ ...draft, validUntilDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Term</label>
              <input
                type="text"
                value={draft.paymentTerm || ''}
                onChange={(e) => setDraft({ ...draft, paymentTerm: e.target.value })}
                placeholder="NET 30"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Term</label>
              <input
                type="text"
                value={draft.deliveryTerm || ''}
                onChange={(e) => setDraft({ ...draft, deliveryTerm: e.target.value })}
                placeholder="FRANCO / FOB"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          {/* Item Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase">Daftar Item Penawaran</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    items: [...prev.items, { itemId: '', qty: 1, unitPrice: 0, discountPercent: 0, hppUnitCost: 0 }],
                  }))
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 text-left min-w-[220px]">Produk / Item</th>
                    <th className="p-2 text-right w-24">Qty</th>
                    <th className="p-2 text-right w-32">Harga Satuan</th>
                    <th className="p-2 text-right w-24">Disc (%)</th>
                    <th className="p-2 text-right w-32">HPP Unit</th>
                    <th className="p-2 text-right w-32">Subtotal</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draft.items.map((line, idx) => {
                    const sub = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0) * (1 - (Number(line.discountPercent) || 0) / 100);
                    return (
                      <tr key={idx}>
                        <td className="p-2">
                          <select
                            required
                            value={line.itemId}
                            onChange={(e) => handleSelectItem(idx, e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          >
                            <option value="">-- Pilih Produk --</option>
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                [{it.code}] {it.name} ({it.unit})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0.01}
                            step="any"
                            value={line.qty}
                            onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            value={line.discountPercent || 0}
                            onChange={(e) => updateLine(idx, { discountPercent: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={line.hppUnitCost || 0}
                            onChange={(e) => updateLine(idx, { hppUnitCost: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-800">{formatIDR(sub)}</td>
                        <td className="p-2 text-center">
                          {draft.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  items: prev.items.filter((_, i) => i !== idx),
                                }))
                              }
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary & Margin Indicator */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PPN (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={draft.taxRate ?? 11}
                  onChange={(e) => setDraft({ ...draft, taxRate: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ongkos Kirim (Freight)</label>
                <input
                  type="number"
                  min={0}
                  value={draft.freightCost || 0}
                  onChange={(e) => setDraft({ ...draft, freightCost: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.taxIncluded)}
                    onChange={(e) => setDraft({ ...draft, taxIncluded: e.target.checked })}
                  />
                  <span>Harga Sudah Termasuk PPN</span>
                </label>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Quotation</label>
                <input
                  type="text"
                  value={draft.notes || ''}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-mono font-bold">{formatIDR(calcLines.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PPN ({draft.taxIncluded ? 'Incl' : `${draft.taxRate}%`}):</span>
                <span className="font-mono">{formatIDR(taxAmt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Freight:</span>
                <span className="font-mono">{formatIDR(draft.freightCost || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono">{formatIDR(grandTotal)}</span>
              </div>
              <div
                className={`mt-2 px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-between ${
                  marginPct < 18 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <span>Estimasi Gross Margin:</span>
                <span className="font-mono">{marginPct}%</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{editingId ? 'Simpan Perubahan' : 'Ajukan Quotation'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3">No. Quotation & Tgl</th>
                <th className="p-3">Customer & Sales</th>
                <th className="p-3 text-right">Grand Total & Margin</th>
                <th className="p-3">Approval 5.1.2 (Mgr)</th>
                <th className="p-3">Approval 5.1.3 (Cost Ctrl)</th>
                <th className="p-3">Status Akhir</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat daftar quotation...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Belum ada data quotation.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => {
                  const isExp = expandedId === q.id;
                  return (
                    <React.Fragment key={q.id}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <button
                            onClick={() => setExpandedId(isExp ? null : q.id)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                          >
                            {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-blue-700">{q.quotationNumber}</div>
                          <div className="text-[11px] text-slate-500">
                            Tgl: {q.date} {q.validUntilDate ? `• s/d ${q.validUntilDate}` : ''}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{q.customerName}</div>
                          <div className="text-[11px] text-slate-500">Sales: {q.salesPersonName} • {q.paymentTerm}</div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-mono font-bold text-slate-900">{formatIDR(q.grandTotalAmount)}</div>
                          <div
                            className={`text-[11px] font-mono font-bold ${
                              q.estimatedMarginPercent < 18 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            Margin: {q.estimatedMarginPercent}%
                          </div>
                        </td>
                        <td className="p-3 space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeTone(q.managerStatus)}`}>
                            {q.managerStatus}
                          </span>
                          {q.managerApprovedBy && (
                            <div className="text-[10px] text-slate-500">oleh {q.managerApprovedBy}</div>
                          )}
                          {canConfirmManager && q.managerStatus === 'PENDING' && (
                            <div className="flex gap-1 pt-0.5">
                              <button
                                onClick={() => setApprovalModal({ quotation: q, stage: 'MANAGER', action: 'APPROVE' })}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setApprovalModal({ quotation: q, stage: 'MANAGER', action: 'REJECT' })}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3 space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeTone(q.costControlStatus)}`}>
                            {q.costControlStatus}
                          </span>
                          {q.costControlApprovedBy && (
                            <div className="text-[10px] text-slate-500">oleh {q.costControlApprovedBy}</div>
                          )}
                          {canConfirmCostControl && q.costControlStatus === 'PENDING' && (
                            <div className="flex gap-1 pt-0.5">
                              <button
                                onClick={() => setApprovalModal({ quotation: q, stage: 'COST_CONTROL', action: 'APPROVE' })}
                                className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Validasi
                              </button>
                              <button
                                onClick={() => setApprovalModal({ quotation: q, stage: 'COST_CONTROL', action: 'REJECT' })}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${badgeTone(q.status)}`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() =>
                                printSalesQuotationApi(q.id).catch((e) => toast.error(extractSalesErrorMessage(e)))
                              }
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                              title="Cetak Quotation (HTML/PDF)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canCreateEdit && q.status !== 'APPROVED' && (
                              <button
                                onClick={() => openEdit(q)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Edit Quotation"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canCreateEdit && (
                              <button
                                onClick={() => setDeleteTarget(q)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Hapus Quotation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExp && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="p-4">
                            <div className="space-y-2">
                              <div className="text-xs font-bold text-slate-700">Detail Item Quotation ({q.items.length} baris):</div>
                              <table className="w-full text-xs bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-100 text-slate-700 font-bold">
                                  <tr>
                                    <th className="p-2 text-left">Kode</th>
                                    <th className="p-2 text-left">Nama Produk</th>
                                    <th className="p-2 text-right">Qty</th>
                                    <th className="p-2 text-right">Harga Satuan</th>
                                    <th className="p-2 text-right">Disc</th>
                                    <th className="p-2 text-right">HPP</th>
                                    <th className="p-2 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {q.items.map((it) => (
                                    <tr key={it.id}>
                                      <td className="p-2 font-mono">{it.itemCode || '-'}</td>
                                      <td className="p-2 font-semibold">{it.itemName || it.itemId}</td>
                                      <td className="p-2 text-right font-mono">{it.qty} {it.unit || ''}</td>
                                      <td className="p-2 text-right font-mono">{formatIDR(it.unitPrice)}</td>
                                      <td className="p-2 text-right font-mono">{it.discountPercent}%</td>
                                      <td className="p-2 text-right font-mono">{formatIDR(it.hppUnitCost)}</td>
                                      <td className="p-2 text-right font-mono font-bold">{formatIDR(it.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {(q.managerNotes || q.costControlNotes || q.notes) && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] pt-1">
                                  {q.notes && <div className="p-2 rounded bg-white border border-slate-200"><strong>Catatan Sales:</strong> {q.notes}</div>}
                                  {q.managerNotes && <div className="p-2 rounded bg-blue-50 border border-blue-200"><strong>Catatan Manager:</strong> {q.managerNotes}</div>}
                                  {q.costControlNotes && <div className="p-2 rounded bg-amber-50 border border-amber-200"><strong>Catatan Cost Control:</strong> {q.costControlNotes}</div>}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                {approvalModal.action === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <span>
                  {approvalModal.stage === 'MANAGER' ? '5.1.2 Konfirmasi Manager Marketing' : '5.1.3 Konfirmasi Cost Control'} (
                  {approvalModal.action})
                </span>
              </h3>
              <button onClick={() => setApprovalModal(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
              <div><strong>No. Quotation:</strong> {approvalModal.quotation.quotationNumber}</div>
              <div><strong>Customer:</strong> {approvalModal.quotation.customerName}</div>
              <div><strong>Nilai:</strong> {formatIDR(approvalModal.quotation.grandTotalAmount)} (Margin {approvalModal.quotation.estimatedMarginPercent}%)</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Persetujuan / Penolakan</label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Masukkan catatan evaluasi margin / harga..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              {approvalModal.stage === 'COST_CONTROL' && approvalModal.action === 'APPROVE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Override Plafon Kredit (Opsional, IDR)</label>
                  <input
                    type="number"
                    min={0}
                    value={creditOverride}
                    onChange={(e) => setCreditOverride(e.target.value)}
                    placeholder="Kosongkan jika pakai plafon default customer"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setApprovalModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                disabled={approvalMut.isPending}
                onClick={() => approvalMut.mutate()}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 ${
                  approvalModal.action === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {approvalMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Konfirmasi {approvalModal.action}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Quotation"
        message={`Yakin ingin membatalkan/menghapus quotation ${deleteTarget?.quotationNumber || ''}?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
};

