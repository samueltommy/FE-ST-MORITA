import React, { useState } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Printer,
  Save,
  X,
  Send,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProductionPlansApi,
  createProductionPlanApi,
  updateProductionPlanApi,
  deleteProductionPlanApi,
  issueSpkApi,
  listAvailableStocksForSpkApi,
  listProductionOperatorsApi,
  printProductionHtmlReport,
  extractProductionError,
  ProductionPlanPayload,
} from '../../services/productionService';
import { listMdmItemsApi } from '../../services/financeService';
import type { ProductionPlan, BOMAllocationItem } from '../../types/productionQc';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

interface PlanDraft {
  itemId: string;
  targetQty: number;
  planDate: string;
  scheduledEndDate: string;
  machineLine: string;
  operatorId: string;
  notes: string;
  bomAllocations: BOMAllocationItem[];
}

const emptyDraft = (): PlanDraft => ({
  itemId: '',
  targetQty: 100,
  planDate: todayStr(),
  scheduledEndDate: '',
  machineLine: '',
  operatorId: '',
  notes: '',
  bomAllocations: [],
});

export const ProductionPlansTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canWritePlan = isSuperAdmin || isExecutive || userDivision === 'WAREHOUSE_PPIC' || userDivision === 'PRODUKSI_QC';
  const canIssueSpk = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [spkOnly, setSpkOnly] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Inline Issue SPK bar state
  const [issuingPlanId, setIssuingPlanId] = useState<string | null>(null);
  const [issueDraft, setIssueDraft] = useState({ operatorId: '', machineLine: '', notes: '' });

  const [voidTarget, setVoidTarget] = useState<ProductionPlan | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['productionPlans', page, search, statusFilter, spkOnly],
    queryFn: () =>
      listProductionPlansApi({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        spkOnly,
      }),
  });
  const plans = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: operators = [] } = useQuery({ queryKey: ['productionOperatorsDropdown'], queryFn: listProductionOperatorsApi });
  const { data: availableStocks = [] } = useQuery({
    queryKey: ['availableStocksForSpk'],
    queryFn: listAvailableStocksForSpkApi,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['productionPlans'] });
    queryClient.invalidateQueries({ queryKey: ['productionPlansDropdown'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const handleErr = (err: any, fallback: string) => {
    const { message, isHoldLockout } = extractProductionError(err, fallback);
    if (isHoldLockout) {
      toast.error(`HOLD LOCKOUT (4.5.3): ${message}`, { duration: 6000 });
    } else {
      toast.error(message);
    }
  };

  const createMut = useMutation({
    mutationFn: (p: ProductionPlanPayload) => createProductionPlanApi(p),
    onSuccess: () => {
      toast.success('Production Plan berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal menyimpan Production Plan'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<ProductionPlanPayload> }) => updateProductionPlanApi(id, p),
    onSuccess: () => {
      toast.success('Production Plan berhasil diperbarui');
      setEditingId(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui Production Plan'),
  });

  const issueSpkMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: { operatorId?: string | null; machineLine?: string | null; notes?: string | null } }) =>
      issueSpkApi(id, p),
    onSuccess: () => {
      toast.success('SPK berhasil diterbitkan');
      setIssuingPlanId(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal menerbitkan SPK'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProductionPlanApi(id),
    onSuccess: () => {
      toast.success('Production Plan / SPK berhasil dibatalkan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal membatalkan Production Plan'),
  });

  const handleSave = () => {
    if (!draft.itemId) return toast.error('Produk/Item Finish Good wajib dipilih');
    if (!draft.targetQty || draft.targetQty <= 0) return toast.error('Target Qty harus > 0');
    const payload: ProductionPlanPayload = {
      itemId: draft.itemId,
      targetQty: Number(draft.targetQty),
      planDate: draft.planDate,
      scheduledEndDate: draft.scheduledEndDate || null,
      machineLine: draft.machineLine || null,
      operatorId: draft.operatorId || null,
      notes: draft.notes || null,
      bomAllocations: draft.bomAllocations.filter((b) => b.stockInventoryId && b.requiredQty > 0),
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">COMPLETED</span>;
    if (s === 'IN_PROGRESS') return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">IN_PROGRESS</span>;
    if (s === 'SPK_ISSUED') return <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">SPK_ISSUED</span>;
    if (s === 'CANCELLED') return <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">CANCELLED</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">PLANNED</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-700">{isNew ? 'AUTO-PLAN' : 'EDIT'}</td>
        <td className="px-3 py-2.5 min-w-[200px]">
          <select
            value={draft.itemId}
            onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}
            className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
          >
            <option value="">-- Pilih Produk (FG) --</option>
            {mdmItems.map((it) => (
              <option key={it.id} value={it.id}>
                {it.code ? `[${it.code}] ` : ''}{it.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2.5">
          <input
            type="number"
            min={1}
            value={draft.targetQty}
            onChange={(e) => setDraft({ ...draft, targetQty: Number(e.target.value) })}
            className="w-24 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right"
          />
        </td>
        <td className="px-3 py-2.5 space-y-1">
          <input
            type="date"
            value={draft.planDate}
            onChange={(e) => setDraft({ ...draft, planDate: e.target.value })}
            className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
          />
          <input
            type="date"
            value={draft.scheduledEndDate}
            onChange={(e) => setDraft({ ...draft, scheduledEndDate: e.target.value })}
            className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]"
          />
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[160px]">
          <input
            type="text"
            placeholder="Mesin / Line (Slitter 01)"
            value={draft.machineLine}
            onChange={(e) => setDraft({ ...draft, machineLine: e.target.value })}
            className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
          />
          <select
            value={draft.operatorId}
            onChange={(e) => setDraft({ ...draft, operatorId: e.target.value })}
            className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]"
          >
            <option value="">-- Opsional Operator --</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>{op.fullName}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
            {isNew ? 'BARU' : 'EDIT'}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <div className="inline-flex gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Simpan
            </button>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Batal
            </button>
          </div>
        </td>
      </tr>

      {/* Inline Sub-Row: BOM Batch RM Allocations (Anti-HOLD 4.5.3) */}
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td colSpan={7} className="p-3">
          <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>Alokasi Batch Bahan Baku RM (Hanya Batch AVAILABLE — Anti-HOLD 4.5.3)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    bomAllocations: [...draft.bomAllocations, { stockInventoryId: '', lotNumber: '', requiredQty: 1 }],
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" /> + Batch RM
              </button>
            </div>

            {draft.bomAllocations.map((alloc, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={alloc.stockInventoryId}
                  onChange={(e) => {
                    const st = availableStocks.find((s) => s.id === e.target.value);
                    const next = draft.bomAllocations.map((a, i) =>
                      i === idx
                        ? { ...a, stockInventoryId: e.target.value, itemId: st?.itemId || null, lotNumber: st?.lotNumber || null }
                        : a
                    );
                    setDraft({ ...draft, bomAllocations: next });
                  }}
                  className="flex-1 min-w-[240px] px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                >
                  <option value="">-- Pilih Batch RM (AVAILABLE) --</option>
                  {availableStocks.map((st) => (
                    <option key={st.id} value={st.id}>
                      [{st.lotNumber}] {st.itemName} — Stok: {st.qty} {st.unit || ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  placeholder="Qty Alokasi"
                  value={alloc.requiredQty}
                  onChange={(e) => {
                    const next = draft.bomAllocations.map((a, i) =>
                      i === idx ? { ...a, requiredQty: Number(e.target.value) } : a
                    );
                    setDraft({ ...draft, bomAllocations: next });
                  }}
                  className="w-28 px-2 py-1 rounded border border-slate-300 font-mono text-right"
                />
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, bomAllocations: draft.bomAllocations.filter((_, i) => i !== idx) })}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <input
              type="text"
              placeholder="Catatan Planning / Instruksi SPK..."
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
            />
          </div>
        </td>
      </tr>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Plan / SPK / Produk..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Status</option>
            <option value="PLANNED">PLANNED</option>
            <option value="SPK_ISSUED">SPK_ISSUED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={spkOnly} onChange={(e) => { setSpkOnly(e.target.checked); setPage(1); }} />
            <span>SPK Terbit Saja</span>
          </label>
        </div>

        {canWritePlan && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Tambah Plan (4.1.1)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. Plan / SPK</th>
                <th className="px-3 py-2.5">Produk</th>
                <th className="px-3 py-2.5 text-right">Target / Hasil (Good &amp; NG)</th>
                <th className="px-3 py-2.5">Tgl Mulai–Selesai</th>
                <th className="px-3 py-2.5">Mesin &amp; Operator</th>
                <th className="px-3 py-2.5 text-center">Status SPK</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWritePlan && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Production Planning &amp; SPK...</td></tr>
              ) : plans.length === 0 && !isAdding ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">Belum ada data Production Planning / SPK.</td></tr>
              ) : (
                plans.map((p) => {
                  if (canWritePlan && editingId === p.id) return <React.Fragment key={p.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === p.id;
                  const isVoid = p.status === 'CANCELLED';

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`hover:bg-slate-50/80 ${isVoid ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                          <button type="button" onClick={() => setExpandedId(isExp ? null : p.id)} className="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{p.spkNumber}</span>
                          </button>
                          {p.planNumber && p.planNumber !== p.spkNumber && (
                            <div className="text-[10px] text-slate-400 pl-4">{p.planNumber}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{p.itemName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{p.itemCode || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                          <div className="font-bold text-slate-900">Target: {p.targetQty}</div>
                          <div className="text-[11px]">
                            <span className="text-emerald-700 font-semibold">Good: {p.accumulatedGoodQty}</span> ·{' '}
                            <span className="text-rose-600 font-semibold">NG: {p.accumulatedNgQty}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div>{p.planDate}</div>
                          <div className="text-[11px] text-slate-400">s/d {p.scheduledEndDate || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{p.machineLine || '-'}</div>
                          <div className="text-[11px] text-slate-400">{p.operatorName || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center">{getStatusBadge(p.status)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {canIssueSpk && !p.spkIssued && !isVoid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIssuingPlanId(p.id);
                                  setIssueDraft({
                                    operatorId: p.operatorId || '',
                                    machineLine: p.machineLine || '',
                                    notes: p.notes || '',
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer"
                              >
                                <Send className="w-3 h-3" /> Terbitkan SPK
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                printProductionHtmlReport(`/production/plans/${p.id}/print`).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak SPK')
                                )
                              }
                              title="Cetak SPK"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canWritePlan && p.status !== 'COMPLETED' && !isVoid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(p.id);
                                  setDraft({
                                    itemId: p.itemId || '',
                                    targetQty: p.targetQty,
                                    planDate: p.planDate || todayStr(),
                                    scheduledEndDate: p.scheduledEndDate || '',
                                    machineLine: p.machineLine || '',
                                    operatorId: p.operatorId || '',
                                    notes: p.notes || '',
                                    bomAllocations: p.bomAllocations || [],
                                  });
                                }}
                                title="Edit Inline"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canWritePlan && !isVoid && (
                              <button
                                type="button"
                                onClick={() => setVoidTarget(p)}
                                title="Batalkan"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline Issue SPK Bar (No Popup) */}
                      {issuingPlanId === p.id && (
                        <tr className="bg-indigo-50 border-b border-indigo-200">
                          <td colSpan={7} className="p-3">
                            <div className="flex flex-wrap items-end gap-2 text-xs">
                              <span className="font-bold text-indigo-800 mr-2 self-center">4.1.2 Terbitkan SPK:</span>
                              <select
                                value={issueDraft.operatorId}
                                onChange={(e) => setIssueDraft({ ...issueDraft, operatorId: e.target.value })}
                                className="px-2 py-1.5 rounded border border-slate-300 bg-white text-xs"
                              >
                                <option value="">-- Pilih Operator --</option>
                                {operators.map((op) => <option key={op.id} value={op.id}>{op.fullName}</option>)}
                              </select>
                              <input
                                type="text"
                                placeholder="Mesin / Line"
                                value={issueDraft.machineLine}
                                onChange={(e) => setIssueDraft({ ...issueDraft, machineLine: e.target.value })}
                                className="px-2 py-1.5 rounded border border-slate-300 bg-white text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Catatan SPK..."
                                value={issueDraft.notes}
                                onChange={(e) => setIssueDraft({ ...issueDraft, notes: e.target.value })}
                                className="flex-1 min-w-[160px] px-2 py-1.5 rounded border border-slate-300 bg-white text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  issueSpkMut.mutate({
                                    id: p.id,
                                    p: {
                                      operatorId: issueDraft.operatorId || null,
                                      machineLine: issueDraft.machineLine || null,
                                      notes: issueDraft.notes || null,
                                    },
                                  })
                                }
                                disabled={issueSpkMut.isPending}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                              >
                                Konfirmasi Terbitkan SPK
                              </button>
                              <button
                                type="button"
                                onClick={() => setIssuingPlanId(null)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isExp && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-3.5 space-y-2 text-xs">
                            <div className="font-bold text-slate-700">Alokasi BOM Batch RM ({p.bomAllocations.length})</div>
                            {p.bomAllocations.length === 0 ? (
                              <div className="text-slate-400">Belum ada alokasi batch bahan baku RM.</div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {p.bomAllocations.map((b, idx) => (
                                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-[11px]">
                                    LOT: {b.lotNumber || b.stockInventoryId} • Qty: <strong>{b.requiredQty}</strong>
                                  </span>
                                ))}
                              </div>
                            )}
                            {p.notes && <div className="text-slate-600">Catatan: {p.notes}</div>}
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
        title="Batalkan Production Plan / SPK?"
        message={`Anda yakin ingin membatalkan ${voidTarget?.spkNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
