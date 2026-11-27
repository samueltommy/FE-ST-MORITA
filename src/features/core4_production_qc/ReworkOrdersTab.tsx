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
  CheckCircle2,
  Loader2,
  Eye,
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
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  EXCEL_CELL,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

const emptyDraft = (): ReworkOrderPayload => ({
  productionPlanId: '',
  itemId: '',
  lotNumber: '',
  reworkQty: 1,
  defectDescription: '',
  repairInstruction: '',
  assignedOperatorId: '',
});

type WorksheetMode = 'list' | 'create' | 'edit' | 'detail';

export const ReworkOrdersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canWriteRework =
    isSuperAdmin || isExecutive || userDivision === 'WAREHOUSE_PPIC' || userDivision === 'PRODUKSI_QC';
  const canReinspect = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [worksheetMode, setWorksheetMode] = useState<WorksheetMode>('list');
  const [selectedRework, setSelectedRework] = useState<ReworkOrder | null>(null);
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
    queryFn: () =>
      listReworkOrdersApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;
  const totalItems = res?.meta?.total;

  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: plansRes } = useQuery({
    queryKey: ['productionPlansDropdown'],
    queryFn: () => listProductionPlansApi({ page: 1, limit: 100 }),
  });
  const plans = plansRes?.data || [];
  const { data: operators = [] } = useQuery({
    queryKey: ['productionOperatorsDropdown'],
    queryFn: listProductionOperatorsApi,
  });

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
      setWorksheetMode('list');
      setSelectedRework(null);
      setEditingId(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membuat tiket rework').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<ReworkOrderPayload> }) =>
      updateReworkOrderApi(id, p),
    onSuccess: () => {
      toast.success('Tiket Rework berhasil diperbarui');
      setWorksheetMode('list');
      setSelectedRework(null);
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal memperbarui rework').message),
  });

  const reinspectMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReworkReinspectPayload }) =>
      reinspectReworkOrderApi(id, p),
    onSuccess: () => {
      toast.success(
        'Re-Inspeksi QC selesai! Qty Good masuk FG AVAILABLE & Scrap tercatat ke 3.6.1 Product Waste.'
      );
      setExpandedId(null);
      if (worksheetMode === 'detail') {
        setWorksheetMode('list');
        setSelectedRework(null);
      }
      invalidateAll();
    },
    onError: (e: any) =>
      toast.error(extractProductionError(e, 'Gagal menyimpan re-inspeksi').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteReworkOrderApi(id),
    onSuccess: () => {
      toast.success('Tiket Rework berhasil dibatalkan');
      setVoidTarget(null);
      if (worksheetMode !== 'list') {
        setWorksheetMode('list');
        setSelectedRework(null);
      }
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membatalkan rework').message),
  });

  const openCreate = () => {
    setSelectedRework(null);
    setEditingId(null);
    setDraft(emptyDraft());
    setWorksheetMode('create');
  };

  const openEdit = (r: ReworkOrder) => {
    setSelectedRework(r);
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
    setWorksheetMode('edit');
  };

  const openDetail = (r: ReworkOrder) => {
    setSelectedRework(r);
    setEditingId(null);
    setReinspectDraft({
      goodAfterReworkQty: r.reworkQty,
      scrapAfterReworkQty: 0,
      verdict: 'PASSED',
      autoLogProductWaste: true,
      notes: '',
    });
    setWorksheetMode('detail');
  };

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
    if (s === 'PASSED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
          PASSED
        </span>
      );
    if (s === 'SCRAPPED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
          SCRAPPED
        </span>
      );
    if (s === 'IN_REWORK')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
          IN_REWORK
        </span>
      );
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        {s || 'OPEN'}
      </span>
    );
  };

  const totals = useMemo(
    () =>
      list.reduce(
        (acc, r) => ({
          rework: acc.rework + (Number(r.reworkQty) || 0),
          good: acc.good + (Number(r.goodAfterReworkQty) || 0),
          scrap: acc.scrap + (Number(r.scrapAfterReworkQty) || 0),
        }),
        { rework: 0, good: 0, scrap: 0 }
      ),
    [list]
  );

  const excelColumns: ExcelColumn<ReworkOrder>[] = useMemo(
    () => [
      {
        key: 'reworkNumber',
        header: 'No. Rework',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.reworkNumber,
      },
      {
        key: 'spkNumber',
        header: 'No. SPK',
        mono: true,
        getValue: (r) => r.spkNumber || '-',
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
        header: 'No. LOT',
        mono: true,
        getValue: (r) => r.lotNumber || '-',
      },
      {
        key: 'reworkQty',
        header: 'Qty Rework',
        align: 'right',
        mono: true,
        getValue: (r) => r.reworkQty,
        footer: totals.rework.toLocaleString('id-ID'),
      },
      {
        key: 'goodAfterReworkQty',
        header: 'Hasil Good',
        align: 'right',
        mono: true,
        getValue: (r) => r.goodAfterReworkQty,
        render: (r) => <span className="font-bold text-emerald-700">{r.goodAfterReworkQty}</span>,
        footer: <span className="text-emerald-700">{totals.good.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'scrapAfterReworkQty',
        header: 'Hasil Scrap',
        align: 'right',
        mono: true,
        getValue: (r) => r.scrapAfterReworkQty,
        render: (r) => <span className="font-bold text-rose-600">{r.scrapAfterReworkQty}</span>,
        footer: <span className="text-rose-600">{totals.scrap.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'defectDescription',
        header: 'Deskripsi Cacat',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.defectDescription || '-',
      },
      {
        key: 'repairInstruction',
        header: 'Instruksi Repair',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.repairInstruction || '-',
      },
      {
        key: 'assignedOperatorName',
        header: 'Operator',
        minWidth: 'min-w-[130px]',
        getValue: (r) => r.assignedOperatorName || '-',
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        getValue: (r) => r.status,
        render: (r) => renderBadge(r.status),
      },
      {
        key: 'reinspectedBy',
        header: 'Re-Inspeksi Oleh',
        getValue: (r) => r.reinspectedBy || '-',
      },
      {
        key: 'reinspectionNotes',
        header: 'Catatan Re-Inspeksi',
        minWidth: 'min-w-[160px]',
        getValue: (r) => r.reinspectionNotes || '-',
      },
    ],
    [totals]
  );

  if (worksheetMode !== 'list') {
    const isReadOnly = worksheetMode === 'detail';
    const canDoReinspect =
      isReadOnly &&
      selectedRework &&
      canReinspect &&
      (selectedRework.status === 'OPEN' || selectedRework.status === 'IN_REWORK');

    return (
      <>
        <ExcelWorksheetShell
          onBack={() => {
            setWorksheetMode('list');
            setSelectedRework(null);
            setEditingId(null);
          }}
          docTitle={
            worksheetMode === 'create'
              ? 'AUTO-RWK BARU'
              : selectedRework?.reworkNumber || 'REWORK ORDER'
          }
          badge={renderBadge(isReadOnly ? selectedRework?.status || 'OPEN' : 'OPEN')}
          formCode="FORM-QA-4.5.2 (REWORK & REPAIR ORDER)"
          sheetTitle={
            worksheetMode === 'create'
              ? 'Lembar Kerja Pembuatan Tiket Rework / Repair'
              : worksheetMode === 'edit'
              ? 'Edit Tiket Rework / Repair'
              : 'Detail Tiket Rework & Re-Inspeksi QC'
          }
          modeHint={isReadOnly ? 'MODE: READ-ONLY / RE-INSPEKSI' : 'MODE: EXCEL ENTRY'}
          actions={
            isReadOnly && selectedRework ? (
              <>
                {canWriteRework &&
                  (selectedRework.status === 'OPEN' || selectedRework.status === 'IN_REWORK') && (
                    <button
                      type="button"
                      onClick={() => openEdit(selectedRework)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" /> Edit Tiket
                    </button>
                  )}
                {canWriteRework && (
                  <button
                    type="button"
                    onClick={() => setVoidTarget(selectedRework)}
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
                  <Save className="w-4 h-4" /> Simpan Rework
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorksheetMode('list');
                    setSelectedRework(null);
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
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              A. Identitas Tiket Rework &amp; Instruksi Repair
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={`${EXCEL_CELL.label} w-44`}>SPK Terkait (Opsional)</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono`}>
                          {selectedRework?.spkNumber || '-'}
                        </div>
                      ) : (
                        <select
                          value={draft.productionPlanId || ''}
                          onChange={(e) => {
                            const pl = plans.find((x) => x.id === e.target.value);
                            setDraft({
                              ...draft,
                              productionPlanId: e.target.value,
                              itemId: pl?.itemId || draft.itemId,
                            });
                          }}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Opsional SPK --</option>
                          {plans.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.spkNumber} — {pl.itemName}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className={`${EXCEL_CELL.label} w-44`}>Produk / Item *</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-semibold`}>
                          {selectedRework?.itemName || '-'}
                        </div>
                      ) : (
                        <select
                          value={draft.itemId}
                          onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Pilih Produk --</option>
                          {mdmItems.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code ? `[${it.code}] ` : ''}
                              {it.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>No. LOT</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono`}>
                          {selectedRework?.lotNumber || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="No. LOT"
                          value={draft.lotNumber || ''}
                          onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })}
                          className={`${EXCEL_CELL.input} font-mono`}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Qty Rework *</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono font-bold`}>
                          {selectedRework?.reworkQty}{' '}
                          <span className="text-xs font-normal text-slate-500 ml-2">
                            (Good:{' '}
                            <strong className="text-emerald-700">
                              {selectedRework?.goodAfterReworkQty}
                            </strong>{' '}
                            / Scrap:{' '}
                            <strong className="text-rose-600">
                              {selectedRework?.scrapAfterReworkQty}
                            </strong>
                            )
                          </span>
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          value={draft.reworkQty}
                          onChange={(e) => setDraft({ ...draft, reworkQty: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Operator Ditugaskan</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedRework?.assignedOperatorName || '-'}
                        </div>
                      ) : (
                        <select
                          value={draft.assignedOperatorId || ''}
                          onChange={(e) =>
                            setDraft({ ...draft, assignedOperatorId: e.target.value })
                          }
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
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Deskripsi Cacat *</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedRework?.defectDescription || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Deskripsi cacat / ketidaksesuaian..."
                          value={draft.defectDescription}
                          onChange={(e) =>
                            setDraft({ ...draft, defectDescription: e.target.value })
                          }
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Instruksi Repair</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedRework?.repairInstruction || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Instruksi pengerjaan ulang / repair..."
                          value={draft.repairInstruction || ''}
                          onChange={(e) =>
                            setDraft({ ...draft, repairInstruction: e.target.value })
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

          {isReadOnly && selectedRework && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                B. Re-Inspeksi QC Setelah Rework ({selectedRework.reworkNumber})
              </div>
              {canDoReinspect ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-700">Qty Good</span>
                      <input
                        type="number"
                        min={0}
                        value={reinspectDraft.goodAfterReworkQty}
                        onChange={(e) =>
                          setReinspectDraft({
                            ...reinspectDraft,
                            goodAfterReworkQty: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-700">Qty Scrap</span>
                      <input
                        type="number"
                        min={0}
                        value={reinspectDraft.scrapAfterReworkQty}
                        onChange={(e) =>
                          setReinspectDraft({
                            ...reinspectDraft,
                            scrapAfterReworkQty: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-700">Verdict</span>
                      <select
                        value={reinspectDraft.verdict}
                        onChange={(e) =>
                          setReinspectDraft({
                            ...reinspectDraft,
                            verdict: e.target.value as 'PASSED' | 'SCRAPPED',
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-sm"
                      >
                        <option value="PASSED">PASSED</option>
                        <option value="SCRAPPED">SCRAPPED</option>
                      </select>
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-xs font-semibold text-slate-700">
                        Catatan Re-Inspeksi
                      </span>
                      <input
                        type="text"
                        placeholder="Hasil cek ulang QC..."
                        value={reinspectDraft.notes || ''}
                        onChange={(e) =>
                          setReinspectDraft({ ...reinspectDraft, notes: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reinspectDraft.autoLogProductWaste}
                        onChange={(e) =>
                          setReinspectDraft({
                            ...reinspectDraft,
                            autoLogProductWaste: e.target.checked,
                          })
                        }
                      />
                      <span>Auto-log Qty Scrap ke 3.6.1 Product Waste</span>
                    </label>
                    <span className="text-emerald-700 font-medium">
                      Qty Good (PASSED) otomatis masuk stok FG AVAILABLE.
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        reinspectMut.mutate({ id: selectedRework.id, p: reinspectDraft })
                      }
                      disabled={reinspectMut.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Simpan Re-Inspeksi
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-700">
                  <strong>Re-Inspeksi Oleh:</strong> {selectedRework.reinspectedBy || '-'} •{' '}
                  <strong>Catatan:</strong> {selectedRework.reinspectionNotes || '-'}
                </div>
              )}
            </div>
          )}
        </ExcelWorksheetShell>

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
              placeholder="Cari No. Rework / SPK / LOT..."
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
            <option value="OPEN">OPEN</option>
            <option value="IN_REWORK">IN_REWORK</option>
            <option value="PASSED">PASSED</option>
            <option value="SCRAPPED">SCRAPPED</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() => exportExcelCsv('rework-orders', excelColumns, list)}
            exportDisabled={list.length === 0}
          />
          {canWriteRework && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> <span>+ Buat Tiket Rework (4.5.2)</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Daftar Tiket Rework / Repair (4.5.2)"
          columns={excelColumns}
          rows={list}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada tiket Rework / Repair."
          onRowClick={openDetail}
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'tiket',
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
                  <th className="px-4 py-3 border-r border-slate-200">No. Rework</th>
                  <th className="px-4 py-3 border-r border-slate-200">SPK &amp; Produk</th>
                  <th className="px-4 py-3 border-r border-slate-200">No. LOT</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">Qty Rework</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">
                    Hasil (Good / Scrap)
                  </th>
                  <th className="px-4 py-3 border-r border-slate-200">
                    Cacat &amp; Instruksi Repair
                  </th>
                  <th className="px-4 py-3 border-r border-slate-200">Operator</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat antrean
                      Rework...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Belum ada tiket Rework / Repair.
                    </td>
                  </tr>
                ) : (
                  list.map((r) => {
                    const isExp = expandedId === r.id;
                    const canDoReinspect =
                      canReinspect && (r.status === 'OPEN' || r.status === 'IN_REWORK');

                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold whitespace-nowrap">
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
                              {isExp ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span>{r.reworkNumber}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-semibold text-slate-800">{r.itemName}</div>
                            <div className="text-xs font-mono text-slate-400">
                              {r.spkNumber || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 font-mono">
                            {r.lotNumber || '-'}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono font-bold">
                            {r.reworkQty}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center font-mono">
                            <span className="text-emerald-700 font-bold">
                              {r.goodAfterReworkQty}
                            </span>{' '}
                            /{' '}
                            <span className="text-rose-600 font-bold">{r.scrapAfterReworkQty}</span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-medium text-slate-700">{r.defectDescription}</div>
                            <div className="text-xs text-slate-400">
                              {r.repairInstruction || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            {r.assignedOperatorName || '-'}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center">
                            {renderBadge(r.status)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
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
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Re-Inspeksi
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openDetail(r)}
                                title="Buka Lembar Kerja"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {canWriteRework &&
                                (r.status === 'OPEN' || r.status === 'IN_REWORK') && (
                                  <button
                                    type="button"
                                    onClick={() => openEdit(r)}
                                    title="Edit Rework"
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                              {canWriteRework && (
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(r)}
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
                          <tr className="bg-indigo-50/70 border-b border-indigo-200">
                            <td colSpan={9} className="p-4">
                              {canDoReinspect ? (
                                <div className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3 text-sm">
                                  <div className="font-bold text-indigo-800">
                                    Re-Inspeksi QC Setelah Rework ({r.reworkNumber})
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end">
                                    <label className="space-y-1">
                                      <span className="text-xs font-semibold">Qty Good</span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={reinspectDraft.goodAfterReworkQty}
                                        onChange={(e) =>
                                          setReinspectDraft({
                                            ...reinspectDraft,
                                            goodAfterReworkQty: Number(e.target.value),
                                          })
                                        }
                                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                                      />
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-xs font-semibold">Qty Scrap</span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={reinspectDraft.scrapAfterReworkQty}
                                        onChange={(e) =>
                                          setReinspectDraft({
                                            ...reinspectDraft,
                                            scrapAfterReworkQty: Number(e.target.value),
                                          })
                                        }
                                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                                      />
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-xs font-semibold">Verdict</span>
                                      <select
                                        value={reinspectDraft.verdict}
                                        onChange={(e) =>
                                          setReinspectDraft({
                                            ...reinspectDraft,
                                            verdict: e.target.value as 'PASSED' | 'SCRAPPED',
                                          })
                                        }
                                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-bold"
                                      >
                                        <option value="PASSED">PASSED</option>
                                        <option value="SCRAPPED">SCRAPPED</option>
                                      </select>
                                    </label>
                                    <label className="space-y-1 col-span-2">
                                      <span className="text-xs font-semibold">
                                        Catatan Re-Inspeksi
                                      </span>
                                      <input
                                        type="text"
                                        placeholder="Hasil cek ulang QC..."
                                        value={reinspectDraft.notes || ''}
                                        onChange={(e) =>
                                          setReinspectDraft({
                                            ...reinspectDraft,
                                            notes: e.target.value,
                                          })
                                        }
                                        className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        reinspectMut.mutate({ id: r.id, p: reinspectDraft })
                                      }
                                      disabled={reinspectMut.isPending}
                                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                    >
                                      Simpan Re-Inspeksi
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                                    <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={reinspectDraft.autoLogProductWaste}
                                        onChange={(e) =>
                                          setReinspectDraft({
                                            ...reinspectDraft,
                                            autoLogProductWaste: e.target.checked,
                                          })
                                        }
                                      />
                                      <span>Auto-log Qty Scrap ke 3.6.1 Product Waste</span>
                                    </label>
                                    <span className="text-emerald-700">
                                      Qty Good (PASSED) otomatis masuk stok FG AVAILABLE.
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-600">
                                  <strong>Re-Inspeksi:</strong> {r.reinspectedBy || '-'} •{' '}
                                  <strong>Catatan:</strong> {r.reinspectionNotes || '-'}
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
