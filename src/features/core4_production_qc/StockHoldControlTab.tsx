import React, { useMemo, useState } from 'react';
import { Plus, Search, Save, X, Unlock, RefreshCw, Loader2, Eye } from 'lucide-react';
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
import type { StockBatch, StockStatus } from '../../types/productionQc';
import { useRBAC } from '../../hooks/useRBAC';
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  EXCEL_CELL,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

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

type WorksheetMode = 'list' | 'create' | 'detail';

export const StockHoldControlTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canWriteStock =
    isSuperAdmin || isExecutive || userDivision === 'WAREHOUSE_PPIC' || userDivision === 'PRODUKSI_QC';
  const canReleaseHold =
    isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'PRODUKSI_QC');

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [worksheetMode, setWorksheetMode] = useState<WorksheetMode>('list');
  const [selectedStock, setSelectedStock] = useState<StockBatch | null>(null);
  const [draft, setDraft] = useState<StockBatchPayload>(emptyDraft);

  // Inline / detail status update & release hold state
  const [statusEditId, setStatusEditId] = useState<string | null>(null);
  const [statusEditVal, setStatusEditVal] = useState<StockStatus>('HOLD');
  const [statusEditReason, setStatusEditReason] = useState('');

  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState('');

  const { data: res, isLoading } = useQuery({
    queryKey: ['productionStocks', page, search, statusFilter],
    queryFn: () =>
      listProductionStocksApi({
        page,
        limit: 50,
        search: search || undefined,
        stockStatus: statusFilter,
      }),
  });
  const stocks = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;
  const totalItems = res?.meta?.total;

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
      setWorksheetMode('list');
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal mencatat batch stok').message),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({
      id,
      stockStatus,
      holdReason,
    }: {
      id: string;
      stockStatus: StockStatus;
      holdReason?: string;
    }) => updateStockStatusApi(id, { stockStatus, holdReason: holdReason || null }),
    onSuccess: () => {
      toast.success('Status stok batch berhasil diperbarui');
      setStatusEditId(null);
      if (worksheetMode === 'detail') {
        setWorksheetMode('list');
        setSelectedStock(null);
      }
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
      if (worksheetMode === 'detail') {
        setWorksheetMode('list');
        setSelectedStock(null);
      }
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal release HOLD').message),
  });

  const openCreate = () => {
    setSelectedStock(null);
    setDraft(emptyDraft());
    setWorksheetMode('create');
  };

  const openDetail = (st: StockBatch) => {
    setSelectedStock(st);
    setStatusEditVal(st.stockStatus);
    setStatusEditReason(st.holdReason || '');
    setReleaseReason('');
    setWorksheetMode('detail');
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || 'HOLD').toUpperCase();
    if (s === 'AVAILABLE')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
          AVAILABLE
        </span>
      );
    if (s === 'QUARANTINE')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
          QUARANTINE
        </span>
      );
    if (s === 'REJECTED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
          REJECTED
        </span>
      );
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        HOLD
      </span>
    );
  };

  const totalQty = useMemo(
    () => stocks.reduce((acc, s) => acc + (Number(s.qty) || 0), 0),
    [stocks]
  );

  const excelColumns: ExcelColumn<StockBatch>[] = useMemo(
    () => [
      {
        key: 'lotNumber',
        header: 'No. LOT',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.lotNumber,
      },
      {
        key: 'itemCode',
        header: 'Kode Item',
        mono: true,
        minWidth: 'min-w-[120px]',
        getValue: (r) => r.itemCode || '-',
      },
      {
        key: 'itemName',
        header: 'Nama Item',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.itemName || '-',
      },
      {
        key: 'rackNumber',
        header: 'No. Rak',
        mono: true,
        getValue: (r) => r.rackNumber || '-',
      },
      {
        key: 'qty',
        header: 'Qty',
        align: 'right',
        mono: true,
        getValue: (r) => r.qty,
        footer: totalQty.toLocaleString('id-ID'),
      },
      {
        key: 'unit',
        header: 'Unit',
        align: 'center',
        getValue: (r) => r.unit || '-',
      },
      {
        key: 'expiredDate',
        header: 'Tgl Expired',
        mono: true,
        getValue: (r) => r.expiredDate || '-',
      },
      {
        key: 'stockStatus',
        header: 'Status Stok',
        align: 'center',
        getValue: (r) => r.stockStatus,
        render: (r) => renderStatusBadge(r.stockStatus),
      },
      {
        key: 'holdReason',
        header: 'Alasan Hold',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.holdReason || '-',
      },
      {
        key: 'releasedBy',
        header: 'Dirilis Oleh',
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.releasedBy || '-',
      },
      {
        key: 'releasedAt',
        header: 'Waktu Rilis',
        mono: true,
        getValue: (r) =>
          r.releasedAt ? String(r.releasedAt).slice(0, 16).replace('T', ' ') : '-',
      },
    ],
    [totalQty]
  );

  if (worksheetMode === 'create') {
    return (
      <ExcelWorksheetShell
        onBack={() => setWorksheetMode('list')}
        docTitle="CATAT BATCH STOK MASUK"
        badge={renderStatusBadge(draft.stockStatus || 'HOLD')}
        formCode="FORM-QA-4.5.3 (STOCK & HOLD LOCKOUT CONTROL)"
        sheetTitle="Lembar Kerja Pencatatan Batch Stok Masuk"
        modeHint="MODE: EXCEL ENTRY"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                if (!draft.itemId || !draft.lotNumber.trim())
                  return toast.error('Item dan No. LOT wajib diisi');
                createMut.mutate({ ...draft, expiredDate: draft.expiredDate || null });
              }}
              disabled={createMut.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Simpan Batch
            </button>
            <button
              type="button"
              onClick={() => setWorksheetMode('list')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
            >
              <X className="w-4 h-4" /> Batal
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${EXCEL_CELL.label} w-44`}>Item / Material *</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={draft.itemId}
                    onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}
                    className={EXCEL_CELL.input}
                  >
                    <option value="">-- Pilih Item --</option>
                    {mdmItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.code ? `[${it.code}] ` : ''}
                        {it.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`${EXCEL_CELL.label} w-44`}>No. LOT *</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="LOT-RM-001"
                    value={draft.lotNumber}
                    onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })}
                    className={`${EXCEL_CELL.input} font-mono`}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>No. Rak</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="RAK-A1"
                    value={draft.rackNumber || ''}
                    onChange={(e) => setDraft({ ...draft, rackNumber: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Qty *</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    min={1}
                    value={draft.qty}
                    onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right`}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Tanggal Expired</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="date"
                    value={draft.expiredDate || ''}
                    onChange={(e) => setDraft({ ...draft, expiredDate: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Status Awal</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={draft.stockStatus}
                    onChange={(e) =>
                      setDraft({ ...draft, stockStatus: e.target.value as StockStatus })
                    }
                    className={`${EXCEL_CELL.input} font-bold`}
                  >
                    <option value="HOLD">HOLD</option>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="QUARANTINE">QUARANTINE</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Alasan HOLD / Catatan</td>
                <td className={EXCEL_CELL.value} colSpan={3}>
                  <input
                    type="text"
                    placeholder="Alasan HOLD..."
                    value={draft.holdReason || ''}
                    onChange={(e) => setDraft({ ...draft, holdReason: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ExcelWorksheetShell>
    );
  }

  if (worksheetMode === 'detail' && selectedStock) {
    return (
      <ExcelWorksheetShell
        onBack={() => {
          setWorksheetMode('list');
          setSelectedStock(null);
        }}
        docTitle={selectedStock.lotNumber}
        badge={renderStatusBadge(selectedStock.stockStatus)}
        formCode="FORM-QA-4.5.3 (KONTROL STATUS & HOLD LOCKOUT BATCH)"
        sheetTitle="Detail Batch Stok & Otorisasi Release HOLD"
        modeHint="MODE: BATCH CONTROL"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${EXCEL_CELL.label} w-44`}>Item / Material</td>
                <td className={EXCEL_CELL.value}>
                  <div className={`${EXCEL_CELL.readValue} font-semibold`}>
                    {selectedStock.itemCode ? `[${selectedStock.itemCode}] ` : ''}
                    {selectedStock.itemName || '-'}
                  </div>
                </td>
                <td className={`${EXCEL_CELL.label} w-44`}>No. LOT</td>
                <td className={EXCEL_CELL.value}>
                  <div className={`${EXCEL_CELL.readValue} font-mono font-bold`}>
                    {selectedStock.lotNumber}
                  </div>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>No. Rak</td>
                <td className={EXCEL_CELL.value}>
                  <div className={EXCEL_CELL.readValue}>{selectedStock.rackNumber || '-'}</div>
                </td>
                <td className={EXCEL_CELL.label}>Qty &amp; Unit</td>
                <td className={EXCEL_CELL.value}>
                  <div className={`${EXCEL_CELL.readValue} font-mono font-bold`}>
                    {selectedStock.qty} {selectedStock.unit || ''}
                  </div>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Expired Date</td>
                <td className={EXCEL_CELL.value}>
                  <div className={`${EXCEL_CELL.readValue} font-mono`}>
                    {selectedStock.expiredDate || '-'}
                  </div>
                </td>
                <td className={EXCEL_CELL.label}>Dirilis Oleh</td>
                <td className={EXCEL_CELL.value}>
                  <div className={EXCEL_CELL.readValue}>
                    {selectedStock.releasedBy
                      ? `${selectedStock.releasedBy} (${selectedStock.releasedAt ? String(selectedStock.releasedAt).slice(0, 16).replace('T', ' ') : '-'})`
                      : '-'}
                  </div>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Alasan Hold</td>
                <td className={EXCEL_CELL.value} colSpan={3}>
                  <div className={EXCEL_CELL.readValue}>{selectedStock.holdReason || '-'}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {canReleaseHold &&
          (selectedStock.stockStatus === 'HOLD' || selectedStock.stockStatus === 'QUARANTINE') && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Otorisasi Release HOLD → AVAILABLE (4.5.3)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Alasan / dasar otorisasi release..."
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!releaseReason.trim()) return toast.error('Alasan otorisasi wajib diisi');
                    releaseHoldMut.mutate({
                      stockInventoryId: selectedStock.id,
                      reason: releaseReason.trim(),
                    });
                  }}
                  disabled={releaseHoldMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" /> Konfirmasi Release → AVAILABLE
                </button>
              </div>
            </div>
          )}

        {canWriteStock && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Ubah Status Batch Stok
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusEditVal}
                onChange={(e) => setStatusEditVal(e.target.value as StockStatus)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold"
              >
                <option value="HOLD">HOLD</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="QUARANTINE">QUARANTINE</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <input
                type="text"
                placeholder="Alasan perubahan status..."
                value={statusEditReason}
                onChange={(e) => setStatusEditReason(e.target.value)}
                className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  updateStatusMut.mutate({
                    id: selectedStock.id,
                    stockStatus: statusEditVal,
                    holdReason: statusEditReason,
                  })
                }
                disabled={updateStatusMut.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" /> Simpan Status
              </button>
            </div>
          </div>
        )}
      </ExcelWorksheetShell>
    );
  }

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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setStatusFilter(c.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === c.id ? c.activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() => exportExcelCsv('stock-hold-control', excelColumns, stocks)}
            exportDisabled={stocks.length === 0}
          />
          {canWriteStock && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> <span>+ Catat Batch Masuk (4.5.3)</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Database Batch Stok & Kontrol HOLD Lockout (4.5.3)"
          columns={excelColumns}
          rows={stocks}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada data batch stok."
          onRowClick={openDetail}
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'batch',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => p + 1),
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <th className="px-4 py-3 border-r border-slate-200">Kode &amp; Nama Item</th>
                  <th className="px-4 py-3 border-r border-slate-200">No. LOT</th>
                  <th className="px-4 py-3 border-r border-slate-200">Rak</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">Qty &amp; Unit</th>
                  <th className="px-4 py-3 border-r border-slate-200">Expired</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Status Stok</th>
                  <th className="px-4 py-3 border-r border-slate-200">
                    Alasan Hold / Info Release
                  </th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat database stok
                      batch...
                    </td>
                  </tr>
                ) : stocks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Belum ada data batch stok.
                    </td>
                  </tr>
                ) : (
                  stocks.map((st) => (
                    <React.Fragment key={st.id}>
                      <tr
                        className={`hover:bg-slate-50/80 ${
                          st.stockStatus === 'HOLD' ? 'bg-amber-50/25' : ''
                        }`}
                      >
                        <td className="px-4 py-3 border-r border-slate-100">
                          <div className="font-semibold text-slate-800">{st.itemName}</div>
                          <div className="text-xs font-mono text-slate-400">
                            {st.itemCode || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {st.lotNumber}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                          {st.rackNumber || '-'}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-right font-mono font-bold whitespace-nowrap">
                          {st.qty}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            {st.unit || ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 font-mono whitespace-nowrap">
                          {st.expiredDate || '-'}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-center">
                          {renderStatusBadge(st.stockStatus)}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-xs text-slate-600">
                          {st.holdReason || '-'}
                          {st.releasedBy && (
                            <div className="text-emerald-700 font-medium">
                              Released by {st.releasedBy}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => openDetail(st)}
                              title="Detail Batch"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canReleaseHold &&
                              (st.stockStatus === 'HOLD' || st.stockStatus === 'QUARANTINE') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStatusEditId(null);
                                    setReleaseId(st.id);
                                    setReleaseReason('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  <Unlock className="w-3.5 h-3.5" /> Release HOLD
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
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Status
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {statusEditId === st.id && (
                        <tr className="bg-blue-50 border-b border-blue-200">
                          <td colSpan={8} className="p-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-blue-800">
                                Ubah Status Batch {st.lotNumber}:
                              </span>
                              <select
                                value={statusEditVal}
                                onChange={(e) => setStatusEditVal(e.target.value as StockStatus)}
                                className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-bold text-sm"
                              >
                                <option value="HOLD">HOLD</option>
                                <option value="AVAILABLE">AVAILABLE</option>
                                <option value="QUARANTINE">QUARANTINE</option>
                                <option value="REJECTED">REJECTED</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Alasan perubahan status..."
                                value={statusEditReason}
                                onChange={(e) => setStatusEditReason(e.target.value)}
                                className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-slate-300 bg-white text-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusMut.mutate({
                                    id: st.id,
                                    stockStatus: statusEditVal,
                                    holdReason: statusEditReason,
                                  })
                                }
                                disabled={updateStatusMut.isPending}
                                className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatusEditId(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {releaseId === st.id && (
                        <tr className="bg-emerald-50 border-b border-emerald-200">
                          <td colSpan={8} className="p-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-emerald-800">
                                Otorisasi Release HOLD ({st.lotNumber}):
                              </span>
                              <input
                                type="text"
                                placeholder="Alasan / dasar otorisasi release..."
                                value={releaseReason}
                                onChange={(e) => setReleaseReason(e.target.value)}
                                className="flex-1 min-w-[220px] px-2.5 py-1.5 rounded border border-slate-300 bg-white text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!releaseReason.trim())
                                    return toast.error('Alasan otorisasi wajib diisi');
                                  releaseHoldMut.mutate({
                                    stockInventoryId: st.id,
                                    reason: releaseReason.trim(),
                                  });
                                }}
                                disabled={releaseHoldMut.isPending}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                              >
                                Konfirmasi Release → AVAILABLE
                              </button>
                              <button
                                type="button"
                                onClick={() => setReleaseId(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer"
                              >
                                Batal
                              </button>
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

          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
