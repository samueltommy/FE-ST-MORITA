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
  Upload,
  Loader2,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listQcInspectionsApi,
  createQcInspectionApi,
  updateQcInspectionApi,
  deleteQcInspectionApi,
  listProductionStocksApi,
  listProductionPlansApi,
  uploadProductionDocument,
  printProductionHtmlReport,
  extractProductionError,
  QCInspectionPayload,
} from '../../services/productionService';
import { listMdmCustomersApi } from '../../services/financeService';
import type { QCType, QCInspectionRecord } from '../../types/productionQc';
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

interface Props {
  qcType: QCType;
}

interface ParamRow {
  key: string;
  value: string;
}

interface QcDraft {
  stockInventoryId: string;
  productionPlanId: string;
  itemId: string;
  lotNumber: string;
  tdsStandard: string;
  customerName: string;
  coaNumber: string;
  sampleSizeQty: number;
  passQty: number;
  failQty: number;
  status: string;
  routeToRework: boolean;
  reworkInstruction: string;
  notes: string;
  params: ParamRow[];
}

const defaultParamsFor = (qcType: QCType): ParamRow[] =>
  qcType === 'IQC'
    ? [
        { key: 'thickness_mm', value: '' },
        { key: 'width_mm', value: '' },
        { key: 'adhesion_gf', value: '' },
        { key: 'visual', value: 'OK' },
      ]
    : qcType === 'PQC'
    ? [
        { key: 'width_mm', value: '' },
        { key: 'length_m', value: '' },
        { key: 'visual', value: 'OK' },
      ]
    : [
        { key: 'thickness_um', value: '' },
        { key: 'adhesion_180', value: '' },
        { key: 'tensile_strength', value: '' },
        { key: 'visual', value: 'OK' },
      ];

const emptyDraft = (qcType: QCType): QcDraft => ({
  stockInventoryId: '',
  productionPlanId: '',
  itemId: '',
  lotNumber: '',
  tdsStandard: '',
  customerName: '',
  coaNumber: '',
  sampleSizeQty: 10,
  passQty: 10,
  failQty: 0,
  status: 'PASSED',
  routeToRework: false,
  reworkInstruction: '',
  notes: '',
  params: defaultParamsFor(qcType),
});

type WorksheetMode = 'list' | 'create' | 'edit' | 'detail';

