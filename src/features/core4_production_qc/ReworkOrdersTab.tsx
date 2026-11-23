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
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listReworkOrdersApi,
  createReworkOrderApi,
  updateReworkOrderApi,
  deleteReworkOrderApi,
  reinspectReworkOrderApi,
  listProductionPlansApi,
  listProductionOperatorsApi,
  extractProductionError,
  ReworkOrderPayload,
  ReworkReinspectPayload,
} from '../../services/productionService';
import { listMdmItemsApi } from '../../services/financeService';
import type { ReworkOrder } from '../../types/productionQc';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const emptyDraft = (): ReworkOrderPayload => ({
  productionPlanId: '',
  itemId: '',
  lotNumber: '',
  reworkQty: 1,
  defectDescription: '',
  repairInstruction: '',
  assignedOperatorId: '',
});

export const ReworkOrdersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canWriteRework = isSuperAdmin || isExecutive || userDivision === 'WAREHOUSE_PPIC' || userDivision === 'PRODUKSI_QC';
  const canReinspect = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReworkOrderPayload>(emptyDraft);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reinspectDraft, setReinspectDraft] = useState<ReworkReinspectPayload>({
    goodAfterReworkQty: 0,
    scrapAfterReworkQty: 0,
    verdict: 'PASSED',
    autoLogProductWaste: true,
    notes: '',
  });

  const [voidTarget, setVoidTarget] = useState<ReworkOrder | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['productionReworks', page, search, statusFilter],
    queryFn: () => listReworkOrdersApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: plansRes } = useQuery({ queryKey: ['productionPlansDropdown'], queryFn: () => listProductionPlansApi({ page: 1, limit: 100 }) });
  const plans = plansRes?.data || [];
  const { data: operators = [] } = useQuery({ queryKey: ['productionOperatorsDropdown'], queryFn: listProductionOperatorsApi });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['productionReworks'] });
    queryClient.invalidateQueries({ queryKey: ['productionStocks'] });
    queryClient.invalidateQueries({ queryKey: ['productionWastes'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: ReworkOrderPayload) => createReworkOrderApi(p),
    onSuccess: () => {
      toast.success('Tiket Rework/Repair berhasil dibuat');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membuat tiket rework').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<ReworkOrderPayload> }) => updateReworkOrderApi(id, p),
    onSuccess: () => {
      toast.success('Tiket Rework berhasil diperbarui');
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal memperbarui rework').message),
  });

  const reinspectMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReworkReinspectPayload }) => reinspectReworkOrderApi(id, p),
    onSuccess: () => {
      toast.success('Re-Inspeksi QC selesai! Qty Good masuk FG AVAILABLE & Scrap tercatat ke 3.6.1 Product Waste.');
      setExpandedId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal menyimpan re-inspeksi').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteReworkOrderApi(id),
    onSuccess: () => {
      toast.success('Tiket Rework berhasil dibatalkan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membatalkan rework').message),
  });

  const handleSave = () => {
    if (!draft.itemId) return toast.error('Item wajib dipilih');
    if (!draft.defectDescription.trim()) return toast.error('Deskripsi cacat wajib diisi');
    const payload: ReworkOrderPayload = {
      ...draft,
      productionPlanId: draft.productionPlanId || null,
      assignedOperatorId: draft.assignedOperatorId || null,
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PASSED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">PASSED</span>;
    if (s === 'SCRAPPED') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">SCRAPPED</span>;
    if (s === 'IN_REWORK') return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">IN_REWORK</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{s || 'OPEN'}</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <tr className="bg-blue-50 border-b border-blue-200 align-top">
      <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-700">{isNew ? 'AUTO-RWK' : 'EDIT'}</td>
      <td className="px-3 py-2.5 space-y-1 min-w-[190px]">
        <select
          value={draft.productionPlanId || ''}
          onChange={(e) => {
            const pl = plans.find((x) => x.id === e.target.value);
            setDraft({ ...draft, productionPlanId: e.target.value, itemId: pl?.itemId || draft.itemId });
          }}
          className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
        >
          <option value="">-- Opsional SPK --</option>
          {plans.map((pl) => <option key={pl.id} value={pl.id}>{pl.spkNumber}</option>)}
        </select>
        <select
          value={draft.itemId}
          onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}
          className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]"
        >
          <option value="">-- Pilih Produk --</option>
          {mdmItems.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <input type="text" placeholder="LOT" value={draft.lotNumber || ''} onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })} className="w-24 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-xs" />
      </td>
      <td className="px-3 py-2.5">
        <input type="number" min={1} value={draft.reworkQty} onChange={(e) => setDraft({ ...draft, reworkQty: Number(e.target.value) })} className="w-20 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-xs text-right" />
      </td>
      <td className="px-3 py-2.5 text-center text-slate-400">-</td>
      <td className="px-3 py-2.5 space-y-1 min-w-[200px]">
        <input type="text" placeholder="Deskripsi cacat..." value={draft.defectDescription} onChange={(e) => setDraft({ ...draft, defectDescription: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
        <input type="text" placeholder="Instruksi repair..." value={draft.repairInstruction || ''} onChange={(e) => setDraft({ ...draft, repairInstruction: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
      </td>
      <td className="px-3 py-2.5">
        <select value={draft.assignedOperatorId || ''} onChange={(e) => setDraft({ ...draft, assignedOperatorId: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
          <option value="">-- Operator --</option>
          {operators.map((op) => <option key={op.id} value={op.id}>{op.fullName}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5 text-center">{renderBadge(isNew ? 'OPEN' : 'EDIT')}</td>
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
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Cari No. Rework / SPK / LOT..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Status</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_REWORK">IN_REWORK</option>
            <option value="PASSED">PASSED</option>
            <option value="SCRAPPED">SCRAPPED</option>
          </select>
        </div>

        {canWriteRework && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Buat Tiket Rework (4.5.2)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. Rework</th>
                <th className="px-3 py-2.5">SPK &amp; Produk</th>
                <th className="px-3 py-2.5">No. LOT</th>
                <th className="px-3 py-2.5 text-right">Qty Rework</th>
                <th className="px-3 py-2.5 text-center">Hasil (Good / Scrap)</th>
                <th className="px-3 py-2.5">Cacat &amp; Instruksi Repair</th>
                <th className="px-3 py-2.5">Operator</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWriteRework && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat antrean Rework...</td></tr>
              ) : list.length === 0 && !isAdding ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">Belum ada tiket Rework / Repair.</td></tr>
              ) : (
                list.map((r) => {
                  if (canWriteRework && editingId === r.id) return <React.Fragment key={r.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === r.id;
                  const canDoReinspect = canReinspect && (r.status === 'OPEN' || r.status === 'IN_REWORK');

                  return (
                    <React.Fragment key={r.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const next = isExp ? null : r.id;
                              setExpandedId(next);
                              if (next) {
                                setReinspectDraft({
                                  goodAfterReworkQty: r.reworkQty,
                                  scrapAfterReworkQty: 0,
                                  verdict: 'PASSED',
                                  autoLogProductWaste: true,
                                  notes: '',
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer"
                          >
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{r.reworkNumber}</span>
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{r.itemName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{r.spkNumber || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono">{r.lotNumber || '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold">{r.reworkQty}</td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          <span className="text-emerald-700 font-bold">{r.goodAfterReworkQty}</span> /{' '}
                          <span className="text-rose-600 font-bold">{r.scrapAfterReworkQty}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-700">{r.defectDescription}</div>
                          <div className="text-[11px] text-slate-400">{r.repairInstruction || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">{r.assignedOperatorName || '-'}</td>
                        <td className="px-3 py-2.5 text-center">{renderBadge(r.status)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            {canDoReinspect && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedId(r.id);
                                  setReinspectDraft({
                                    goodAfterReworkQty: r.reworkQty,
                                    scrapAfterReworkQty: 0,
                                    verdict: 'PASSED',
                                    autoLogProductWaste: true,
                                    notes: '',
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Re-Inspeksi
                              </button>
                            )}
                            {canWriteRework && (r.status === 'OPEN' || r.status === 'IN_REWORK') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(r.id);
                                  setDraft({
                                    productionPlanId: r.productionPlanId || '',
                                    itemId: r.itemId || '',
                                    lotNumber: r.lotNumber || '',
                                    reworkQty: r.reworkQty,
                                    defectDescription: r.defectDescription,
                                    repairInstruction: r.repairInstruction || '',
                                    assignedOperatorId: r.assignedOperatorId || '',
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canWriteRework && (
                              <button type="button" onClick={() => setVoidTarget(r)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExp && (
                        <tr className="bg-indigo-50/70 border-b border-indigo-200">
                          <td colSpan={9} className="p-3.5">
                            {canDoReinspect ? (
                              <div className="bg-white rounded-xl border border-indigo-200 p-3 space-y-2.5 text-xs">
                                <div className="font-bold text-indigo-800">Re-Inspeksi QC Setelah Rework ({r.reworkNumber})</div>
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                                  <label className="space-y-1">
                                    <span className="text-[10px] font-semibold">Qty Good</span>
                                    <input type="number" min={0} value={reinspectDraft.goodAfterReworkQty} onChange={(e) => setReinspectDraft({ ...reinspectDraft, goodAfterReworkQty: Number(e.target.value) })} className="w-full px-2 py-1 rounded border border-slate-300 font-mono" />
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-[10px] font-semibold">Qty Scrap</span>
                                    <input type="number" min={0} value={reinspectDraft.scrapAfterReworkQty} onChange={(e) => setReinspectDraft({ ...reinspectDraft, scrapAfterReworkQty: Number(e.target.value) })} className="w-full px-2 py-1 rounded border border-slate-300 font-mono" />
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-[10px] font-semibold">Verdict</span>
                                    <select value={reinspectDraft.verdict} onChange={(e) => setReinspectDraft({ ...reinspectDraft, verdict: e.target.value as 'PASSED' | 'SCRAPPED' })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white font-bold">
                                      <option value="PASSED">PASSED</option>
                                      <option value="SCRAPPED">SCRAPPED</option>
                                    </select>
                                  </label>
                                  <label className="space-y-1 col-span-2">
                                    <span className="text-[10px] font-semibold">Catatan Re-Inspeksi</span>
                                    <input type="text" placeholder="Hasil cek ulang QC..." value={reinspectDraft.notes || ''} onChange={(e) => setReinspectDraft({ ...reinspectDraft, notes: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300" />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => reinspectMut.mutate({ id: r.id, p: reinspectDraft })}
                                    disabled={reinspectMut.isPending}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                                  >
                                    Simpan Re-Inspeksi
                                  </button>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                                  <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                                    <input type="checkbox" checked={reinspectDraft.autoLogProductWaste} onChange={(e) => setReinspectDraft({ ...reinspectDraft, autoLogProductWaste: e.target.checked })} />
                                    <span>Auto-log Qty Scrap ke 3.6.1 Product Waste</span>
                                  </label>
                                  <span className="text-emerald-700">Qty Good (PASSED) otomatis masuk stok FG AVAILABLE.</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-600">
                                <strong>Re-Inspeksi:</strong> {r.reinspectedBy || '-'} • <strong>Catatan:</strong> {r.reinspectionNotes || '-'}
                              </div>
                            )}
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
        title="Batalkan Tiket Rework?"
        message={`Anda yakin ingin membatalkan tiket rework ${voidTarget?.reworkNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
