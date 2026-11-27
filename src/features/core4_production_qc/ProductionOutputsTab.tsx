import React, { useMemo, useState } from 'react';
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
  Eye,
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
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  EXCEL_CELL,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

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

type WorksheetMode = 'list' | 'create' | 'edit' | 'detail';

export const ProductionOutputsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');

  const [worksheetMode, setWorksheetMode] = useState<WorksheetMode>('list');
  const [selectedOutput, setSelectedOutput] = useState<ProductionOutputRecord | null>(null);
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
  const totalItems = res?.meta?.total;

  const { data: plansRes } = useQuery({
    queryKey: ['productionPlansDropdown'],
    queryFn: () => listProductionPlansApi({ page: 1, limit: 100 }),
  });
  const plans = plansRes?.data || [];

  const { data: operators = [] } = useQuery({
    queryKey: ['productionOperatorsDropdown'],
    queryFn: listProductionOperatorsApi,
  });
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
      toast.success(
        'Output tercatat! Stok RM dipotong otomatis & hasil Good masuk gudang FG berstatus HOLD menunggu PQC/OQC.'
      );
      setWorksheetMode('list');
      setSelectedOutput(null);
      setEditingId(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal mencatat output produksi'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<ProductionOutputPayload> }) =>
      updateProductionOutputApi(id, p),
    onSuccess: () => {
      toast.success('Output produksi berhasil diperbarui');
      setWorksheetMode('list');
      setSelectedOutput(null);
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
      if (worksheetMode !== 'list') {
        setWorksheetMode('list');
        setSelectedOutput(null);
      }
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal membatalkan output'),
  });

  const openCreate = () => {
    setSelectedOutput(null);
    setEditingId(null);
    setDraft(emptyDraft());
    setWorksheetMode('create');
  };

  const openEdit = (o: ProductionOutputRecord) => {
    setSelectedOutput(o);
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
    setWorksheetMode('edit');
  };

  const openDetail = (o: ProductionOutputRecord) => {
    setSelectedOutput(o);
    setEditingId(null);
    setWorksheetMode('detail');
  };

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

  const totals = useMemo(
    () =>
      outputs.reduce(
        (acc, o) => ({
          good: acc.good + (Number(o.goodQty) || 0),
          ng: acc.ng + (Number(o.ngQty) || 0),
          rework: acc.rework + (Number(o.reworkQty) || 0),
          waste: acc.waste + (Number(o.wasteQty) || 0),
          downtime: acc.downtime + (Number(o.downtimeMinutes) || 0),
        }),
        { good: 0, ng: 0, rework: 0, waste: 0, downtime: 0 }
      ),
    [outputs]
  );

  const excelColumns: ExcelColumn<ProductionOutputRecord>[] = useMemo(
    () => [
      {
        key: 'spkNumber',
        header: 'No. SPK',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.spkNumber || '-',
      },
      {
        key: 'completedAt',
        header: 'Waktu Selesai',
        mono: true,
        minWidth: 'min-w-[145px]',
        getValue: (r) => (r.completedAt ? String(r.completedAt).slice(0, 16).replace('T', ' ') : '-'),
      },
      {
        key: 'itemCode',
        header: 'Kode Produk',
        mono: true,
        getValue: (r) => r.itemCode || '-',
      },
      {
        key: 'itemName',
        header: 'Nama Produk',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.itemName || '-',
      },
      {
        key: 'lotNumber',
        header: 'No. LOT FG',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.lotNumber || '-',
      },
      {
        key: 'operatorName',
        header: 'Operator',
        minWidth: 'min-w-[130px]',
        getValue: (r) => r.operatorName || '-',
      },
      {
        key: 'shiftNumber',
        header: 'Shift',
        align: 'center',
        mono: true,
        getValue: (r) => `Shift ${r.shiftNumber}`,
      },
      {
        key: 'machineLine',
        header: 'Mesin / Line',
        minWidth: 'min-w-[120px]',
        getValue: (r) => r.machineLine || '-',
      },
      {
        key: 'goodQty',
        header: 'Good',
        align: 'right',
        mono: true,
        getValue: (r) => r.goodQty,
        render: (r) => <span className="font-bold text-emerald-700">{r.goodQty}</span>,
        footer: <span className="text-emerald-700">{totals.good.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'ngQty',
        header: 'NG',
        align: 'right',
        mono: true,
        getValue: (r) => r.ngQty,
        render: (r) => <span className="font-bold text-rose-600">{r.ngQty}</span>,
        footer: <span className="text-rose-600">{totals.ng.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'reworkQty',
        header: 'Rework',
        align: 'right',
        mono: true,
        getValue: (r) => r.reworkQty,
        render: (r) => <span className="text-amber-700 font-semibold">{r.reworkQty}</span>,
        footer: <span className="text-amber-700">{totals.rework.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'wasteQty',
        header: 'Waste',
        align: 'right',
        mono: true,
        getValue: (r) => r.wasteQty,
        footer: totals.waste.toLocaleString('id-ID'),
      },
      {
        key: 'downtimeMinutes',
        header: 'Downtime (mnt)',
        align: 'right',
        mono: true,
        getValue: (r) => r.downtimeMinutes,
        footer: totals.downtime.toLocaleString('id-ID'),
      },
      {
        key: 'rmCount',
        header: 'Batch RM',
        align: 'center',
        mono: true,
        getValue: (r) => r.rmConsumptions?.length || 0,
      },
      {
        key: 'defectReason',
        header: 'Alasan NG / Defect',
        minWidth: 'min-w-[160px]',
        getValue: (r) => r.defectReason || '-',
      },
      {
        key: 'notes',
        header: 'Catatan',
        minWidth: 'min-w-[160px]',
        getValue: (r) => r.notes || '-',
      },
    ],
    [totals]
  );

  if (worksheetMode !== 'list') {
    const isReadOnly = worksheetMode === 'detail';
    return (
      <>
        <ExcelWorksheetShell
          onBack={() => {
            setWorksheetMode('list');
            setSelectedOutput(null);
            setEditingId(null);
          }}
          docTitle={
            worksheetMode === 'create'
              ? 'CATAT OUTPUT PRODUKSI BARU'
              : selectedOutput?.lotNumber || selectedOutput?.spkNumber || 'OUTPUT PRODUKSI'
          }
          badge={
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              {worksheetMode === 'create'
                ? 'BARU'
                : `SHIFT ${selectedOutput?.shiftNumber || draft.shiftNumber}`}
            </span>
          }
          formCode="FORM-PRD-4.1.3 (REALISASI OUTPUT PRODUKSI)"
          sheetTitle={
            worksheetMode === 'create'
              ? 'Lembar Kerja Pencatatan Output Produksi & Pemotongan RM'
              : worksheetMode === 'edit'
              ? 'Edit Catatan Output Produksi'
              : 'Detail Realisasi Output Produksi'
          }
          modeHint={isReadOnly ? 'MODE: READ-ONLY' : 'MODE: EXCEL ENTRY'}
          actions={
            isReadOnly && selectedOutput ? (
              <>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => openEdit(selectedOutput)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Edit Output
                  </button>
                )}
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setVoidTarget(selectedOutput)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Batalkan &amp; Kembalikan RM
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
                  <Save className="w-4 h-4" /> Simpan Output
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorksheetMode('list');
                    setSelectedOutput(null);
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
          {/* Section A: SPK & Operator Info */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              A. Identitas SPK, Operator &amp; LOT Finish Good
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={`${EXCEL_CELL.label} w-44`}>SPK Aktif *</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono font-bold`}>
                          {selectedOutput?.spkNumber || '-'} — {selectedOutput?.itemName || ''}
                        </div>
                      ) : (
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
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Pilih SPK Aktif --</option>
                          {plans.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.spkNumber} — {pl.itemName}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className={`${EXCEL_CELL.label} w-44`}>No. LOT FG</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono font-bold text-blue-700`}>
                          {selectedOutput?.lotNumber || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Auto-generate jika dikosongkan"
                          value={draft.lotNumber}
                          onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })}
                          className={`${EXCEL_CELL.input} font-mono`}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Operator</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedOutput?.operatorName || '-'}
                        </div>
                      ) : (
                        <select
                          value={draft.operatorId}
                          onChange={(e) => setDraft({ ...draft, operatorId: e.target.value })}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Pilih Operator --</option>
                          {operators.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.fullName}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Shift &amp; Mesin / Line</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          Shift {selectedOutput?.shiftNumber} •{' '}
                          {selectedOutput?.machineLine || '-'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 divide-x divide-slate-300">
                          <select
                            value={draft.shiftNumber}
                            onChange={(e) =>
                              setDraft({ ...draft, shiftNumber: Number(e.target.value) })
                            }
                            className={EXCEL_CELL.input}
                          >
                            <option value={1}>Shift 1</option>
                            <option value={2}>Shift 2</option>
                            <option value={3}>Shift 3</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Mesin / Line"
                            value={draft.machineLine}
                            onChange={(e) => setDraft({ ...draft, machineLine: e.target.value })}
                            className={EXCEL_CELL.input}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Quantities */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              B. Hasil Produksi &amp; Downtime
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                    <th className="border border-slate-300 px-3 py-2 text-right">Qty Good</th>
                    <th className="border border-slate-300 px-3 py-2 text-right">Qty NG</th>
                    <th className="border border-slate-300 px-3 py-2 text-right">Qty Rework</th>
                    <th className="border border-slate-300 px-3 py-2 text-right">Qty Waste</th>
                    <th className="border border-slate-300 px-3 py-2 text-right">
                      Downtime (menit)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div
                          className={`${EXCEL_CELL.readValue} text-right font-mono font-bold text-emerald-700`}
                        >
                          {selectedOutput?.goodQty}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={draft.goodQty}
                          onChange={(e) => setDraft({ ...draft, goodQty: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right font-bold text-emerald-700`}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div
                          className={`${EXCEL_CELL.readValue} text-right font-mono font-bold text-rose-600`}
                        >
                          {selectedOutput?.ngQty}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={draft.ngQty}
                          onChange={(e) => setDraft({ ...draft, ngQty: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right font-bold text-rose-600`}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div
                          className={`${EXCEL_CELL.readValue} text-right font-mono font-bold text-amber-700`}
                        >
                          {selectedOutput?.reworkQty}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={draft.reworkQty}
                          onChange={(e) => setDraft({ ...draft, reworkQty: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right text-amber-700`}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} text-right font-mono`}>
                          {selectedOutput?.wasteQty}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={draft.wasteQty}
                          onChange={(e) => setDraft({ ...draft, wasteQty: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} text-right font-mono`}>
                          {selectedOutput?.downtimeMinutes}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={draft.downtimeMinutes}
                          onChange={(e) =>
                            setDraft({ ...draft, downtimeMinutes: Number(e.target.value) })
                          }
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Alasan NG / Defect</td>
                    <td className={EXCEL_CELL.value} colSpan={2}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} text-rose-700`}>
                          {selectedOutput?.defectReason || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Alasan NG / Defect (jika ada)..."
                          value={draft.defectReason}
                          onChange={(e) => setDraft({ ...draft, defectReason: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Catatan Produksi</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedOutput?.notes || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Catatan produksi..."
                          value={draft.notes}
                          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section C: RM Consumptions */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                C. Pemotongan Stok Bahan Baku RM (Hanya Batch AVAILABLE — Anti-HOLD 4.5.3)
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      rmConsumptions: [
                        ...draft.rmConsumptions,
                        { stockInventoryId: '', qtyUsed: 1 },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Potong Batch RM
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                    <th className="border border-slate-300 px-3 py-2 text-center w-12">No</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">
                      Batch Bahan Baku RM (AVAILABLE)
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-right w-40">
                      Qty Dipakai
                    </th>
                    {!isReadOnly && (
                      <th className="border border-slate-300 px-3 py-2 text-center w-16">Hapus</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isReadOnly ? (
                    (selectedOutput?.rmConsumptions || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="border border-slate-300 px-3 py-6 text-center text-sm text-slate-400"
                        >
                          Tidak ada pemotongan RM tercatat.
                        </td>
                      </tr>
                    ) : (
                      (selectedOutput?.rmConsumptions || []).map((c, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 px-3 py-2 text-center font-mono text-xs text-slate-500 bg-slate-50">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-mono text-sm">
                            {c.lotNumber || c.stockInventoryId}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono font-bold text-sm">
                            {c.qtyUsed}
                          </td>
                        </tr>
                      ))
                    )
                  ) : draft.rmConsumptions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="border border-slate-300 px-3 py-6 text-center text-sm text-slate-400"
                      >
                        Klik &quot;+ Potong Batch RM&quot; untuk menambahkan pemotongan stok RM
                        otomatis.
                      </td>
                    </tr>
                  ) : (
                    draft.rmConsumptions.map((rm, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono text-xs text-slate-500 bg-slate-50">
                          {idx + 1}
                        </td>
                        <td className={EXCEL_CELL.value}>
                          <select
                            value={rm.stockInventoryId}
                            onChange={(e) => {
                              const st = availableStocks.find((s) => s.id === e.target.value);
                              const next = draft.rmConsumptions.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      stockInventoryId: e.target.value,
                                      lotNumber: st?.lotNumber,
                                    }
                                  : x
                              );
                              setDraft({ ...draft, rmConsumptions: next });
                            }}
                            className={EXCEL_CELL.input}
                          >
                            <option value="">-- Pilih Batch RM (AVAILABLE) --</option>
                            {availableStocks.map((st) => (
                              <option key={st.id} value={st.id}>
                                [{st.lotNumber}] {st.itemName} — Stok: {st.qty} {st.unit || ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={EXCEL_CELL.value}>
                          <input
                            type="number"
                            min={1}
                            value={rm.qtyUsed}
                            onChange={(e) => {
                              const next = draft.rmConsumptions.map((x, i) =>
                                i === idx ? { ...x, qtyUsed: Number(e.target.value) } : x
                              );
                              setDraft({ ...draft, rmConsumptions: next });
                            }}
                            className={`${EXCEL_CELL.input} font-mono text-right`}
                          />
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                rmConsumptions: draft.rmConsumptions.filter((_, i) => i !== idx),
                              })
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {worksheetMode === 'create' && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  Stok RM akan dipotong otomatis dan hasil Good masuk gudang FG berstatus{' '}
                  <strong>HOLD</strong> menunggu inspeksi PQC/OQC.
                </span>
              </div>
            )}
          </div>
        </ExcelWorksheetShell>

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
      </>
    );
  }

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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white max-w-[240px]"
          >
            <option value="ALL">Semua SPK</option>
            {plans.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.spkNumber} — {pl.itemName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() => exportExcelCsv('production-outputs', excelColumns, outputs)}
            exportDisabled={outputs.length === 0}
          />
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> <span>+ Catat Output (4.1.3)</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Daftar Realisasi Output Produksi (4.1.3)"
          columns={excelColumns}
          rows={outputs}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada catatan Output Produksi."
          onRowClick={openDetail}
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'output',
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
                  <th className="px-4 py-3 border-r border-slate-200">Waktu &amp; SPK</th>
                  <th className="px-4 py-3 border-r border-slate-200">Produk &amp; LOT FG</th>
                  <th className="px-4 py-3 border-r border-slate-200">
                    Operator / Shift / Mesin
                  </th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">Good</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">NG</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">Rework</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">Waste</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">
                    Downtime (mnt)
                  </th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Output
                      Produksi...
                    </td>
                  </tr>
                ) : outputs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Belum ada catatan Output Produksi.
                    </td>
                  </tr>
                ) : (
                  outputs.map((o) => {
                    const isExp = expandedId === o.id;
                    return (
                      <React.Fragment key={o.id}>
                        <tr className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExp ? null : o.id)}
                              className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer"
                            >
                              {isExp ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span>{o.spkNumber}</span>
                            </button>
                            <div className="text-xs text-slate-400 pl-5">
                              {o.completedAt
                                ? String(o.completedAt).slice(0, 16).replace('T', ' ')
                                : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-semibold text-slate-800">{o.itemName}</div>
                            <div className="text-xs font-mono text-blue-700">{o.lotNumber}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-medium">{o.operatorName}</div>
                            <div className="text-xs text-slate-400">
                              Shift {o.shiftNumber} • {o.machineLine || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono font-bold text-emerald-700">
                            {o.goodQty}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono font-bold text-rose-600">
                            {o.ngQty}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono text-amber-700">
                            {o.reworkQty}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono text-slate-600">
                            {o.wasteQty}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono">
                            {o.downtimeMinutes}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => openDetail(o)}
                                title="Buka Lembar Kerja"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(o)}
                                  title="Edit Output"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(o)}
                                  title="Batalkan Output"
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
                            <td colSpan={9} className="p-4 text-sm space-y-2">
                              <div className="font-bold text-slate-700">
                                Pemotongan Batch RM ({o.rmConsumptions.length})
                              </div>
                              {o.rmConsumptions.length === 0 ? (
                                <div className="text-slate-400">
                                  Tidak ada pemotongan RM tercatat.
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {o.rmConsumptions.map((c, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-xs"
                                    >
                                      LOT: {c.lotNumber || c.stockInventoryId} • Dipakai:{' '}
                                      <strong>{c.qtyUsed}</strong>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {o.defectReason && (
                                <div className="text-rose-700">Alasan NG: {o.defectReason}</div>
                              )}
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