export const QcInspectionsTab: React.FC<Props> = ({ qcType }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite =
    isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC' || userDivision === 'RND';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [worksheetMode, setWorksheetMode] = useState<WorksheetMode>('list');
  const [selectedQc, setSelectedQc] = useState<QCInspectionRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QcDraft>(() => emptyDraft(qcType));
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<QCInspectionRecord | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['qcInspections', qcType, page, search, statusFilter],
    queryFn: () =>
      listQcInspectionsApi({
        qcType,
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;
  const totalItems = res?.meta?.total;

  const { data: holdStocksRes } = useQuery({
    queryKey: ['productionHoldStocksDropdown'],
    queryFn: () => listProductionStocksApi({ page: 1, limit: 100, stockStatus: 'HOLD' }),
    enabled: qcType === 'IQC' || qcType === 'OQC',
  });
  const holdStocks = holdStocksRes?.data || [];

  const { data: plansRes } = useQuery({
    queryKey: ['productionPlansDropdown'],
    queryFn: () => listProductionPlansApi({ page: 1, limit: 100 }),
    enabled: qcType === 'PQC',
  });
  const plans = plansRes?.data || [];

  const { data: customers = [] } = useQuery({
    queryKey: ['mdmCustomersDropdown'],
    queryFn: listMdmCustomersApi,
    enabled: qcType === 'OQC',
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['qcInspections'] });
    queryClient.invalidateQueries({ queryKey: ['productionStocks'] });
    queryClient.invalidateQueries({ queryKey: ['productionHoldStocksDropdown'] });
    queryClient.invalidateQueries({ queryKey: ['availableStocksForSpk'] });
    queryClient.invalidateQueries({ queryKey: ['productionReworks'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: QCInspectionPayload) => createQcInspectionApi(p),
    onSuccess: (created) => {
      if (qcType === 'IQC' && created.status === 'PASSED') {
        toast.success('IQC PASSED — Stok batch terkait otomatis dirilis dari HOLD → AVAILABLE!');
      } else if (qcType === 'PQC' && (created.status === 'REWORK' || created.routedToRework)) {
        toast.success('PQC tercatat — Tiket 4.5.2 Rework/Repair telah diterbitkan otomatis!');
      } else if (qcType === 'OQC' && created.status === 'PASSED') {
        toast.success(
          `OQC PASSED — COA ${created.coaNumber || ''} terbit & stok FG dirilis AVAILABLE!`
        );
      } else {
        toast.success(`Inspeksi ${qcType} berhasil disimpan`);
      }
      setWorksheetMode('list');
      setSelectedQc(null);
      setEditingId(null);
      setDraft(emptyDraft(qcType));
      invalidateAll();
    },
    onError: (e: any) =>
      toast.error(extractProductionError(e, `Gagal menyimpan inspeksi ${qcType}`).message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<QCInspectionPayload> }) =>
      updateQcInspectionApi(id, p),
    onSuccess: () => {
      toast.success(`Inspeksi ${qcType} berhasil diperbarui`);
      setWorksheetMode('list');
      setSelectedQc(null);
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) =>
      toast.error(extractProductionError(e, `Gagal memperbarui inspeksi ${qcType}`).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteQcInspectionApi(id),
    onSuccess: () => {
      toast.success(`Inspeksi ${qcType} berhasil dibatalkan`);
      setVoidTarget(null);
      if (worksheetMode !== 'list') {
        setWorksheetMode('list');
        setSelectedQc(null);
      }
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membatalkan inspeksi').message),
  });

  const handleUploadAttachment = async (file: File) => {
    setUploading(true);
    try {
      const docType =
        qcType === 'IQC' ? 'tds_report' : qcType === 'OQC' ? 'coa_attachment' : 'qc_photo';
      const url = await uploadProductionDocument(docType, file);
      setDraft((prev) => ({
        ...prev,
        params: [
          ...prev.params.filter((p) => p.key !== 'attachment_url'),
          { key: 'attachment_url', value: url },
        ],
      }));
      toast.success('Dokumen lampiran QC berhasil diunggah');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mengunggah dokumen QC');
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    setSelectedQc(null);
    setEditingId(null);
    setDraft(emptyDraft(qcType));
    setWorksheetMode('create');
  };

  const openEdit = (row: QCInspectionRecord) => {
    const entries = Object.entries(row.inspectionData || {});
    setSelectedQc(row);
    setEditingId(row.id);
    setDraft({
      stockInventoryId: row.stockInventoryId || '',
      productionPlanId: row.productionPlanId || '',
      itemId: row.itemId || '',
      lotNumber: row.lotNumber || '',
      tdsStandard: row.tdsStandard || '',
      customerName: row.customerName || '',
      coaNumber: row.coaNumber || '',
      sampleSizeQty: row.sampleSizeQty,
      passQty: row.passQty,
      failQty: row.failQty,
      status: row.status,
      routeToRework: row.routedToRework,
      reworkInstruction: '',
      notes: row.notes || '',
      params:
        entries.length > 0
          ? entries.map(([k, v]) => ({ key: k, value: String(v) }))
          : defaultParamsFor(qcType),
    });
    setWorksheetMode('edit');
  };

  const openDetail = (row: QCInspectionRecord) => {
    setSelectedQc(row);
    setEditingId(null);
    setWorksheetMode('detail');
  };

  const handleSave = () => {
    const inspectionData: Record<string, string | number> = {};
    draft.params.forEach((p) => {
      if (p.key.trim() && p.value.trim() !== '') {
        inspectionData[p.key.trim()] = p.value.trim();
      }
    });

    const payload: QCInspectionPayload = {
      qcType,
      referenceType: qcType === 'IQC' ? 'RECEIPT' : qcType === 'PQC' ? 'PRODUCTION' : 'DO',
      stockInventoryId: qcType !== 'PQC' ? draft.stockInventoryId || null : null,
      productionPlanId: qcType === 'PQC' ? draft.productionPlanId || null : null,
      itemId: draft.itemId || null,
      lotNumber: draft.lotNumber || null,
      tdsStandard: qcType === 'IQC' ? draft.tdsStandard || null : null,
      customerName: qcType === 'OQC' ? draft.customerName || null : null,
      coaNumber: qcType === 'OQC' ? draft.coaNumber || null : null,
      sampleSizeQty: Number(draft.sampleSizeQty) || 0,
      passQty: Number(draft.passQty) || 0,
      failQty: Number(draft.failQty) || 0,
      status: draft.status,
      routeToRework: qcType === 'PQC' ? draft.routeToRework || draft.status === 'REWORK' : false,
      reworkInstruction: qcType === 'PQC' ? draft.reworkInstruction || null : null,
      inspectionData,
      notes: draft.notes || null,
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
    if (s === 'REWORK')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
          REWORK
        </span>
      );
    if (s === 'FAILED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
          FAILED
        </span>
      );
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        {s || 'HOLD'}
      </span>
    );
  };

  const printPathFor = (id: string) =>
    qcType === 'OQC' ? `/qc/inspections/${id}/print-coa` : `/qc/inspections/${id}/print-lkp`;

  const totals = useMemo(
    () =>
      list.reduce(
        (acc, r) => ({
          sample: acc.sample + (Number(r.sampleSizeQty) || 0),
          pass: acc.pass + (Number(r.passQty) || 0),
          fail: acc.fail + (Number(r.failQty) || 0),
        }),
        { sample: 0, pass: 0, fail: 0 }
      ),
    [list]
  );

  const excelColumns: ExcelColumn<QCInspectionRecord>[] = useMemo(() => {
    const cols: ExcelColumn<QCInspectionRecord>[] = [
      {
        key: 'inspectionNumber',
        header: `No. ${qcType}`,
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.inspectionNumber || r.id.slice(0, 8),
      },
      {
        key: 'createdAt',
        header: 'Tanggal',
        mono: true,
        getValue: (r) => r.createdAt || '-',
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
    ];

    if (qcType === 'PQC') {
      cols.push({
        key: 'spkNumber',
        header: 'No. SPK',
        mono: true,
        getValue: (r) => r.spkNumber || '-',
      });
    }

    cols.push({
      key: 'lotNumber',
      header: 'No. LOT',
      mono: true,
      minWidth: 'min-w-[130px]',
      getValue: (r) => r.lotNumber || '-',
    });

    if (qcType === 'IQC') {
      cols.push({
        key: 'tdsStandard',
        header: 'Standar TDS',
        minWidth: 'min-w-[150px]',
        getValue: (r) => r.tdsStandard || '-',
      });
    }
    if (qcType === 'OQC') {
      cols.push(
        {
          key: 'customerName',
          header: 'Customer',
          minWidth: 'min-w-[160px]',
          getValue: (r) => r.customerName || '-',
        },
        {
          key: 'coaNumber',
          header: 'No. COA',
          mono: true,
          minWidth: 'min-w-[140px]',
          getValue: (r) => r.coaNumber || '-',
        }
      );
    }
    if (qcType === 'PQC') {
      cols.push({
        key: 'routedToRework',
        header: 'Route Rework',
        align: 'center',
        getValue: (r) => (r.routedToRework ? 'YA' : 'TIDAK'),
      });
    }

    cols.push(
      {
        key: 'inspectorName',
        header: 'Inspector',
        minWidth: 'min-w-[130px]',
        getValue: (r) => r.inspectorName || '-',
      },
      {
        key: 'sampleSizeQty',
        header: 'Sample',
        align: 'right',
        mono: true,
        getValue: (r) => r.sampleSizeQty,
        footer: totals.sample.toLocaleString('id-ID'),
      },
      {
        key: 'passQty',
        header: 'Pass',
        align: 'right',
        mono: true,
        getValue: (r) => r.passQty,
        render: (r) => <span className="font-bold text-emerald-700">{r.passQty}</span>,
        footer: <span className="text-emerald-700">{totals.pass.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'failQty',
        header: 'Fail',
        align: 'right',
        mono: true,
        getValue: (r) => r.failQty,
        render: (r) => <span className="font-bold text-rose-600">{r.failQty}</span>,
        footer: <span className="text-rose-600">{totals.fail.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'status',
        header: 'Status QC',
        align: 'center',
        getValue: (r) => r.status,
        render: (r) => renderBadge(r.status),
      },
      {
        key: 'notes',
        header: 'Catatan',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.notes || '-',
      }
    );
    return cols;
  }, [qcType, totals]);

  if (worksheetMode !== 'list') {
    const isReadOnly = worksheetMode === 'detail';
    const detailEntries = Object.entries(selectedQc?.inspectionData || {});

    return (
      <>
        <ExcelWorksheetShell
          onBack={() => {
            setWorksheetMode('list');
            setSelectedQc(null);
            setEditingId(null);
          }}
          docTitle={
            worksheetMode === 'create'
              ? `AUTO-${qcType} BARU`
              : selectedQc?.inspectionNumber || selectedQc?.id.slice(0, 8) || qcType
          }
          badge={renderBadge(isReadOnly ? selectedQc?.status || 'HOLD' : draft.status)}
          formCode={`FORM-QC-${qcType} (${qcType === 'OQC' ? 'OUTGOING QC & COA' : qcType === 'IQC' ? 'INCOMING QC' : 'IN-PROCESS QC'})`}
          sheetTitle={
            worksheetMode === 'create'
              ? `Lembar Kerja Inspeksi ${qcType === 'OQC' ? 'OQC / Penerbitan COA' : qcType}`
              : worksheetMode === 'edit'
              ? `Edit Inspeksi ${qcType}`
              : `Detail Laporan Inspeksi ${qcType}`
          }
          modeHint={isReadOnly ? 'MODE: READ-ONLY' : 'MODE: EXCEL ENTRY'}
          actions={
            isReadOnly && selectedQc ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printProductionHtmlReport(printPathFor(selectedQc.id)).catch((e) =>
                      toast.error(e?.message || 'Gagal mencetak dokumen QC')
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak {qcType === 'OQC' ? 'COA' : 'LKP'}
                </button>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => openEdit(selectedQc)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                )}
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setVoidTarget(selectedQc)}
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
                  disabled={createMut.isPending || updateMut.isPending || uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Simpan Inspeksi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorksheetMode('list');
                    setSelectedQc(null);
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
          {/* Section A: Target & Verdict */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              A. Identitas Batch / SPK &amp; Keputusan QC ({qcType})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={`${EXCEL_CELL.label} w-44`}>
                      {qcType === 'PQC' ? 'SPK Produksi' : `Batch HOLD (${qcType === 'IQC' ? 'RM' : 'FG'})`}
                    </td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-semibold`}>
                          {selectedQc?.spkNumber ? `${selectedQc.spkNumber} — ` : ''}
                          {selectedQc?.itemName || '-'}
                        </div>
                      ) : qcType === 'PQC' ? (
                        <select
                          value={draft.productionPlanId}
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
                          <option value="">-- Pilih SPK --</option>
                          {plans.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.spkNumber} — {pl.itemName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={draft.stockInventoryId}
                          onChange={(e) => {
                            const st = holdStocks.find((x) => x.id === e.target.value);
                            setDraft({
                              ...draft,
                              stockInventoryId: e.target.value,
                              itemId: st?.itemId || draft.itemId,
                              lotNumber: st?.lotNumber || draft.lotNumber,
                            });
                          }}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">
                            -- Pilih Batch HOLD ({qcType === 'IQC' ? 'RM' : 'FG'}) --
                          </option>
                          {holdStocks.map((st) => (
                            <option key={st.id} value={st.id}>
                              [{st.lotNumber}] {st.itemName} (Qty: {st.qty})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className={`${EXCEL_CELL.label} w-44`}>No. LOT</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono font-bold text-blue-700`}>
                          {selectedQc?.lotNumber || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="No. LOT"
                          value={draft.lotNumber}
                          onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })}
                          className={`${EXCEL_CELL.input} font-mono`}
                        />
                      )}
                    </td>
                  </tr>

                  {qcType === 'IQC' && (
                    <tr>
                      <td className={EXCEL_CELL.label}>Standar TDS</td>
                      <td className={EXCEL_CELL.value}>
                        {isReadOnly ? (
                          <div className={EXCEL_CELL.readValue}>
                            {selectedQc?.tdsStandard || '-'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Standar TDS..."
                            value={draft.tdsStandard}
                            onChange={(e) => setDraft({ ...draft, tdsStandard: e.target.value })}
                            className={EXCEL_CELL.input}
                          />
                        )}
                      </td>
                      <td className={EXCEL_CELL.label}>Status Keputusan</td>
                      <td className={EXCEL_CELL.value}>
                        {isReadOnly ? (
                          <div className={EXCEL_CELL.readValue}>
                            {renderBadge(selectedQc?.status || 'HOLD')}
                          </div>
                        ) : (
                          <select
                            value={draft.status}
                            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                            className={`${EXCEL_CELL.input} font-bold`}
                          >
                            <option value="PASSED">PASSED</option>
                            <option value="HOLD">HOLD</option>
                            <option value="FAILED">FAILED</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  )}

                  {qcType === 'OQC' && (
                    <tr>
                      <td className={EXCEL_CELL.label}>Customer</td>
                      <td className={EXCEL_CELL.value}>
                        {isReadOnly ? (
                          <div className={EXCEL_CELL.readValue}>
                            {selectedQc?.customerName || '-'}
                          </div>
                        ) : (
                          <select
                            value={draft.customerName}
                            onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                            className={EXCEL_CELL.input}
                          >
                            <option value="">-- Pilih Customer --</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className={EXCEL_CELL.label}>No. COA &amp; Status</td>
                      <td className={EXCEL_CELL.value}>
                        {isReadOnly ? (
                          <div className={`${EXCEL_CELL.readValue} flex items-center gap-2`}>
                            <span className="font-mono font-bold text-emerald-700">
                              {selectedQc?.coaNumber || '-'}
                            </span>
                            {renderBadge(selectedQc?.status || 'HOLD')}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 divide-x divide-slate-300">
                            <input
                              type="text"
                              placeholder="No. COA (auto)"
                              value={draft.coaNumber}
                              onChange={(e) => setDraft({ ...draft, coaNumber: e.target.value })}
                              className={`${EXCEL_CELL.input} font-mono`}
                            />
                            <select
                              value={draft.status}
                              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                              className={`${EXCEL_CELL.input} font-bold`}
                            >
                              <option value="PASSED">PASSED</option>
                              <option value="HOLD">HOLD</option>
                              <option value="FAILED">FAILED</option>
                            </select>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}

                  {qcType === 'PQC' && (
                    <tr>
                      <td className={EXCEL_CELL.label}>Status Keputusan</td>
                      <td className={EXCEL_CELL.value}>
                        {isReadOnly ? (
                          <div className={EXCEL_CELL.readValue}>
                            {renderBadge(selectedQc?.status || 'HOLD')}
                          </div>
                        ) : (
                          <select
                            value={draft.status}
                            onChange={(e) => {
                              const st = e.target.value;
                              setDraft({
                                ...draft,
                                status: st,
                                routeToRework: st === 'REWORK' ? true : draft.routeToRework,
                              });
                            }}
                            className={`${EXCEL_CELL.input} font-bold`}
                          >
                            <option value="PASSED">PASSED</option>
                            <option value="REWORK">REWORK</option>
                            <option value="HOLD">HOLD</option>
                            <option value="FAILED">FAILED</option>
                          </select>
                        )}
                      </td>
                      <td className={EXCEL_CELL.label}>Routing Rework (4.5.2)</td>
                      <td className={EXCEL_CELL.value}>
                        {isReadOnly ? (
                          <div className={EXCEL_CELL.readValue}>
                            {selectedQc?.routedToRework ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">
                                <RotateCcw className="w-3.5 h-3.5" /> Dikirim ke Rework
                              </span>
                            ) : (
                              'Tidak'
                            )}
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-indigo-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft.routeToRework}
                              onChange={(e) =>
                                setDraft({ ...draft, routeToRework: e.target.checked })
                              }
                            />
                            <span>Kirim ke Rework/Repair (4.5.2)</span>
                          </label>
                        )}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className={EXCEL_CELL.label}>Sample / Pass / Fail</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono`}>
                          Sample: <strong>{selectedQc?.sampleSizeQty}</strong> • Pass:{' '}
                          <strong className="text-emerald-700">{selectedQc?.passQty}</strong> •
                          Fail: <strong className="text-rose-600">{selectedQc?.failQty}</strong>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 divide-x divide-slate-300">
                          <label className="flex items-center px-3 gap-2">
                            <span className="text-xs font-bold text-slate-500">Sample:</span>
                            <input
                              type="number"
                              min={0}
                              value={draft.sampleSizeQty}
                              onChange={(e) =>
                                setDraft({ ...draft, sampleSizeQty: Number(e.target.value) })
                              }
                              className="w-full py-2 text-sm font-mono text-right focus:outline-none"
                            />
                          </label>
                          <label className="flex items-center px-3 gap-2">
                            <span className="text-xs font-bold text-emerald-700">Pass:</span>
                            <input
                              type="number"
                              min={0}
                              value={draft.passQty}
                              onChange={(e) =>
                                setDraft({ ...draft, passQty: Number(e.target.value) })
                              }
                              className="w-full py-2 text-sm font-mono text-right font-bold text-emerald-700 focus:outline-none"
                            />
                          </label>
                          <label className="flex items-center px-3 gap-2">
                            <span className="text-xs font-bold text-rose-600">Fail:</span>
                            <input
                              type="number"
                              min={0}
                              value={draft.failQty}
                              onChange={(e) =>
                                setDraft({ ...draft, failQty: Number(e.target.value) })
                              }
                              className="w-full py-2 text-sm font-mono text-right font-bold text-rose-600 focus:outline-none"
                            />
                          </label>
                        </div>
                      )}
                    </td>
                  </tr>

                  {qcType === 'PQC' && !isReadOnly && (
                    <tr>
                      <td className={EXCEL_CELL.label}>Instruksi Rework</td>
                      <td className={EXCEL_CELL.value} colSpan={3}>
                        <input
                          type="text"
                          placeholder="Instruksi Rework/Repair (jika status REWORK)..."
                          value={draft.reworkInstruction}
                          onChange={(e) =>
                            setDraft({ ...draft, reworkInstruction: e.target.value })
                          }
                          className={EXCEL_CELL.input}
                        />
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className={EXCEL_CELL.label}>Catatan Inspeksi</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedQc?.notes || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Catatan inspeksi QC..."
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

          {/* Section B: Dynamic Parameters & Upload */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                B. Parameter Uji Dinamis ({qcType}) &amp; Lampiran Dokumen
              </div>
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer">
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      Upload{' '}
                      {qcType === 'IQC' ? 'TDS / Foto' : qcType === 'OQC' ? 'Lampiran COA' : 'Foto QC'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        e.target.files?.[0] && handleUploadAttachment(e.target.files[0])
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, params: [...draft.params, { key: '', value: '' }] })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Parameter
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                    <th className="border border-slate-300 px-3 py-2 text-center w-12">No</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">Nama Parameter</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">Hasil Pengujian</th>
                    {!isReadOnly && (
                      <th className="border border-slate-300 px-3 py-2 text-center w-16">Hapus</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isReadOnly ? (
                    detailEntries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="border border-slate-300 px-3 py-6 text-center text-sm text-slate-400"
                        >
                          Tidak ada parameter uji tambahan.
                        </td>
                      </tr>
                    ) : (
                      detailEntries.map(([k, v], idx) => (
                        <tr key={k}>
                          <td className="border border-slate-300 px-3 py-2 text-center font-mono text-xs text-slate-500 bg-slate-50">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-mono text-sm">
                            {k}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-semibold text-sm">
                            {String(v)}
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    draft.params.map((p, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono text-xs text-slate-500 bg-slate-50">
                          {idx + 1}
                        </td>
                        <td className={EXCEL_CELL.value}>
                          <input
                            type="text"
                            placeholder="Nama parameter (cth: thickness_mm)"
                            value={p.key}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                params: draft.params.map((x, i) =>
                                  i === idx ? { ...x, key: e.target.value } : x
                                ),
                              })
                            }
                            className={`${EXCEL_CELL.input} font-mono`}
                          />
                        </td>
                        <td className={EXCEL_CELL.value}>
                          <input
                            type="text"
                            placeholder="Hasil ukur / nilai"
                            value={p.value}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                params: draft.params.map((x, i) =>
                                  i === idx ? { ...x, value: e.target.value } : x
                                ),
                              })
                            }
                            className={EXCEL_CELL.input}
                          />
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                params: draft.params.filter((_, i) => i !== idx),
                              })
                            }
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
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
        </ExcelWorksheetShell>

        <ConfirmActionModal
          open={Boolean(voidTarget)}
          title={`Batalkan Inspeksi ${qcType}?`}
          message={`Anda yakin ingin membatalkan catatan inspeksi ${voidTarget?.inspectionNumber || voidTarget?.lotNumber || ''}?`}
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
              placeholder={`Cari No. ${qcType} / LOT / Item${qcType === 'OQC' ? ' / COA' : ''}...`}
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
            <option value="PASSED">PASSED</option>
            {qcType === 'PQC' && <option value="REWORK">REWORK</option>}
            <option value="HOLD">HOLD</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() =>
              exportExcelCsv(`qc-inspections-${qcType.toLowerCase()}`, excelColumns, list)
            }
            exportDisabled={list.length === 0}
          />
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat {qcType === 'OQC' ? 'OQC / COA' : qcType}</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title={`Daftar Inspeksi ${qcType === 'OQC' ? 'OQC & Penerbitan COA' : qcType}`}
          columns={excelColumns}
          rows={list}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText={`Belum ada data inspeksi ${qcType}.`}
          onRowClick={openDetail}
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'inspeksi',
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
                  <th className="px-4 py-3 border-r border-slate-200">No. Inspeksi &amp; Tgl</th>
                  <th className="px-4 py-3 border-r border-slate-200">
                    Item, {qcType === 'PQC' ? 'SPK' : 'Batch'} &amp; LOT
                  </th>
                  <th className="px-4 py-3 border-r border-slate-200">
                    {qcType === 'IQC'
                      ? 'Standar TDS'
                      : qcType === 'OQC'
                      ? 'Customer & No. COA'
                      : 'Routing & Inspector'}
                  </th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">
                    Sample / Pass / Fail
                  </th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat inspeksi{' '}
                      {qcType}...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada data inspeksi {qcType}.
                    </td>
                  </tr>
                ) : (
                  list.map((row) => {
                    const isExp = expandedId === row.id;
                    const entries = Object.entries(row.inspectionData || {});
                    return (
                      <React.Fragment key={row.id}>
                        <tr className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExp ? null : row.id)}
                              className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer"
                            >
                              {isExp ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span>{row.inspectionNumber || row.id.slice(0, 8)}</span>
                            </button>
                            <div className="text-xs text-slate-400 pl-5">
                              {row.createdAt || '-'} • {row.inspectorName}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-semibold text-slate-800">{row.itemName}</div>
                            <div className="text-xs font-mono text-blue-700">
                              {row.spkNumber ? `${row.spkNumber} • ` : ''}LOT:{' '}
                              {row.lotNumber || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            {qcType === 'IQC' && <span>{row.tdsStandard || '-'}</span>}
                            {qcType === 'OQC' && (
                              <div>
                                <div className="font-medium text-slate-800">
                                  {row.customerName || '-'}
                                </div>
                                <div className="text-xs font-mono text-emerald-700 font-bold">
                                  {row.coaNumber || '-'}
                                </div>
                              </div>
                            )}
                            {qcType === 'PQC' && (
                              <div className="flex items-center gap-1.5">
                                {row.routedToRework && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">
                                    <RotateCcw className="w-3 h-3" /> → Rework
                                  </span>
                                )}
                                <span className="text-slate-600">{row.inspectorName}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center font-mono whitespace-nowrap">
                            <span>{row.sampleSizeQty}</span> /{' '}
                            <span className="text-emerald-700 font-bold">{row.passQty}</span> /{' '}
                            <span className="text-rose-600 font-bold">{row.failQty}</span>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center">
                            {renderBadge(row.status)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => openDetail(row)}
                                title="Buka Lembar Kerja"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  printProductionHtmlReport(printPathFor(row.id)).catch((e) =>
                                    toast.error(e?.message || 'Gagal mencetak dokumen QC')
                                  )
                                }
                                title={qcType === 'OQC' ? 'Cetak COA' : 'Cetak LKP'}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>{qcType === 'OQC' ? 'COA' : 'LKP'}</span>
                              </button>
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(row)}
                                  title="Edit Inspeksi"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(row)}
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
                            <td colSpan={6} className="p-4 text-sm space-y-2">
                              <div className="font-bold text-slate-700">
                                Hasil Parameter Uji ({entries.length})
                              </div>
                              {entries.length === 0 ? (
                                <div className="text-slate-400">
                                  Tidak ada parameter uji tambahan.
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {entries.map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs"
                                    >
                                      <span className="font-mono text-slate-500">{k}:</span>{' '}
                                      <strong>{String(v)}</strong>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {row.notes && (
                                <div className="text-slate-600">Catatan: {row.notes}</div>
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
        title={`Batalkan Inspeksi ${qcType}?`}
        message={`Anda yakin ingin membatalkan catatan inspeksi ${voidTarget?.inspectionNumber || voidTarget?.lotNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
