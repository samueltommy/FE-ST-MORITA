import React, { useState, useMemo } from 'react';
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
import type { RMStockItemSummary, StockMovement } from '../../types/logisticsRmStock';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

const todayStr = () => new Date().toISOString().split('T')[0];

export const RmStockTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite =
    isSuperAdmin || isExecutive || userDivision === 'WAREHOUSE_PPIC' || userDivision === 'DELIVERY';

  const [subTab, setSubTab] = useState<'monitoring' | 'adjustments' | 'transfers'>('monitoring');
  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');

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
    queryFn: () =>
      getRmStockMonitoringApi({
        category: catFilter,
        lowStockOnly,
        search: monSearch || undefined,
      }),
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
  const movTotalItems = movementsRes?.meta?.total ?? movementsRes?.meta?.totalItems ?? movements.length;

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
    mutationFn: ({ itemId, minStock }: { itemId: string; minStock: number }) =>
      updateItemMinStockApi(itemId, minStock),
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
    mutationFn: ({
      id,
      p,
    }: {
      id: string;
      p: { referenceNumber?: string; reason?: string; notes?: string };
    }) => updateStockMovementApi(id, p),
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
    if (health === 'OUT_OF_STOCK') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black">
          OUT_OF_STOCK
        </span>
      );
    }
    if (health === 'LOW_STOCK') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          LOW_STOCK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
        SAFE
      </span>
    );
  };

  // Excel columns for Sub-Tab A (Monitoring)
  const monTotals = useMemo(
    () =>
      monitoring.reduce(
        (acc, m) => ({
          available: acc.available + (Number(m.availableQty) || 0),
          hold: acc.hold + (Number(m.holdQty) || 0),
          total: acc.total + (Number(m.totalQty) || 0),
          shortage: acc.shortage + (Number(m.shortageQty) || 0),
        }),
        { available: 0, hold: 0, total: 0, shortage: 0 }
      ),
    [monitoring]
  );

  const monExcelColumns: ExcelColumn<RMStockItemSummary>[] = useMemo(
    () => [
      {
        key: 'itemCode',
        header: 'Kode Item',
        mono: true,
        minWidth: 'min-w-[130px]',
        getValue: (m) => m.itemCode,
      },
      {
        key: 'itemName',
        header: 'Nama Bahan Baku / Item',
        minWidth: 'min-w-[220px]',
        getValue: (m) => m.itemName,
      },
      {
        key: 'category',
        header: 'Kategori',
        mono: true,
        getValue: (m) => m.category || '-',
      },
      {
        key: 'unit',
        header: 'Unit',
        align: 'center',
        getValue: (m) => m.unit || '-',
      },
      {
        key: 'batchCount',
        header: 'Jumlah Batch',
        align: 'right',
        mono: true,
        getValue: (m) => m.batchCount,
      },
      {
        key: 'availableQty',
        header: 'Stok AVAILABLE',
        align: 'right',
        mono: true,
        getValue: (m) => m.availableQty,
        render: (m) => (
          <span className="font-bold text-emerald-700">
            {Number(m.availableQty).toLocaleString('id-ID')}
          </span>
        ),
        footer: (
          <span className="text-emerald-800">{monTotals.available.toLocaleString('id-ID')}</span>
        ),
      },
      {
        key: 'holdQty',
        header: 'Stok HOLD',
        align: 'right',
        mono: true,
        getValue: (m) => m.holdQty,
        render: (m) => (
          <span className="text-amber-700">{Number(m.holdQty).toLocaleString('id-ID')}</span>
        ),
        footer: <span className="text-amber-800">{monTotals.hold.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'totalQty',
        header: 'Total Stok',
        align: 'right',
        mono: true,
        getValue: (m) => m.totalQty,
        render: (m) => <span className="font-bold">{Number(m.totalQty).toLocaleString('id-ID')}</span>,
        footer: <span>{monTotals.total.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'minStock',
        header: 'Batas Minimum (min_stock)',
        align: 'right',
        mono: true,
        getValue: (m) => m.minStock,
      },
      {
        key: 'shortageQty',
        header: 'Shortage',
        align: 'right',
        mono: true,
        getValue: (m) => (m.shortageQty > 0 ? -m.shortageQty : 0),
        render: (m) => (
          <span className="font-bold text-rose-600">
            {m.shortageQty > 0 ? `-${Number(m.shortageQty).toLocaleString('id-ID')}` : '0'}
          </span>
        ),
        footer: (
          <span className="text-rose-700">
            {monTotals.shortage > 0 ? `-${monTotals.shortage.toLocaleString('id-ID')}` : '0'}
          </span>
        ),
      },
      {
        key: 'stockHealth',
        header: 'Status Kesehatan',
        align: 'center',
        getValue: (m) => m.stockHealth,
        render: (m) => renderHealthBadge(m.stockHealth),
      },
    ],
    [monTotals]
  );

  // Excel columns for Sub-Tab B & C (Movements)
  const totalMovChange = useMemo(
    () => movements.reduce((acc, m) => acc + (Number(m.qtyChange) || 0), 0),
    [movements]
  );

  const movExcelColumns: ExcelColumn<StockMovement>[] = useMemo(
    () => [
      {
        key: 'movementNumber',
        header: 'No. Mutasi',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (m) => m.movementNumber,
      },
      {
        key: 'movementDate',
        header: 'Tanggal Mutasi',
        mono: true,
        getValue: (m) => m.movementDate || '-',
      },
      {
        key: 'movementType',
        header: 'Tipe Mutasi',
        mono: true,
        getValue: (m) => m.movementType,
        render: (m) => (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
            {m.movementType}
          </span>
        ),
      },
      {
        key: 'itemCode',
        header: 'Kode Item',
        mono: true,
        getValue: (m) => m.itemCode || '-',
      },
      {
        key: 'itemName',
        header: 'Nama Item',
        minWidth: 'min-w-[200px]',
        getValue: (m) => m.itemName || '-',
      },
      {
        key: 'lotNumber',
        header: 'No. LOT / Batch',
        mono: true,
        getValue: (m) => m.lotNumber || '-',
      },
      {
        key: 'qtyBefore',
        header: 'Saldo Sebelum',
        align: 'right',
        mono: true,
        getValue: (m) => m.qtyBefore,
      },
      {
        key: 'qtyChange',
        header: 'Perubahan (+/-)',
        align: 'right',
        mono: true,
        getValue: (m) => m.qtyChange,
        render: (m) => (
          <span className={`font-bold ${m.qtyChange >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {m.qtyChange >= 0 ? `+${m.qtyChange}` : m.qtyChange}
          </span>
        ),
        footer: (
          <span className={totalMovChange >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
            {totalMovChange >= 0 ? `+${totalMovChange}` : totalMovChange}
          </span>
        ),
      },
      {
        key: 'qtyAfter',
        header: 'Saldo Sesudah',
        align: 'right',
        mono: true,
        getValue: (m) => m.qtyAfter,
        render: (m) => <span className="font-bold text-slate-900">{m.qtyAfter}</span>,
      },
      {
        key: 'fromLocation',
        header: 'Lokasi Asal',
        getValue: (m) => m.fromLocation || '-',
      },
      {
        key: 'fromRack',
        header: 'Rak Asal',
        mono: true,
        getValue: (m) => m.fromRack || '-',
      },
      {
        key: 'toLocation',
        header: 'Lokasi Tujuan',
        getValue: (m) => m.toLocation || '-',
      },
      {
        key: 'toRack',
        header: 'Rak Tujuan',
        mono: true,
        getValue: (m) => m.toRack || '-',
      },
      {
        key: 'referenceNumber',
        header: 'No. Referensi',
        mono: true,
        getValue: (m) => m.referenceNumber || '-',
      },
      {
        key: 'reason',
        header: 'Alasan',
        minWidth: 'min-w-[180px]',
        getValue: (m) => m.reason || '-',
      },
      {
        key: 'notes',
        header: 'Catatan',
        minWidth: 'min-w-[160px]',
        getValue: (m) => m.notes || '-',
      },
      {
        key: 'performedBy',
        header: 'Petugas',
        getValue: (m) => m.performedBy || '-',
      },
    ],
    [totalMovChange]
  );

  const handleExportMonCsv = () => {
    exportExcelCsv('rm-stock-monitoring', monExcelColumns, monitoring);
  };

  const handleExportMovCsv = () => {
    exportExcelCsv(
      subTab === 'transfers' ? 'rm-stock-transfers' : 'rm-stock-adjustments',
      movExcelColumns,
      movements
    );
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
            onClick={() => {
              setSubTab(t.id as any);
              setMovPage(1);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === t.id
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SUB-TAB A: Monitoring & Inline min_stock ── */}
      {subTab === 'monitoring' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari Kode / Nama Bahan Baku..."
                  value={monSearch}
                  onChange={(e) => setMonSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="RAW_MATERIAL">RAW_MATERIAL</option>
                <option value="FINISH_GOOD">FINISH_GOOD</option>
                <option value="ALL">Semua Kategori</option>
              </select>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                />
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Hanya Low Stock</span>
              </label>
            </div>

            <ExcelViewToggle
              value={tableStyle}
              onChange={setTableStyle}
              onExport={handleExportMonCsv}
              exportDisabled={monitoring.length === 0}
            />
          </div>

          {tableStyle === 'excel' ? (
            <ExcelSpreadsheetTable
              title={`Tabel Excel Monitoring Stok RM & Min Stock — ${monitoring.length} Item`}
              subtitle="Beralih ke mode Ringkas untuk mengubah batas minimum (min_stock) secara inline"
              columns={monExcelColumns}
              rows={monitoring}
              rowKey={(m) => m.itemId}
              isLoading={isLoadingMon}
              emptyText="Tidak ada item stok ditemukan."
              footerLabel="TOTAL STOK"
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                      <th className="border-b border-r border-slate-200 px-3.5 py-3">
                        Kode &amp; Nama Bahan Baku
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3">Unit</th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3 text-right">
                        Stok AVAILABLE
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3 text-right">
                        Stok HOLD
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3 text-right">
                        Total Stok
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3 text-right">
                        Batas Minimum (min_stock)
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3 text-right">
                        Shortage
                      </th>
                      <th className="border-b border-slate-200 px-3.5 py-3 text-center">
                        Status Kesehatan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {isLoadingMon ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat monitoring
                          stok...
                        </td>
                      </tr>
                    ) : monitoring.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          Tidak ada item stok ditemukan.
                        </td>
                      </tr>
                    ) : (
                      monitoring.map((m) => (
                        <tr
                          key={m.itemId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            m.isLowStock ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="border-r border-slate-200 px-3.5 py-3">
                            <div className="font-semibold text-slate-900">{m.itemName}</div>
                            <div className="text-xs font-mono text-slate-500 mt-0.5">
                              {m.itemCode} • {m.batchCount} Batch
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-slate-700">
                            {m.unit}
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                            {Number(m.availableQty).toLocaleString('id-ID')}
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-right font-mono text-amber-700">
                            {Number(m.holdQty).toLocaleString('id-ID')}
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                            {Number(m.totalQty).toLocaleString('id-ID')}
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-right font-mono">
                            {editMinItemId === m.itemId ? (
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={editMinVal}
                                  onChange={(e) => setEditMinVal(Number(e.target.value))}
                                  className="w-24 px-2 py-1 rounded-lg border border-blue-400 text-right font-mono bg-white text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    minStockMut.mutate({ itemId: m.itemId, minStock: editMinVal })
                                  }
                                  disabled={minStockMut.isPending}
                                  className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditMinItemId(null)}
                                  className="p-1.5 rounded-lg border border-slate-300 bg-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <span>{Number(m.minStock).toLocaleString('id-ID')}</span>
                                {canWrite && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditMinItemId(m.itemId);
                                      setEditMinVal(m.minStock);
                                    }}
                                    title="Edit min_stock inline"
                                    className="p-1 rounded hover:bg-blue-50 text-blue-600 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-right font-mono font-bold text-rose-600">
                            {m.shortageQty > 0
                              ? `-${Number(m.shortageQty).toLocaleString('id-ID')}`
                              : '0'}
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            {renderHealthBadge(m.stockHealth)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB B & C: Stock Adjustments & RM Transfers ── */}
      {subTab !== 'monitoring' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari No. Mutasi / LOT / Item..."
                value={movSearch}
                onChange={(e) => {
                  setMovSearch(e.target.value);
                  setMovPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ExcelViewToggle
                value={tableStyle}
                onChange={setTableStyle}
                onExport={handleExportMovCsv}
                exportDisabled={movements.length === 0}
              />

              {canWrite && subTab === 'adjustments' && (
                <button
                  type="button"
                  onClick={() => {
                    setTableStyle('preview');
                    setIsAddingAdj(true);
                  }}
                  disabled={isAddingAdj}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Catat Stock Adjustment</span>
                </button>
              )}

              {canWrite && subTab === 'transfers' && (
                <button
                  type="button"
                  onClick={() => {
                    setTableStyle('preview');
                    setIsAddingTrf(true);
                  }}
                  disabled={isAddingTrf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Catat RM Transfer</span>
                </button>
              )}
            </div>
          </div>

          {tableStyle === 'excel' ? (
            <ExcelSpreadsheetTable
              title={`Tabel Excel ${
                subTab === 'transfers' ? 'Raw Material Transfer' : 'Stock Adjustment'
              } — ${movements.length} Mutasi`}
              subtitle="Beralih ke mode Ringkas untuk mencatat mutasi baru, cetak bukti, atau reversal"
              columns={movExcelColumns}
              rows={movements}
              rowKey={(m) => m.id}
              isLoading={isLoadingMov}
              emptyText="Belum ada data mutasi stok."
              footerLabel="NET PERUBAHAN"
              pagination={{
                page: movPage,
                totalPages: movTotalPages,
                totalItems: movTotalItems,
                unitLabel: 'mutasi',
                onPrev: () => setMovPage((p) => Math.max(1, p - 1)),
                onNext: () => setMovPage((p) => p + 1),
              }}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                      <th className="border-b border-r border-slate-200 px-3.5 py-3">
                        No. Mutasi &amp; Tgl
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3">Tipe</th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3">
                        Item &amp; LOT
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3 text-right">
                        Saldo (Sebelum → Sesudah)
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3">
                        Lokasi / Rak
                      </th>
                      <th className="border-b border-r border-slate-200 px-3.5 py-3">
                        Referensi &amp; Alasan
                      </th>
                      <th className="border-b border-slate-200 px-3.5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {/* Inline Add Stock Adjustment */}
                    {canWrite && subTab === 'adjustments' && isAddingAdj && (
                      <tr className="bg-blue-50 border-b border-blue-200 align-top">
                        <td className="border-r border-blue-200 px-3 py-3 space-y-1.5">
                          <div className="font-mono text-xs font-bold text-blue-700">AUTO-ADJ</div>
                          <input
                            type="date"
                            value={adjDraft.movementDate}
                            onChange={(e) =>
                              setAdjDraft({ ...adjDraft, movementDate: e.target.value })
                            }
                            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3">
                          <select
                            value={adjDraft.movementType}
                            onChange={(e) =>
                              setAdjDraft({
                                ...adjDraft,
                                movementType: e.target
                                  .value as StockAdjustmentPayload['movementType'],
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                          >
                            <option value="ADJUSTMENT_IN">ADJUSTMENT_IN</option>
                            <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT</option>
                            <option value="STOCK_OPNAME">STOCK_OPNAME</option>
                          </select>
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3 min-w-[230px]">
                          <select
                            value={adjDraft.stockInventoryId}
                            onChange={(e) =>
                              setAdjDraft({ ...adjDraft, stockInventoryId: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          >
                            <option value="">-- Pilih Batch Stok --</option>
                            {stocks.map((s) => (
                              <option key={s.id} value={s.id}>
                                [{s.lotNumber}] {s.itemName} (Saldo: {s.qty} • {s.stockStatus})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            value={adjDraft.qty}
                            onChange={(e) =>
                              setAdjDraft({ ...adjDraft, qty: Number(e.target.value) })
                            }
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-right text-sm"
                          />
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3 text-slate-400">-</td>
                        <td className="border-r border-blue-200 px-3 py-3 space-y-1.5 min-w-[190px]">
                          <input
                            type="text"
                            placeholder="No. Ref (OPN-2026-11)"
                            value={adjDraft.referenceNumber || ''}
                            onChange={(e) =>
                              setAdjDraft({ ...adjDraft, referenceNumber: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Alasan penyesuaian..."
                            value={adjDraft.reason || ''}
                            onChange={(e) => setAdjDraft({ ...adjDraft, reason: e.target.value })}
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!adjDraft.stockInventoryId)
                                  return toast.error('Pilih batch stok terlebih dahulu');
                                adjMut.mutate(adjDraft);
                              }}
                              disabled={adjMut.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" /> Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddingAdj(false)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Batal
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Inline Add RM Transfer */}
                    {canWrite && subTab === 'transfers' && isAddingTrf && (
                      <tr className="bg-blue-50 border-b border-blue-200 align-top">
                        <td className="border-r border-blue-200 px-3 py-3 space-y-1.5">
                          <div className="font-mono text-xs font-bold text-blue-700">AUTO-TRF</div>
                          <input
                            type="date"
                            value={trfDraft.movementDate}
                            onChange={(e) =>
                              setTrfDraft({ ...trfDraft, movementDate: e.target.value })
                            }
                            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3 font-bold text-xs text-indigo-700">
                          RM_TRANSFER
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3 min-w-[230px]">
                          <select
                            value={trfDraft.stockInventoryId}
                            onChange={(e) =>
                              setTrfDraft({ ...trfDraft, stockInventoryId: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          >
                            <option value="">-- Pilih Batch RM --</option>
                            {stocks.map((s) => (
                              <option key={s.id} value={s.id}>
                                [{s.lotNumber}] {s.itemName} (Rak: {s.rackNumber || '-'} • Qty:{' '}
                                {s.qty} • {s.stockStatus})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3">
                          <input
                            type="number"
                            min={1}
                            value={trfDraft.qtyTransfer}
                            onChange={(e) =>
                              setTrfDraft({ ...trfDraft, qtyTransfer: Number(e.target.value) })
                            }
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-right text-sm"
                          />
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3 space-y-1.5 min-w-[170px]">
                          <select
                            value={trfDraft.toLocation}
                            onChange={(e) =>
                              setTrfDraft({ ...trfDraft, toLocation: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          >
                            <option value="PRODUCTION_FLOOR">PRODUCTION_FLOOR</option>
                            <option value="RM_WAREHOUSE">RM_WAREHOUSE</option>
                            <option value="WIP_AREA">WIP_AREA</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Rak Tujuan (LINE-SLIT-01)"
                            value={trfDraft.toRack || ''}
                            onChange={(e) => setTrfDraft({ ...trfDraft, toRack: e.target.value })}
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                          />
                        </td>
                        <td className="border-r border-blue-200 px-3 py-3 space-y-1.5 min-w-[170px]">
                          <input
                            type="text"
                            placeholder="No. SPK / Ref"
                            value={trfDraft.referenceNumber || ''}
                            onChange={(e) =>
                              setTrfDraft({ ...trfDraft, referenceNumber: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Alasan transfer..."
                            value={trfDraft.reason || ''}
                            onChange={(e) => setTrfDraft({ ...trfDraft, reason: e.target.value })}
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!trfDraft.stockInventoryId)
                                  return toast.error('Pilih batch RM terlebih dahulu');
                                trfMut.mutate(trfDraft);
                              }}
                              disabled={trfMut.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" /> Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddingTrf(false)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Batal
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {isLoadingMov ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat riwayat
                          mutasi stok...
                        </td>
                      </tr>
                    ) : movements.length === 0 && !isAddingAdj && !isAddingTrf ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Belum ada data mutasi stok.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="border-r border-slate-200 px-3.5 py-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">
                              {m.movementNumber}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {m.movementDate} • {m.performedBy}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                              {m.movementType}
                            </span>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3">
                            <div className="font-semibold text-slate-900">{m.itemName}</div>
                            <div className="text-xs font-mono text-slate-500 mt-0.5">
                              LOT: {m.lotNumber || '-'}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-right font-mono whitespace-nowrap">
                            <span className="text-slate-500">{m.qtyBefore}</span> →{' '}
                            <strong
                              className={m.qtyChange >= 0 ? 'text-emerald-700' : 'text-rose-600'}
                            >
                              {m.qtyAfter} ({m.qtyChange >= 0 ? `+${m.qtyChange}` : m.qtyChange})
                            </strong>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-xs text-slate-700">
                            {m.fromLocation || m.fromRack || '-'} →{' '}
                            <strong className="text-slate-900">
                              {m.toLocation || m.toRack || '-'}
                            </strong>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3">
                            {editingMovId === m.id ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={editMovDraft.referenceNumber}
                                  onChange={(e) =>
                                    setEditMovDraft({
                                      ...editMovDraft,
                                      referenceNumber: e.target.value,
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-blue-400 text-xs"
                                />
                                <input
                                  type="text"
                                  value={editMovDraft.reason}
                                  onChange={(e) =>
                                    setEditMovDraft({ ...editMovDraft, reason: e.target.value })
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-blue-400 text-xs"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="font-mono text-xs text-slate-800">
                                  {m.referenceNumber || '-'}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {m.reason || '-'}
                                </div>
                              </>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1.5">
                              {editingMovId === m.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateMovMut.mutate({ id: m.id, p: editMovDraft })
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMovId(null)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      printLogisticsHtmlReport(
                                        `/warehouse/rm-stocks/movements/${m.id}/print`
                                      ).catch((e) =>
                                        toast.error(e?.message || 'Gagal mencetak bukti mutasi')
                                      )
                                    }
                                    title="Cetak Bukti Mutasi"
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  {canWrite && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMovId(m.id);
                                        setEditMovDraft({
                                          referenceNumber: m.referenceNumber || '',
                                          reason: m.reason || '',
                                          notes: m.notes || '',
                                        });
                                      }}
                                      title="Edit Referensi / Alasan"
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canWrite && (
                                    <button
                                      type="button"
                                      onClick={() => setVoidMovement(m)}
                                      title="Batalkan & Kembalikan Stok"
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
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
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Halaman <strong className="text-slate-900">{movPage}</strong> dari{' '}
                  <strong className="text-slate-900">{movTotalPages}</strong> • Total{' '}
                  <strong className="text-slate-900">{movTotalItems}</strong> mutasi
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={movPage <= 1}
                    onClick={() => setMovPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={movPage >= movTotalPages}
                    onClick={() => setMovPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </div>
          )}
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
