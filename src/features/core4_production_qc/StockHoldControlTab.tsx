import React, { useState } from 'react';
import {
  Plus,
  Search,
  Save,
  X,
  Unlock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProductionStocksApi,
  createProductionStockApi,
  updateStockStatusApi,
  releaseHoldLockoutApi,
  extractProductionError,
  StockBatchPayload,
} from '../../services/productionService';
import { listMdmItemsApi } from '../../services/financeService';
import type { StockStatus } from '../../types/productionQc';
import { useRBAC } from '../../hooks/useRBAC';

const emptyDraft = (): StockBatchPayload => ({
  itemId: '',
  lotNumber: '',
  rackNumber: '',
  qty: 0,
  expiredDate: '',
  stockStatus: 'HOLD',
  holdReason: 'Menunggu inspeksi IQC',
});

const STATUS_CHIPS: { id: string; label: string; activeClass: string }[] = [
  { id: 'ALL', label: 'Semua', activeClass: 'bg-slate-800 text-white' },
  { id: 'AVAILABLE', label: 'AVAILABLE', activeClass: 'bg-emerald-600 text-white' },
  { id: 'HOLD', label: 'HOLD', activeClass: 'bg-amber-500 text-white' },
  { id: 'QUARANTINE', label: 'QUARANTINE', activeClass: 'bg-orange-600 text-white' },
  { id: 'REJECTED', label: 'REJECTED', activeClass: 'bg-rose-600 text-white' },
];

