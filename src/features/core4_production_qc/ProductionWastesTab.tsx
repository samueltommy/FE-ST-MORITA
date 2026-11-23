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
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProductionWastesApi,
  createProductionWasteApi,
  updateProductionWasteApi,
  deleteProductionWasteApi,
  listProductionStocksApi,
  listProductionPlansApi,
  printProductionHtmlReport,
  extractProductionError,
  WastePayload,
} from '../../services/productionService';
import { listMdmItemsApi } from '../../services/financeService';
import type { WasteRecord, WasteType, WasteSeverity } from '../../types/productionQc';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): WastePayload => ({
  type: 'RM_WASTE',
  itemId: '',
  stockInventoryId: '',
  productionPlanId: '',
  wasteDate: todayStr(),
  lotNumber: '',
  qty: 1,
  severity: 'MINOR',
  reason: '',
  rootCause: '',
  correctiveAction: '',
  preventiveAction: '',
});

export const ProductionWastesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WastePayload>(emptyDraft);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<WasteRecord | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['productionWastes', page, search, wasteTypeFilter, severityFilter],
    queryFn: () =>
      listProductionWastesApi({
        page,
        limit: 20,
        search: search || undefined,
        wasteType: wasteTypeFilter,
        severity: severityFilter,
      }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: stocksRes } = useQuery({ queryKey: ['productionStocksDropdown'], queryFn: () => listProductionStocksApi({ page: 1, limit: 100 }) });
  const stocks = stocksRes?.data || [];
  const { data: plansRes } = useQuery({ queryKey: ['productionPlansDropdown'], queryFn: () => listProductionPlansApi({ page: 1, limit: 100 }) });
  const plans = plansRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['productionWastes'] });
    queryClient.invalidateQueries({ queryKey: ['productionStocks'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: WastePayload) => createProductionWasteApi(p),
    onSuccess: () => {
      toast.success('Catatan Limbah & CAPA berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal mencatat limbah').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<WastePayload> }) => updateProductionWasteApi(id, p),
    onSuccess: () => {
      toast.success('Catatan Limbah berhasil diperbarui');
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal memperbarui limbah').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProductionWasteApi(id),
    onSuccess: () => {
      toast.success('Catatan Limbah dibatalkan (stok batch terkait dikembalikan jika ada)');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membatalkan limbah').message),
  });

  const handleSave = () => {
    if (!draft.itemId) return toast.error('Item wajib dipilih');
    const payload: WastePayload = {
      ...draft,
      stockInventoryId: draft.stockInventoryId || null,
      productionPlanId: draft.productionPlanId || null,
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderSeverityBadge = (sev?: string | null) => {
    const s = (sev || 'MINOR').toUpperCase();
    if (s === 'CRITICAL') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">CRITICAL</span>;
    if (s === 'MAJOR') return <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">MAJOR</span>;
    return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">MINOR</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-3 py-2.5 space-y-1">
          <div className="font-mono text-xs font-bold text-blue-700">{isNew ? 'AUTO-WST' : 'EDIT'}</div>
          <input type="date" value={draft.wasteDate} onChange={(e) => setDraft({ ...draft, wasteDate: e.target.value })} className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5">
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as WasteType })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold">
            <option value="RM_WASTE">3.5.1 RM_WASTE</option>
            <option value="PRODUCT_WASTE">3.6.1 PRODUCT_WASTE</option>
          </select>
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[200px]">
          <select value={draft.itemId} onChange={(e) => setDraft({ ...draft, itemId: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
            <option value="">-- Pilih Item --</option>
            {mdmItems.map((it) => <option key={it.id} value={it.id}>{it.code ? `[${it.code}] ` : ''}{it.name}</option>)}
          </select>
          <div className="flex gap-1">
            <select
              value={draft.stockInventoryId || ''}
              onChange={(e) => {
                const st = stocks.find((x) => x.id === e.target.value);
                setDraft({ ...draft, stockInventoryId: e.target.value, lotNumber: st?.lotNumber || draft.lotNumber });
              }}
              className="w-1/2 px-1 py-0.5 rounded border border-slate-300 bg-white text-[10px]"
            >
              <option value="">-- Ops. Batch --</option>
              {stocks.map((st) => <option key={st.id} value={st.id}>{st.lotNumber}</option>)}
            </select>
            <input type="text" placeholder="LOT" value={draft.lotNumber || ''} onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })} className="w-1/2 px-1.5 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]" />
          </div>
        </td>
        <td className="px-3 py-2.5">
          <input type="number" min={1} value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })} className="w-20 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-xs text-right" />
        </td>
        <td className="px-3 py-2.5">
          <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as WasteSeverity })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold">
            <option value="MINOR">MINOR</option>
            <option value="MAJOR">MAJOR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </td>
        <td className="px-3 py-2.5" colSpan={2}>
          <input type="text" placeholder="Alasan ketidaksesuaian..." value={draft.reason || ''} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
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

      {/* Inline CAPA Sub-Row */}
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td colSpan={8} className="p-3">
          <div className="bg-white rounded-xl border border-blue-200 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600">SPK Terkait (Opsional)</span>
              <select value={draft.productionPlanId || ''} onChange={(e) => setDraft({ ...draft, productionPlanId: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
                <option value="">-- Tanpa SPK --</option>
                {plans.map((pl) => <option key={pl.id} value={pl.id}>{pl.spkNumber}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600">Root Cause (Akar Masalah)</span>
              <input type="text" placeholder="Akar penyebab..." value={draft.rootCause || ''} onChange={(e) => setDraft({ ...draft, rootCause: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600">Corrective Action</span>
              <input type="text" placeholder="Tindakan korektif..." value={draft.correctiveAction || ''} onChange={(e) => setDraft({ ...draft, correctiveAction: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600">Preventive Action</span>
              <input type="text" placeholder="Tindakan preventif..." value={draft.preventiveAction || ''} onChange={(e) => setDraft({ ...draft, preventiveAction: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300" />
            </label>
          </div>
        </td>
      </tr>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 gap-0.5 border border-slate-200">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'RM_WASTE', label: '3.5.1 RM Waste' },
              { id: 'PRODUCT_WASTE', label: '3.6.1 Product Waste & CAPA' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setWasteTypeFilter(t.id); setPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                  wasteTypeFilter === t.id ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Cari Kode / Item / LOT..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
          </div>
          <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Severity</option>
            <option value="MINOR">MINOR</option>
            <option value="MAJOR">MAJOR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Catat Limbah</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">Kode &amp; Tgl</th>
                <th className="px-3 py-2.5">Tipe</th>
                <th className="px-3 py-2.5">Item &amp; No. LOT</th>
                <th className="px-3 py-2.5 text-right">Qty &amp; Unit</th>
                <th className="px-3 py-2.5 text-center">Severity</th>
                <th className="px-3 py-2.5">Alasan Ketidaksesuaian</th>
                <th className="px-3 py-2.5">Pelapor</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWrite && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat laporan limbah...</td></tr>
              ) : list.length === 0 && !isAdding ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">Belum ada data RM Waste / Product Waste.</td></tr>
              ) : (
                list.map((w) => {
                  if (canWrite && editingId === w.id) return <React.Fragment key={w.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === w.id;
                  return (
                    <React.Fragment key={w.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button type="button" onClick={() => setExpandedId(isExp ? null : w.id)} className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{w.wasteCode}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 pl-4">{w.wasteDate || w.createdAt || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${w.type === 'PRODUCT_WASTE' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>
                            {w.type === 'PRODUCT_WASTE' ? '3.6.1 PRODUCT' : '3.5.1 RM'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{w.itemName}</div>
                          <div className="text-[11px] font-mono text-slate-400">LOT: {w.lotNumber || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap">
                          {w.qty} <span className="text-[10px] font-normal text-slate-500">{w.unit || ''}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">{renderSeverityBadge(w.severity)}</td>
                        <td className="px-3 py-2.5 truncate max-w-[200px]">{w.reason || '-'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{w.reportedByName || '-'}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                printProductionHtmlReport(`/production/wastes/${w.id}/print`).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak laporan waste')
                                )
                              }
                              title="Cetak Laporan Waste"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(w.id);
                                  setDraft({
                                    type: w.type,
                                    itemId: w.itemId,
                                    stockInventoryId: w.stockInventoryId || '',
                                    productionPlanId: w.productionPlanId || '',
                                    wasteDate: w.wasteDate || todayStr(),
                                    lotNumber: w.lotNumber || '',
                                    qty: w.qty,
                                    severity: w.severity || 'MINOR',
                                    reason: w.reason || '',
                                    rootCause: w.rootCause || '',
                                    correctiveAction: w.correctiveAction || '',
                                    preventiveAction: w.preventiveAction || '',
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canWrite && (
                              <button type="button" onClick={() => setVoidTarget(w)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExp && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={8} className="p-3.5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white rounded-xl border border-slate-200 p-3">
                              <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400">Root Cause (Akar Masalah)</div>
                                <div className="mt-0.5 text-slate-800">{w.rootCause || '-'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400">Corrective Action</div>
                                <div className="mt-0.5 text-slate-800">{w.correctiveAction || '-'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400">Preventive Action</div>
                                <div className="mt-0.5 text-slate-800">{w.preventiveAction || '-'}</div>
                              </div>
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
        title="Batalkan Laporan Limbah?"
        message={`Anda yakin ingin membatalkan ${voidTarget?.wasteCode || ''}? Jika terhubung ke batch stok, saldo stok akan dikembalikan.`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
