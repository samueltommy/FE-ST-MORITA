import React, { useMemo, useState } from 'react';
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
  Eye,
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
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  EXCEL_CELL,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

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

type WorksheetMode = 'list' | 'create' | 'edit' | 'detail';

export const ProductionWastesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const [worksheetMode, setWorksheetMode] = useState<WorksheetMode>('list');
  const [selectedWaste, setSelectedWaste] = useState<WasteRecord | null>(null);
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
  const totalItems = res?.meta?.total;

  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: stocksRes } = useQuery({
    queryKey: ['productionStocksDropdown'],
    queryFn: () => listProductionStocksApi({ page: 1, limit: 100 }),
  });
  const stocks = stocksRes?.data || [];
  const { data: plansRes } = useQuery({
    queryKey: ['productionPlansDropdown'],
    queryFn: () => listProductionPlansApi({ page: 1, limit: 100 }),
  });
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
      setWorksheetMode('list');
      setSelectedWaste(null);
      setEditingId(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal mencatat limbah').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<WastePayload> }) =>
      updateProductionWasteApi(id, p),
    onSuccess: () => {
      toast.success('Catatan Limbah berhasil diperbarui');
      setWorksheetMode('list');
      setSelectedWaste(null);
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
      if (worksheetMode !== 'list') {
        setWorksheetMode('list');
        setSelectedWaste(null);
      }
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membatalkan limbah').message),
  });

  const openCreate = () => {
    setSelectedWaste(null);
    setEditingId(null);
    setDraft(emptyDraft());
    setWorksheetMode('create');
  };

  const openEdit = (w: WasteRecord) => {
    setSelectedWaste(w);
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
    setWorksheetMode('edit');
  };

  const openDetail = (w: WasteRecord) => {
    setSelectedWaste(w);
    setEditingId(null);
    setWorksheetMode('detail');
  };

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
    if (s === 'CRITICAL')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-black">
          CRITICAL
        </span>
      );
    if (s === 'MAJOR')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
          MAJOR
        </span>
      );
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
        MINOR
      </span>
    );
  };

  const totalWasteQty = useMemo(
    () => list.reduce((acc, w) => acc + (Number(w.qty) || 0), 0),
    [list]
  );

  const excelColumns: ExcelColumn<WasteRecord>[] = useMemo(
    () => [
      {
        key: 'wasteCode',
        header: 'Kode Waste',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.wasteCode,
      },
      {
        key: 'wasteDate',
        header: 'Tanggal',
        mono: true,
        getValue: (r) => r.wasteDate || r.createdAt || '-',
      },
      {
        key: 'type',
        header: 'Tipe Waste',
        align: 'center',
        getValue: (r) => (r.type === 'PRODUCT_WASTE' ? '3.6.1 PRODUCT' : '3.5.1 RM'),
        render: (r) => (
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold ${
              r.type === 'PRODUCT_WASTE'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {r.type === 'PRODUCT_WASTE' ? '3.6.1 PRODUCT' : '3.5.1 RM'}
          </span>
        ),
      },
      {
        key: 'itemCode',
        header: 'Kode Item',
        mono: true,
        getValue: (r) => r.itemCode || '-',
      },
      {
        key: 'itemName',
        header: 'Nama Item',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.itemName || '-',
      },
      {
        key: 'lotNumber',
        header: 'No. LOT',
        mono: true,
        getValue: (r) => r.lotNumber || '-',
      },
      {
        key: 'qty',
        header: 'Qty',
        align: 'right',
        mono: true,
        getValue: (r) => r.qty,
        footer: totalWasteQty.toLocaleString('id-ID'),
      },
      {
        key: 'unit',
        header: 'Unit',
        align: 'center',
        getValue: (r) => r.unit || '-',
      },
      {
        key: 'severity',
        header: 'Severity',
        align: 'center',
        getValue: (r) => r.severity || 'MINOR',
        render: (r) => renderSeverityBadge(r.severity),
      },
      {
        key: 'reason',
        header: 'Alasan Ketidaksesuaian',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.reason || '-',
      },
      {
        key: 'rootCause',
        header: 'Root Cause',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.rootCause || '-',
      },
      {
        key: 'correctiveAction',
        header: 'Corrective Action',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.correctiveAction || '-',
      },
      {
        key: 'preventiveAction',
        header: 'Preventive Action',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.preventiveAction || '-',
      },
      {
        key: 'reportedByName',
        header: 'Pelapor',
        minWidth: 'min-w-[130px]',
        getValue: (r) => r.reportedByName || '-',
      },
    ],
    [totalWasteQty]
  );

  if (worksheetMode !== 'list') {
    const isReadOnly = worksheetMode === 'detail';

    return (
      <>
        <ExcelWorksheetShell
          onBack={() => {
            setWorksheetMode('list');
            setSelectedWaste(null);
            setEditingId(null);
          }}
          docTitle={
            worksheetMode === 'create'
              ? 'AUTO-WST BARU'
              : selectedWaste?.wasteCode || 'LAPORAN LIMBAH'
          }
          badge={renderSeverityBadge(isReadOnly ? selectedWaste?.severity : draft.severity)}
          formCode="FORM-QA-3.5.1 / 3.6.1 (RM & PRODUCT WASTE + CAPA)"
          sheetTitle={
            worksheetMode === 'create'
              ? 'Lembar Kerja Pencatatan Limbah & Analisis CAPA'
              : worksheetMode === 'edit'
              ? 'Edit Laporan Limbah & CAPA'
              : 'Detail Laporan Limbah & Tindakan CAPA'
          }
          modeHint={isReadOnly ? 'MODE: READ-ONLY' : 'MODE: EXCEL ENTRY'}
          actions={
            isReadOnly && selectedWaste ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printProductionHtmlReport(`/production/wastes/${selectedWaste.id}/print`).catch(
                      (e) => toast.error(e?.message || 'Gagal mencetak laporan waste')
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak Laporan Waste
                </button>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => openEdit(selectedWaste)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                )}
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setVoidTarget(selectedWaste)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Batalkan
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={createMut.isPending || updateMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Simpan Limbah &amp; CAPA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorksheetMode('list');
                    setSelectedWaste(null);
                    setEditingId(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" /> Batal
                </button>
              </>
            )
          }
        >
          {/* Section A: Waste Identification */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              A. Identitas Limbah &amp; Batch Terkait
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={`${EXCEL_CELL.label} w-44`}>Tanggal Limbah</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono`}>
                          {selectedWaste?.wasteDate || selectedWaste?.createdAt || '-'}
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={draft.wasteDate}
                          onChange={(e) => setDraft({ ...draft, wasteDate: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                    <td className={`${EXCEL_CELL.label} w-44`}>Tipe Limbah</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                              selectedWaste?.type === 'PRODUCT_WASTE'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {selectedWaste?.type === 'PRODUCT_WASTE'
                              ? '3.6.1 PRODUCT_WASTE'
                              : '3.5.1 RM_WASTE'}
                          </span>
                        </div>
                      ) : (
                        <select
                          value={draft.type}
                          onChange={(e) =>
                            setDraft({ ...draft, type: e.target.value as WasteType })
                          }
                          className={`${EXCEL_CELL.input} font-bold`}
                        >
                          <option value="RM_WASTE">3.5.1 RM_WASTE</option>
                          <option value="PRODUCT_WASTE">3.6.1 PRODUCT_WASTE</option>
                        </select>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Item / Material *</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-semibold`}>
                          {selectedWaste?.itemCode ? `[${selectedWaste.itemCode}] ` : ''}
                          {selectedWaste?.itemName || '-'}
                        </div>
                      ) : (
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
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Batch Stok &amp; No. LOT</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono`}>
                          {selectedWaste?.lotNumber || '-'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 divide-x divide-slate-300">
                          <select
                            value={draft.stockInventoryId || ''}
                            onChange={(e) => {
                              const st = stocks.find((x) => x.id === e.target.value);
                              setDraft({
                                ...draft,
                                stockInventoryId: e.target.value,
                                lotNumber: st?.lotNumber || draft.lotNumber,
                              });
                            }}
                            className={EXCEL_CELL.input}
                          >
                            <option value="">-- Ops. Batch --</option>
                            {stocks.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.lotNumber}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="No. LOT"
                            value={draft.lotNumber || ''}
                            onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })}
                            className={`${EXCEL_CELL.input} font-mono`}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Qty Limbah *</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono font-bold`}>
                          {selectedWaste?.qty} {selectedWaste?.unit || ''}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          value={draft.qty}
                          onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Severity &amp; SPK Terkait</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} flex items-center gap-2`}>
                          {renderSeverityBadge(selectedWaste?.severity)}
                          <span className="text-xs text-slate-500">
                            Pelapor: {selectedWaste?.reportedByName || '-'}
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 divide-x divide-slate-300">
                          <select
                            value={draft.severity}
                            onChange={(e) =>
                              setDraft({ ...draft, severity: e.target.value as WasteSeverity })
                            }
                            className={`${EXCEL_CELL.input} font-bold`}
                          >
                            <option value="MINOR">MINOR</option>
                            <option value="MAJOR">MAJOR</option>
                            <option value="CRITICAL">CRITICAL</option>
                          </select>
                          <select
                            value={draft.productionPlanId || ''}
                            onChange={(e) =>
                              setDraft({ ...draft, productionPlanId: e.target.value })
                            }
                            className={EXCEL_CELL.input}
                          >
                            <option value="">-- Tanpa SPK --</option>
                            {plans.map((pl) => (
                              <option key={pl.id} value={pl.id}>
                                {pl.spkNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Alasan Ketidaksesuaian</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedWaste?.reason || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Alasan ketidaksesuaian..."
                          value={draft.reason || ''}
                          onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: CAPA Fields */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              B. Analisis CAPA (Corrective &amp; Preventive Action)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={`${EXCEL_CELL.label} w-52`}>Root Cause (Akar Masalah)</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedWaste?.rootCause || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Akar penyebab masalah..."
                          value={draft.rootCause || ''}
                          onChange={(e) => setDraft({ ...draft, rootCause: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Corrective Action</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedWaste?.correctiveAction || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Tindakan korektif segera..."
                          value={draft.correctiveAction || ''}
                          onChange={(e) =>
                            setDraft({ ...draft, correctiveAction: e.target.value })
                          }
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Preventive Action</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedWaste?.preventiveAction || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Tindakan pencegahan agar tidak terulang..."
                          value={draft.preventiveAction || ''}
                          onChange={(e) =>
                            setDraft({ ...draft, preventiveAction: e.target.value })
                          }
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ExcelWorksheetShell>

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
      </>
    );
  }

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
                onClick={() => {
                  setWasteTypeFilter(t.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                  wasteTypeFilter === t.id ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Kode / Item / LOT..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Severity</option>
            <option value="MINOR">MINOR</option>
            <option value="MAJOR">MAJOR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() => exportExcelCsv('production-wastes-capa', excelColumns, list)}
            exportDisabled={list.length === 0}
          />
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> <span>+ Catat Limbah</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Daftar Laporan Limbah & Analisis CAPA (3.5.1 / 3.6.1)"
          columns={excelColumns}
          rows={list}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada data RM Waste / Product Waste."
          onRowClick={openDetail}
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'laporan',
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
                  <th className="px-4 py-3 border-r border-slate-200">Kode &amp; Tgl</th>
                  <th className="px-4 py-3 border-r border-slate-200">Tipe</th>
                  <th className="px-4 py-3 border-r border-slate-200">Item &amp; No. LOT</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">Qty &amp; Unit</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Severity</th>
                  <th className="px-4 py-3 border-r border-slate-200">Alasan Ketidaksesuaian</th>
                  <th className="px-4 py-3 border-r border-slate-200">Pelapor</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat laporan
                      limbah...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Belum ada data RM Waste / Product Waste.
                    </td>
                  </tr>
                ) : (
                  list.map((w) => {
                    const isExp = expandedId === w.id;
                    return (
                      <React.Fragment key={w.id}>
                        <tr className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExp ? null : w.id)}
                              className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer"
                            >
                              {isExp ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span>{w.wasteCode}</span>
                            </button>
                            <div className="text-xs text-slate-400 pl-5">
                              {w.wasteDate || w.createdAt || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                w.type === 'PRODUCT_WASTE'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {w.type === 'PRODUCT_WASTE' ? '3.6.1 PRODUCT' : '3.5.1 RM'}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-semibold text-slate-800">{w.itemName}</div>
                            <div className="text-xs font-mono text-slate-400">
                              LOT: {w.lotNumber || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono font-bold whitespace-nowrap">
                            {w.qty}{' '}
                            <span className="text-xs font-normal text-slate-500">
                              {w.unit || ''}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center">
                            {renderSeverityBadge(w.severity)}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 truncate max-w-[220px]">
                            {w.reason || '-'}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                            {w.reportedByName || '-'}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => openDetail(w)}
                                title="Buka Lembar Kerja"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  printProductionHtmlReport(`/production/wastes/${w.id}/print`).catch(
                                    (e) => toast.error(e?.message || 'Gagal mencetak laporan waste')
                                  )
                                }
                                title="Cetak Laporan Waste"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(w)}
                                  title="Edit Limbah"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(w)}
                                  title="Batalkan"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExp && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={8} className="p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-white rounded-xl border border-slate-200 p-3.5">
                                <div>
                                  <div className="text-xs font-bold uppercase text-slate-400">
                                    Root Cause (Akar Masalah)
                                  </div>
                                  <div className="mt-1 text-slate-800">{w.rootCause || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-bold uppercase text-slate-400">
                                    Corrective Action
                                  </div>
                                  <div className="mt-1 text-slate-800">
                                    {w.correctiveAction || '-'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-bold uppercase text-slate-400">
                                    Preventive Action
                                  </div>
                                  <div className="mt-1 text-slate-800">
                                    {w.preventiveAction || '-'}
                                  </div>
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
