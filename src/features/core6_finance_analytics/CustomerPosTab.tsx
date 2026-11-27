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
  Loader2,
  Mail,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listCustomerPosApi,
  createCustomerPoApi,
  updateCustomerPoApi,
  deleteCustomerPoApi,
  createIncomingOrderApi,
  getCustomerPoBillingProgressApi,
  listMdmCustomersApi,
  listMdmItemsApi,
  uploadFinanceDocument,
  resolveFinanceFileUrl,
  extractFinanceErrorMessage,
  CustomerPoRecord,
  CustomerPoPayload,
  CustomerPoItemPayload,
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
  canMutate: boolean; // true for FINANCE / L0 / L1; false for SALES (View-only)
}

interface PoDraft {
  poNumber: string;
  customerId: string;
  date: string;
  paymentTerm: string;
  emailSender: string;
  emailSubject: string;
  discount: number;
  freight: number;
  taxRate: number;
  totalAmount: number;
  fileUrl: string;
  notes: string;
  items: CustomerPoItemPayload[];
}

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): PoDraft => ({
  poNumber: '',
  customerId: '',
  date: todayStr(),
  paymentTerm: 'NET 30',
  emailSender: '',
  emailSubject: '',
  discount: 0,
  freight: 0,
  taxRate: 11,
  totalAmount: 0,
  fileUrl: '',
  notes: '',
  items: [],
});

