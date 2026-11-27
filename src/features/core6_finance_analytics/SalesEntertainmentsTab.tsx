import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Printer,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesEntertainmentsApi,
  createSalesEntertainmentApi,
  updateSalesEntertainmentApi,
  deleteSalesEntertainmentApi,
  approveEntertainmentManagerApi,
  approveEntertainmentFinanceApi,
  listMdmCustomersApi,
  uploadFinanceDocument,
  resolveFinanceFileUrl,
  printFinanceHtmlReport,
  extractFinanceErrorMessage,
  SalesEntertainmentRecord,
  SalesEntertainmentPayload,
} from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';
import {
  EXCEL_CELL,
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): SalesEntertainmentPayload => ({
  customerId: '',
  customerName: '',
  entertainmentDate: todayStr(),
  location: '',
  attendees: '',
  purpose: '',
  estimatedAmount: 0,
  actualAmount: 0,
  receiptFileUrl: '',
  notes: '',
});

export const SalesEntertainmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canCreateOrEdit = isSuperAdmin || isExecutive || userDivision === 'SALES';
  const canApproveManager = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'SALES');
  const canApproveFinance = isSuperAdmin || isExecutive || userDivision === 'FINANCE';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesEntertainmentRecord | null>(null);
  const [draft, setDraft] = useState<SalesEntertainmentPayload>(emptyDraft);
  const [uploading, setUploading] = useState(false);

  const [voidTarget, setVoidTarget] = useState<SalesEntertainmentRecord | null>(null);

  const editingId = editingRecord?.id ?? null;

  const { data: res, isLoading } = useQuery({
    queryKey: ['financeEntertainments', page, search, statusFilter],
    queryFn: () => listSalesEntertainmentsApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;
  const totalItems = res?.meta?.total ?? res?.meta?.totalItems;

  const { data: customers = [] } = useQuery({
    queryKey: ['mdmCustomersDropdown'],
    queryFn: listMdmCustomersApi,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['financeEntertainments'] });

  const createMutation = useMutation({
    mutationFn: (payload: SalesEntertainmentPayload) => createSalesEntertainmentApi(payload),
    onSuccess: () => {
      toast.success('Pengajuan Entertain Sales berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyimpan entertain sales')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SalesEntertainmentPayload> }) =>
      updateSalesEntertainmentApi(id, payload),
    onSuccess: () => {
      toast.success('Entertain Sales berhasil diperbarui');
      setEditingRecord(null);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui entertain sales')),
  });

  const mgrMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveEntertainmentManagerApi(id, action),
    onSuccess: () => {
      toast.success('Approval Manager Marketing berhasil diproses');
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memproses approval Manager Marketing')),
  });

  const finMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveEntertainmentFinanceApi(id, action),
    onSuccess: () => {
      toast.success('Approval Finance berhasil diproses');
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memproses approval Finance')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSalesEntertainmentApi(id),
    onSuccess: () => {
      toast.success('Pengajuan Entertain berhasil dibatalkan');
      setVoidTarget(null);
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan entertain')),
  });

  const handleUploadReceipt = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFinanceDocument('entertainment_receipt', file);
      setDraft((prev) => ({ ...prev, receiptFileUrl: url }));
      toast.success('Nota/kwitansi entertain berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah nota');
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (row: SalesEntertainmentRecord) => {
    setIsAdding(false);
    setEditingRecord(row);
    setDraft({
      customerId: row.customerId || '',
      customerName: row.customerName || '',
      entertainmentDate: row.entertainmentDate,
      location: row.location,
      attendees: row.attendees,
      purpose: row.purpose,
      estimatedAmount: row.estimatedAmount,
      actualAmount: row.actualAmount,
      receiptFileUrl: row.receiptFileUrl || '',
      notes: row.notes || '',
    });
  };

  const cancelEditor = () => {
    setIsAdding(false);
    setEditingRecord(null);
    setDraft(emptyDraft());
  };

  const handleSave = () => {
    if (!draft.customerId && !draft.customerName?.trim()) return toast.error('Customer wajib diisi');
    if (!draft.location.trim()) return toast.error('Lokasi wajib diisi');
    const payload: SalesEntertainmentPayload = {
      ...draft,
      customerId: draft.customerId || null,
      receiptFileUrl: draft.receiptFileUrl || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderBadge = (status: string) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'APPROVED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">APPROVED</span>;
    if (s === 'REJECTED') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">REJECTED</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">PENDING</span>;
  };

  const totals = useMemo(
    () =>
      list.reduce(
        (acc, r) => {
          acc.est += Number(r.estimatedAmount || 0);
          acc.act += Number(r.actualAmount || 0);
          return acc;
        },
        { est: 0, act: 0 }
      ),
    [list]
  );

  const excelColumns: ExcelColumn<SalesEntertainmentRecord>[] = [
    {
      key: 'entertainmentDate',
      header: 'Tanggal',
      getValue: (r) => r.entertainmentDate || '-',
    },
    {
      key: 'customerName',
      header: 'Customer',
      minWidth: 'min-w-[160px]',
      getValue: (r) => r.customerName || '-',
    },
    {
      key: 'requesterName',
      header: 'Pemohon',
      minWidth: 'min-w-[140px]',
      getValue: (r) => r.requesterName || '-',
    },
    {
      key: 'location',
      header: 'Lokasi / Restoran',
      minWidth: 'min-w-[150px]',
      getValue: (r) => r.location || '-',
    },
    {
      key: 'attendees',
      header: 'Peserta / Attendees',
      minWidth: 'min-w-[160px]',
      getValue: (r) => r.attendees || '-',
    },
    {
      key: 'purpose',
      header: 'Tujuan / Keperluan',
      minWidth: 'min-w-[180px]',
      getValue: (r) => r.purpose || '-',
    },
    {
      key: 'estimatedAmount',
      header: 'Estimasi',
      align: 'right',
      mono: true,
      getValue: (r) => Number(r.estimatedAmount || 0),
      render: (r) => formatIDR(r.estimatedAmount),
      footer: formatIDR(totals.est),
    },
    {
      key: 'actualAmount',
      header: 'Aktual',
      align: 'right',
      mono: true,
      getValue: (r) => Number(r.actualAmount || 0),
      render: (r) => <span className="font-bold text-emerald-700">{formatIDR(r.actualAmount)}</span>,
      footer: <span className="text-emerald-700">{formatIDR(totals.act)}</span>,
    },
    {
      key: 'managerStatus',
      header: 'Manager Mkt',
      align: 'center',
      getValue: (r) => r.managerStatus || 'PENDING',
      render: (row) => {
        const isVoid = row.status === 'CANCELLED' || row.status === 'VOID';
        return (
          <div className="inline-flex items-center gap-1">
            {renderBadge(row.managerStatus)}
            {canApproveManager && row.managerStatus === 'PENDING' && !isVoid && (
              <>
                <button
                  type="button"
                  onClick={() => mgrMutation.mutate({ id: row.id, action: 'APPROVE' })}
                  title="Approve Manager Mkt"
                  className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => mgrMutation.mutate({ id: row.id, action: 'REJECT' })}
                  title="Reject Manager Mkt"
                  className="p-1 rounded bg-rose-600 text-white cursor-pointer"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'financeStatus',
      header: 'Finance',
      align: 'center',
      getValue: (r) => r.financeStatus || 'PENDING',
      render: (row) => {
        const isVoid = row.status === 'CANCELLED' || row.status === 'VOID';
        return (
          <div className="inline-flex items-center gap-1">
            {renderBadge(row.financeStatus)}
            {canApproveFinance && row.financeStatus === 'PENDING' && !isVoid && (
              <>
                <button
                  type="button"
                  onClick={() => finMutation.mutate({ id: row.id, action: 'APPROVE' })}
                  title="Approve Finance"
                  className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => finMutation.mutate({ id: row.id, action: 'REJECT' })}
                  title="Reject Finance"
                  className="p-1 rounded bg-rose-600 text-white cursor-pointer"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'receiptFileUrl',
      header: 'Nota / Kwitansi',
      align: 'center',
      getValue: (r) => (r.receiptFileUrl ? 'Ada' : '-'),
      render: (r) => {
        const notaHref = resolveFinanceFileUrl(r.receiptFileUrl);
        return notaHref ? (
          <a href={notaHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
            <ExternalLink className="w-3 h-3" /> Nota
          </a>
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      key: 'notes',
      header: 'Catatan',
      minWidth: 'min-w-[150px]',
      getValue: (r) => r.notes || '-',
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (row) => {
        const isVoid = row.status === 'CANCELLED' || row.status === 'VOID';
        return (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                printFinanceHtmlReport(`/finance/entertainments/${row.id}/print`).catch((e) =>
                  toast.error(e?.message || 'Gagal mencetak form entertain')
                )
              }
              title="Cetak Form Entertain"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            {canCreateOrEdit && row.financeStatus === 'PENDING' && !isVoid && (
              <button
                type="button"
                onClick={() => startEdit(row)}
                title="Edit"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {(canCreateOrEdit || canApproveFinance) && row.financeStatus === 'PENDING' && !isVoid && (
              <button
                type="button"
                onClick={() => setVoidTarget(row)}
                title="Batal / Void"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const handleExportCsv = () => {
    exportExcelCsv(
      'entertain-sales',
      excelColumns.filter((c) => c.key !== 'actions'),
      list
    );
  };

  if (canCreateOrEdit && (isAdding || editingRecord)) {
    const isNew = isAdding && !editingRecord;
    const notaHref = resolveFinanceFileUrl(draft.receiptFileUrl);
    return (
      <ExcelWorksheetShell
        onBack={cancelEditor}
        docTitle={isNew ? 'PENGAJUAN ENTERTAIN BARU' : `ENTERTAIN — ${editingRecord?.customerName || ''}`}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {isNew ? 'BARU' : 'EDIT'}
          </span>
        }
        formCode="FORM PENGAJUAN ENTERTAIN SALES"
        sheetTitle={isNew ? 'Ajukan Biaya Entertain Sales' : 'Edit Pengajuan Entertain Sales'}
        modeHint="Worksheet Pengajuan Entertain"
        actions={
          <>
            <button
              type="button"
              onClick={cancelEditor}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer"
            >
              <X className="w-4 h-4" /> Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || uploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Pengajuan</span>
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${EXCEL_CELL.label} w-48`}>Tanggal Entertain *</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="date"
                    value={draft.entertainmentDate}
                    onChange={(e) => setDraft({ ...draft, entertainmentDate: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
                <td className={`${EXCEL_CELL.label} w-48`}>Customer (MDM)</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={draft.customerId || ''}
                    onChange={(e) => {
                      const c = customers.find((x) => x.id === e.target.value);
                      setDraft({ ...draft, customerId: e.target.value, customerName: c?.name || draft.customerName });
                    }}
                    className={EXCEL_CELL.input}
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Nama Customer *</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="Nama customer / perusahaan..."
                    value={draft.customerName || ''}
                    onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Lokasi / Restoran *</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="Lokasi / Restoran..."
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Peserta / Attendees</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="Nama peserta yang hadir..."
                    value={draft.attendees}
                    onChange={(e) => setDraft({ ...draft, attendees: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Tujuan / Keperluan</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="Tujuan / Keperluan meeting..."
                    value={draft.purpose}
                    onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Estimasi Biaya (IDR)</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={draft.estimatedAmount}
                    onChange={(e) => setDraft({ ...draft, estimatedAmount: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right`}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Biaya Aktual (IDR)</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={draft.actualAmount}
                    onChange={(e) => setDraft({ ...draft, actualAmount: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right font-bold text-emerald-700`}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Upload Nota / Kwitansi</td>
                <td className="px-3 py-2 bg-white border border-slate-300">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{draft.receiptFileUrl ? 'Ganti Nota' : 'Upload Nota'}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => e.target.files?.[0] && handleUploadReceipt(e.target.files[0])}
                      />
                    </label>
                    {notaHref && (
                      <a href={notaHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
                        <ExternalLink className="w-3.5 h-3.5" /> Lihat Nota
                      </a>
                    )}
                  </div>
                </td>
                <td className={EXCEL_CELL.label}>Catatan</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="Catatan tambahan (opsional)..."
                    value={draft.notes || ''}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Customer / Lokasi / Tujuan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={handleExportCsv}
            exportDisabled={list.length === 0}
          />
          {canCreateOrEdit && (
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setDraft(emptyDraft());
                setIsAdding(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ajukan Entertain</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Pengajuan Entertain Sales — Tabel Excel"
          subtitle="Seluruh kolom estimasi, aktual, peserta, tujuan & approval terpisah rapi"
          columns={excelColumns}
          rows={list}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada pengajuan Entertain Sales."
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'pengajuan',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => p + 1),
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 uppercase">
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Tanggal</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Customer &amp; Pemohon</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Lokasi &amp; Peserta</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Tujuan &amp; Nota</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Estimasi / Aktual</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Manager Mkt</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Finance</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Entertain Sales...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Belum ada pengajuan Entertain Sales.
                    </td>
                  </tr>
                ) : (
                  list.map((row) => {
                    const notaHref = resolveFinanceFileUrl(row.receiptFileUrl);
                    const isVoid = row.status === 'CANCELLED' || row.status === 'VOID';

                    return (
                      <tr key={row.id} className={`hover:bg-slate-50/80 transition-colors ${isVoid ? 'opacity-60' : ''}`}>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap font-medium">
                          {row.entertainmentDate}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200">
                          <div className="font-semibold text-slate-800">{row.customerName}</div>
                          <div className="text-xs text-slate-500">{row.requesterName}</div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200">
                          <div className="font-medium text-slate-700">{row.location}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[180px]">{row.attendees}</div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200">
                          <div className="truncate max-w-[200px]">{row.purpose}</div>
                          {notaHref && (
                            <a href={notaHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Lihat Nota
                            </a>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono whitespace-nowrap">
                          <div className="font-bold text-slate-800">{formatIDR(row.actualAmount || row.estimatedAmount)}</div>
                          <div className="text-xs text-slate-400">Est: {formatIDR(row.estimatedAmount)}</div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-center space-y-1">
                          <div>{renderBadge(row.managerStatus)}</div>
                          {canApproveManager && row.managerStatus === 'PENDING' && !isVoid && (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => mgrMutation.mutate({ id: row.id, action: 'APPROVE' })}
                                title="Approve Manager Mkt"
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => mgrMutation.mutate({ id: row.id, action: 'REJECT' })}
                                title="Reject Manager Mkt"
                                className="p-1 rounded bg-rose-600 text-white cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-center space-y-1">
                          <div>{renderBadge(row.financeStatus)}</div>
                          {canApproveFinance && row.financeStatus === 'PENDING' && !isVoid && (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => finMutation.mutate({ id: row.id, action: 'APPROVE' })}
                                title="Approve Finance"
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => finMutation.mutate({ id: row.id, action: 'REJECT' })}
                                title="Reject Finance"
                                className="p-1 rounded bg-rose-600 text-white cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                printFinanceHtmlReport(`/finance/entertainments/${row.id}/print`).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak form entertain')
                                )
                              }
                              title="Cetak Form Entertain"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canCreateOrEdit && row.financeStatus === 'PENDING' && !isVoid && (
                              <button
                                type="button"
                                onClick={() => startEdit(row)}
                                title="Edit"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {(canCreateOrEdit || canApproveFinance) && row.financeStatus === 'PENDING' && !isVoid && (
                              <button
                                type="button"
                                onClick={() => setVoidTarget(row)}
                                title="Batal / Void"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(voidTarget)}
        title="Batalkan Pengajuan Entertain?"
        message={`Anda yakin ingin membatalkan pengajuan entertain untuk ${voidTarget?.customerName || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
