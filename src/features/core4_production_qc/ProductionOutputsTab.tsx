import React, { useState } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  Info,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProductionOutputsApi,
  createProductionOutputApi,
  updateProductionOutputApi,
  deleteProductionOutputApi,
  listProductionPlansApi,
  listAvailableStocksForSpkApi,
  listProductionOperatorsApi,
  extractProductionError,
  ProductionOutputPayload,
} from '../../services/productionService';
import type { ProductionOutputRecord, RMConsumptionItem } from '../../types/productionQc';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

interface OutputDraft {
  productionPlanId: string;
  itemId: string;
  operatorId: string;
  shiftNumber: number;
  machineLine: string;
  goodQty: number;
  ngQty: number;
  reworkQty: number;
  wasteQty: number;
  lotNumber: string;
  downtimeMinutes: number;
  defectReason: string;
  notes: string;
  rmConsumptions: RMConsumptionItem[];
}

const emptyDraft = (): OutputDraft => ({
  productionPlanId: '',
  itemId: '',
  operatorId: '',
  shiftNumber: 1,
  machineLine: '',
  goodQty: 0,
  ngQty: 0,
  reworkQty: 0,
  wasteQty: 0,
  lotNumber: '',
  downtimeMinutes: 0,
  defectReason: '',
  notes: '',
  rmConsumptions: [],
});