export const CustomerPosTab: React.FC<Props> = ({ canMutate }) => {
  const queryClient = useQueryClient();

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustomerPoRecord | null>(null);
  const [draft, setDraft] = useState<PoDraft>(emptyDraft);
  const [uploading, setUploading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<CustomerPoRecord | null>(null);

  const editingId = editingRecord?.id ?? null;

  const { data: posRes, isLoading } = useQuery({
    queryKey: ['financeCustomerPos', page, search, customerFilter, statusFilter],
    queryFn: () =>
      listCustomerPosApi({
        page,
        limit: 20,
        search: search || undefined,
        customerId: customerFilter,
        status: statusFilter,
      }),
  });
  const customerPos = posRes?.data || [];
  const totalPages = posRes?.meta?.totalPages || posRes?.meta?.total_pages || 1;
  const totalItems = posRes?.meta?.total ?? posRes?.meta?.totalItems;

  const { data: customers = [] } = useQuery({
    queryKey: ['mdmCustomersDropdown'],
    queryFn: listMdmCustomersApi,
  });

  const { data: mdmItems = [] } = useQuery({
    queryKey: ['mdmItemsDropdown'],
    queryFn: listMdmItemsApi,
  });

  const { data: billingProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['customerPoBillingProgress', expandedId],
    queryFn: () => getCustomerPoBillingProgressApi(expandedId!),
    enabled: Boolean(expandedId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['financeCustomerPos'] });
    queryClient.invalidateQueries({ queryKey: ['financeCustomerPosDropdown'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CustomerPoPayload) => createCustomerPoApi(payload),
    onSuccess: () => {
      toast.success('Purchase Order Customer berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyimpan Customer PO')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CustomerPoPayload> }) =>
      updateCustomerPoApi(id, payload),
    onSuccess: () => {
      toast.success('Purchase Order Customer berhasil diperbarui');
      setEditingRecord(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui Customer PO')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomerPoApi(id),
    onSuccess: () => {
      toast.success('Customer PO berhasil di-void / dibatalkan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan Customer PO')),
  });

  const convertToIoMutation = useMutation({
    mutationFn: (poId: string) =>
      createIncomingOrderApi({ customerPoId: poId, date: todayStr() }),
    onSuccess: (io) => {
      toast.success(`Incoming Order ${io.ioNumber || ''} berhasil diterbitkan dari PO`);
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['financeIncomingOrders'] });
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menerbitkan Incoming Order')),
  });

  const recomputeTotal = (
    items: CustomerPoItemPayload[],
    discount: number,
    freight: number,
    taxRate: number,
    fallbackTotal: number
  ) => {
    if (items.length === 0) return fallbackTotal;
    const subtotal = items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);
    const dpp = Math.max(0, subtotal - Number(discount || 0) + Number(freight || 0));
    return Math.round(dpp * (1 + Number(taxRate || 0) / 100));
  };

  const handleUploadPoFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFinanceDocument('customer_po', file);
      setDraft((prev) => ({ ...prev, fileUrl: url }));
      toast.success('File PO Customer berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah file PO');
    } finally {
      setUploading(false);
    }
  };

  const startAdd = () => {
    setEditingRecord(null);
    setDraft(emptyDraft());
    setIsAdding(true);
  };

  const startEdit = (po: CustomerPoRecord) => {
    setIsAdding(false);
    setEditingRecord(po);
    setDraft({
      poNumber: po.poNumber || '',
      customerId: po.customerId || '',
      date: po.date || todayStr(),
      paymentTerm: po.paymentTerm || 'NET 30',
      emailSender: po.emailSender || '',
      emailSubject: po.emailSubject || '',
      discount: po.discount || 0,
      freight: po.freight || 0,
      taxRate: po.taxRate ?? 11,
      totalAmount: po.totalAmount || 0,
      fileUrl: po.fileUrl || '',
      notes: po.notes || '',
      items: (po.items || []).map((it) => ({ ...it })),
    });
  };

  const cancelEditor = () => {
    setIsAdding(false);
    setEditingRecord(null);
    setDraft(emptyDraft());
  };

  const addDraftItem = () => {
    const nextItems = [...draft.items, { itemId: '', qty: 1, unitPrice: 0, subtotal: 0 }];
    setDraft({
      ...draft,
      items: nextItems,
      totalAmount: recomputeTotal(nextItems, draft.discount, draft.freight, draft.taxRate, draft.totalAmount),
    });
  };

  const updateDraftItem = (idx: number, patch: Partial<CustomerPoItemPayload>) => {
    const nextItems = draft.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, ...patch };
      updated.subtotal = Number(updated.qty || 0) * Number(updated.unitPrice || 0);
      return updated;
    });
    setDraft({
      ...draft,
      items: nextItems,
      totalAmount: recomputeTotal(nextItems, draft.discount, draft.freight, draft.taxRate, draft.totalAmount),
    });
  };

  const removeDraftItem = (idx: number) => {
    const nextItems = draft.items.filter((_, i) => i !== idx);
    setDraft({
      ...draft,
      items: nextItems,
      totalAmount: recomputeTotal(nextItems, draft.discount, draft.freight, draft.taxRate, draft.totalAmount),
    });
  };

  const handleSave = () => {
    if (!draft.poNumber.trim()) {
      toast.error('No. PO Customer wajib diisi');
      return;
    }
    if (!draft.customerId) {
      toast.error('Silakan pilih Customer terlebih dahulu');
      return;
    }
    const payload: CustomerPoPayload = {
      poNumber: draft.poNumber.trim(),
      customerId: draft.customerId,
      date: draft.date,
      paymentTerm: draft.paymentTerm,
      emailSender: draft.emailSender || undefined,
      emailSubject: draft.emailSubject || undefined,
      discount: Number(draft.discount) || 0,
      freight: Number(draft.freight) || 0,
      taxRate: Number(draft.taxRate) || 0,
      totalAmount: Number(draft.totalAmount) || 0,
      fileUrl: draft.fileUrl || null,
      notes: draft.notes || null,
      items: draft.items
        .filter((it) => it.itemId && it.qty > 0)
        .map((it) => ({
          itemId: it.itemId,
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
        })),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'CLOSED' || s === 'COMPLETED' || s === 'INVOICED') {
      return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{s}</span>;
    }
    if (s === 'CANCELLED' || s === 'VOID') {
      return <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">VOID</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{s || 'OPEN'}</span>;
  };

  const totals = useMemo(
    () =>
      customerPos.reduce(
        (acc, po) => {
          acc.disc += Number(po.discount || 0);
          acc.freight += Number(po.freight || 0);
          acc.total += Number(po.totalAmount || 0);
          return acc;
        },
        { disc: 0, freight: 0, total: 0 }
      ),
    [customerPos]
  );

  const excelColumns: ExcelColumn<CustomerPoRecord>[] = [
    {
      key: 'poNumber',
      header: 'No. PO Customer',
      mono: true,
      getValue: (po) => po.poNumber,
    },
    {
      key: 'date',
      header: 'Tanggal PO',
      getValue: (po) => po.date || '-',
    },
    {
      key: 'customerName',
      header: 'Customer',
      minWidth: 'min-w-[180px]',
      getValue: (po) => po.customerName || '-',
    },
    {
      key: 'emailSender',
      header: 'Pengirim E-mail',
      minWidth: 'min-w-[160px]',
      getValue: (po) => po.emailSender || '-',
    },
    {
      key: 'emailSubject',
      header: 'Subjek E-mail',
      minWidth: 'min-w-[180px]',
      getValue: (po) => po.emailSubject || '-',
    },
    {
      key: 'paymentTerm',
      header: 'Payment Term',
      getValue: (po) => po.paymentTerm || '-',
    },
    {
      key: 'discount',
      header: 'Diskon',
      align: 'right',
      mono: true,
      getValue: (po) => Number(po.discount || 0),
      render: (po) => formatIDR(po.discount),
      footer: formatIDR(totals.disc),
    },
    {
      key: 'freight',
      header: 'Freight',
      align: 'right',
      mono: true,
      getValue: (po) => Number(po.freight || 0),
      render: (po) => formatIDR(po.freight),
      footer: formatIDR(totals.freight),
    },
    {
      key: 'taxRate',
      header: 'PPN (%)',
      align: 'right',
      mono: true,
      getValue: (po) => `${po.taxRate ?? 0}%`,
    },
    {
      key: 'totalAmount',
      header: 'Total PO',
      align: 'right',
      mono: true,
      getValue: (po) => Number(po.totalAmount || 0),
      render: (po) => <span className="font-bold text-slate-900">{formatIDR(po.totalAmount)}</span>,
      footer: <span className="text-emerald-700">{formatIDR(totals.total)}</span>,
    },
    {
      key: 'fileUrl',
      header: 'Lampiran PO',
      align: 'center',
      getValue: (po) => (po.fileUrl ? 'Ada' : '-'),
      render: (po) => {
        const href = resolveFinanceFileUrl(po.fileUrl);
        return href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
            <ExternalLink className="w-3 h-3" /> File PO
          </a>
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      getValue: (po) => po.status || 'OPEN',
      render: (po) => getStatusBadge(po.status),
    },
    {
      key: 'notes',
      header: 'Catatan',
      minWidth: 'min-w-[160px]',
      getValue: (po) => po.notes || '-',
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (po) => {
        const isVoid = po.status === 'CANCELLED' || po.status === 'VOID';
        return (
          <div className="inline-flex items-center gap-1">
            {canMutate && !isVoid && po.status !== 'CONVERTED_TO_IO' && (
              <button
                type="button"
                onClick={() => convertToIoMutation.mutate(po.id)}
                disabled={convertToIoMutation.isPending}
                title="Konversi PO menjadi Incoming Order (IO)"
                className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                → Terbitkan IO
              </button>
            )}
            {canMutate && !isVoid && (
              <button
                type="button"
                onClick={() => startEdit(po)}
                title="Edit"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canMutate && !isVoid && (
              <button
                type="button"
                onClick={() => setVoidTarget(po)}
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
      'purchase-order-customer',
      excelColumns.filter((c) => c.key !== 'actions'),
      customerPos
    );
  };

  if (canMutate && (isAdding || editingRecord)) {
    const isNew = isAdding && !editingRecord;
    const fileHref = resolveFinanceFileUrl(draft.fileUrl);
    return (
      <ExcelWorksheetShell
        onBack={cancelEditor}
        docTitle={isNew ? draft.poNumber || 'PO CUSTOMER BARU' : editingRecord?.poNumber || 'EDIT-PO'}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {isNew ? 'BARU' : 'EDIT'}
          </span>
        }
        formCode="FORM PURCHASE ORDER CUSTOMER"
        sheetTitle={isNew ? 'Input Purchase Order Customer Baru' : `Edit PO Customer ${editingRecord?.poNumber}`}
        modeHint="Worksheet Input PO Customer & Rincian Item"
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
              <span>Simpan PO Customer</span>
            </button>
          </>
        }
      >
        {/* Header Grid */}
        <div className="space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            1. Informasi PO &amp; Sumber E-mail
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className={`${EXCEL_CELL.label} w-48`}>No. PO Customer *</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="text"
                      placeholder="PO-CUST-001"
                      value={draft.poNumber}
                      onChange={(e) => setDraft({ ...draft, poNumber: e.target.value })}
                      className={`${EXCEL_CELL.input} font-mono`}
                    />
                  </td>
                  <td className={`${EXCEL_CELL.label} w-48`}>Tanggal PO *</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      className={EXCEL_CELL.input}
                    />
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>Customer *</td>
                  <td className={EXCEL_CELL.value}>
                    <select
                      value={draft.customerId}
                      onChange={(e) => {
                        const cust = customers.find((c) => c.id === e.target.value);
                        setDraft({
                          ...draft,
                          customerId: e.target.value,
                          paymentTerm: cust?.paymentTerm || draft.paymentTerm,
                        });
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
                  <td className={EXCEL_CELL.label}>Payment Term</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="text"
                      placeholder="NET 30"
                      value={draft.paymentTerm}
                      onChange={(e) => setDraft({ ...draft, paymentTerm: e.target.value })}
                      className={EXCEL_CELL.input}
                    />
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>Pengirim E-mail</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="email"
                      placeholder="procurement@customer.com"
                      value={draft.emailSender}
                      onChange={(e) => setDraft({ ...draft, emailSender: e.target.value })}
                      className={EXCEL_CELL.input}
                    />
                  </td>
                  <td className={EXCEL_CELL.label}>Subjek E-mail PO</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="text"
                      placeholder="Subjek e-mail PO..."
                      value={draft.emailSubject}
                      onChange={(e) => setDraft({ ...draft, emailSubject: e.target.value })}
                      className={EXCEL_CELL.input}
                    />
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>Lampiran File PO</td>
                  <td className="px-3 py-2 bg-white border border-slate-300">
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer">
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{draft.fileUrl ? 'Ganti File' : 'Upload PO'}</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => e.target.files?.[0] && handleUploadPoFile(e.target.files[0])}
                        />
                      </label>
                      {fileHref && (
                        <a href={fileHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
                          <ExternalLink className="w-3.5 h-3.5" /> Lihat File PO
                        </a>
                      )}
                    </div>
                  </td>
                  <td className={EXCEL_CELL.label}>Catatan PO</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="text"
                      placeholder="Catatan PO dari email customer..."
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      className={EXCEL_CELL.input}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Rincian Item Barang PO */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              2. Rincian Item Barang PO ({draft.items.length})
            </div>
            <button
              type="button"
              onClick={addDraftItem}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Item</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                  <th className="border border-slate-300 px-2.5 py-2 w-10 text-center">#</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Item Barang (/mdm/items)</th>
                  <th className="border border-slate-300 px-3 py-2 text-right w-28">Qty</th>
                  <th className="border border-slate-300 px-3 py-2 text-right w-40">Harga Satuan</th>
                  <th className="border border-slate-300 px-3 py-2 text-right w-40">Subtotal</th>
                  <th className="border border-slate-300 px-2 py-2 w-12 text-center">Hapus</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-slate-300 py-6 text-center text-xs text-slate-400">
                      Belum ada item. Klik "+ Tambah Item" atau isi langsung Total PO di bawah.
                    </td>
                  </tr>
                ) : (
                  draft.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 px-2.5 py-2 text-center font-mono text-xs text-slate-500 bg-slate-50">
                        {idx + 1}
                      </td>
                      <td className={EXCEL_CELL.value}>
                        <select
                          value={it.itemId}
                          onChange={(e) => {
                            const found = mdmItems.find((m) => m.id === e.target.value);
                            updateDraftItem(idx, {
                              itemId: e.target.value,
                              unitPrice: found ? found.sellingPrice : it.unitPrice,
                            });
                          }}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Pilih Item --</option>
                          {mdmItems.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.code ? `[${m.code}] ` : ''}
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={EXCEL_CELL.value}>
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => updateDraftItem(idx, { qty: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      </td>
                      <td className={EXCEL_CELL.value}>
                        <input
                          type="number"
                          value={it.unitPrice}
                          onChange={(e) => updateDraftItem(idx, { unitPrice: Number(e.target.value) })}
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-sm font-bold bg-slate-50">
                        {formatIDR(Number(it.qty || 0) * Number(it.unitPrice || 0))}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeDraftItem(idx)}
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

        {/* Komponen Biaya & Total PO */}
        <div className="space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            3. Komponen Biaya &amp; Total Nilai PO
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className={`${EXCEL_CELL.label} w-44`}>Diskon (Rp)</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="number"
                      value={draft.discount}
                      onChange={(e) => {
                        const discount = Number(e.target.value);
                        setDraft({
                          ...draft,
                          discount,
                          totalAmount: recomputeTotal(draft.items, discount, draft.freight, draft.taxRate, draft.totalAmount),
                        });
                      }}
                      className={`${EXCEL_CELL.input} font-mono text-right`}
                    />
                  </td>
                  <td className={`${EXCEL_CELL.label} w-44`}>Freight (Rp)</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="number"
                      value={draft.freight}
                      onChange={(e) => {
                        const freight = Number(e.target.value);
                        setDraft({
                          ...draft,
                          freight,
                          totalAmount: recomputeTotal(draft.items, draft.discount, freight, draft.taxRate, draft.totalAmount),
                        });
                      }}
                      className={`${EXCEL_CELL.input} font-mono text-right`}
                    />
                  </td>
                </tr>
                <tr>
                  <td className={EXCEL_CELL.label}>PPN (%)</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="number"
                      value={draft.taxRate}
                      onChange={(e) => {
                        const taxRate = Number(e.target.value);
                        setDraft({
                          ...draft,
                          taxRate,
                          totalAmount: recomputeTotal(draft.items, draft.discount, draft.freight, taxRate, draft.totalAmount),
                        });
                      }}
                      className={`${EXCEL_CELL.input} font-mono text-right`}
                    />
                  </td>
                  <td className={`${EXCEL_CELL.label} bg-emerald-50 text-emerald-900`}>Total PO (IDR)</td>
                  <td className={EXCEL_CELL.value}>
                    <input
                      type="number"
                      value={draft.totalAmount}
                      onChange={(e) => setDraft({ ...draft, totalAmount: Number(e.target.value) })}
                      className={`${EXCEL_CELL.input} font-mono text-right font-black text-emerald-700 bg-emerald-50/40`}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ExcelWorksheetShell>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. PO / Pengirim E-mail..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white max-w-[200px]"
          >
            <option value="ALL">Semua Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
            <option value="OPEN">OPEN</option>
            <option value="INVOICED">INVOICED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={handleExportCsv}
            exportDisabled={customerPos.length === 0}
          />
          {canMutate ? (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah PO Customer</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">
              Mode Lihat (Read-Only Sales / Cost Control)
            </span>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Purchase Order Customer — Tabel Excel"
          subtitle="Seluruh kolom PO, pengirim & subjek e-mail, biaya & total nilai terpisah rapi"
          columns={excelColumns}
          rows={customerPos}
          rowKey={(po) => po.id}
          isLoading={isLoading}
          emptyText="Belum ada data Purchase Order Customer."
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'PO',
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
                  <th className="px-3.5 py-2.5 border-r border-slate-200">No. PO Customer</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Tanggal PO</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Customer</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Info E-mail (Pengirim &amp; Subjek)</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Payment Term</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Total PO</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Lampiran File</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Purchase Order Customer...
                    </td>
                  </tr>
                ) : customerPos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Belum ada data Purchase Order Customer.
                    </td>
                  </tr>
                ) : (
                  customerPos.map((po) => {
                    const isExpanded = expandedId === po.id;
                    const fileHref = resolveFinanceFileUrl(po.fileUrl);
                    const isVoid = po.status === 'CANCELLED' || po.status === 'VOID';

                    return (
                      <React.Fragment key={po.id}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${isVoid ? 'opacity-60' : ''}`}>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : po.id)}
                              className="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <span>{po.poNumber}</span>
                            </button>
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">{po.date}</td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 font-semibold text-slate-800">{po.customerName}</td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200">
                            <div className="flex items-center gap-1 text-slate-700">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{po.emailSender || '-'}</span>
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-[200px]">
                              {po.emailSubject || '-'}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">{po.paymentTerm || '-'}</td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatIDR(po.totalAmount)}
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">
                            {fileHref ? (
                              <a
                                href={fileHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> File PO
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-slate-200 text-center">{getStatusBadge(po.status)}</td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {canMutate && !isVoid && po.status !== 'CONVERTED_TO_IO' && (
                                <button
                                  type="button"
                                  onClick={() => convertToIoMutation.mutate(po.id)}
                                  disabled={convertToIoMutation.isPending}
                                  title="Konversi PO menjadi Incoming Order (IO)"
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                  → Terbitkan IO
                                </button>
                              )}
                              {canMutate && !isVoid && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(po)}
                                  title="Edit"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canMutate && !isVoid && (
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(po)}
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
                              {/* PO Billing Progress Bar */}
                              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className="font-bold text-slate-700">Progres Penagihan PO (Billing Progress)</span>
                                  {isLoadingProgress ? (
                                    <span className="text-slate-400">Memuat progres...</span>
                                  ) : (
                                    <span className="font-mono text-xs font-bold text-emerald-700">
                                      {billingProgress?.billedPercentage ?? 0}% Tertagih ({billingProgress?.invoiceCount ?? 0} Inv)
                                    </span>
                                  )}
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${Math.min(100, billingProgress?.billedPercentage ?? 0)}%` }}
                                  />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                                  <div>
                                    <span className="text-slate-400">Total PO:</span>{' '}
                                    <strong className="font-mono">{formatIDR(billingProgress?.totalPoAmount ?? po.totalAmount)}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Sudah Ditagih:</span>{' '}
                                    <strong className="font-mono text-emerald-700">{formatIDR(billingProgress?.billedAmount ?? 0)}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Sisa Belum Ditagih:</span>{' '}
                                    <strong className="font-mono text-amber-700">{formatIDR(billingProgress?.unbilledAmount ?? po.totalAmount)}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Total DP:</span>{' '}
                                    <strong className="font-mono text-blue-700">{formatIDR(billingProgress?.downPaymentTotal ?? 0)}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="text-slate-600">
                                  <strong>Diskon:</strong> {formatIDR(po.discount)} •{' '}
                                  <strong>Freight:</strong> {formatIDR(po.freight)} •{' '}
                                  <strong>PPN:</strong> {po.taxRate}%
                                  {po.notes ? ` • Catatan: ${po.notes}` : ''}
                                </div>
                                {fileHref && (
                                  <a
                                    href={fileHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> Download / Preview Lampiran PO
                                  </a>
                                )}
                              </div>

                              <div className="bg-white rounded-xl border border-slate-200 p-3">
                                <div className="text-xs font-bold text-slate-700 mb-2">
                                  Rincian Item Barang ({po.items?.length || 0})
                                </div>
                                {!po.items || po.items.length === 0 ? (
                                  <div className="text-xs text-slate-400">Tidak ada rincian item barang pada PO ini.</div>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-[11px] text-slate-500 uppercase border-b border-slate-200">
                                        <th className="py-1.5 text-left">Kode &amp; Nama Item</th>
                                        <th className="py-1.5 text-right">Qty</th>
                                        <th className="py-1.5 text-right">Harga Satuan</th>
                                        <th className="py-1.5 text-right">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {po.items.map((it, idx) => (
                                        <tr key={idx}>
                                          <td className="py-1.5">
                                            {it.itemCode ? `[${it.itemCode}] ` : ''}
                                            {it.itemName || it.itemId}
                                          </td>
                                          <td className="py-1.5 text-right font-mono">{it.qty}</td>
                                          <td className="py-1.5 text-right font-mono">{formatIDR(it.unitPrice)}</td>
                                          <td className="py-1.5 text-right font-mono font-bold">
                                            {formatIDR(it.subtotal ?? it.qty * it.unitPrice)}
                                          </td>
                                        </tr>
                                      ))}
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
        title="Batalkan / Void Purchase Order Customer?"
        message={`Anda yakin ingin membatalkan PO Customer ${voidTarget?.poNumber || ''}? Data akan ditandai Void (Soft Delete).`}
        confirmLabel="Ya, Void PO"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
