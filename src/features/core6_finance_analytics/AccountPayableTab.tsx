import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSupplierInvoicesApi,
  createSupplierInvoiceApi,
  updateSupplierInvoiceApi,
  deleteSupplierInvoiceApi,
  listSupplierPaymentsApi,
  createSupplierPaymentApi,
  reconcileSupplierPaymentApi,
  deleteSupplierPaymentApi,
  listMdmSuppliersApi,
  getFinancePaymentTermsApi,
  DEFAULT_PAYMENT_TERMS,
  uploadFinanceDocument,
  resolveFinanceFileUrl,
  printFinanceHtmlReport,
  extractFinanceErrorMessage,
  SupplierInvoiceRecord,
  SupplierInvoicePayload,
  SupplierPaymentRecord,
  SupplierPaymentPayload,
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

interface ApDraft {
  invoiceNumber: string;
  supplierId: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerm: string;
  billingStage: string;
  terminNumber: string;
  terminPercentage: string;
  fakturPajakNumber: string;
  subtotal: number;
  freight: number;
  discount: number;
  taxRate: number;
  pphRate: number;
  fileUrl: string;
  notes: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): ApDraft => ({
  invoiceNumber: '',
  supplierId: '',
  invoiceDate: todayStr(),
  dueDate: '',
  paymentTerm: 'NET 30',
  billingStage: 'FINAL_PAYMENT',
  terminNumber: '',
  terminPercentage: '',
  fakturPajakNumber: '',
  subtotal: 0,
  freight: 0,
  discount: 0,
  taxRate: 11,
  pphRate: 0,
  fileUrl: '',
  notes: '',
});

