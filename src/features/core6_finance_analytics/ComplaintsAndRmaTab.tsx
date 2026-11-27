import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
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
  ShieldCheck,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listFinanceComplaintsApi,
  createFinanceComplaintApi,
  updateFinanceComplaintApi,
  deleteFinanceComplaintApi,
  submitComplaintQcCorrectiveApi,
  listFinanceRmaApi,
  createFinanceRmaApi,
  updateFinanceRmaApi,
  deleteFinanceRmaApi,
  approveRmaQcApi,
  approveRmaFinanceApi,
  listMdmCustomersApi,
  listMdmItemsApi,
  listFinanceInvoicesApi,
  listSupplierInvoicesApi,
  uploadFinanceDocument,
  resolveFinanceFileUrl,
  printFinanceHtmlReport,
  extractFinanceErrorMessage,
  FinanceComplaintRecord,
  FinanceComplaintPayload,
  QcCorrectivePayload,
  FinanceRmaRecord,
  FinanceRmaPayload,
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

const emptyComplaint = (): FinanceComplaintPayload => ({
  customerId: '',
  salesInvoiceId: '',
  itemId: '',
  complaintType: 'QUALITY_DEFECT',
  proposedSolution: 'CREDIT_NOTE',
  description: '',
  rejectQty: 0,
  evidenceFileUrl: '',
});

const emptyRma = (): FinanceRmaPayload => ({
  noteType: 'CREDIT_NOTE',
  complaintId: '',
  salesInvoiceId: '',
  supplierInvoiceId: '',
  itemId: '',
  returnQty: 1,
  unitPrice: 0,
  amount: 0,
  returnToStock: true,
  rackNumber: 'RMA-HOLD',
  reason: '',
});

