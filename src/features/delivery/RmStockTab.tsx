import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Printer,
  Save,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRmStockMonitoringApi,
  updateItemMinStockApi,
  listStockMovementsApi,
  createStockAdjustmentApi,
  createRmTransferApi,
  updateStockMovementApi,
  deleteStockMovementApi,
  printLogisticsHtmlReport,
  extractLogisticsError,
  StockAdjustmentPayload,
  RmTransferPayload,
} from '../../services/logisticsService';
import { listProductionStocksApi } from '../../services/productionService';
import type { StockMovement } from '../../types/logisticsRmStock';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

export const RmStockTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'WAREHOUSE_PPIC' || userDivision === 'DELIVERY';

  const [subTab, setSubTab] = useState<'monitoring' | 'adjustments' | 'transfers'>('monitoring');

  // Sub-Tab A: Monitoring
  const [catFilter, setCatFilter] = useState('RAW_MATERIAL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [monSearch, setMonSearch] = useState('');
  const [editMinItemId, setEditMinItemId] = useState<string | null>(null);
  const [editMinVal, setEditMinVal] = useState<number>(0);

  // Sub-Tab B & C: Movements
  const [movPage, setMovPage] = useState(1);
  const [movSearch, setMovSearch] = useState('');
  const [isAddingAdj, setIsAddingAdj] = useState(false);
  const [adjDraft, setAdjDraft] = useState<StockAdjustmentPayload>({
    movementType: 'ADJUSTMENT_IN',
    movementDate: todayStr(),
    stockInventoryId: '',
    qty: 1,
    referenceNumber: '',
    reason: '',
    notes: '',
  });
  const [isAddingTrf, setIsAddingTrf] = useState(false);
  const [trfDraft, setTrfDraft] = useState<RmTransferPayload>({
    movementDate: todayStr(),
    stockInventoryId: '',
    qtyTransfer: 1,
    fromLocation: 'RM_WAREHOUSE',
    toLocation: 'PRODUCTION_FLOOR',
    toRack: 'LINE-SLIT-01',
    referenceNumber: '',
    reason: '',
    notes: '',
  });
  const [editingMovId, setEditingMovId] = useState<string | null>(null);
  const [editMovDraft, setEditMovDraft] = useState({ referenceNumber: '', reason: '', notes: '' });
  const [voidMovement, setVoidMovement] = useState<StockMovement | null>(null);

  const { data: monitoring = [], isLoading: isLoadingMon } = useQuery({
    queryKey: ['rmStockMonitoring', catFilter, lowStockOnly, monSearch],
    queryFn: () => getRmStockMonitoringApi({ category: catFilter, lowStockOnly, search: monSearch || undefined }),
    enabled: subTab === 'monitoring',
  });

  const { data: movementsRes, isLoading: isLoadingMov } = useQuery({
    queryKey: ['rmStockMovements', subTab, movPage, movSearch],
    queryFn: () =>
      listStockMovementsApi({
        page: movPage,
        limit: 20,
        movementType: subTab === 'transfers' ? 'RM_TRANSFER' : undefined,
        search: movSearch || undefined,
      }),
    enabled: subTab !== 'monitoring',
  });
  const movements = (movementsRes?.data || []).filter((m) =>
    subTab === 'transfers' ? m.movementType === 'RM_TRANSFER' : m.movementType !== 'RM_TRANSFER'
  );
  const movTotalPages = movementsRes?.meta?.totalPages || movementsRes?.meta?.total_pages || 1;

  const { data: stocksRes } = useQuery({
    queryKey: ['productionStocksDropdown'],
    queryFn: () => listProductionStocksApi({ page: 1, limit: 100 }),
    enabled: subTab !== 'monitoring',
  });
  const stocks = stocksRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['rmStockMonitoring'] });
    queryClient.invalidateQueries({ queryKey: ['rmStockMovements'] });
    queryClient.invalidateQueries({ queryKey: ['productionStocks'] });
    queryClient.invalidateQueries({ queryKey: ['productionStocksDropdown'] });
    queryClient.invalidateQueries({ queryKey: ['availableStocksForSpk'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDashboardSummary'] });
  };

  const handleErr = (e: any, fallback: string) => {
    const { message, isHoldLockout, isInsufficientStock } = extractLogisticsError(e, fallback);
    if (isHoldLockout) toast.error(`HOLD LOCKOUT (4.5.3): ${message}`, { duration: 6000 });
    else if (isInsufficientStock) toast.error(`STOK TIDAK CUKUP: ${message}`, { duration: 6000 });
    else toast.error(message);
  };

  const minStockMut = useMutation({
    mutationFn: ({ itemId, minStock }: { itemId: string; minStock: number }) => updateItemMinStockApi(itemId, minStock),
    onSuccess: () => {
      toast.success('Batas minimum stok (min_stock) diperbarui');
      setEditMinItemId(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui min_stock'),
  });

  const adjMut = useMutation({
    mutationFn: (p: StockAdjustmentPayload) => createStockAdjustmentApi(p),
    onSuccess: () => {
      toast.success('Stock Adjustment berhasil dicatat');
      setIsAddingAdj(false);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal mencatat Stock Adjustment'),
  });

  const trfMut = useMutation({
    mutationFn: (p: RmTransferPayload) => createRmTransferApi(p),
    onSuccess: () => {
      toast.success('RM Transfer berhasil dicatat');
      setIsAddingTrf(false);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal mencatat RM Transfer'),
  });

  const updateMovMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: { referenceNumber?: string; reason?: string; notes?: string } }) =>
      updateStockMovementApi(id, p),
    onSuccess: () => {
      toast.success('Mutasi stok berhasil diperbarui');
      setEditingMovId(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui mutasi'),
  });

  const deleteMovMut = useMutation({
    mutationFn: (id: string) => deleteStockMovementApi(id),
    onSuccess: () => {
      toast.success('Mutasi dibatalkan — saldo stok & rak asal telah dikembalikan otomatis.');
      setVoidMovement(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal membatalkan mutasi'),
  });

  const renderHealthBadge = (health: string) => {
    if (health === 'OUT_OF_STOCK') return <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">OUT_OF_STOCK</span>;
    if (health === 'LOW_STOCK') return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">LOW_STOCK</span>;
    return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">SAFE</span>;
  };

  return (
    <div className="space-y-4">
      {/* 3 Sub-Tabs for 3.2.1 RM Stock */}
      <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 gap-1 border border-slate-200">
        {[
          { id: 'monitoring', label: 'A. Monitoring Low Stock & Min Stock' },
          { id: 'adjustments', label: 'B. Stock Adjustment (IN/OUT/OPNAME)' },
          { id: 'transfers', label: 'C. Raw Material Transfer (Anti-HOLD)' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setSubTab(t.id as any); setMovPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === t.id ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SUB-TAB A: Monitoring & Inline min_stock ── */}
      {subTab === 'monitoring' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Cari Kode / Nama Bahan Baku..." value={monSearch} onChange={(e) => setMonSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
              <option value="RAW_MATERIAL">RAW_MATERIAL</option>
              <option value="FINISH_GOOD">FINISH_GOOD</option>
              <option value="ALL">Semua Kategori</option>
            </select>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer">
              <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Hanya Low Stock</span>
            </label>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="px-3 py-2.5">Kode &amp; Nama Bahan Baku</th>
                    <th className="px-3 py-2.5">Unit</th>
                    <th className="px-3 py-2.5 text-right">Stok AVAILABLE</th>
                    <th className="px-3 py-2.5 text-right">Stok HOLD</th>
                    <th className="px-3 py-2.5 text-right">Total Stok</th>
                    <th className="px-3 py-2.5 text-right">Batas Minimum (min_stock)</th>
                    <th className="px-3 py-2.5 text-right">Shortage</th>
                    <th className="px-3 py-2.5 text-center">Status Kesehatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingMon ? (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat monitoring stok...</td></tr>
                  ) : monitoring.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">Tidak ada item stok ditemukan.</td></tr>
                  ) : (
                    monitoring.map((m) => (
                      <tr key={m.itemId} className={`hover:bg-slate-50/80 ${m.isLowStock ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{m.itemName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{m.itemCode} • {m.batchCount} Batch</div>
                        </td>
                        <td className="px-3 py-2.5">{m.unit}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{m.availableQty}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-amber-700">{m.holdQty}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold">{m.totalQty}</td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {editMinItemId === m.itemId ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={editMinVal}
                                onChange={(e) => setEditMinVal(Number(e.target.value))}
                                className="w-20 px-1.5 py-0.5 rounded border border-blue-400 text-right font-mono bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => minStockMut.mutate({ itemId: m.itemId, minStock: editMinVal })}
                                disabled={minStockMut.isPending}
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button type="button" onClick={() => setEditMinItemId(null)} className="p-1 rounded border border-slate-300 bg-white cursor-pointer">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span>{m.minStock}</span>
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => { setEditMinItemId(m.itemId); setEditMinVal(m.minStock); }}
                                  title="Edit min_stock inline"
                                  className="p-1 rounded hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">
                          {m.shortageQty > 0 ? `-${m.shortageQty}` : '0'}
                        </td>
                        <td className="px-3 py-2.5 text-center">{renderHealthBadge(m.stockHealth)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB B & C: Stock Adjustments & RM Transfers ── */}
      {subTab !== 'monitoring' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Cari No. Mutasi / LOT / Item..." value={movSearch} onChange={(e) => { setMovSearch(e.target.value); setMovPage(1); }} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
            </div>

            {canWrite && subTab === 'adjustments' && (
              <button
                type="button"
                onClick={() => setIsAddingAdj(true)}
                disabled={isAddingAdj}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> <span>+ Catat Stock Adjustment</span>
              </button>
            )}

            {canWrite && subTab === 'transfers' && (
              <button
                type="button"
                onClick={() => setIsAddingTrf(true)}
                disabled={isAddingTrf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> <span>+ Catat RM Transfer</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="px-3 py-2.5">No. Mutasi &amp; Tgl</th>
                    <th className="px-3 py-2.5">Tipe</th>
                    <th className="px-3 py-2.5">Item &amp; LOT</th>
                    <th className="px-3 py-2.5 text-right">Saldo (Sebelum → Sesudah)</th>
                    <th className="px-3 py-2.5">Lokasi / Rak</th>
                    <th className="px-3 py-2.5">Referensi &amp; Alasan</th>
                    <th className="px-3 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {/* Inline Add Stock Adjustment */}
                  {canWrite && subTab === 'adjustments' && isAddingAdj && (
                    <tr className="bg-blue-50 border-b border-blue-200 align-top">
                      <td className="px-3 py-2.5 space-y-1">
                        <div className="font-mono font-bold text-blue-700">AUTO-ADJ</div>
                        <input type="date" value={adjDraft.movementDate} onChange={(e) => setAdjDraft({ ...adjDraft, movementDate: e.target.value })} className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
                      </td>
                      <td className="px-3 py-2.5">
                        <select value={adjDraft.movementType} onChange={(e) => setAdjDraft({ ...adjDraft, movementType: e.target.value as StockAdjustmentPayload['movementType'] })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold">
                          <option value="ADJUSTMENT_IN">ADJUSTMENT_IN</option>
                          <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT</option>
                          <option value="STOCK_OPNAME">STOCK_OPNAME</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 min-w-[220px]">
                        <select value={adjDraft.stockInventoryId} onChange={(e) => setAdjDraft({ ...adjDraft, stockInventoryId: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
                          <option value="">-- Pilih Batch Stok --</option>
                          {stocks.map((s) => (
                            <option key={s.id} value={s.id}>
                              [{s.lotNumber}] {s.itemName} (Saldo: {s.qty} • {s.stockStatus})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" min={0} value={adjDraft.qty} onChange={(e) => setAdjDraft({ ...adjDraft, qty: Number(e.target.value) })} className="w-24 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-right" />
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">-</td>
                      <td className="px-3 py-2.5 space-y-1 min-w-[180px]">
                        <input type="text" placeholder="No. Ref (OPN-2026-11)" value={adjDraft.referenceNumber || ''} onChange={(e) => setAdjDraft({ ...adjDraft, referenceNumber: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
                        <input type="text" placeholder="Alasan penyesuaian..." value={adjDraft.reason || ''} onChange={(e) => setAdjDraft({ ...adjDraft, reason: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!adjDraft.stockInventoryId) return toast.error('Pilih batch stok terlebih dahulu');
                              adjMut.mutate(adjDraft);
                            }}
                            disabled={adjMut.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" /> Simpan
                          </button>
                          <button type="button" onClick={() => setIsAddingAdj(false)} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer">
                            <X className="w-3.5 h-3.5" /> Batal
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Inline Add RM Transfer */}
                  {canWrite && subTab === 'transfers' && isAddingTrf && (
                    <tr className="bg-blue-50 border-b border-blue-200 align-top">
                      <td className="px-3 py-2.5 space-y-1">
                        <div className="font-mono font-bold text-blue-700">AUTO-TRF</div>
                        <input type="date" value={trfDraft.movementDate} onChange={(e) => setTrfDraft({ ...trfDraft, movementDate: e.target.value })} className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
                      </td>
                      <td className="px-3 py-2.5 font-bold text-indigo-700">RM_TRANSFER</td>
                      <td className="px-3 py-2.5 min-w-[220px]">
                        <select value={trfDraft.stockInventoryId} onChange={(e) => setTrfDraft({ ...trfDraft, stockInventoryId: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
                          <option value="">-- Pilih Batch RM --</option>
                          {stocks.map((s) => (
                            <option key={s.id} value={s.id}>
                              [{s.lotNumber}] {s.itemName} (Rak: {s.rackNumber || '-'} • Qty: {s.qty} • {s.stockStatus})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" min={1} value={trfDraft.qtyTransfer} onChange={(e) => setTrfDraft({ ...trfDraft, qtyTransfer: Number(e.target.value) })} className="w-20 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-right" />
                      </td>
                      <td className="px-3 py-2.5 space-y-1 min-w-[160px]">
                        <select value={trfDraft.toLocation} onChange={(e) => setTrfDraft({ ...trfDraft, toLocation: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
                          <option value="PRODUCTION_FLOOR">PRODUCTION_FLOOR</option>
                          <option value="RM_WAREHOUSE">RM_WAREHOUSE</option>
                          <option value="WIP_AREA">WIP_AREA</option>
                        </select>
                        <input type="text" placeholder="Rak Tujuan (LINE-SLIT-01)" value={trfDraft.toRack || ''} onChange={(e) => setTrfDraft({ ...trfDraft, toRack: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white font-mono text-[11px]" />
                      </td>
                      <td className="px-3 py-2.5 space-y-1 min-w-[160px]">
                        <input type="text" placeholder="No. SPK / Ref" value={trfDraft.referenceNumber || ''} onChange={(e) => setTrfDraft({ ...trfDraft, referenceNumber: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
                        <input type="text" placeholder="Alasan transfer..." value={trfDraft.reason || ''} onChange={(e) => setTrfDraft({ ...trfDraft, reason: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!trfDraft.stockInventoryId) return toast.error('Pilih batch RM terlebih dahulu');
                              trfMut.mutate(trfDraft);
                            }}
                            disabled={trfMut.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" /> Simpan
                          </button>
                          <button type="button" onClick={() => setIsAddingTrf(false)} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer">
                            <X className="w-3.5 h-3.5" /> Batal
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {isLoadingMov ? (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat riwayat mutasi stok...</td></tr>
                  ) : movements.length === 0 && !isAddingAdj && !isAddingTrf ? (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400">Belum ada data mutasi stok.</td></tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-800">{m.movementNumber}</div>
                          <div className="text-[10px] text-slate-400">{m.movementDate} • {m.performedBy}</div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">{m.movementType}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{m.itemName}</div>
                          <div className="text-[11px] font-mono text-slate-400">LOT: {m.lotNumber || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                          <span className="text-slate-500">{m.qtyBefore}</span> →{' '}
                          <strong className={m.qtyChange >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {m.qtyAfter} ({m.qtyChange >= 0 ? `+${m.qtyChange}` : m.qtyChange})
                          </strong>
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {m.fromLocation || m.fromRack || '-'} → <strong>{m.toLocation || m.toRack || '-'}</strong>
                        </td>
                        <td className="px-3 py-2.5">
                          {editingMovId === m.id ? (
                            <div className="space-y-1">
                              <input type="text" value={editMovDraft.referenceNumber} onChange={(e) => setEditMovDraft({ ...editMovDraft, referenceNumber: e.target.value })} className="w-full px-1.5 py-0.5 rounded border border-blue-400 text-xs" />
                              <input type="text" value={editMovDraft.reason} onChange={(e) => setEditMovDraft({ ...editMovDraft, reason: e.target.value })} className="w-full px-1.5 py-0.5 rounded border border-blue-400 text-[11px]" />
                            </div>
                          ) : (
                            <>
                              <div className="font-mono text-[11px]">{m.referenceNumber || '-'}</div>
                              <div className="text-[11px] text-slate-500">{m.reason || '-'}</div>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            {editingMovId === m.id ? (
                              <>
                                <button type="button" onClick={() => updateMovMut.mutate({ id: m.id, p: editMovDraft })} className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold cursor-pointer">Simpan</button>
                                <button type="button" onClick={() => setEditingMovId(null)} className="px-2 py-1 rounded border border-slate-300 bg-white text-[10px] font-bold cursor-pointer">Batal</button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    printLogisticsHtmlReport(`/warehouse/rm-stocks/movements/${m.id}/print`).catch((e) =>
                                      toast.error(e?.message || 'Gagal mencetak bukti mutasi')
                                    )
                                  }
                                  title="Cetak Bukti Mutasi"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                {canWrite && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMovId(m.id);
                                      setEditMovDraft({ referenceNumber: m.referenceNumber || '', reason: m.reason || '', notes: m.notes || '' });
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canWrite && (
                                  <button type="button" onClick={() => setVoidMovement(m)} title="Batalkan & Kembalikan Stok" className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Halaman {movPage} dari {movTotalPages}</span>
              <div className="flex gap-1.5">
                <button type="button" disabled={movPage <= 1} onClick={() => setMovPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">Prev</button>
                <button type="button" disabled={movPage >= movTotalPages} onClick={() => setMovPage((p) => p + 1)} className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(voidMovement)}
        title="Batalkan Mutasi Stok & Kembalikan Saldo?"
        message={`Anda yakin ingin membatalkan ${voidMovement?.movementNumber || ''}? Saldo stok dan posisi rak asal akan dikembalikan otomatis.`}
        confirmLabel="Ya, Batalkan & Reversal"
        variant="danger"
        loading={deleteMovMut.isPending}
        onConfirm={() => voidMovement && deleteMovMut.mutate(voidMovement.id)}
        onCancel={() => setVoidMovement(null)}
      />
    </div>
  );
};