export const StockHoldControlTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canWriteStock = isSuperAdmin || isExecutive || userDivision === 'WAREHOUSE_PPIC' || userDivision === 'PRODUKSI_QC';
  const canReleaseHold = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'PRODUKSI_QC');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<StockBatchPayload>(emptyDraft);

  // Inline status update / release hold state
  const [statusEditId, setStatusEditId] = useState<string | null>(null);
  const [statusEditVal, setStatusEditVal] = useState<StockStatus>('HOLD');
  const [statusEditReason, setStatusEditReason] = useState('');

  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState('');

  const { data: res, isLoading } = useQuery({
    queryKey: ['productionStocks', page, search, statusFilter],
    queryFn: () => listProductionStocksApi({ page, limit: 50, search: search || undefined, stockStatus: statusFilter }),
  });
  const stocks = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['productionStocks'] });
    queryClient.invalidateQueries({ queryKey: ['availableStocksForSpk'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: StockBatchPayload) => createProductionStockApi(p),
    onSuccess: () => {
      toast.success('Batch stok masuk berhasil dicatat');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal mencatat batch stok').message),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, stockStatus, holdReason }: { id: string; stockStatus: StockStatus; holdReason?: string }) =>
      updateStockStatusApi(id, { stockStatus, holdReason: holdReason || null }),
    onSuccess: () => {
      toast.success('Status stok batch berhasil diperbarui');
      setStatusEditId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal mengubah status stok').message),
  });

  const releaseHoldMut = useMutation({
    mutationFn: ({ stockInventoryId, reason }: { stockInventoryId: string; reason: string }) =>
      releaseHoldLockoutApi({ stockInventoryId, reason }),
    onSuccess: () => {
      toast.success('Otorisasi Release HOLD berhasil — Batch kini AVAILABLE');
      setReleaseId(null);
      setReleaseReason('');
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal release HOLD').message),
  });

  const renderStatusBadge = (status: string) => {
    const s = (status || 'HOLD').toUpperCase();
    if (s === 'AVAILABLE') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">AVAILABLE</span>;
    if (s === 'QUARANTINE') return <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">QUARANTINE</span>;
    if (s === 'REJECTED') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">REJECTED</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">HOLD</span>;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Kode Item / Nama / No. LOT..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setStatusFilter(c.id); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === c.id ? c.activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {canWriteStock && (
          <button
            type="button"
            onClick={() => { setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Catat Batch Masuk (4.5.3)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">Kode &amp; Nama Item</th>
                <th className="px-3 py-2.5">No. LOT</th>
                <th className="px-3 py-2.5">Rak</th>
                <th className="px-3 py-2.5 text-right">Qty &amp; Unit</th>
                <th className="px-3 py-2.5">Expired</th>
                <th className="px-3 py-2.5 text-center">Status Stok</th>
                <th className="px-3 py-2.5">Alasan Hold / Info Release</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWriteStock && isAdding && (
                <tr className="bg-amber-50 border-b border-amber-200 align-top">
                  <td className="px-3 py-2.5 min-w-[200px]">
                    <select
                      value={draft.itemId}
                      onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}
                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                    >
                      <option value="">-- Pilih Item --</option>
                      {mdmItems.map((it) => (
                        <option key={it.id} value={it.id}>{it.code ? `[${it.code}] ` : ''}{it.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="text" placeholder="LOT-RM-001" value={draft.lotNumber} onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })} className="w-28 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-xs" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="text" placeholder="RAK-A1" value={draft.rackNumber || ''} onChange={(e) => setDraft({ ...draft, rackNumber: e.target.value })} className="w-20 px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="number" min={1} value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })} className="w-20 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-right text-xs" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="date" value={draft.expiredDate || ''} onChange={(e) => setDraft({ ...draft, expiredDate: e.target.value })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
                  </td>
                  <td className="px-3 py-2.5">
                    <select value={draft.stockStatus} onChange={(e) => setDraft({ ...draft, stockStatus: e.target.value as StockStatus })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold">
                      <option value="HOLD">HOLD</option>
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="QUARANTINE">QUARANTINE</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="text" placeholder="Alasan HOLD..." value={draft.holdReason || ''} onChange={(e) => setDraft({ ...draft, holdReason: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!draft.itemId || !draft.lotNumber.trim()) return toast.error('Item dan No. LOT wajib diisi');
                          createMut.mutate({ ...draft, expiredDate: draft.expiredDate || null });
                        }}
                        disabled={createMut.isPending}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Simpan
                      </button>
                      <button type="button" onClick={() => setIsAdding(false)} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer">
                        <X className="w-3.5 h-3.5" /> Batal
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {isLoading ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat database stok batch...</td></tr>
              ) : stocks.length === 0 && !isAdding ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">Belum ada data batch stok.</td></tr>
              ) : (
                stocks.map((st) => (
                  <React.Fragment key={st.id}>
                    <tr className={`hover:bg-slate-50/80 ${st.stockStatus === 'HOLD' ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800">{st.itemName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{st.itemCode || '-'}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">{st.lotNumber}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{st.rackNumber || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap">
                        {st.qty} <span className="text-[10px] font-normal text-slate-500">{st.unit || ''}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{st.expiredDate || '-'}</td>
                      <td className="px-3 py-2.5 text-center">{renderStatusBadge(st.stockStatus)}</td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-600">
                        {st.holdReason || '-'}
                        {st.releasedBy && <div className="text-emerald-700">Released by {st.releasedBy}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          {canReleaseHold && (st.stockStatus === 'HOLD' || st.stockStatus === 'QUARANTINE') && (
                            <button
                              type="button"
                              onClick={() => { setStatusEditId(null); setReleaseId(st.id); setReleaseReason(''); }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" /> Release HOLD
                            </button>
                          )}
                          {canWriteStock && (
                            <button
                              type="button"
                              onClick={() => {
                                setReleaseId(null);
                                setStatusEditId(st.id);
                                setStatusEditVal(st.stockStatus);
                                setStatusEditReason(st.holdReason || '');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Status
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {statusEditId === st.id && (
                      <tr className="bg-blue-50 border-b border-blue-200">
                        <td colSpan={8} className="p-2.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-blue-800">Ubah Status Batch {st.lotNumber}:</span>
                            <select value={statusEditVal} onChange={(e) => setStatusEditVal(e.target.value as StockStatus)} className="px-2 py-1 rounded border border-slate-300 bg-white font-bold">
                              <option value="HOLD">HOLD</option>
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="QUARANTINE">QUARANTINE</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                            <input type="text" placeholder="Alasan perubahan status..." value={statusEditReason} onChange={(e) => setStatusEditReason(e.target.value)} className="flex-1 min-w-[200px] px-2 py-1 rounded border border-slate-300 bg-white" />
                            <button
                              type="button"
                              onClick={() => updateStatusMut.mutate({ id: st.id, stockStatus: statusEditVal, holdReason: statusEditReason })}
                              disabled={updateStatusMut.isPending}
                              className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
                            >
                              Simpan
                            </button>
                            <button type="button" onClick={() => setStatusEditId(null)} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer">Batal</button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {releaseId === st.id && (
                      <tr className="bg-emerald-50 border-b border-emerald-200">
                        <td colSpan={8} className="p-2.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-emerald-800">Otorisasi Release HOLD ({st.lotNumber}):</span>
                            <input type="text" placeholder="Alasan / dasar otorisasi release..." value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} className="flex-1 min-w-[220px] px-2 py-1 rounded border border-slate-300 bg-white" />
                            <button
                              type="button"
                              onClick={() => {
                                if (!releaseReason.trim()) return toast.error('Alasan otorisasi wajib diisi');
                                releaseHoldMut.mutate({ stockInventoryId: st.id, reason: releaseReason.trim() });
                              }}
                              disabled={releaseHoldMut.isPending}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                            >
                              Konfirmasi Release → AVAILABLE
                            </button>
                            <button type="button" onClick={() => setReleaseId(null)} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer">Batal</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
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
    </div>
  );
};