export const ComplaintsAndRmaTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canMutateComplaint = isSuperAdmin || isExecutive || userDivision === 'FINANCE' || userDivision === 'SALES';
  const canQcCorrective = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC';
  const canMutateRma = isSuperAdmin || isExecutive || userDivision === 'FINANCE';
  const canApproveRmaQc = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'PRODUKSI_QC');
  const canApproveRmaFinance = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'FINANCE');

  const [subTab, setSubTab] = useState<'complaints' | 'rma'>('complaints');
  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');

  // Shared lookups
  const { data: customers = [] } = useQuery({ queryKey: ['mdmCustomersDropdown'], queryFn: listMdmCustomersApi });
  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: arInvoicesRes } = useQuery({
    queryKey: ['financeInvoicesDropdown'],
    queryFn: () => listFinanceInvoicesApi({ page: 1, limit: 100 }),
  });
  const arInvoices = arInvoicesRes?.data || [];
  const { data: apInvoicesRes } = useQuery({
    queryKey: ['financeSupplierInvoicesDropdown'],
    queryFn: () => listSupplierInvoicesApi({ page: 1, limit: 100 }),
  });
  const apInvoices = apInvoicesRes?.data || [];

  // ── Sub-Tab A: Complaints ──
  const [cPage, setCPage] = useState(1);
  const [cSearch, setCSearch] = useState('');
  const [cStatus, setCStatus] = useState('ALL');
  const [cAdding, setCAdding] = useState(false);
  const [cEditingRecord, setCEditingRecord] = useState<FinanceComplaintRecord | null>(null);
  const [cDraft, setCDraft] = useState<FinanceComplaintPayload>(emptyComplaint);
  const [cUploading, setCUploading] = useState(false);
  const [cExpandedId, setCExpandedId] = useState<string | null>(null);
  const [qcDraft, setQcDraft] = useState<QcCorrectivePayload>({
    rootCause: '',
    correctiveAction: '',
    preventiveAction: '',
    status: 'APPROVED_RMA',
  });
  const [cVoidTarget, setCVoidTarget] = useState<FinanceComplaintRecord | null>(null);

  const cEditingId = cEditingRecord?.id ?? null;

  const { data: complaintsRes, isLoading: isLoadingComplaints } = useQuery({
    queryKey: ['financeComplaints', cPage, cSearch, cStatus],
    queryFn: () => listFinanceComplaintsApi({ page: cPage, limit: 20, search: cSearch || undefined, status: cStatus }),
  });
  const complaints = complaintsRes?.data || [];
  const cTotalPages = complaintsRes?.meta?.totalPages || complaintsRes?.meta?.total_pages || 1;
  const cTotalItems = complaintsRes?.meta?.total ?? complaintsRes?.meta?.totalItems;

  // ── Sub-Tab B: RMA / Credit Note / Debit Note ──
  const [rPage, setRPage] = useState(1);
  const [rTypeFilter, setRTypeFilter] = useState('ALL');
  const [rStatusFilter, setRStatusFilter] = useState('ALL');
  const [rAdding, setRAdding] = useState(false);
  const [rEditingRecord, setREditingRecord] = useState<FinanceRmaRecord | null>(null);
  const [rDraft, setRDraft] = useState<FinanceRmaPayload>(emptyRma);
  const [rVoidTarget, setRVoidTarget] = useState<FinanceRmaRecord | null>(null);

  const rEditingId = rEditingRecord?.id ?? null;

  const { data: rmaRes, isLoading: isLoadingRma } = useQuery({
    queryKey: ['financeRma', rPage, rTypeFilter, rStatusFilter],
    queryFn: () => listFinanceRmaApi({ page: rPage, limit: 20, noteType: rTypeFilter, status: rStatusFilter }),
  });
  const rmaList = rmaRes?.data || [];
  const rTotalPages = rmaRes?.meta?.totalPages || rmaRes?.meta?.total_pages || 1;
  const rTotalItems = rmaRes?.meta?.total ?? rmaRes?.meta?.totalItems;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['financeComplaints'] });
    queryClient.invalidateQueries({ queryKey: ['financeRma'] });
    queryClient.invalidateQueries({ queryKey: ['financeInvoices'] });
    queryClient.invalidateQueries({ queryKey: ['financeSupplierInvoices'] });
    queryClient.invalidateQueries({ queryKey: ['financeArSummary'] });
    queryClient.invalidateQueries({ queryKey: ['financeApSummary'] });
  };

  // Complaint mutations
  const createComplaintMut = useMutation({
    mutationFn: (p: FinanceComplaintPayload) => createFinanceComplaintApi(p),
    onSuccess: () => {
      toast.success('E-Complaint / CHR berhasil disimpan');
      setCAdding(false);
      setCDraft(emptyComplaint());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal menyimpan komplain')),
  });
  const updateComplaintMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<FinanceComplaintPayload> }) => updateFinanceComplaintApi(id, p),
    onSuccess: () => {
      toast.success('E-Complaint berhasil diperbarui');
      setCEditingRecord(null);
      setCDraft(emptyComplaint());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal memperbarui komplain')),
  });
  const deleteComplaintMut = useMutation({
    mutationFn: (id: string) => deleteFinanceComplaintApi(id),
    onSuccess: () => {
      toast.success('E-Complaint berhasil dibatalkan');
      setCVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal membatalkan komplain')),
  });
  const qcCorrectiveMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: QcCorrectivePayload }) => submitComplaintQcCorrectiveApi(id, p),
    onSuccess: () => {
      toast.success('Tindakan QC Corrective berhasil disimpan');
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal menyimpan QC Corrective')),
  });

  // RMA mutations
  const createRmaMut = useMutation({
    mutationFn: (p: FinanceRmaPayload) => createFinanceRmaApi(p),
    onSuccess: () => {
      toast.success('RMA / Credit-Debit Note berhasil dibuat');
      setRAdding(false);
      setRDraft(emptyRma());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal membuat RMA')),
  });
  const updateRmaMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<FinanceRmaPayload> }) => updateFinanceRmaApi(id, p),
    onSuccess: () => {
      toast.success('RMA berhasil diperbarui');
      setREditingRecord(null);
      setRDraft(emptyRma());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal memperbarui RMA')),
  });
  const deleteRmaMut = useMutation({
    mutationFn: (id: string) => deleteFinanceRmaApi(id),
    onSuccess: () => {
      toast.success('RMA di-void & saldo AR/AP + stok dikembalikan (reversal)');
      setRVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal membatalkan RMA')),
  });
  const approveRmaQcMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) => approveRmaQcApi(id, action),
    onSuccess: () => {
      toast.success('Approval QC untuk RMA berhasil diproses');
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal approval QC')),
  });
  const approveRmaFinMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) => approveRmaFinanceApi(id, action),
    onSuccess: () => {
      toast.success('Approval Finance untuk RMA berhasil diproses');
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractFinanceErrorMessage(e, 'Gagal approval Finance')),
  });

  const handleUploadEvidence = async (file: File) => {
    setCUploading(true);
    try {
      const url = await uploadFinanceDocument('complaint_evidence', file);
      setCDraft((prev) => ({ ...prev, evidenceFileUrl: url }));
      toast.success('Foto bukti komplain berhasil diunggah');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mengunggah bukti');
    } finally {
      setCUploading(false);
    }
  };

  const renderBadge = (status: string) => {
    const s = (status || 'OPEN').toUpperCase();
    if (s === 'APPROVED' || s === 'APPLIED' || s === 'APPROVED_RMA') {
      return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{s}</span>;
    }
    if (s === 'REJECTED' || s === 'CANCELLED' || s === 'VOID') {
      return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">{s}</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">{s}</span>;
  };

  const saveComplaint = () => {
    if (!cDraft.customerId) return toast.error('Customer wajib dipilih');
    if (!cDraft.description.trim()) return toast.error('Deskripsi komplain wajib diisi');
    const payload: FinanceComplaintPayload = {
      ...cDraft,
      salesInvoiceId: cDraft.salesInvoiceId || null,
      itemId: cDraft.itemId || null,
      evidenceFileUrl: cDraft.evidenceFileUrl || null,
    };
    if (cEditingId) updateComplaintMut.mutate({ id: cEditingId, p: payload });
    else createComplaintMut.mutate(payload);
  };

  const saveRma = () => {
    if (rDraft.noteType === 'CREDIT_NOTE' && !rDraft.salesInvoiceId) {
      return toast.error('Sales Invoice wajib dipilih untuk Credit Note (AR)');
    }
    if (rDraft.noteType === 'DEBIT_NOTE' && !rDraft.supplierInvoiceId) {
      return toast.error('Supplier Invoice wajib dipilih untuk Debit Note (AP)');
    }
    const payload: FinanceRmaPayload = {
      ...rDraft,
      complaintId: rDraft.complaintId || null,
      salesInvoiceId: rDraft.noteType === 'CREDIT_NOTE' ? rDraft.salesInvoiceId || null : null,
      supplierInvoiceId: rDraft.noteType === 'DEBIT_NOTE' ? rDraft.supplierInvoiceId || null : null,
      itemId: rDraft.itemId || null,
      rackNumber: rDraft.returnToStock ? rDraft.rackNumber || 'RMA-HOLD' : null,
    };
    if (rEditingId) updateRmaMut.mutate({ id: rEditingId, p: payload });
    else createRmaMut.mutate(payload);
  };

  const startEditComplaint = (c: FinanceComplaintRecord) => {
    setCAdding(false);
    setCEditingRecord(c);
    setCDraft({
      customerId: c.customerId,
      salesInvoiceId: c.salesInvoiceId || '',
      itemId: c.itemId || '',
      complaintType: c.complaintType,
      proposedSolution: c.proposedSolution || 'CREDIT_NOTE',
      description: c.description,
      rejectQty: c.rejectQty,
      evidenceFileUrl: c.evidenceFileUrl || '',
    });
  };

  const startEditRma = (r: FinanceRmaRecord) => {
    setRAdding(false);
    setREditingRecord(r);
    setRDraft({
      noteType: r.noteType,
      complaintId: r.complaintId || '',
      salesInvoiceId: r.salesInvoiceId || '',
      supplierInvoiceId: r.supplierInvoiceId || '',
      itemId: r.itemId || '',
      returnQty: r.returnQty,
      unitPrice: r.unitPrice,
      amount: r.amount,
      returnToStock: r.returnToStock,
      rackNumber: r.rackNumber || 'RMA-HOLD',
      reason: r.reason,
    });
  };

  // Excel Columns — Complaints
  const totalRejectQty = useMemo(
    () => complaints.reduce((sum, c) => sum + Number(c.rejectQty || 0), 0),
    [complaints]
  );

  const complaintExcelColumns: ExcelColumn<FinanceComplaintRecord>[] = [
    { key: 'complaintNumber', header: 'No. CHR', mono: true, getValue: (c) => c.complaintNumber },
    { key: 'customerName', header: 'Customer', minWidth: 'min-w-[160px]', getValue: (c) => c.customerName || '-' },
    { key: 'invoiceNumber', header: 'No. Invoice', mono: true, getValue: (c) => c.invoiceNumber || '-' },
    { key: 'itemName', header: 'Item Barang', minWidth: 'min-w-[160px]', getValue: (c) => c.itemName || '-' },
    {
      key: 'rejectQty',
      header: 'Qty Reject',
      align: 'right',
      mono: true,
      getValue: (c) => Number(c.rejectQty || 0),
      render: (c) => <span className="font-bold text-rose-600">{c.rejectQty}</span>,
      footer: totalRejectQty,
    },
    { key: 'complaintType', header: 'Tipe Komplain', getValue: (c) => c.complaintType || '-' },
    { key: 'proposedSolution', header: 'Solusi Usulan', getValue: (c) => c.proposedSolution || '-' },
    { key: 'description', header: 'Deskripsi Keluhan', minWidth: 'min-w-[200px]', getValue: (c) => c.description || '-' },
    { key: 'rootCause', header: 'Root Cause (QC)', minWidth: 'min-w-[160px]', getValue: (c) => c.rootCause || '-' },
    { key: 'correctiveAction', header: 'Corrective Action', minWidth: 'min-w-[160px]', getValue: (c) => c.correctiveAction || '-' },
    { key: 'preventiveAction', header: 'Preventive Action', minWidth: 'min-w-[160px]', getValue: (c) => c.preventiveAction || '-' },
    {
      key: 'evidenceFileUrl',
      header: 'Bukti',
      align: 'center',
      getValue: (c) => (c.evidenceFileUrl ? 'Ada' : '-'),
      render: (c) => {
        const href = resolveFinanceFileUrl(c.evidenceFileUrl);
        return href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
            <ExternalLink className="w-3 h-3" /> Foto
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
      getValue: (c) => c.status,
      render: (c) => renderBadge(c.status),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (c) => (
        <div className="inline-flex gap-1">
          {canMutateComplaint && c.status === 'OPEN' && (
            <button
              type="button"
              onClick={() => startEditComplaint(c)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canMutateComplaint && (
            <button
              type="button"
              onClick={() => setCVoidTarget(c)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Excel Columns — RMA
  const rmaTotals = useMemo(
    () =>
      rmaList.reduce(
        (acc, r) => {
          acc.qty += Number(r.returnQty || 0);
          acc.amount += Number(r.amount || 0);
          return acc;
        },
        { qty: 0, amount: 0 }
      ),
    [rmaList]
  );

  const rmaExcelColumns: ExcelColumn<FinanceRmaRecord>[] = [
    { key: 'rmaNumber', header: 'No. RMA', mono: true, getValue: (r) => r.rmaNumber },
    {
      key: 'noteType',
      header: 'Tipe Note',
      getValue: (r) => r.noteType,
      render: (r) => (
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.noteType === 'CREDIT_NOTE' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {r.noteType}
        </span>
      ),
    },
    { key: 'invoiceNumber', header: 'No. Invoice', mono: true, getValue: (r) => r.invoiceNumber || '-' },
    { key: 'complaintNumber', header: 'Ref CHR', mono: true, getValue: (r) => r.complaintNumber || '-' },
    { key: 'itemName', header: 'Item Barang', minWidth: 'min-w-[160px]', getValue: (r) => r.itemName || '-' },
    {
      key: 'returnQty',
      header: 'Qty Retur',
      align: 'right',
      mono: true,
      getValue: (r) => Number(r.returnQty || 0),
      footer: rmaTotals.qty,
    },
    {
      key: 'unitPrice',
      header: 'Harga Satuan',
      align: 'right',
      mono: true,
      getValue: (r) => Number(r.unitPrice || 0),
      render: (r) => formatIDR(r.unitPrice),
    },
    {
      key: 'amount',
      header: 'Nominal CN/DN',
      align: 'right',
      mono: true,
      getValue: (r) => Number(r.amount || 0),
      render: (r) => <span className="font-bold text-emerald-700">{formatIDR(r.amount)}</span>,
      footer: <span className="text-emerald-700">{formatIDR(rmaTotals.amount)}</span>,
    },
    {
      key: 'returnToStock',
      header: 'Return Stock',
      align: 'center',
      getValue: (r) => (r.returnToStock ? 'Ya' : 'Tidak'),
    },
    { key: 'rackNumber', header: 'Rak Gudang', mono: true, getValue: (r) => (r.returnToStock ? r.rackNumber || 'RMA-HOLD' : '-') },
    { key: 'reason', header: 'Alasan', minWidth: 'min-w-[180px]', getValue: (r) => r.reason || '-' },
    {
      key: 'qcStatus',
      header: 'Approve QC',
      align: 'center',
      getValue: (r) => r.qcStatus || 'PENDING',
      render: (r) => {
        const isVoid = r.status === 'CANCELLED' || r.status === 'VOID';
        return (
          <div className="inline-flex items-center gap-1">
            {renderBadge(r.qcStatus)}
            {canApproveRmaQc && r.qcStatus === 'PENDING' && !isVoid && (
              <>
                <button type="button" onClick={() => approveRmaQcMut.mutate({ id: r.id, action: 'APPROVE' })} className="p-1 rounded bg-emerald-600 text-white cursor-pointer" title="Approve QC"><CheckCircle2 className="w-3 h-3" /></button>
                <button type="button" onClick={() => approveRmaQcMut.mutate({ id: r.id, action: 'REJECT' })} className="p-1 rounded bg-rose-600 text-white cursor-pointer" title="Reject QC"><XCircle className="w-3 h-3" /></button>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'financeStatus',
      header: 'Approve Finance',
      align: 'center',
      getValue: (r) => r.financeStatus || 'PENDING',
      render: (r) => {
        const isVoid = r.status === 'CANCELLED' || r.status === 'VOID';
        return (
          <div className="inline-flex items-center gap-1">
            {renderBadge(r.financeStatus)}
            {canApproveRmaFinance && r.financeStatus === 'PENDING' && !isVoid && (
              <>
                <button type="button" onClick={() => approveRmaFinMut.mutate({ id: r.id, action: 'APPROVE' })} className="p-1 rounded bg-emerald-600 text-white cursor-pointer" title="Approve Finance"><CheckCircle2 className="w-3 h-3" /></button>
                <button type="button" onClick={() => approveRmaFinMut.mutate({ id: r.id, action: 'REJECT' })} className="p-1 rounded bg-rose-600 text-white cursor-pointer" title="Reject Finance"><XCircle className="w-3 h-3" /></button>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      getValue: (r) => r.status,
      render: (r) => renderBadge(r.status),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (r) => {
        const isVoid = r.status === 'CANCELLED' || r.status === 'VOID';
        return (
          <div className="inline-flex gap-1">
            <button
              type="button"
              onClick={() => printFinanceHtmlReport(`/finance/rma/${r.id}/print`).catch((e) => toast.error(e?.message || 'Gagal mencetak Credit/Debit Note'))}
              title="Cetak Credit/Debit Note"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            {canMutateRma && r.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => startEditRma(r)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canMutateRma && !isVoid && (
              <button type="button" onClick={() => setRVoidTarget(r)} title="Void / Reversal" className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // Worksheet Form: Complaint Create/Edit
  if (subTab === 'complaints' && canMutateComplaint && (cAdding || cEditingRecord)) {
    const isNew = cAdding && !cEditingRecord;
    const evHref = resolveFinanceFileUrl(cDraft.evidenceFileUrl);
    return (
      <ExcelWorksheetShell
        onBack={() => { setCAdding(false); setCEditingRecord(null); setCDraft(emptyComplaint()); }}
        docTitle={isNew ? 'AUTO-CHR' : cEditingRecord?.complaintNumber || 'EDIT-CHR'}
        badge={<span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{isNew ? 'BARU' : 'EDIT'}</span>}
        formCode="FORM E-COMPLAINT / CUSTOMER HANDLING REPORT (CHR)"
        sheetTitle={isNew ? 'Input E-Complaint / CHR Baru' : `Edit E-Complaint ${cEditingRecord?.complaintNumber}`}
        modeHint="Worksheet Pengajuan Komplain Customer"
        actions={
          <>
            <button
              type="button"
              onClick={() => { setCAdding(false); setCEditingRecord(null); setCDraft(emptyComplaint()); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer"
            >
              <X className="w-4 h-4" /> Batal
            </button>
            <button
              type="button"
              onClick={saveComplaint}
              disabled={createComplaintMut.isPending || updateComplaintMut.isPending || cUploading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              {createComplaintMut.isPending || updateComplaintMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Komplain</span>
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${EXCEL_CELL.label} w-48`}>Customer *</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={cDraft.customerId}
                    onChange={(e) => setCDraft({ ...cDraft, customerId: e.target.value })}
                    className={EXCEL_CELL.input}
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className={`${EXCEL_CELL.label} w-48`}>Link Sales Invoice</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={cDraft.salesInvoiceId || ''}
                    onChange={(e) => setCDraft({ ...cDraft, salesInvoiceId: e.target.value })}
                    className={EXCEL_CELL.input}
                  >
                    <option value="">-- Opsional Invoice --</option>
                    {arInvoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>)}
                  </select>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Item Barang</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={cDraft.itemId || ''}
                    onChange={(e) => setCDraft({ ...cDraft, itemId: e.target.value })}
                    className={EXCEL_CELL.input}
                  >
                    <option value="">-- Pilih Item --</option>
                    {mdmItems.map((it) => <option key={it.id} value={it.id}>{it.code ? `[${it.code}] ` : ''}{it.name}</option>)}
                  </select>
                </td>
                <td className={EXCEL_CELL.label}>Qty Reject</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={cDraft.rejectQty}
                    onChange={(e) => setCDraft({ ...cDraft, rejectQty: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right`}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Tipe Komplain</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={cDraft.complaintType}
                    onChange={(e) => setCDraft({ ...cDraft, complaintType: e.target.value })}
                    className={EXCEL_CELL.input}
                  >
                    <option value="QUALITY_DEFECT">QUALITY_DEFECT</option>
                    <option value="WRONG_ITEM">WRONG_ITEM</option>
                    <option value="SHORT_QUANTITY">SHORT_QUANTITY</option>
                    <option value="DAMAGED_IN_TRANSIT">DAMAGED_IN_TRANSIT</option>
                  </select>
                </td>
                <td className={EXCEL_CELL.label}>Usulan Solusi</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={cDraft.proposedSolution || 'CREDIT_NOTE'}
                    onChange={(e) => setCDraft({ ...cDraft, proposedSolution: e.target.value })}
                    className={EXCEL_CELL.input}
                  >
                    <option value="CREDIT_NOTE">CREDIT_NOTE</option>
                    <option value="REPLACEMENT">REPLACEMENT</option>
                    <option value="REWORK">REWORK</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Deskripsi Keluhan *</td>
                <td className={EXCEL_CELL.value} colSpan={3}>
                  <input
                    type="text"
                    placeholder="Jelaskan detail keluhan customer..."
                    value={cDraft.description}
                    onChange={(e) => setCDraft({ ...cDraft, description: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Foto / Bukti Komplain</td>
                <td className="px-3 py-2 bg-white border border-slate-300" colSpan={3}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer">
                      {cUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{cDraft.evidenceFileUrl ? 'Ganti Foto Bukti' : 'Upload Foto Bukti'}</span>
                      <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && handleUploadEvidence(e.target.files[0])} />
                    </label>
                    {evHref && (
                      <a href={evHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
                        <ExternalLink className="w-3.5 h-3.5" /> Lihat Bukti Terunggah
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ExcelWorksheetShell>
    );
  }

  // Worksheet Form: RMA Create/Edit
  if (subTab === 'rma' && canMutateRma && (rAdding || rEditingRecord)) {
    const isNew = rAdding && !rEditingRecord;
    return (
      <ExcelWorksheetShell
        onBack={() => { setRAdding(false); setREditingRecord(null); setRDraft(emptyRma()); }}
        docTitle={isNew ? 'AUTO-RMA' : rEditingRecord?.rmaNumber || 'EDIT-RMA'}
        badge={<span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{isNew ? 'BARU' : 'EDIT'}</span>}
        formCode="FORM RMA — CREDIT NOTE (AR) / DEBIT NOTE (AP)"
        sheetTitle={isNew ? 'Buat RMA / Credit Note / Debit Note Baru' : `Edit RMA ${rEditingRecord?.rmaNumber}`}
        modeHint="Worksheet Retur & Penyesuaian Saldo AR/AP"
        actions={
          <>
            <button
              type="button"
              onClick={() => { setRAdding(false); setREditingRecord(null); setRDraft(emptyRma()); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer"
            >
              <X className="w-4 h-4" /> Batal
            </button>
            <button
              type="button"
              onClick={saveRma}
              disabled={createRmaMut.isPending || updateRmaMut.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              {createRmaMut.isPending || updateRmaMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan RMA / CN / DN</span>
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${EXCEL_CELL.label} w-48`}>Tipe Note *</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={rDraft.noteType}
                    onChange={(e) => setRDraft({ ...rDraft, noteType: e.target.value as 'CREDIT_NOTE' | 'DEBIT_NOTE' })}
                    className={`${EXCEL_CELL.input} font-bold`}
                  >
                    <option value="CREDIT_NOTE">CREDIT_NOTE (Potong AR)</option>
                    <option value="DEBIT_NOTE">DEBIT_NOTE (Potong AP)</option>
                  </select>
                </td>
                <td className={`${EXCEL_CELL.label} w-48`}>
                  {rDraft.noteType === 'CREDIT_NOTE' ? 'Sales Invoice (AR) *' : 'Supplier Invoice (AP) *'}
                </td>
                <td className={EXCEL_CELL.value}>
                  {rDraft.noteType === 'CREDIT_NOTE' ? (
                    <select
                      value={rDraft.salesInvoiceId || ''}
                      onChange={(e) => setRDraft({ ...rDraft, salesInvoiceId: e.target.value })}
                      className={EXCEL_CELL.input}
                    >
                      <option value="">-- Pilih Sales Invoice (AR) --</option>
                      {arInvoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.customerName}</option>)}
                    </select>
                  ) : (
                    <select
                      value={rDraft.supplierInvoiceId || ''}
                      onChange={(e) => setRDraft({ ...rDraft, supplierInvoiceId: e.target.value })}
                      className={EXCEL_CELL.input}
                    >
                      <option value="">-- Pilih Supplier Invoice (AP) --</option>
                      {apInvoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.supplierName}</option>)}
                    </select>
                  )}
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Referensi E-Complaint (CHR)</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={rDraft.complaintId || ''}
                    onChange={(e) => setRDraft({ ...rDraft, complaintId: e.target.value })}
                    className={EXCEL_CELL.input}
                  >
                    <option value="">-- Opsional Link CHR --</option>
                    {complaints.map((c) => <option key={c.id} value={c.id}>{c.complaintNumber} ({c.customerName})</option>)}
                  </select>
                </td>
                <td className={EXCEL_CELL.label}>Item Barang</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={rDraft.itemId || ''}
                    onChange={(e) => {
                      const it = mdmItems.find((m) => m.id === e.target.value);
                      const unitPrice = it ? it.sellingPrice : rDraft.unitPrice;
                      setRDraft({ ...rDraft, itemId: e.target.value, unitPrice, amount: rDraft.returnQty * unitPrice });
                    }}
                    className={EXCEL_CELL.input}
                  >
                    <option value="">-- Pilih Item --</option>
                    {mdmItems.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Qty Retur</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={rDraft.returnQty}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      setRDraft({ ...rDraft, returnQty: qty, amount: qty * rDraft.unitPrice });
                    }}
                    className={`${EXCEL_CELL.input} font-mono text-right`}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Harga Satuan (IDR)</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={rDraft.unitPrice}
                    onChange={(e) => {
                      const price = Number(e.target.value);
                      setRDraft({ ...rDraft, unitPrice: price, amount: rDraft.returnQty * price });
                    }}
                    className={`${EXCEL_CELL.input} font-mono text-right`}
                  />
                </td>
              </tr>
              <tr>
                <td className={`${EXCEL_CELL.label} bg-emerald-50 text-emerald-900`}>Nominal Credit/Debit Note</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={rDraft.amount}
                    onChange={(e) => setRDraft({ ...rDraft, amount: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right font-black text-emerald-700 bg-emerald-50/40`}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Pengembalian Stok &amp; Rak</td>
                <td className="px-3 py-2 bg-white border border-slate-300">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rDraft.returnToStock}
                        onChange={(e) => setRDraft({ ...rDraft, returnToStock: e.target.checked })}
                      />
                      <span>Return to Stock</span>
                    </label>
                    {rDraft.returnToStock && (
                      <input
                        type="text"
                        placeholder="RMA-HOLD"
                        value={rDraft.rackNumber || ''}
                        onChange={(e) => setRDraft({ ...rDraft, rackNumber: e.target.value })}
                        className="px-2.5 py-1 rounded border border-slate-300 text-xs font-mono w-36"
                      />
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Alasan Credit / Debit Note</td>
                <td className={EXCEL_CELL.value} colSpan={3}>
                  <input
                    type="text"
                    placeholder="Alasan penerbitan Credit/Debit Note..."
                    value={rDraft.reason}
                    onChange={(e) => setRDraft({ ...rDraft, reason: e.target.value })}
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
      {/* Sub-Tab Toggle */}
      <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setSubTab('complaints')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'complaints' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          6.6.1 &amp; 6.6.2 E-Complaint / CHR
        </button>
        <button
          type="button"
          onClick={() => setSubTab('rma')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'rma' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          RMA &amp; Credit Note (AR) / Debit Note (AP)
        </button>
      </div>

      {subTab === 'complaints' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari No. CHR / Customer..."
                  value={cSearch}
                  onChange={(e) => { setCSearch(e.target.value); setCPage(1); }}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <select value={cStatus} onChange={(e) => { setCStatus(e.target.value); setCPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="ALL">Semua Status</option>
                <option value="OPEN">OPEN</option>
                <option value="APPROVED_RMA">APPROVED_RMA</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExcelViewToggle
                value={tableStyle}
                onChange={setTableStyle}
                onExport={() =>
                  exportExcelCsv(
                    'e-complaint-chr',
                    complaintExcelColumns.filter((c) => c.key !== 'actions'),
                    complaints
                  )
                }
                exportDisabled={complaints.length === 0}
              />
              {canMutateComplaint && (
                <button
                  type="button"
                  onClick={() => { setCEditingRecord(null); setCDraft(emptyComplaint()); setCAdding(true); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> <span>+ Tambah Komplain (CHR)</span>
                </button>
              )}
            </div>
          </div>

          {tableStyle === 'excel' ? (
            <ExcelSpreadsheetTable
              title="E-Complaint / Customer Handling Report (CHR) — Tabel Excel"
              subtitle="Seluruh kolom komplain, qty reject & QC CAPA terpisah rapi"
              columns={complaintExcelColumns}
              rows={complaints}
              rowKey={(c) => c.id}
              isLoading={isLoadingComplaints}
              emptyText="Belum ada data E-Complaint / CHR."
              footerLabel="TOTAL"
              pagination={{
                page: cPage,
                totalPages: cTotalPages,
                totalItems: cTotalItems,
                unitLabel: 'komplain',
                onPrev: () => setCPage((p) => Math.max(1, p - 1)),
                onNext: () => setCPage((p) => p + 1),
              }}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 uppercase">
                      <th className="px-3.5 py-2.5 border-r border-slate-200">No. CHR</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200">Customer &amp; Invoice</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200">Item &amp; Qty Reject</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200">Tipe &amp; Solusi</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200">Deskripsi &amp; Bukti</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {isLoadingComplaints ? (
                      <tr><td colSpan={7} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat E-Complaint...</td></tr>
                    ) : complaints.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-slate-400">Belum ada data E-Complaint / CHR.</td></tr>
                    ) : (
                      complaints.map((c) => {
                        const isExp = cExpandedId === c.id;
                        const evHref = resolveFinanceFileUrl(c.evidenceFileUrl);
                        return (
                          <React.Fragment key={c.id}>
                            <tr className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-3.5 py-2.5 border-r border-slate-200 font-mono font-bold whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = isExp ? null : c.id;
                                    setCExpandedId(next);
                                    if (next) {
                                      setQcDraft({
                                        rootCause: c.rootCause || '',
                                        correctiveAction: c.correctiveAction || '',
                                        preventiveAction: c.preventiveAction || '',
                                        status: c.status === 'REJECTED' ? 'REJECTED' : 'APPROVED_RMA',
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer"
                                >
                                  {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  <span>{c.complaintNumber}</span>
                                </button>
                              </td>
                              <td className="px-3.5 py-2.5 border-r border-slate-200">
                                <div className="font-semibold text-slate-800">{c.customerName}</div>
                                <div className="text-xs font-mono text-slate-500">{c.invoiceNumber || '-'}</div>
                              </td>
                              <td className="px-3.5 py-2.5 border-r border-slate-200">
                                <div>{c.itemName || '-'}</div>
                                <div className="text-xs font-mono text-rose-600 font-bold">Reject: {c.rejectQty}</div>
                              </td>
                              <td className="px-3.5 py-2.5 border-r border-slate-200">
                                <div className="font-medium">{c.complaintType}</div>
                                <div className="text-xs text-slate-500">{c.proposedSolution}</div>
                              </td>
                              <td className="px-3.5 py-2.5 border-r border-slate-200">
                                <div className="truncate max-w-[220px]">{c.description}</div>
                                {evHref && (
                                  <a href={evHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                    <ExternalLink className="w-3 h-3" /> Foto Bukti
                                  </a>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 border-r border-slate-200 text-center">{renderBadge(c.status)}</td>
                              <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                <div className="inline-flex gap-1">
                                  {canMutateComplaint && c.status === 'OPEN' && (
                                    <button
                                      type="button"
                                      onClick={() => startEditComplaint(c)}
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canMutateComplaint && (
                                    <button type="button" onClick={() => setCVoidTarget(c)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isExp && (
                              <tr className="bg-slate-50/90 border-b border-slate-200">
                                <td colSpan={7} className="p-4">
                                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                                      <span>QC Corrective Action (Root Cause &amp; CAPA)</span>
                                    </div>
                                    {canQcCorrective ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs items-end">
                                        <label className="space-y-1">
                                          <span className="text-[11px] font-semibold">Root Cause</span>
                                          <input type="text" value={qcDraft.rootCause} onChange={(e) => setQcDraft({ ...qcDraft, rootCause: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-300" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-[11px] font-semibold">Corrective Action</span>
                                          <input type="text" value={qcDraft.correctiveAction} onChange={(e) => setQcDraft({ ...qcDraft, correctiveAction: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-300" />
                                        </label>
                                        <label className="space-y-1">
                                          <span className="text-[11px] font-semibold">Preventive Action</span>
                                          <input type="text" value={qcDraft.preventiveAction} onChange={(e) => setQcDraft({ ...qcDraft, preventiveAction: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-300" />
                                        </label>
                                        <div className="flex gap-1.5">
                                          <select value={qcDraft.status} onChange={(e) => setQcDraft({ ...qcDraft, status: e.target.value as 'APPROVED_RMA' | 'REJECTED' })} className="px-2 py-1.5 rounded border border-slate-300 bg-white text-xs">
                                            <option value="APPROVED_RMA">APPROVED_RMA</option>
                                            <option value="REJECTED">REJECTED</option>
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => qcCorrectiveMut.mutate({ id: c.id, p: qcDraft })}
                                            disabled={qcCorrectiveMut.isPending}
                                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                                          >
                                            Simpan QC
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-600">
                                        <strong>Root Cause:</strong> {c.rootCause || '-'} • <strong>Corrective:</strong> {c.correctiveAction || '-'} • <strong>Preventive:</strong> {c.preventiveAction || '-'}
                                      </div>
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
                <span>Halaman <strong>{cPage}</strong> dari <strong>{cTotalPages}</strong></span>
                <div className="flex gap-1.5">
                  <button type="button" disabled={cPage <= 1} onClick={() => setCPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer">Prev</button>
                  <button type="button" disabled={cPage >= cTotalPages} onClick={() => setCPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer">Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select value={rTypeFilter} onChange={(e) => { setRTypeFilter(e.target.value); setRPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="ALL">Semua Tipe Note</option>
                <option value="CREDIT_NOTE">CREDIT_NOTE (Potong AR)</option>
                <option value="DEBIT_NOTE">DEBIT_NOTE (Potong AP)</option>
              </select>
              <select value={rStatusFilter} onChange={(e) => { setRStatusFilter(e.target.value); setRPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="ALL">Semua Status</option>
                <option value="PENDING">PENDING</option>
                <option value="APPLIED">APPLIED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExcelViewToggle
                value={tableStyle}
                onChange={setTableStyle}
                onExport={() =>
                  exportExcelCsv(
                    'rma-credit-debit-note',
                    rmaExcelColumns.filter((c) => c.key !== 'actions'),
                    rmaList
                  )
                }
                exportDisabled={rmaList.length === 0}
              />
              {canMutateRma && (
                <button
                  type="button"
                  onClick={() => { setREditingRecord(null); setRDraft(emptyRma()); setRAdding(true); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> <span>+ Tambah RMA / CN / DN</span>
                </button>
              )}
            </div>
          </div>

          {tableStyle === 'excel' ? (
            <ExcelSpreadsheetTable
              title="RMA & Credit Note (AR) / Debit Note (AP) — Tabel Excel"
              subtitle="Seluruh kolom retur, nominal CN/DN, stok & status approval terpisah rapi"
              columns={rmaExcelColumns}
              rows={rmaList}
              rowKey={(r) => r.id}
              isLoading={isLoadingRma}
              emptyText="Belum ada data RMA / Credit Note / Debit Note."
              footerLabel="TOTAL"
              pagination={{
                page: rPage,
                totalPages: rTotalPages,
                totalItems: rTotalItems,
                unitLabel: 'RMA',
                onPrev: () => setRPage((p) => Math.max(1, p - 1)),
                onNext: () => setRPage((p) => p + 1),
              }}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 uppercase">
                      <th className="px-3.5 py-2.5 border-r border-slate-200">No. RMA &amp; Tipe</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200">Invoice &amp; Ref CHR</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200">Item &amp; Qty Retur</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Nominal &amp; Stok</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Approve QC</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Approve Finance</th>
                      <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {isLoadingRma ? (
                      <tr><td colSpan={8} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat RMA / Credit-Debit Note...</td></tr>
                    ) : rmaList.length === 0 ? (
                      <tr><td colSpan={8} className="py-10 text-center text-slate-400">Belum ada data RMA / Credit Note / Debit Note.</td></tr>
                    ) : (
                      rmaList.map((r) => {
                        const isVoid = r.status === 'CANCELLED' || r.status === 'VOID';
                        return (
                          <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors ${isVoid ? 'opacity-60' : ''}`}>
                            <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">
                              <div className="font-mono font-bold text-slate-800">{r.rmaNumber}</div>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${r.noteType === 'CREDIT_NOTE' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                {r.noteType}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 border-r border-slate-200">
                              <div className="font-mono font-semibold">{r.invoiceNumber || '-'}</div>
                              <div className="text-xs text-slate-500">CHR: {r.complaintNumber || '-'}</div>
                            </td>
                            <td className="px-3.5 py-2.5 border-r border-slate-200">
                              <div>{r.itemName || '-'}</div>
                              <div className="text-xs font-mono text-slate-500">Qty: {r.returnQty} × {formatIDR(r.unitPrice)}</div>
                            </td>
                            <td className="px-3.5 py-2.5 border-r border-slate-200 text-right whitespace-nowrap">
                              <div className="font-mono font-bold text-emerald-700">{formatIDR(r.amount)}</div>
                              <div className="text-xs text-slate-400">{r.returnToStock ? `Stok → ${r.rackNumber}` : 'Non-Stock'}</div>
                            </td>
                            <td className="px-3.5 py-2.5 border-r border-slate-200 text-center space-y-1">
                              <div>{renderBadge(r.qcStatus)}</div>
                              {canApproveRmaQc && r.qcStatus === 'PENDING' && !isVoid && (
                                <div className="inline-flex gap-1">
                                  <button type="button" onClick={() => approveRmaQcMut.mutate({ id: r.id, action: 'APPROVE' })} className="p-1 rounded bg-emerald-600 text-white cursor-pointer" title="Approve QC"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={() => approveRmaQcMut.mutate({ id: r.id, action: 'REJECT' })} className="p-1 rounded bg-rose-600 text-white cursor-pointer" title="Reject QC"><XCircle className="w-3.5 h-3.5" /></button>
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 border-r border-slate-200 text-center space-y-1">
                              <div>{renderBadge(r.financeStatus)}</div>
                              {canApproveRmaFinance && r.financeStatus === 'PENDING' && !isVoid && (
                                <div className="inline-flex gap-1">
                                  <button type="button" onClick={() => approveRmaFinMut.mutate({ id: r.id, action: 'APPROVE' })} className="p-1 rounded bg-emerald-600 text-white cursor-pointer" title="Approve Finance"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={() => approveRmaFinMut.mutate({ id: r.id, action: 'REJECT' })} className="p-1 rounded bg-rose-600 text-white cursor-pointer" title="Reject Finance"><XCircle className="w-3.5 h-3.5" /></button>
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 border-r border-slate-200 text-center">{renderBadge(r.status)}</td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => printFinanceHtmlReport(`/finance/rma/${r.id}/print`).catch((e) => toast.error(e?.message || 'Gagal mencetak Credit/Debit Note'))}
                                  title="Cetak Credit/Debit Note"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {canMutateRma && r.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    onClick={() => startEditRma(r)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                {canMutateRma && !isVoid && (
                                  <button type="button" onClick={() => setRVoidTarget(r)} title="Void / Reversal" className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
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
                <span>Halaman <strong>{rPage}</strong> dari <strong>{rTotalPages}</strong></span>
                <div className="flex gap-1.5">
                  <button type="button" disabled={rPage <= 1} onClick={() => setRPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer">Prev</button>
                  <button type="button" disabled={rPage >= rTotalPages} onClick={() => setRPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer">Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(cVoidTarget)}
        title="Batalkan E-Complaint / CHR?"
        message={`Anda yakin ingin membatalkan komplain ${cVoidTarget?.complaintNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteComplaintMut.isPending}
        onConfirm={() => cVoidTarget && deleteComplaintMut.mutate(cVoidTarget.id)}
        onCancel={() => setCVoidTarget(null)}
      />

      <ConfirmActionModal
        open={Boolean(rVoidTarget)}
        title="Batalkan / Void RMA & Reversal Saldo?"
        message={`Anda yakin ingin membatalkan ${rVoidTarget?.rmaNumber || ''}? Saldo AR/AP dan penyesuaian stok gudang akan otomatis dibalikkan (reversal).`}
        confirmLabel="Ya, Void & Reversal"
        variant="danger"
        loading={deleteRmaMut.isPending}
        onConfirm={() => rVoidTarget && deleteRmaMut.mutate(rVoidTarget.id)}
        onCancel={() => setRVoidTarget(null)}
      />
    </div>
  );
};