export const ProductionOutputsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OutputDraft>(emptyDraft);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<ProductionOutputRecord | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['productionOutputs', page, search, planFilter],
    queryFn: () =>
      listProductionOutputsApi({
        page,
        limit: 20,
        search: search || undefined,
        productionPlanId: planFilter,
      }),
  });
  const outputs = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: plansRes } = useQuery({
    queryKey: ['productionPlansDropdown'],
    queryFn: () => listProductionPlansApi({ page: 1, limit: 100 }),
  });
  const plans = plansRes?.data || [];

  const { data: operators = [] } = useQuery({ queryKey: ['productionOperatorsDropdown'], queryFn: listProductionOperatorsApi });
  const { data: availableStocks = [] } = useQuery({
    queryKey: ['availableStocksForSpk'],
    queryFn: listAvailableStocksForSpkApi,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['productionOutputs'] });
    queryClient.invalidateQueries({ queryKey: ['productionPlans'] });
    queryClient.invalidateQueries({ queryKey: ['productionStocks'] });
    queryClient.invalidateQueries({ queryKey: ['availableStocksForSpk'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const handleErr = (e: any, fallback: string) => {
    const { message, isHoldLockout } = extractProductionError(e, fallback);
    toast.error(isHoldLockout ? `HOLD LOCKOUT (4.5.3): ${message}` : message);
  };

  const createMut = useMutation({
    mutationFn: (p: ProductionOutputPayload) => createProductionOutputApi(p),
    onSuccess: () => {
      toast.success('Output tercatat! Stok RM dipotong otomatis & hasil Good masuk gudang FG berstatus HOLD menunggu PQC/OQC.');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal mencatat output produksi'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<ProductionOutputPayload> }) => updateProductionOutputApi(id, p),
    onSuccess: () => {
      toast.success('Output produksi berhasil diperbarui');
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui output produksi'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProductionOutputApi(id),
    onSuccess: () => {
      toast.success('Output dibatalkan — stok RM yang terpotong telah dikembalikan otomatis.');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal membatalkan output'),
  });

  const handleSave = () => {
    if (!draft.productionPlanId) return toast.error('Pilih SPK terlebih dahulu');
    const payload: ProductionOutputPayload = {
      productionPlanId: draft.productionPlanId,
      itemId: draft.itemId,
      operatorId: draft.operatorId || null,
      shiftNumber: Number(draft.shiftNumber) || 1,
      machineLine: draft.machineLine || null,
      goodQty: Number(draft.goodQty) || 0,
      ngQty: Number(draft.ngQty) || 0,
      reworkQty: Number(draft.reworkQty) || 0,
      wasteQty: Number(draft.wasteQty) || 0,
      lotNumber: draft.lotNumber || null,
      downtimeMinutes: Number(draft.downtimeMinutes) || 0,
      defectReason: draft.defectReason || null,
      notes: draft.notes || null,
      rmConsumptions: draft.rmConsumptions.filter((c) => c.stockInventoryId && c.qtyUsed > 0),
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderInlineEditor = (isNew: boolean) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-3 py-2.5 min-w-[180px]">
          <select
            value={draft.productionPlanId}
            onChange={(e) => {
              const pl = plans.find((x) => x.id === e.target.value);
              setDraft({
                ...draft,
                productionPlanId: e.target.value,
                itemId: pl?.itemId || draft.itemId,
                machineLine: pl?.machineLine || draft.machineLine,
              });
            }}
            className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
          >
            <option value="">-- Pilih SPK Aktif --</option>
            {plans.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.spkNumber} — {pl.itemName}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2.5">
          <input
            type="text"
            placeholder="LOT FG (auto jika kosong)"
            value={draft.lotNumber}
            onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })}
            className="w-36 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono"
          />
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[150px]">
          <select
            value={draft.operatorId}
            onChange={(e) => setDraft({ ...draft, operatorId: e.target.value })}
            className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
          >
            <option value="">-- Operator --</option>
            {operators.map((op) => <option key={op.id} value={op.id}>{op.fullName}</option>)}
          </select>
          <div className="flex gap-1">
            <select
              value={draft.shiftNumber}
              onChange={(e) => setDraft({ ...draft, shiftNumber: Number(e.target.value) })}
              className="w-1/2 px-1 py-0.5 rounded border border-slate-300 bg-white text-[11px]"
            >
              <option value={1}>Shift 1</option>
              <option value={2}>Shift 2</option>
              <option value={3}>Shift 3</option>
            </select>
            <input
              type="text"
              placeholder="Mesin"
              value={draft.machineLine}
              onChange={(e) => setDraft({ ...draft, machineLine: e.target.value })}
              className="w-1/2 px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px]"
            />
          </div>
        </td>
        <td className="px-3 py-2.5">
          <input type="number" value={draft.goodQty} onChange={(e) => setDraft({ ...draft, goodQty: Number(e.target.value) })} className="w-16 px-1.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right" />
        </td>
        <td className="px-3 py-2.5">
          <input type="number" value={draft.ngQty} onChange={(e) => setDraft({ ...draft, ngQty: Number(e.target.value) })} className="w-16 px-1.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right" />
        </td>
        <td className="px-3 py-2.5">
          <input type="number" value={draft.reworkQty} onChange={(e) => setDraft({ ...draft, reworkQty: Number(e.target.value) })} className="w-16 px-1.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right" />
        </td>
        <td className="px-3 py-2.5">
          <input type="number" value={draft.wasteQty} onChange={(e) => setDraft({ ...draft, wasteQty: Number(e.target.value) })} className="w-16 px-1.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right" />
        </td>
        <td className="px-3 py-2.5">
          <input type="number" value={draft.downtimeMinutes} onChange={(e) => setDraft({ ...draft, downtimeMinutes: Number(e.target.value) })} className="w-16 px-1.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right" />
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <div className="inline-flex gap-1">
            <button type="button" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer">
              <Save className="w-3.5 h-3.5" /> Simpan
            </button>
            <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer">
              <X className="w-3.5 h-3.5" /> Batal
            </button>
          </div>
        </td>
      </tr>

      {/* Inline Sub-Row: RM Consumptions + Defect Reason */}
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td colSpan={9} className="p-3">
          <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-800">
                Pemotongan Stok Bahan Baku RM (Hanya Batch AVAILABLE — Anti-HOLD)
              </span>
              <button
                type="button"
                onClick={() =>
                  setDraft({ ...draft, rmConsumptions: [...draft.rmConsumptions, { stockInventoryId: '', qtyUsed: 1 }] })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" /> + Potong Batch RM
              </button>
            </div>

            {draft.rmConsumptions.map((rm, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={rm.stockInventoryId}
                  onChange={(e) => {
                    const st = availableStocks.find((s) => s.id === e.target.value);
                    const next = draft.rmConsumptions.map((x, i) =>
                      i === idx ? { ...x, stockInventoryId: e.target.value, lotNumber: st?.lotNumber } : x
                    );
                    setDraft({ ...draft, rmConsumptions: next });
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
                  placeholder="Qty Dipakai"
                  value={rm.qtyUsed}
                  onChange={(e) => {
                    const next = draft.rmConsumptions.map((x, i) =>
                      i === idx ? { ...x, qtyUsed: Number(e.target.value) } : x
                    );
                    setDraft({ ...draft, rmConsumptions: next });
                  }}
                  className="w-28 px-2 py-1 rounded border border-slate-300 font-mono text-right"
                />
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, rmConsumptions: draft.rmConsumptions.filter((_, i) => i !== idx) })}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Alasan NG / Defect (jika ada)..."
                value={draft.defectReason}
                onChange={(e) => setDraft({ ...draft, defectReason: e.target.value })}
                className="px-2.5 py-1.5 rounded border border-slate-300 text-xs"
              />
              <input
                type="text"
                placeholder="Catatan produksi..."
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="px-2.5 py-1.5 rounded border border-slate-300 text-xs"
              />
            </div>

            {isNew && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Stok RM akan dipotong otomatis dan hasil Good masuk gudang FG berstatus <strong>HOLD</strong> menunggu inspeksi PQC/OQC.</span>
              </div>
            )}
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
              placeholder="Cari LOT FG / SPK / Operator..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white max-w-[220px]">
            <option value="ALL">Semua SPK</option>
            {plans.map((pl) => <option key={pl.id} value={pl.id}>{pl.spkNumber} — {pl.itemName}</option>)}
          </select>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Catat Output (4.1.3)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">Waktu &amp; SPK</th>
                <th className="px-3 py-2.5">Produk &amp; LOT FG</th>
                <th className="px-3 py-2.5">Operator / Shift / Mesin</th>
                <th className="px-3 py-2.5 text-right">Good</th>
                <th className="px-3 py-2.5 text-right">NG</th>
                <th className="px-3 py-2.5 text-right">Rework</th>
                <th className="px-3 py-2.5 text-right">Waste</th>
                <th className="px-3 py-2.5 text-right">Downtime (mnt)</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWrite && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Output Produksi...</td></tr>
              ) : outputs.length === 0 && !isAdding ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">Belum ada catatan Output Produksi.</td></tr>
              ) : (
                outputs.map((o) => {
                  if (canWrite && editingId === o.id) return <React.Fragment key={o.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === o.id;
                  return (
                    <React.Fragment key={o.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button type="button" onClick={() => setExpandedId(isExp ? null : o.id)} className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{o.spkNumber}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 pl-4">{o.completedAt ? String(o.completedAt).slice(0, 16).replace('T', ' ') : '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{o.itemName}</div>
                          <div className="text-[11px] font-mono text-blue-700">{o.lotNumber}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{o.operatorName}</div>
                          <div className="text-[11px] text-slate-400">Shift {o.shiftNumber} • {o.machineLine || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{o.goodQty}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">{o.ngQty}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-amber-700">{o.reworkQty}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{o.wasteQty}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{o.downtimeMinutes}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {canWrite && (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(o.id);
                                  setDraft({
                                    productionPlanId: o.productionPlanId,
                                    itemId: o.itemId,
                                    operatorId: o.operatorId || '',
                                    shiftNumber: o.shiftNumber,
                                    machineLine: o.machineLine || '',
                                    goodQty: o.goodQty,
                                    ngQty: o.ngQty,
                                    reworkQty: o.reworkQty,
                                    wasteQty: o.wasteQty,
                                    lotNumber: o.lotNumber,
                                    downtimeMinutes: o.downtimeMinutes,
                                    defectReason: o.defectReason || '',
                                    notes: o.notes || '',
                                    rmConsumptions: o.rmConsumptions || [],
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => setVoidTarget(o)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExp && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={9} className="p-3.5 text-xs space-y-1.5">
                            <div className="font-bold text-slate-700">Pemotongan Batch RM ({o.rmConsumptions.length})</div>
                            {o.rmConsumptions.length === 0 ? (
                              <div className="text-slate-400">Tidak ada pemotongan RM tercatat.</div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {o.rmConsumptions.map((c, idx) => (
                                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-[11px]">
                                    LOT: {c.lotNumber || c.stockInventoryId} • Dipakai: <strong>{c.qtyUsed}</strong>
                                  </span>
                                ))}
                              </div>
                            )}
                            {o.defectReason && <div className="text-rose-700">Alasan NG: {o.defectReason}</div>}
                            {o.notes && <div className="text-slate-600">Catatan: {o.notes}</div>}
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
        title="Batalkan Output Produksi?"
        message={`Anda yakin ingin membatalkan output LOT ${voidTarget?.lotNumber || ''}? Stok RM yang terpotong akan dikembalikan otomatis.`}
        confirmLabel="Ya, Batalkan & Kembalikan RM"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
