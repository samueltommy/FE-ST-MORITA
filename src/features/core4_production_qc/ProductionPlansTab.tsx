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
  Send,
  Loader2,
  ShieldAlert,
  Eye,
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

type WorksheetMode = 'list' | 'create' | 'edit' | 'detail';

export const ProductionPlansTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canWritePlan =
    isSuperAdmin || isExecutive || userDivision === 'WAREHOUSE_PPIC' || userDivision === 'PRODUKSI_QC';
  const canIssueSpk = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [spkOnly, setSpkOnly] = useState(false);

  const [worksheetMode, setWorksheetMode] = useState<WorksheetMode>('list');
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
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
  const totalItems = res?.meta?.total;

  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: operators = [] } = useQuery({
    queryKey: ['productionOperatorsDropdown'],
    queryFn: listProductionOperatorsApi,
  });
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
      setWorksheetMode('list');
      setSelectedPlan(null);
      setEditingId(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal menyimpan Production Plan'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<ProductionPlanPayload> }) =>
      updateProductionPlanApi(id, p),
    onSuccess: () => {
      toast.success('Production Plan berhasil diperbarui');
      setWorksheetMode('list');
      setSelectedPlan(null);
      setEditingId(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui Production Plan'),
  });

  const issueSpkMut = useMutation({
    mutationFn: ({
      id,
      p,
    }: {
      id: string;
      p: { operatorId?: string | null; machineLine?: string | null; notes?: string | null };
    }) => issueSpkApi(id, p),
    onSuccess: () => {
      toast.success('SPK berhasil diterbitkan');
      setIssuingPlanId(null);
      if (worksheetMode === 'detail') {
        setWorksheetMode('list');
        setSelectedPlan(null);
      }
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal menerbitkan SPK'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProductionPlanApi(id),
    onSuccess: () => {
      toast.success('Production Plan / SPK berhasil dibatalkan');
      setVoidTarget(null);
      if (worksheetMode !== 'list') {
        setWorksheetMode('list');
        setSelectedPlan(null);
      }
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal membatalkan Production Plan'),
  });

  const openCreate = () => {
    setSelectedPlan(null);
    setEditingId(null);
    setDraft(emptyDraft());
    setWorksheetMode('create');
  };

  const openEdit = (p: ProductionPlan) => {
    setSelectedPlan(p);
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
    setWorksheetMode('edit');
  };

  const openDetail = (p: ProductionPlan) => {
    setSelectedPlan(p);
    setEditingId(null);
    setIssueDraft({
      operatorId: p.operatorId || '',
      machineLine: p.machineLine || '',
      notes: p.notes || '',
    });
    setWorksheetMode('detail');
  };

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
    if (s === 'COMPLETED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
          COMPLETED
        </span>
      );
    if (s === 'IN_PROGRESS')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
          IN_PROGRESS
        </span>
      );
    if (s === 'SPK_ISSUED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
          SPK_ISSUED
        </span>
      );
    if (s === 'CANCELLED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
          CANCELLED
        </span>
      );
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        PLANNED
      </span>
    );
  };

  const totalTargetQty = useMemo(() => plans.reduce((acc, p) => acc + (Number(p.targetQty) || 0), 0), [plans]);
  const totalGoodQty = useMemo(
    () => plans.reduce((acc, p) => acc + (Number(p.accumulatedGoodQty) || 0), 0),
    [plans]
  );
  const totalNgQty = useMemo(
    () => plans.reduce((acc, p) => acc + (Number(p.accumulatedNgQty) || 0), 0),
    [plans]
  );

  const excelColumns: ExcelColumn<ProductionPlan>[] = useMemo(
    () => [
      {
        key: 'spkNumber',
        header: 'No. SPK',
        mono: true,
        minWidth: 'min-w-[150px]',
        getValue: (r) => r.spkNumber,
      },
      {
        key: 'planNumber',
        header: 'No. Plan',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.planNumber || '-',
      },
      {
        key: 'itemCode',
        header: 'Kode Produk',
        mono: true,
        minWidth: 'min-w-[120px]',
        getValue: (r) => r.itemCode || '-',
      },
      {
        key: 'itemName',
        header: 'Nama Produk (FG)',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.itemName || '-',
      },
      {
        key: 'targetQty',
        header: 'Target Qty',
        align: 'right',
        mono: true,
        getValue: (r) => r.targetQty,
        footer: totalTargetQty.toLocaleString('id-ID'),
      },
      {
        key: 'accumulatedGoodQty',
        header: 'Hasil Good',
        align: 'right',
        mono: true,
        getValue: (r) => r.accumulatedGoodQty,
        render: (r) => <span className="font-bold text-emerald-700">{r.accumulatedGoodQty}</span>,
        footer: <span className="text-emerald-700">{totalGoodQty.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'accumulatedNgQty',
        header: 'Hasil NG',
        align: 'right',
        mono: true,
        getValue: (r) => r.accumulatedNgQty,
        render: (r) => <span className="font-bold text-rose-600">{r.accumulatedNgQty}</span>,
        footer: <span className="text-rose-600">{totalNgQty.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'planDate',
        header: 'Tgl Mulai',
        mono: true,
        getValue: (r) => r.planDate || '-',
      },
      {
        key: 'scheduledEndDate',
        header: 'Tgl Selesai',
        mono: true,
        getValue: (r) => r.scheduledEndDate || '-',
      },
      {
        key: 'machineLine',
        header: 'Mesin / Line',
        minWidth: 'min-w-[130px]',
        getValue: (r) => r.machineLine || '-',
      },
      {
        key: 'operatorName',
        header: 'Operator',
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.operatorName || '-',
      },
      {
        key: 'bomCount',
        header: 'Jml Batch RM',
        align: 'center',
        mono: true,
        getValue: (r) => r.bomAllocations?.length || 0,
      },
      {
        key: 'status',
        header: 'Status SPK',
        align: 'center',
        getValue: (r) => r.status,
        render: (r) => getStatusBadge(r.status),
      },
      {
        key: 'notes',
        header: 'Catatan',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.notes || '-',
      },
    ],
    [totalTargetQty, totalGoodQty, totalNgQty]
  );

  if (worksheetMode !== 'list') {
    const isReadOnly = worksheetMode === 'detail';
    const isVoid = selectedPlan?.status === 'CANCELLED';

    return (
      <>
        <ExcelWorksheetShell
          onBack={() => {
            setWorksheetMode('list');
            setSelectedPlan(null);
            setEditingId(null);
          }}
          docTitle={
            worksheetMode === 'create'
              ? 'AUTO-PLAN / SPK BARU'
              : selectedPlan?.spkNumber || selectedPlan?.planNumber || 'PRODUCTION PLAN'
          }
          badge={
            worksheetMode === 'create' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                BARU
              </span>
            ) : (
              getStatusBadge(selectedPlan?.status || 'PLANNED')
            )
          }
          formCode="FORM-PRD-4.1.1 / 4.1.2 (PRODUCTION PLAN & SPK)"
          sheetTitle={
            worksheetMode === 'create'
              ? 'Lembar Kerja Rencana Produksi Baru'
              : worksheetMode === 'edit'
              ? 'Edit Rencana Produksi & Alokasi BOM RM'
              : 'Detail Rencana Produksi & Surat Perintah Kerja (SPK)'
          }
          modeHint={isReadOnly ? 'MODE: READ-ONLY' : 'MODE: EXCEL ENTRY'}
          actions={
            isReadOnly && selectedPlan ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printProductionHtmlReport(`/production/plans/${selectedPlan.id}/print`).catch((e) =>
                      toast.error(e?.message || 'Gagal mencetak SPK')
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak SPK
                </button>
                {canWritePlan && selectedPlan.status !== 'COMPLETED' && !isVoid && (
                  <button
                    type="button"
                    onClick={() => openEdit(selectedPlan)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Edit Plan
                  </button>
                )}
                {canWritePlan && !isVoid && (
                  <button
                    type="button"
                    onClick={() => setVoidTarget(selectedPlan)}
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
                  <Save className="w-4 h-4" /> Simpan Plan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorksheetMode('list');
                    setSelectedPlan(null);
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
          {/* Section 1: Header Info Grid */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              A. Informasi Rencana Produksi &amp; Penjadwalan
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={`${EXCEL_CELL.label} w-44`}>Produk (Finish Good) *</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-semibold`}>
                          {selectedPlan?.itemCode ? `[${selectedPlan.itemCode}] ` : ''}
                          {selectedPlan?.itemName || '-'}
                        </div>
                      ) : (
                        <select
                          value={draft.itemId}
                          onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Pilih Produk (FG) --</option>
                          {mdmItems.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code ? `[${it.code}] ` : ''}
                              {it.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className={`${EXCEL_CELL.label} w-44`}>Target Qty *</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono font-bold`}>
                          {selectedPlan?.targetQty}{' '}
                          <span className="text-xs font-normal text-slate-500 ml-2">
                            (Good:{' '}
                            <strong className="text-emerald-700">
                              {selectedPlan?.accumulatedGoodQty}
                            </strong>{' '}
                            · NG:{' '}
                            <strong className="text-rose-600">
                              {selectedPlan?.accumulatedNgQty}
                            </strong>
                            )
                          </span>
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          value={draft.targetQty}
                          onChange={(e) => setDraft({ ...draft, targetQty: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Tanggal Mulai</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono`}>
                          {selectedPlan?.planDate || '-'}
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={draft.planDate}
                          onChange={(e) => setDraft({ ...draft, planDate: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Tanggal Selesai</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono`}>
                          {selectedPlan?.scheduledEndDate || '-'}
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={draft.scheduledEndDate}
                          onChange={(e) => setDraft({ ...draft, scheduledEndDate: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Mesin / Line</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedPlan?.machineLine || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Contoh: Slitter 01"
                          value={draft.machineLine}
                          onChange={(e) => setDraft({ ...draft, machineLine: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Operator</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedPlan?.operatorName || '-'}</div>
                      ) : (
                        <select
                          value={draft.operatorId}
                          onChange={(e) => setDraft({ ...draft, operatorId: e.target.value })}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Opsional Operator --</option>
                          {operators.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.fullName}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Catatan / Instruksi SPK</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedPlan?.notes || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Catatan Planning / Instruksi SPK..."
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

          {/* Section 2: BOM Batch RM Allocations */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>
                  B. Alokasi Batch Bahan Baku RM (Hanya Batch AVAILABLE — Anti-HOLD 4.5.3)
                </span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      bomAllocations: [
                        ...draft.bomAllocations,
                        { stockInventoryId: '', lotNumber: '', requiredQty: 1 },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Tambah Batch RM
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                    <th className="border border-slate-300 px-3 py-2 text-center w-12">No</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">
                      Batch RM (Status AVAILABLE)
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-right w-40">
                      Qty Alokasi
                    </th>
                    {!isReadOnly && (
                      <th className="border border-slate-300 px-3 py-2 text-center w-16">Hapus</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isReadOnly ? (
                    (selectedPlan?.bomAllocations || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="border border-slate-300 px-3 py-6 text-center text-sm text-slate-400"
                        >
                          Belum ada alokasi batch bahan baku RM.
                        </td>
                      </tr>
                    ) : (
                      (selectedPlan?.bomAllocations || []).map((b, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 px-3 py-2 text-center font-mono text-xs text-slate-500 bg-slate-50">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-mono text-sm">
                            {b.lotNumber || b.stockInventoryId}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono font-bold text-sm">
                            {b.requiredQty}
                          </td>
                        </tr>
                      ))
                    )
                  ) : draft.bomAllocations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="border border-slate-300 px-3 py-6 text-center text-sm text-slate-400"
                      >
                        Klik &quot;+ Tambah Batch RM&quot; untuk mengalokasikan batch bahan baku
                        AVAILABLE.
                      </td>
                    </tr>
                  ) : (
                    draft.bomAllocations.map((alloc, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono text-xs text-slate-500 bg-slate-50">
                          {idx + 1}
                        </td>
                        <td className={EXCEL_CELL.value}>
                          <select
                            value={alloc.stockInventoryId}
                            onChange={(e) => {
                              const st = availableStocks.find((s) => s.id === e.target.value);
                              const next = draft.bomAllocations.map((a, i) =>
                                i === idx
                                  ? {
                                      ...a,
                                      stockInventoryId: e.target.value,
                                      itemId: st?.itemId || null,
                                      lotNumber: st?.lotNumber || null,
                                    }
                                  : a
                              );
                              setDraft({ ...draft, bomAllocations: next });
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
                            value={alloc.requiredQty}
                            onChange={(e) => {
                              const next = draft.bomAllocations.map((a, i) =>
                                i === idx ? { ...a, requiredQty: Number(e.target.value) } : a
                              );
                              setDraft({ ...draft, bomAllocations: next });
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
                                bomAllocations: draft.bomAllocations.filter((_, i) => i !== idx),
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
          </div>

          {/* Section 3: Issue SPK Panel in Detail Mode */}
          {isReadOnly && selectedPlan && canIssueSpk && !selectedPlan.spkIssued && !isVoid && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                C. Penerbitan Surat Perintah Kerja (4.1.2 Terbitkan SPK)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={issueDraft.operatorId}
                  onChange={(e) => setIssueDraft({ ...issueDraft, operatorId: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                >
                  <option value="">-- Pilih Operator --</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.fullName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Mesin / Line"
                  value={issueDraft.machineLine}
                  onChange={(e) => setIssueDraft({ ...issueDraft, machineLine: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                />
                <input
                  type="text"
                  placeholder="Catatan SPK..."
                  value={issueDraft.notes}
                  onChange={(e) => setIssueDraft({ ...issueDraft, notes: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() =>
                    issueSpkMut.mutate({
                      id: selectedPlan.id,
                      p: {
                        operatorId: issueDraft.operatorId || null,
                        machineLine: issueDraft.machineLine || null,
                        notes: issueDraft.notes || null,
                      },
                    })
                  }
                  disabled={issueSpkMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Konfirmasi Terbitkan SPK
                </button>
              </div>
            </div>
          )}
        </ExcelWorksheetShell>

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
              placeholder="Cari No. Plan / SPK / Produk..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="PLANNED">PLANNED</option>
            <option value="SPK_ISSUED">SPK_ISSUED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={spkOnly}
              onChange={(e) => {
                setSpkOnly(e.target.checked);
                setPage(1);
              }}
            />
            <span>SPK Terbit Saja</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() => exportExcelCsv('production-plans-spk', excelColumns, plans)}
            exportDisabled={plans.length === 0}
          />
          {canWritePlan && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> <span>+ Tambah Plan (4.1.1)</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Daftar Production Planning & SPK (4.1.1 / 4.1.2)"
          columns={excelColumns}
          rows={plans}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada data Production Planning / SPK."
          onRowClick={openDetail}
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'plan',
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
                  <th className="px-4 py-3 border-r border-slate-200">No. Plan / SPK</th>
                  <th className="px-4 py-3 border-r border-slate-200">Produk</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">
                    Target / Hasil (Good &amp; NG)
                  </th>
                  <th className="px-4 py-3 border-r border-slate-200">Tgl Mulai–Selesai</th>
                  <th className="px-4 py-3 border-r border-slate-200">Mesin &amp; Operator</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Status SPK</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Production
                      Planning &amp; SPK...
                    </td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada data Production Planning / SPK.
                    </td>
                  </tr>
                ) : (
                  plans.map((p) => {
                    const isExp = expandedId === p.id;
                    const isVoid = p.status === 'CANCELLED';

                    return (
                      <React.Fragment key={p.id}>
                        <tr className={`hover:bg-slate-50/80 ${isVoid ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExp ? null : p.id)}
                              className="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer"
                            >
                              {isExp ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span>{p.spkNumber}</span>
                            </button>
                            {p.planNumber && p.planNumber !== p.spkNumber && (
                              <div className="text-xs text-slate-400 pl-5">{p.planNumber}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-semibold text-slate-800">{p.itemName}</div>
                            <div className="text-xs font-mono text-slate-400">
                              {p.itemCode || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono whitespace-nowrap">
                            <div className="font-bold text-slate-900">Target: {p.targetQty}</div>
                            <div className="text-xs">
                              <span className="text-emerald-700 font-semibold">
                                Good: {p.accumulatedGoodQty}
                              </span>{' '}
                              ·{' '}
                              <span className="text-rose-600 font-semibold">
                                NG: {p.accumulatedNgQty}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                            <div>{p.planDate}</div>
                            <div className="text-xs text-slate-400">
                              s/d {p.scheduledEndDate || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-medium">{p.machineLine || '-'}</div>
                            <div className="text-xs text-slate-400">{p.operatorName || '-'}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center">
                            {getStatusBadge(p.status)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
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
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" /> Terbitkan SPK
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openDetail(p)}
                                title="Buka Lembar Kerja"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  printProductionHtmlReport(`/production/plans/${p.id}/print`).catch(
                                    (e) => toast.error(e?.message || 'Gagal mencetak SPK')
                                  )
                                }
                                title="Cetak SPK"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {canWritePlan && p.status !== 'COMPLETED' && !isVoid && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(p)}
                                  title="Edit Plan"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canWritePlan && !isVoid && (
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(p)}
                                  title="Batalkan"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Inline Issue SPK Bar */}
                        {issuingPlanId === p.id && (
                          <tr className="bg-indigo-50 border-b border-indigo-200">
                            <td colSpan={7} className="p-3.5">
                              <div className="flex flex-wrap items-end gap-2 text-xs">
                                <span className="font-bold text-indigo-800 mr-2 self-center">
                                  4.1.2 Terbitkan SPK:
                                </span>
                                <select
                                  value={issueDraft.operatorId}
                                  onChange={(e) =>
                                    setIssueDraft({ ...issueDraft, operatorId: e.target.value })
                                  }
                                  className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-sm"
                                >
                                  <option value="">-- Pilih Operator --</option>
                                  {operators.map((op) => (
                                    <option key={op.id} value={op.id}>
                                      {op.fullName}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="Mesin / Line"
                                  value={issueDraft.machineLine}
                                  onChange={(e) =>
                                    setIssueDraft({ ...issueDraft, machineLine: e.target.value })
                                  }
                                  className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-sm"
                                />
                                <input
                                  type="text"
                                  placeholder="Catatan SPK..."
                                  value={issueDraft.notes}
                                  onChange={(e) =>
                                    setIssueDraft({ ...issueDraft, notes: e.target.value })
                                  }
                                  className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded border border-slate-300 bg-white text-sm"
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
                                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                                >
                                  Konfirmasi Terbitkan SPK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIssuingPlanId(null)}
                                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {isExp && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={7} className="p-4 space-y-2 text-sm">
                              <div className="font-bold text-slate-700">
                                Alokasi BOM Batch RM ({p.bomAllocations.length})
                              </div>
                              {p.bomAllocations.length === 0 ? (
                                <div className="text-slate-400">
                                  Belum ada alokasi batch bahan baku RM.
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {p.bomAllocations.map((b, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-xs"
                                    >
                                      LOT: {b.lotNumber || b.stockInventoryId} • Qty:{' '}
                                      <strong>{b.requiredQty}</strong>
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
