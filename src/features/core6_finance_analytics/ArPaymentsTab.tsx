import React, { useState, useMemo } from 'react';
import {
  Plus,
  CheckCircle2,
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
  listFinancePaymentsApi,
  listFinanceInvoicesApi,
  createInvoicePaymentApi,
  updateFinancePaymentApi,
  deleteFinancePaymentApi,
  reconcileFinancePaymentApi,
  uploadFinanceDocument,
  resolveFinanceFileUrl,
  extractFinanceErrorMessage,
  ArPaymentRecord,
  ArPaymentPayload,
} from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import {
  EXCEL_CELL,
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

interface Props {
  canMutate: boolean;
}

interface PaymentDraft {
  salesInvoiceId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: ArPaymentPayload['paymentMethod'];
  bankAccount: string;
  referenceNumber: string;
  proofFileUrl: string;
  notes: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): PaymentDraft => ({
  salesInvoiceId: '',
  paymentDate: todayStr(),
  paymentAmount: 0,
  paymentMethod: 'BANK_TRANSFER',
  bankAccount: '',
  referenceNumber: '',
  proofFileUrl: '',
  notes: '',
});

export const ArPaymentsTab: React.FC<Props> = ({ canMutate }) => {
  const queryClient = useQueryClient();

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [reconFilter, setReconFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ArPaymentRecord | null>(null);
  const [draft, setDraft] = useState<PaymentDraft>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [voidTarget, setVoidTarget] = useState<ArPaymentRecord | null>(null);

  const editingId = editingRecord?.id ?? null;

  const { data: paymentsRes, isLoading } = useQuery({
    queryKey: ['financePayments', page, reconFilter, methodFilter, invoiceFilter],
    queryFn: () =>
      listFinancePaymentsApi({
        page,
        limit: 20,
        reconciliationStatus: reconFilter,
        paymentMethod: methodFilter,
        salesInvoiceId: invoiceFilter,
      }),
  });
  const payments = paymentsRes?.data || [];
  const totalPages = paymentsRes?.meta?.totalPages || paymentsRes?.meta?.total_pages || 1;
  const totalItems = paymentsRes?.meta?.total ?? paymentsRes?.meta?.totalItems;

  const { data: allInvoicesRes } = useQuery({
    queryKey: ['financeInvoicesDropdown'],
    queryFn: () => listFinanceInvoicesApi({ page: 1, limit: 100 }),
  });
  const allInvoices = allInvoicesRes?.data || [];
  const payableInvoices = allInvoices.filter(
    (inv) => inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID'
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['financePayments'] });
    queryClient.invalidateQueries({ queryKey: ['financeInvoices'] });
    queryClient.invalidateQueries({ queryKey: ['financeInvoicesDropdown'] });
    queryClient.invalidateQueries({ queryKey: ['financeInvoicePayments'] });
    queryClient.invalidateQueries({ queryKey: ['financeArSummary'] });
  };

  const createMutation = useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: ArPaymentPayload }) =>
      createInvoicePaymentApi(invoiceId, payload),
    onSuccess: () => {
      toast.success('Mutasi pelunasan AR berhasil dicatat');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal mencatat pelunasan')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ArPaymentPayload> }) =>
      updateFinancePaymentApi(id, payload),
    onSuccess: () => {
      toast.success('Mutasi pelunasan berhasil diperbarui');
      setEditingRecord(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui pelunasan')),
  });

  const reconcileMutation = useMutation({
    mutationFn: (id: string) => reconcileFinancePaymentApi(id, 'RECONCILED'),
    onSuccess: () => {
      toast.success('Mutasi berhasil direkonsiliasi');
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal merekonsiliasi mutasi')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFinancePaymentApi(id),
    onSuccess: () => {
      toast.success('Mutasi pelunasan di-void & saldo AR invoice dikembalikan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan mutasi')),
  });

  const handleUploadProof = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFinanceDocument('payment_proof', file);
      setDraft((prev) => ({ ...prev, proofFileUrl: url }));
      toast.success('Bukti pembayaran berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah bukti bayar');
    } finally {
      setUploading(false);
    }
  };

  const startAdd = () => {
    setEditingRecord(null);
    setDraft(emptyDraft());
    setIsAdding(true);
  };

  const startEdit = (p: ArPaymentRecord) => {
    setIsAdding(false);
    setEditingRecord(p);
    setDraft({
      salesInvoiceId: p.salesInvoiceId,
      paymentDate: p.paymentDate || todayStr(),
      paymentAmount: p.paymentAmount,
      paymentMethod: (p.paymentMethod as ArPaymentPayload['paymentMethod']) || 'BANK_TRANSFER',
      bankAccount: p.bankAccount || '',
      referenceNumber: p.referenceNumber || '',
      proofFileUrl: p.proofFileUrl || '',
      notes: p.notes || '',
    });
  };

  const cancelEditor = () => {
    setIsAdding(false);
    setEditingRecord(null);
    setDraft(emptyDraft());
  };

  const handleSave = () => {
    if (!editingId && !draft.salesInvoiceId) {
      toast.error('Silakan pilih Sales Invoice terlebih dahulu');
      return;
    }
    if (!draft.paymentAmount || draft.paymentAmount <= 0) {
      toast.error('Nominal pembayaran harus lebih dari 0');
      return;
    }
    const payload: ArPaymentPayload = {
      paymentDate: draft.paymentDate,
      paymentAmount: Number(draft.paymentAmount),
      paymentMethod: draft.paymentMethod,
      bankAccount: draft.bankAccount || undefined,
      referenceNumber: draft.referenceNumber || undefined,
      proofFileUrl: draft.proofFileUrl || null,
      notes: draft.notes || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate({ invoiceId: draft.salesInvoiceId, payload });
    }
  };

  const totalPaymentsAmount = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.paymentAmount || 0), 0),
    [payments]
  );

  const excelColumns: ExcelColumn<ArPaymentRecord>[] = [
    {
      key: 'paymentNumber',
      header: 'No. Pembayaran',
      mono: true,
      getValue: (p) => p.paymentNumber,
    },
    {
      key: 'paymentDate',
      header: 'Tanggal Bayar',
      getValue: (p) => p.paymentDate || '-',
    },
    {
      key: 'invoiceNumber',
      header: 'No. Invoice',
      mono: true,
      getValue: (p) => p.invoiceNumber || '-',
    },
    {
      key: 'customerName',
      header: 'Customer',
      minWidth: 'min-w-[180px]',
      getValue: (p) => p.customerName || '-',
    },
    {
      key: 'paymentMethod',
      header: 'Metode Bayar',
      getValue: (p) => p.paymentMethod || '-',
    },
    {
      key: 'bankAccount',
      header: 'Rekening Kas/Bank',
      minWidth: 'min-w-[140px]',
      getValue: (p) => p.bankAccount || '-',
    },
    {
      key: 'referenceNumber',
      header: 'No. Referensi',
      mono: true,
      getValue: (p) => p.referenceNumber || '-',
    },
    {
      key: 'paymentAmount',
      header: 'Nominal Bayar',
      align: 'right',
      mono: true,
      getValue: (p) => Number(p.paymentAmount || 0),
      render: (p) => <span className="font-bold text-emerald-700">{formatIDR(p.paymentAmount)}</span>,
      footer: <span className="text-emerald-700">{formatIDR(totalPaymentsAmount)}</span>,
    },
    {
      key: 'reconciliationStatus',
      header: 'Status Rekonsiliasi',
      align: 'center',
      getValue: (p) => p.reconciliationStatus || 'UNRECONCILED',
      render: (p) =>
        p.reconciliationStatus === 'RECONCILED' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            <CheckCircle2 className="w-3 h-3" /> RECONCILED
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            UNRECONCILED
          </span>
        ),
    },
    {
      key: 'proofFileUrl',
      header: 'Bukti Bayar',
      align: 'center',
      getValue: (p) => (p.proofFileUrl ? 'Ada' : '-'),
      render: (p) => {
        const fileHref = resolveFinanceFileUrl(p.proofFileUrl);
        return fileHref ? (
          <a
            href={fileHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
          >
            <ExternalLink className="w-3 h-3" /> Lihat
          </a>
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      key: 'notes',
      header: 'Catatan',
      minWidth: 'min-w-[160px]',
      getValue: (p) => p.notes || '-',
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (p) => {
        const isReconciled = p.reconciliationStatus === 'RECONCILED';
        return (
          <div className="inline-flex items-center gap-1">
            {canMutate && !isReconciled && (
              <button
                type="button"
                onClick={() => reconcileMutation.mutate(p.id)}
                disabled={reconcileMutation.isPending}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Rekonsiliasi</span>
              </button>
            )}
            {canMutate && !isReconciled && (
              <button
                type="button"
                onClick={() => startEdit(p)}
                title="Edit"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canMutate && (
              <button
                type="button"
                onClick={() => setVoidTarget(p)}
                title="Void / Batal"
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
      'mutasi-pelunasan-ar',
      excelColumns.filter((c) => c.key !== 'actions'),
      payments
    );
  };

  if (canMutate && (isAdding || editingRecord)) {
    const isNew = isAdding && !editingRecord;
    const proofHref = resolveFinanceFileUrl(draft.proofFileUrl);
    return (
      <ExcelWorksheetShell
        onBack={cancelEditor}
        docTitle={isNew ? 'AUTO-PAY' : editingRecord?.paymentNumber || 'EDIT-PAY'}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {isNew ? 'BARU' : 'EDIT'}
          </span>
        }
        formCode="FORM PELUNASAN PIUTANG (AR PAYMENT)"
        sheetTitle={isNew ? 'Catat Mutasi Pelunasan AR Baru' : `Edit Mutasi Pelunasan ${editingRecord?.paymentNumber}`}
        modeHint="Worksheet Input AR Payment"
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
              <span>Simpan Pelunasan</span>
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${EXCEL_CELL.label} w-48`}>Sales Invoice *</td>
                <td className={EXCEL_CELL.value} colSpan={3}>
                  {isNew ? (
                    <select
                      value={draft.salesInvoiceId}
                      onChange={(e) => {
                        const inv = payableInvoices.find((i) => i.id === e.target.value);
                        setDraft({
                          ...draft,
                          salesInvoiceId: e.target.value,
                          paymentAmount: inv ? inv.outstandingAmount : draft.paymentAmount,
                        });
                      }}
                      className={EXCEL_CELL.input}
                    >
                      <option value="">-- Pilih Invoice Unpaid / Partial --</option>
                      {payableInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {inv.customerName} (Sisa: {formatIDR(inv.outstandingAmount)})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={EXCEL_CELL.readValue}>
                      <span className="font-mono font-bold text-blue-700">{editingRecord?.invoiceNumber}</span>
                      <span className="ml-2 text-slate-600">— {editingRecord?.customerName}</span>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td className={`${EXCEL_CELL.label} w-48`}>Tanggal Bayar *</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="date"
                    value={draft.paymentDate}
                    onChange={(e) => setDraft({ ...draft, paymentDate: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
                <td className={`${EXCEL_CELL.label} w-48`}>Nominal Bayar (IDR) *</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={draft.paymentAmount}
                    onChange={(e) => setDraft({ ...draft, paymentAmount: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right font-bold text-emerald-700`}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Metode Bayar</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={draft.paymentMethod}
                    onChange={(e) =>
                      setDraft({ ...draft, paymentMethod: e.target.value as ArPaymentPayload['paymentMethod'] })
                    }
                    className={EXCEL_CELL.input}
                  >
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    <option value="CASH">CASH</option>
                    <option value="GIRO">GIRO</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="VIRTUAL_ACCOUNT">VIRTUAL_ACCOUNT</option>
                  </select>
                </td>
                <td className={EXCEL_CELL.label}>Rekening Kas / Bank</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="BCA / Mandiri / Kas Kecil..."
                    value={draft.bankAccount}
                    onChange={(e) => setDraft({ ...draft, bankAccount: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>No. Referensi</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="TRF-001 / No. Giro..."
                    value={draft.referenceNumber}
                    onChange={(e) => setDraft({ ...draft, referenceNumber: e.target.value })}
                    className={`${EXCEL_CELL.input} font-mono`}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Bukti Pembayaran</td>
                <td className="px-3 py-2 bg-white border border-slate-300">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{draft.proofFileUrl ? 'Ganti Bukti' : 'Upload Bukti'}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => e.target.files?.[0] && handleUploadProof(e.target.files[0])}
                      />
                    </label>
                    {proofHref && (
                      <a
                        href={proofHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Lihat File Terunggah
                      </a>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Catatan</td>
                <td className={EXCEL_CELL.value} colSpan={3}>
                  <input
                    type="text"
                    placeholder="Catatan tambahan (opsional)..."
                    value={draft.notes}
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
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={reconFilter}
            onChange={(e) => {
              setReconFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Rekonsiliasi</option>
            <option value="UNRECONCILED">UNRECONCILED</option>
            <option value="RECONCILED">RECONCILED</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Metode Bayar</option>
            <option value="BANK_TRANSFER">BANK_TRANSFER</option>
            <option value="CASH">CASH</option>
            <option value="GIRO">GIRO</option>
            <option value="CHEQUE">CHEQUE</option>
            <option value="VIRTUAL_ACCOUNT">VIRTUAL_ACCOUNT</option>
          </select>
          <select
            value={invoiceFilter}
            onChange={(e) => {
              setInvoiceFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white max-w-[240px]"
          >
            <option value="ALL">Semua Invoice</option>
            {allInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.customerName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={handleExportCsv}
            exportDisabled={payments.length === 0}
          />
          {canMutate && (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Pelunasan</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Mutasi Pelunasan AR (Account Receivable Payments) — Tabel Excel"
          subtitle="Seluruh kolom pembayaran terpisah rapi • Total nominal pada footer"
          columns={excelColumns}
          rows={payments}
          rowKey={(p) => p.id}
          isLoading={isLoading}
          emptyText="Belum ada mutasi pelunasan AR."
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'pembayaran',
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
                  <th className="px-3.5 py-2.5 border-r border-slate-200">No. Pembayaran</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Tanggal</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">No. Invoice &amp; Customer</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Metode Bayar</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Rekening Kas/Bank</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">No. Referensi &amp; Bukti</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Nominal Bayar</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Status Rekonsiliasi</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat mutasi pelunasan AR...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Belum ada mutasi pelunasan AR.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const isReconciled = p.reconciliationStatus === 'RECONCILED';
                    const fileHref = resolveFinanceFileUrl(p.proofFileUrl);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {p.paymentNumber}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">{p.paymentDate}</td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200">
                          <div className="font-mono font-semibold text-blue-700">{p.invoiceNumber}</div>
                          <div className="text-xs text-slate-500">{p.customerName}</div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 font-medium">{p.paymentMethod}</td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200">
                          <div>{p.bankAccount || '-'}</div>
                          {p.notes && <div className="text-xs text-slate-400 truncate max-w-[180px]">{p.notes}</div>}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200">
                          <div className="font-mono">{p.referenceNumber || '-'}</div>
                          {fileHref && (
                            <a
                              href={fileHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                            >
                              <ExternalLink className="w-3 h-3" /> Lihat Bukti
                            </a>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatIDR(p.paymentAmount)}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-center">
                          {isReconciled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> RECONCILED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                              UNRECONCILED
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {canMutate && !isReconciled && (
                              <button
                                type="button"
                                onClick={() => reconcileMutation.mutate(p.id)}
                                disabled={reconcileMutation.isPending}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Rekonsiliasi</span>
                              </button>
                            )}
                            {canMutate && !isReconciled && (
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                title="Edit"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canMutate && (
                              <button
                                type="button"
                                onClick={() => setVoidTarget(p)}
                                title="Void / Batal"
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

          {/* Pagination */}
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(voidTarget)}
        title="Batalkan / Void Mutasi Pelunasan?"
        message={`Anda yakin ingin membatalkan pembayaran ${voidTarget?.paymentNumber || ''}? Saldo piutang (Outstanding) pada Sales Invoice terkait akan otomatis dikembalikan.`}
        confirmLabel="Ya, Void Pembayaran"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