export const AccountPayableTab: React.FC<Props> = ({ canMutate }) => {
  const queryClient = useQueryClient();

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SupplierInvoiceRecord | null>(null);
  const [draft, setDraft] = useState<ApDraft>(emptyDraft);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payDraft, setPayDraft] = useState<SupplierPaymentPayload>({
    paymentDate: todayStr(),
    paymentAmount: 0,
    paymentMethod: 'BANK_TRANSFER',
    bankAccount: '',
    referenceNumber: '',
    proofFileUrl: '',
    notes: '',
  });
  const [uploadingProof, setUploadingProof] = useState(false);

  const [voidInvoice, setVoidInvoice] = useState<SupplierInvoiceRecord | null>(null);
  const [voidPayment, setVoidPayment] = useState<SupplierPaymentRecord | null>(null);

  const editingId = editingRecord?.id ?? null;

  const { data: apRes, isLoading } = useQuery({
    queryKey: ['financeSupplierInvoices', page, search, statusFilter, supplierFilter, overdueOnly],
    queryFn: () =>
      listSupplierInvoicesApi({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        supplierId: supplierFilter,
        overdueOnly,
      }),
  });
  const invoices = apRes?.data || [];
  const totalPages = apRes?.meta?.totalPages || apRes?.meta?.total_pages || 1;
  const totalItems = apRes?.meta?.total ?? apRes?.meta?.totalItems;

  const { data: suppliers = [] } = useQuery({
    queryKey: ['mdmSuppliersDropdown'],
    queryFn: listMdmSuppliersApi,
  });

  const { data: termsDict = DEFAULT_PAYMENT_TERMS } = useQuery({
    queryKey: ['financePaymentTerms'],
    queryFn: getFinancePaymentTermsApi,
  });

  const { data: expandedPaymentsRes, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['financeSupplierPayments', expandedId],
    queryFn: () => listSupplierPaymentsApi({ supplierInvoiceId: expandedId || undefined, limit: 50 }),
    enabled: Boolean(expandedId),
  });
  const expandedPayments = expandedPaymentsRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['financeSupplierInvoices'] });
    queryClient.invalidateQueries({ queryKey: ['financeSupplierPayments'] });
    queryClient.invalidateQueries({ queryKey: ['financeApSummary'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: SupplierInvoicePayload) => createSupplierInvoiceApi(payload),
    onSuccess: () => {
      toast.success('Tagihan Vendor (AP) berhasil dicatat');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyimpan tagihan vendor')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SupplierInvoicePayload> }) =>
      updateSupplierInvoiceApi(id, payload),
    onSuccess: () => {
      toast.success('Tagihan Vendor (AP) berhasil diperbarui');
      setEditingRecord(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui tagihan vendor')),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => deleteSupplierInvoiceApi(id),
    onSuccess: () => {
      toast.success('Tagihan Vendor berhasil di-void');
      setVoidInvoice(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan tagihan vendor')),
  });

  const createPayMutation = useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: SupplierPaymentPayload }) =>
      createSupplierPaymentApi(invoiceId, payload),
    onSuccess: () => {
      toast.success('Pembayaran hutang (AP) berhasil dicatat');
      setPayingInvoiceId(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal mencatat pembayaran hutang')),
  });

  const reconcilePayMutation = useMutation({
    mutationFn: (paymentId: string) => reconcileSupplierPaymentApi(paymentId, 'RECONCILED'),
    onSuccess: () => {
      toast.success('Pembayaran AP berhasil direkonsiliasi');
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal merekonsiliasi pembayaran AP')),
  });

  const deletePayMutation = useMutation({
    mutationFn: (paymentId: string) => deleteSupplierPaymentApi(paymentId),
    onSuccess: () => {
      toast.success('Pembayaran AP berhasil di-void');
      setVoidPayment(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan pembayaran AP')),
  });

  const computeDraftBreakdown = (d: ApDraft) => {
    const dpp = Math.max(0, Number(d.subtotal || 0) + Number(d.freight || 0) - Number(d.discount || 0));
    const ppn = Math.round(dpp * (Number(d.taxRate || 0) / 100));
    const pph = Math.round(dpp * (Number(d.pphRate || 0) / 100));
    const grandTotal = Math.round(dpp + ppn - pph);
    return { dpp, ppn, pph, grandTotal };
  };

  const handleUploadInvoiceFile = async (file: File) => {
    setUploadingDoc(true);
    try {
      const url = await uploadFinanceDocument('supplier_invoice', file);
      setDraft((prev) => ({ ...prev, fileUrl: url }));
      toast.success('File tagihan vendor berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah file tagihan');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUploadApProof = async (file: File) => {
    setUploadingProof(true);
    try {
      const url = await uploadFinanceDocument('ap_payment_proof', file);
      setPayDraft((prev) => ({ ...prev, proofFileUrl: url }));
      toast.success('Bukti bayar hutang berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah bukti bayar');
    } finally {
      setUploadingProof(false);
    }
  };

  const startAdd = () => {
    setEditingRecord(null);
    setDraft(emptyDraft());
    setIsAdding(true);
  };

  const startEdit = (inv: SupplierInvoiceRecord) => {
    setIsAdding(false);
    setEditingRecord(inv);
    setDraft({
      invoiceNumber: inv.invoiceNumber,
      supplierId: inv.supplierId,
      invoiceDate: inv.invoiceDate || todayStr(),
      dueDate: inv.dueDate || '',
      paymentTerm: inv.paymentTerm || 'NET 30',
      billingStage: inv.billingStage || 'FINAL_PAYMENT',
      terminNumber: inv.terminNumber != null ? String(inv.terminNumber) : '',
      terminPercentage: inv.terminPercentage != null ? String(inv.terminPercentage) : '',
      fakturPajakNumber: inv.fakturPajakNumber || '',
      subtotal: inv.subtotal,
      freight: inv.freight,
      discount: inv.discount,
      taxRate: inv.taxRate,
      pphRate: inv.pphRate,
      fileUrl: inv.fileUrl || '',
      notes: inv.notes || '',
    });
  };

  const cancelEditor = () => {
    setIsAdding(false);
    setEditingRecord(null);
    setDraft(emptyDraft());
  };

  const handleSave = () => {
    if (!draft.invoiceNumber.trim()) {
      toast.error('No. Invoice Vendor wajib diisi');
      return;
    }
    if (!draft.supplierId) {
      toast.error('Silakan pilih Supplier terlebih dahulu');
      return;
    }
    const payload: SupplierInvoicePayload = {
      invoiceNumber: draft.invoiceNumber.trim(),
      supplierId: draft.supplierId,
      invoiceDate: draft.invoiceDate,
      dueDate: draft.dueDate || null,
      paymentTerm: draft.paymentTerm,
      billingStage: draft.billingStage || null,
      terminNumber: draft.terminNumber ? Number(draft.terminNumber) : null,
      terminPercentage: draft.terminPercentage ? Number(draft.terminPercentage) : null,
      fakturPajakNumber: draft.fakturPajakNumber || null,
      subtotal: Number(draft.subtotal) || 0,
      freight: Number(draft.freight) || 0,
      discount: Number(draft.discount) || 0,
      taxRate: Number(draft.taxRate) || 0,
      pphRate: Number(draft.pphRate) || 0,
      fileUrl: draft.fileUrl || null,
      notes: draft.notes || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PAID') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">PAID</span>;
    if (s === 'PARTIALLY_PAID') return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">PARTIAL</span>;
    if (s === 'CANCELLED' || s === 'VOID') return <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">VOID</span>;
    return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">UNPAID</span>;
  };

  const totals = useMemo(
    () =>
      invoices.reduce(
        (acc, inv) => {
          acc.sub += Number(inv.subtotal || 0);
          acc.freight += Number(inv.freight || 0);
          acc.disc += Number(inv.discount || 0);
          acc.grand += Number(inv.grandTotal || 0);
          acc.paid += Number(inv.paidAmount || 0);
          acc.out += Number(inv.outstandingAmount || 0);
          return acc;
        },
        { sub: 0, freight: 0, disc: 0, grand: 0, paid: 0, out: 0 }
      ),
    [invoices]
  );

  const excelColumns: ExcelColumn<SupplierInvoiceRecord>[] = [
    {
      key: 'invoiceNumber',
      header: 'No. Invoice Vendor',
      mono: true,
      getValue: (inv) => inv.invoiceNumber,
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      minWidth: 'min-w-[180px]',
      getValue: (inv) => inv.supplierName || '-',
    },
    {
      key: 'invoiceDate',
      header: 'Tgl Invoice',
      getValue: (inv) => inv.invoiceDate || '-',
    },
    {
      key: 'dueDate',
      header: 'Jatuh Tempo',
      getValue: (inv) => inv.dueDate || '-',
      render: (inv) => (
        <div className="inline-flex items-center gap-1.5">
          <span className={inv.isOverdue ? 'text-rose-700 font-bold' : ''}>{inv.dueDate || '-'}</span>
          {inv.isOverdue && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black">
              <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'paymentTerm',
      header: 'Payment Term',
      getValue: (inv) => inv.paymentTerm || '-',
    },
    {
      key: 'fakturPajakNumber',
      header: 'No. Faktur Pajak',
      mono: true,
      getValue: (inv) => inv.fakturPajakNumber || '-',
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      align: 'right',
      mono: true,
      getValue: (inv) => Number(inv.subtotal || 0),
      render: (inv) => formatIDR(inv.subtotal),
      footer: formatIDR(totals.sub),
    },
    {
      key: 'freight',
      header: 'Freight',
      align: 'right',
      mono: true,
      getValue: (inv) => Number(inv.freight || 0),
      render: (inv) => formatIDR(inv.freight),
      footer: formatIDR(totals.freight),
    },
    {
      key: 'discount',
      header: 'Diskon',
      align: 'right',
      mono: true,
      getValue: (inv) => Number(inv.discount || 0),
      render: (inv) => formatIDR(inv.discount),
      footer: formatIDR(totals.disc),
    },
    {
      key: 'taxRate',
      header: 'PPN (%)',
      align: 'right',
      mono: true,
      getValue: (inv) => `${inv.taxRate ?? 0}%`,
    },
    {
      key: 'pphRate',
      header: 'PPh (%)',
      align: 'right',
      mono: true,
      getValue: (inv) => `${inv.pphRate ?? 0}%`,
    },
    {
      key: 'grandTotal',
      header: 'Grand Total',
      align: 'right',
      mono: true,
      getValue: (inv) => Number(inv.grandTotal || 0),
      render: (inv) => <span className="font-bold text-slate-900">{formatIDR(inv.grandTotal)}</span>,
      footer: <span className="text-slate-900">{formatIDR(totals.grand)}</span>,
    },
    {
      key: 'paidAmount',
      header: 'Terbayar',
      align: 'right',
      mono: true,
      getValue: (inv) => Number(inv.paidAmount || 0),
      render: (inv) => <span className="text-emerald-700">{formatIDR(inv.paidAmount)}</span>,
      footer: <span className="text-emerald-700">{formatIDR(totals.paid)}</span>,
    },
    {
      key: 'outstandingAmount',
      header: 'Sisa Hutang',
      align: 'right',
      mono: true,
      getValue: (inv) => Number(inv.outstandingAmount || 0),
      render: (inv) => <span className="font-bold text-rose-700">{formatIDR(inv.outstandingAmount)}</span>,
      footer: <span className="text-rose-700">{formatIDR(totals.out)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      getValue: (inv) => inv.status,
      render: (inv) => getStatusBadge(inv.status),
    },
    {
      key: 'fileUrl',
      header: 'Lampiran',
      align: 'center',
      getValue: (inv) => (inv.fileUrl ? 'Ada' : '-'),
      render: (inv) => {
        const href = resolveFinanceFileUrl(inv.fileUrl);
        return href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
            <ExternalLink className="w-3 h-3" /> File
          </a>
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (inv) => {
        const isPaid = inv.status === 'PAID';
        const isVoid = inv.status === 'CANCELLED' || inv.status === 'VOID';
        return (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                printFinanceHtmlReport(`/finance/supplier-invoices/${inv.id}/print`).catch((e) =>
                  toast.error(e?.message || 'Gagal mencetak voucher AP')
                )
              }
              title="Cetak Voucher AP"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            {canMutate && !isPaid && !isVoid && (
              <button
                type="button"
                onClick={() => startEdit(inv)}
                title="Edit"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canMutate && inv.paidAmount === 0 && !isVoid && (
              <button
                type="button"
                onClick={() => setVoidInvoice(inv)}
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
      'account-payable-ap',
      excelColumns.filter((c) => c.key !== 'actions'),
      invoices
    );
  };

  if (canMutate && (isAdding || editingRecord)) {
    const isNew = isAdding && !editingRecord;
    const calc = computeDraftBreakdown(draft);
    const fileHref = resolveFinanceFileUrl(draft.fileUrl);

    return (
      <ExcelWorksheetShell
        onBack={cancelEditor}
        docTitle={isNew ? draft.invoiceNumber || 'TAGIHAN VENDOR BARU' : editingRecord?.invoiceNumber || 'EDIT-AP'}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
            {isNew ? 'BARU' : 'EDIT'}
          </span>
        }
        formCode="FORM TAGIHAN VENDOR (ACCOUNT PAYABLE)"
        sheetTitle={isNew ? 'Catat Tagihan Vendor (AP) Baru' : `Edit Tagihan Vendor ${editingRecord?.invoiceNumber}`}
        modeHint="Worksheet Input Invoice Supplier"
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
              disabled={createMutation.isPending || updateMutation.isPending || uploadingDoc}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Tagihan AP</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className={`${EXCEL_CELL.label} w-48`}>No. Invoice Vendor *</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="text"
                      placeholder="INV-VND-001"
                      value={draft.invoiceNumber}
                      onChange={(e) => setDraft({ ...draft, invoiceNumber: e.target.value })}
                      className={`${EXCEL_CELL.input} font-mono`}
                    />
                  </td>
                  <td className={`${EXCEL_CELL.label} w-48`}>Supplier *</td>
                  <td className={EXCEL_CELL.value}>
                    <select
                      value={draft.supplierId}
                      onChange={(e) => {
                        const sup = suppliers.find((s) => s.id === e.target.value);
                        setDraft({ ...draft, supplierId: e.target.value, paymentTerm: sup?.paymentTerm || draft.paymentTerm });
                      }}
                      className={EXCEL_CELL.input}
                    >
                      <option value="">-- Pilih Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>Tanggal Invoice *</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="date"
                      value={draft.invoiceDate}
                      onChange={(e) => setDraft({ ...draft, invoiceDate: e.target.value })}
                      className={EXCEL_CELL.input}
                    />
                  </td>
                  <td className={EXCEL_CELL.label}>Jatuh Tempo</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="date"
                      value={draft.dueDate}
                      onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                      className={EXCEL_CELL.input}
                    />
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>Payment Term</td>
                  <td className={EXCEL_CELL.value}>
                    <select
                      value={draft.paymentTerm}
                      onChange={(e) => setDraft({ ...draft, paymentTerm: e.target.value })}
                      className={EXCEL_CELL.input}
                    >
                      {termsDict.paymentTerms.map((pt) => (
                        <option key={pt.code} value={pt.code}>
                          {pt.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={EXCEL_CELL.label}>Tahap / Termin</td>
                  <td className={EXCEL_CELL.value}>
                    <div className="flex">
                      <select
                        value={draft.billingStage}
                        onChange={(e) => setDraft({ ...draft, billingStage: e.target.value })}
                        className={`${EXCEL_CELL.input} border-r border-slate-300`}
                      >
                        {termsDict.billingStages.map((bs) => (
                          <option key={bs.code} value={bs.code}>
                            {bs.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="#"
                        value={draft.terminNumber}
                        onChange={(e) => setDraft({ ...draft, terminNumber: e.target.value })}
                        className={`${EXCEL_CELL.input} w-20 font-mono text-right border-r border-slate-300`}
                      />
                      <input
                        type="number"
                        placeholder="%"
                        value={draft.terminPercentage}
                        onChange={(e) => setDraft({ ...draft, terminPercentage: e.target.value })}
                        className={`${EXCEL_CELL.input} w-20 font-mono text-right`}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>No. Faktur Pajak</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="text"
                      placeholder="010.xxx"
                      value={draft.fakturPajakNumber}
                      onChange={(e) => setDraft({ ...draft, fakturPajakNumber: e.target.value })}
                      className={`${EXCEL_CELL.input} font-mono`}
                    />
                  </td>
                  <td className={EXCEL_CELL.label}>Lampiran Invoice</td>
                  <td className="px-3 py-2 bg-white border border-slate-300">
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer">
                        {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{draft.fileUrl ? 'Ganti File' : 'Upload Inv'}</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,image/*"
                          onChange={(e) => e.target.files?.[0] && handleUploadInvoiceFile(e.target.files[0])}
                        />
                      </label>
                      {fileHref && (
                        <a href={fileHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
                          <ExternalLink className="w-3.5 h-3.5" /> Lihat File
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>Subtotal (IDR)</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="number"
                      value={draft.subtotal}
                      onChange={(e) => setDraft({ ...draft, subtotal: Number(e.target.value) })}
                      className={`${EXCEL_CELL.input} font-mono text-right`}
                    />
                  </td>
                  <td className={EXCEL_CELL.label}>Freight (IDR)</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="number"
                      value={draft.freight}
                      onChange={(e) => setDraft({ ...draft, freight: Number(e.target.value) })}
                      className={`${EXCEL_CELL.input} font-mono text-right`}
                    />
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>Diskon (IDR)</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="number"
                      value={draft.discount}
                      onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })}
                      className={`${EXCEL_CELL.input} font-mono text-right`}
                    />
                  </td>
                  <td className={EXCEL_CELL.label}>PPN (%) &amp; PPh (%)</td>
                  <td className={EXCEL_CELL.value}>
                    <div className="flex">
                      <input
                        type="number"
                        placeholder="PPN %"
                        value={draft.taxRate}
                        onChange={(e) => setDraft({ ...draft, taxRate: Number(e.target.value) })}
                        className={`${EXCEL_CELL.input} font-mono text-right border-r border-slate-300`}
                      />
                      <input
                        type="number"
                        placeholder="PPh %"
                        value={draft.pphRate}
                        onChange={(e) => setDraft({ ...draft, pphRate: Number(e.target.value) })}
                        className={`${EXCEL_CELL.input} font-mono text-right`}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>Catatan</td>
                  <td className={EXCEL_CELL.value} colSpan={3}>
                    <input
                      type="text"
                      placeholder="Catatan tambahan tagihan vendor..."
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      className={EXCEL_CELL.input}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
              <div className="text-xs font-bold uppercase text-slate-500">DPP</div>
              <div className="font-mono text-base font-black text-slate-900 mt-0.5">{formatIDR(calc.dpp)}</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
              <div className="text-xs font-bold uppercase text-blue-600">PPN ({draft.taxRate}%)</div>
              <div className="font-mono text-base font-black text-blue-800 mt-0.5">{formatIDR(calc.ppn)}</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3">
              <div className="text-xs font-bold uppercase text-rose-600">PPh ({draft.pphRate}%)</div>
              <div className="font-mono text-base font-black text-rose-800 mt-0.5">{formatIDR(calc.pph)}</div>
            </div>
            <div className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3">
              <div className="text-xs font-bold uppercase text-indigo-700">Grand Total AP</div>
              <div className="font-mono text-lg font-black text-indigo-800 mt-0.5">{formatIDR(calc.grandTotal)}</div>
            </div>
          </div>
        </div>
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
              placeholder="Cari No. Invoice Vendor..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <select
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white max-w-[200px]"
          >
            <option value="ALL">Semua Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
          </select>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => {
                setOverdueOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded"
            />
            <span>Overdue Saja</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={handleExportCsv}
            exportDisabled={invoices.length === 0}
          />
          {canMutate && (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Tagihan Vendor</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Account Payable (Tagihan Supplier / Vendor) — Tabel Excel"
          subtitle="Seluruh kolom subtotal, pajak, terbayar & sisa hutang terpisah rapi • Total IDR pada footer"
          columns={excelColumns}
          rows={invoices}
          rowKey={(inv) => inv.id}
          isLoading={isLoading}
          emptyText="Belum ada data Invoice Supplier (Account Payable)."
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'tagihan',
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
                  <th className="px-3.5 py-2.5 border-r border-slate-200">No. Invoice Vendor</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Supplier</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Tgl Invoice</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Jatuh Tempo</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Grand Total</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Terbayar</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Sisa Hutang</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat tagihan supplier (AP)...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Belum ada data Invoice Supplier (Account Payable).
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const isExpanded = expandedId === inv.id;
                    const isPaid = inv.status === 'PAID';
                    const isVoid = inv.status === 'CANCELLED' || inv.status === 'VOID';
                    const fileHref = resolveFinanceFileUrl(inv.fileUrl);

                    return (
                      <React.Fragment key={inv.id}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${inv.isOverdue ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                              className="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <span>{inv.invoiceNumber}</span>
                            </button>
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 font-semibold text-slate-800">{inv.supplierName}</td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">{inv.invoiceDate}</td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={inv.isOverdue ? 'text-rose-700 font-bold' : ''}>{inv.dueDate}</span>
                              {inv.isOverdue && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black">
                                  <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono font-bold whitespace-nowrap">{formatIDR(inv.grandTotal)}</td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono text-emerald-700 whitespace-nowrap">{formatIDR(inv.paidAmount)}</td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono font-bold text-rose-700 whitespace-nowrap">{formatIDR(inv.outstandingAmount)}</td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 text-center">{getStatusBadge(inv.status)}</td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  printFinanceHtmlReport(`/finance/supplier-invoices/${inv.id}/print`).catch((e) =>
                                    toast.error(e?.message || 'Gagal mencetak voucher AP')
                                  )
                                }
                                title="Cetak Voucher AP"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {fileHref && (
                                <a
                                  href={fileHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Lihat Lampiran Invoice"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              {canMutate && !isPaid && !isVoid && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(inv)}
                                  title="Edit"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canMutate && inv.paidAmount === 0 && !isVoid && (
                                <button
                                  type="button"
                                  onClick={() => setVoidInvoice(inv)}
                                  title="Void / Batal"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={9} className="p-4 space-y-3">
                              <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                                <div>
                                  <strong>Subtotal:</strong> {formatIDR(inv.subtotal)} • <strong>Freight:</strong> {formatIDR(inv.freight)} •{' '}
                                  <strong>Diskon:</strong> {formatIDR(inv.discount)} • <strong>PPN:</strong> {inv.taxRate}% • <strong>PPh:</strong> {inv.pphRate}%
                                  {inv.fakturPajakNumber ? ` • FP: ${inv.fakturPajakNumber}` : ''}
                                </div>
                              </div>

                              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700">
                                    Mutasi Pembayaran Hutang ({expandedPayments.length})
                                  </span>
                                  {canMutate && !isPaid && !isVoid && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPayingInvoiceId(inv.id);
                                        setPayDraft({
                                          paymentDate: todayStr(),
                                          paymentAmount: inv.outstandingAmount,
                                          paymentMethod: 'BANK_TRANSFER',
                                          bankAccount: '',
                                          referenceNumber: '',
                                          proofFileUrl: '',
                                          notes: '',
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Bayar Hutang</span>
                                    </button>
                                  )}
                                </div>

                                {payingInvoiceId === inv.id && (
                                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 grid grid-cols-2 sm:grid-cols-7 gap-2 items-end text-xs">
                                    <label className="space-y-0.5">
                                      <span className="text-[11px] font-semibold">Tgl Bayar</span>
                                      <input
                                        type="date"
                                        value={payDraft.paymentDate}
                                        onChange={(e) => setPayDraft({ ...payDraft, paymentDate: e.target.value })}
                                        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs"
                                      />
                                    </label>
                                    <label className="space-y-0.5">
                                      <span className="text-[11px] font-semibold">Nominal</span>
                                      <input
                                        type="number"
                                        value={payDraft.paymentAmount}
                                        onChange={(e) => setPayDraft({ ...payDraft, paymentAmount: Number(e.target.value) })}
                                        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono"
                                      />
                                    </label>
                                    <label className="space-y-0.5">
                                      <span className="text-[11px] font-semibold">Metode</span>
                                      <select
                                        value={payDraft.paymentMethod}
                                        onChange={(e) =>
                                          setPayDraft({ ...payDraft, paymentMethod: e.target.value as SupplierPaymentPayload['paymentMethod'] })
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs"
                                      >
                                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                                        <option value="CASH">CASH</option>
                                        <option value="GIRO">GIRO</option>
                                        <option value="CHEQUE">CHEQUE</option>
                                        <option value="VIRTUAL_ACCOUNT">VIRTUAL_ACCOUNT</option>
                                      </select>
                                    </label>
                                    <label className="space-y-0.5">
                                      <span className="text-[11px] font-semibold">Rekening</span>
                                      <input
                                        type="text"
                                        placeholder="BCA / Mandiri"
                                        value={payDraft.bankAccount || ''}
                                        onChange={(e) => setPayDraft({ ...payDraft, bankAccount: e.target.value })}
                                        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs"
                                      />
                                    </label>
                                    <label className="space-y-0.5">
                                      <span className="text-[11px] font-semibold">Referensi</span>
                                      <input
                                        type="text"
                                        placeholder="REF-AP"
                                        value={payDraft.referenceNumber || ''}
                                        onChange={(e) => setPayDraft({ ...payDraft, referenceNumber: e.target.value })}
                                        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs"
                                      />
                                    </label>
                                    <label className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold cursor-pointer">
                                      {uploadingProof ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                      <span>{payDraft.proofFileUrl ? 'Ganti' : 'Bukti'}</span>
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.pdf"
                                        onChange={(e) => e.target.files?.[0] && handleUploadApProof(e.target.files[0])}
                                      />
                                    </label>
                                    <div className="flex gap-1 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => createPayMutation.mutate({ invoiceId: inv.id, payload: payDraft })}
                                        disabled={createPayMutation.isPending || uploadingProof}
                                        className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                      >
                                        Simpan
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPayingInvoiceId(null)}
                                        className="px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {isLoadingPayments ? (
                                  <div className="text-xs text-slate-400 py-2">Memuat mutasi pembayaran...</div>
                                ) : expandedPayments.length === 0 ? (
                                  <div className="text-xs text-slate-400 py-2">Belum ada pembayaran hutang untuk invoice ini.</div>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-[11px] text-slate-500 uppercase border-b border-slate-200">
                                        <th className="py-1.5 text-left">No. Bayar</th>
                                        <th className="py-1.5 text-left">Tanggal</th>
                                        <th className="py-1.5 text-left">Metode &amp; Rekening</th>
                                        <th className="py-1.5 text-left">Referensi &amp; Bukti</th>
                                        <th className="py-1.5 text-right">Nominal</th>
                                        <th className="py-1.5 text-center">Rekonsiliasi</th>
                                        <th className="py-1.5 text-right">Aksi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {expandedPayments.map((p) => {
                                        const isRec = p.reconciliationStatus === 'RECONCILED';
                                        const proofHref = resolveFinanceFileUrl(p.proofFileUrl);
                                        return (
                                          <tr key={p.id}>
                                            <td className="py-1.5 font-mono font-semibold">{p.paymentNumber}</td>
                                            <td className="py-1.5">{p.paymentDate}</td>
                                            <td className="py-1.5">{p.paymentMethod} {p.bankAccount ? `(${p.bankAccount})` : ''}</td>
                                            <td className="py-1.5">
                                              <span className="font-mono">{p.referenceNumber || '-'}</span>
                                              {proofHref && (
                                                <a href={proofHref} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline">
                                                  Bukti
                                                </a>
                                              )}
                                            </td>
                                            <td className="py-1.5 text-right font-mono font-bold text-emerald-700">
                                              {formatIDR(p.paymentAmount)}
                                            </td>
                                            <td className="py-1.5 text-center">
                                              {isRec ? (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">RECONCILED</span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">UNRECONCILED</span>
                                              )}
                                            </td>
                                            <td className="py-1.5 text-right space-x-1">
                                              {canMutate && !isRec && (
                                                <button
                                                  type="button"
                                                  onClick={() => reconcilePayMutation.mutate(p.id)}
                                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                                                >
                                                  <CheckCircle2 className="w-3 h-3" /> Rekonsiliasi
                                                </button>
                                              )}
                                              {canMutate && (
                                                <button
                                                  type="button"
                                                  onClick={() => setVoidPayment(p)}
                                                  className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[11px] font-bold cursor-pointer"
                                                >
                                                  Void
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
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
        open={Boolean(voidInvoice)}
        title="Batalkan / Void Tagihan Vendor?"
        message={`Batalkan tagihan vendor ${voidInvoice?.invoiceNumber || ''}? Data akan di-soft delete.`}
        confirmLabel="Ya, Void Tagihan"
        variant="danger"
        loading={deleteInvoiceMutation.isPending}
        onConfirm={() => voidInvoice && deleteInvoiceMutation.mutate(voidInvoice.id)}
        onCancel={() => setVoidInvoice(null)}
      />

      <ConfirmActionModal
        open={Boolean(voidPayment)}
        title="Batalkan / Void Pembayaran Hutang?"
        message={`Batalkan pembayaran ${voidPayment?.paymentNumber || ''}? Saldo hutang invoice vendor akan dikembalikan.`}
        confirmLabel="Ya, Void Pembayaran"
        variant="danger"
        loading={deletePayMutation.isPending}
        onConfirm={() => voidPayment && deletePayMutation.mutate(voidPayment.id)}
        onCancel={() => setVoidPayment(null)}
      />
    </div>
  );
};
