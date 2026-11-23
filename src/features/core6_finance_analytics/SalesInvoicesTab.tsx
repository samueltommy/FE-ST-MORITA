import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Printer,
  Trash2,
  Save,
  X,
  Calculator,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listFinanceInvoicesApi,
  getFinanceFormulasApi,
  getFinancePaymentTermsApi,
  DEFAULT_PAYMENT_TERMS,
  calculateFinanceInvoiceApi,
  createFinanceInvoiceApi,
  updateFinanceInvoiceApi,
  deleteFinanceInvoiceApi,
  listFinancePaymentsApi,
  createInvoicePaymentApi,
  listMdmCustomersApi,
  listCustomerPosApi,
  printFinanceInvoice,
  extractFinanceErrorMessage,
  SalesInvoiceRecord,
  SalesInvoicePayload,
  FinanceCalculateResult,
  ArPaymentPayload,
} from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';

interface Props {
  canMutate: boolean;
}

type InvoiceType = SalesInvoicePayload['invoiceType'];

interface InvoiceDraft {
  customerId: string;
  customerPoId: string;
  invoiceDate: string;
  dueDate: string;
  invoiceType: InvoiceType;
  paymentTerm: string;
  billingStage: string;
  terminNumber: string;
  terminPercentage: string;
  taxFactureNumber: string;
  taxPeriod: string;
  formulaId: number;
  totalOrderAmount: number;
  freightCost: number;
  discountAmount: number;
  downPaymentDeduction: number;
  retentionDeduction: number;
  ppnRate: number;
  pphRate: number;
  notes: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const plus30Str = () => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

const emptyDraft = (): InvoiceDraft => ({
  customerId: '',
  customerPoId: '',
  invoiceDate: todayStr(),
  dueDate: '',
  invoiceType: 'FINAL_PAYMENT_100',
  paymentTerm: 'NET 30',
  billingStage: 'FINAL_PAYMENT',
  terminNumber: '',
  terminPercentage: '',
  taxFactureNumber: '',
  taxPeriod: todayStr().slice(0, 7),
  formulaId: 1,
  totalOrderAmount: 0,
  freightCost: 0,
  discountAmount: 0,
  downPaymentDeduction: 0,
  retentionDeduction: 0,
  ppnRate: 11,
  pphRate: 0,
  notes: '',
});

const INVOICE_TYPE_LABELS: Record<string, string> = {
  DOWN_PAYMENT: 'Down Payment (DP)',
  FINAL_PAYMENT_UNDER_100: 'Pelunasan < 100%',
  FINAL_PAYMENT_100: 'Pelunasan 100%',
  RETENTION: 'Retensi',
};

export const SalesInvoicesTab: React.FC<Props> = ({ canMutate }) => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InvoiceDraft>(emptyDraft);
  const [calcPreview, setCalcPreview] = useState<FinanceCalculateResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inlinePayInvoiceId, setInlinePayInvoiceId] = useState<string | null>(null);
  const [inlinePayDraft, setInlinePayDraft] = useState<ArPaymentPayload>({
    paymentDate: todayStr(),
    paymentAmount: 0,
    paymentMethod: 'BANK_TRANSFER',
    bankAccount: '',
    referenceNumber: '',
    notes: '',
  });

  const [voidTarget, setVoidTarget] = useState<SalesInvoiceRecord | null>(null);

  const { data: invoicesRes, isLoading } = useQuery({
    queryKey: ['financeInvoices', page, search, statusFilter, customerFilter, overdueOnly],
    queryFn: () =>
      listFinanceInvoicesApi({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        customerId: customerFilter,
        overdueOnly,
      }),
  });

  const invoices = invoicesRes?.data || [];
  const totalPages = invoicesRes?.meta?.totalPages || invoicesRes?.meta?.total_pages || 1;

  const { data: formulas = [] } = useQuery({
    queryKey: ['financeFormulas'],
    queryFn: getFinanceFormulasApi,
  });

  const { data: termsDict = DEFAULT_PAYMENT_TERMS } = useQuery({
    queryKey: ['financePaymentTerms'],
    queryFn: getFinancePaymentTermsApi,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['mdmCustomersDropdown'],
    queryFn: listMdmCustomersApi,
  });

  const { data: customerPosRes } = useQuery({
    queryKey: ['financeCustomerPosDropdown'],
    queryFn: () => listCustomerPosApi({ page: 1, limit: 100 }),
  });
  const customerPos = customerPosRes?.data || [];

  const { data: expandedPaymentsRes, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['financeInvoicePayments', expandedId],
    queryFn: () => listFinancePaymentsApi({ salesInvoiceId: expandedId || undefined, limit: 50 }),
    enabled: Boolean(expandedId),
  });
  const expandedPayments = expandedPaymentsRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['financeInvoices'] });
    queryClient.invalidateQueries({ queryKey: ['financePayments'] });
    queryClient.invalidateQueries({ queryKey: ['financeInvoicePayments'] });
    queryClient.invalidateQueries({ queryKey: ['financeArSummary'] });
  };

  // Real-time debounced 300ms calculation preview whenever editor is active
  const isEditorOpen = isAdding || editingId !== null;
  const runCalculation = async (d: InvoiceDraft) => {
    setIsCalculating(true);
    try {
      const res = await calculateFinanceInvoiceApi({
        customer_id: d.customerId || undefined,
        formula_id: Number(d.formulaId) || 1,
        total_order_amount: Number(d.totalOrderAmount) || 0,
        freight_cost: Number(d.freightCost) || 0,
        discount_amount: Number(d.discountAmount) || 0,
        down_payment_deduction: Number(d.downPaymentDeduction) || 0,
        retention_deduction: Number(d.retentionDeduction) || 0,
        ppn_rate: Number(d.ppnRate) || 0,
        pph_rate: Number(d.pphRate) || 0,
      });
      setCalcPreview(res);
    } catch {
      // ignore transient preview error
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (!isEditorOpen) return;
    const timer = setTimeout(() => {
      runCalculation(draft);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEditorOpen,
    draft.formulaId,
    draft.totalOrderAmount,
    draft.freightCost,
    draft.discountAmount,
    draft.downPaymentDeduction,
    draft.retentionDeduction,
    draft.ppnRate,
    draft.pphRate,
  ]);

  const createMutation = useMutation({
    mutationFn: (payload: SalesInvoicePayload) => createFinanceInvoiceApi(payload),
    onSuccess: () => {
      toast.success('Sales Invoice berhasil diterbitkan');
      setIsAdding(false);
      setDraft(emptyDraft());
      setCalcPreview(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyimpan Sales Invoice')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SalesInvoicePayload> }) =>
      updateFinanceInvoiceApi(id, payload),
    onSuccess: () => {
      toast.success('Sales Invoice berhasil diperbarui');
      setEditingId(null);
      setDraft(emptyDraft());
      setCalcPreview(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui Sales Invoice')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFinanceInvoiceApi(id),
    onSuccess: () => {
      toast.success('Sales Invoice berhasil di-void / dibatalkan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan Sales Invoice')),
  });

  const inlinePayMutation = useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: ArPaymentPayload }) =>
      createInvoicePaymentApi(invoiceId, payload),
    onSuccess: () => {
      toast.success('Pembayaran AR berhasil dicatat');
      setInlinePayInvoiceId(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal mencatat pembayaran')),
  });

  const startAdd = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setCalcPreview(null);
    setIsAdding(true);
  };

  const startEdit = (inv: SalesInvoiceRecord) => {
    setIsAdding(false);
    setEditingId(inv.id);
    setDraft({
      customerId: inv.customerId,
      customerPoId: inv.customerPoId || '',
      invoiceDate: inv.invoiceDate || todayStr(),
      dueDate: inv.dueDate || '',
      invoiceType: (inv.invoiceType as InvoiceType) || 'FINAL_PAYMENT_100',
      paymentTerm: inv.paymentTerm || 'NET 30',
      billingStage: inv.billingStage || 'FINAL_PAYMENT',
      terminNumber: inv.terminNumber != null ? String(inv.terminNumber) : '',
      terminPercentage: inv.terminPercentage != null ? String(inv.terminPercentage) : '',
      taxFactureNumber: inv.taxFactureNumber || '',
      taxPeriod: inv.taxPeriod || '',
      formulaId: inv.formulaId || 1,
      totalOrderAmount: inv.totalOrderAmount || 0,
      freightCost: inv.freightCost || 0,
      discountAmount: inv.discountAmount || 0,
      downPaymentDeduction: inv.downPaymentDeduction || 0,
      retentionDeduction: inv.retentionDeduction || 0,
      ppnRate: inv.ppnRate ?? 11,
      pphRate: inv.pphRate ?? 0,
      notes: inv.notes || '',
    });
  };

  const cancelEditor = () => {
    setIsAdding(false);
    setEditingId(null);
    setDraft(emptyDraft());
    setCalcPreview(null);
  };

  const handleSave = () => {
    if (!draft.customerId) {
      toast.error('Silakan pilih Customer terlebih dahulu');
      return;
    }
    const payload: SalesInvoicePayload = {
      customerId: draft.customerId,
      customerPoId: draft.customerPoId || null,
      invoiceDate: draft.invoiceDate,
      dueDate: draft.dueDate || null,
      invoiceType: draft.invoiceType,
      paymentTerm: draft.paymentTerm,
      billingStage: draft.billingStage || null,
      terminNumber: draft.terminNumber ? Number(draft.terminNumber) : null,
      terminPercentage: draft.terminPercentage ? Number(draft.terminPercentage) : null,
      taxFactureNumber: draft.taxFactureNumber || null,
      taxPeriod: draft.taxPeriod || null,
      formulaId: Number(draft.formulaId),
      totalOrderAmount: Number(draft.totalOrderAmount),
      freightCost: Number(draft.freightCost),
      discountAmount: Number(draft.discountAmount),
      downPaymentDeduction: Number(draft.downPaymentDeduction),
      retentionDeduction: Number(draft.retentionDeduction),
      ppnRate: Number(draft.ppnRate),
      pphRate: Number(draft.pphRate),
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
    if (s === 'PAID') {
      return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">PAID</span>;
    }
    if (s === 'PARTIALLY_PAID') {
      return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">PARTIAL</span>;
    }
    if (s === 'CANCELLED' || s === 'VOID') {
      return <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">VOID</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold">UNPAID</span>;
  };

  const renderInlineEditorSubPanel = (colSpan: number) => (
    <tr className="bg-blue-50/70 border-b border-blue-200">
      <td colSpan={colSpan} className="p-3">
        <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
              <Calculator className="w-4 h-4" />
              <span>Komponen Kalkulasi 13 Rumus & Pajak (Auto-Preview Real-Time)</span>
            </div>
            <button
              type="button"
              onClick={() => runCalculation(draft)}
              disabled={isCalculating}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
            >
              {isCalculating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calculator className="w-3 h-3" />}
              <span>Hitung Ulang</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">Total Order (TOT)</span>
              <input
                type="number"
                value={draft.totalOrderAmount}
                onChange={(e) => setDraft({ ...draft, totalOrderAmount: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">Freight</span>
              <input
                type="number"
                value={draft.freightCost}
                onChange={(e) => setDraft({ ...draft, freightCost: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">Diskon</span>
              <input
                type="number"
                value={draft.discountAmount}
                onChange={(e) => setDraft({ ...draft, discountAmount: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">Potongan UM / DP</span>
              <input
                type="number"
                value={draft.downPaymentDeduction}
                onChange={(e) => setDraft({ ...draft, downPaymentDeduction: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">Retensi</span>
              <input
                type="number"
                value={draft.retentionDeduction}
                onChange={(e) => setDraft({ ...draft, retentionDeduction: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">PPN (%)</span>
              <input
                type="number"
                step="0.5"
                value={draft.ppnRate}
                onChange={(e) => setDraft({ ...draft, ppnRate: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">PPh (%)</span>
              <input
                type="number"
                step="0.5"
                value={draft.pphRate}
                onChange={(e) => setDraft({ ...draft, pphRate: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center pt-2 border-t border-slate-100">
            <div className="md:col-span-1 flex flex-wrap gap-1.5">
              <select
                value={draft.billingStage}
                onChange={(e) => setDraft({ ...draft, billingStage: e.target.value })}
                className="flex-1 min-w-[120px] px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                {termsDict.billingStages.map((bs) => (
                  <option key={bs.code} value={bs.code}>
                    {bs.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Termin #"
                value={draft.terminNumber}
                onChange={(e) => setDraft({ ...draft, terminNumber: e.target.value })}
                className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
              <input
                type="number"
                placeholder="Termin %"
                value={draft.terminPercentage}
                onChange={(e) => setDraft({ ...draft, terminPercentage: e.target.value })}
                className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
              />
              <input
                type="text"
                placeholder="Catatan invoice (opsional)..."
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-4 text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
              <div>
                <span className="text-slate-500">DPP:</span>{' '}
                <strong className="font-mono text-slate-800">{formatIDR(calcPreview?.dpp ?? 0)}</strong>
              </div>
              <div>
                <span className="text-slate-500">PPN:</span>{' '}
                <strong className="font-mono text-blue-700">{formatIDR(calcPreview?.ppnAmount ?? 0)}</strong>
              </div>
              <div>
                <span className="text-slate-500">PPh:</span>{' '}
                <strong className="font-mono text-rose-700">{formatIDR(calcPreview?.pphAmount ?? 0)}</strong>
              </div>
              <div className="text-sm">
                <span className="text-slate-600 font-semibold">Grand Total:</span>{' '}
                <strong className="font-mono text-emerald-700">{formatIDR(calcPreview?.grandTotal ?? 0)}</strong>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );

  const renderInlineEditorRow = (isNew: boolean, rowId?: string, invNumber?: string) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-2.5 py-2.5 text-xs font-mono font-bold text-blue-800">
          {isNew ? 'AUTO-INV' : invNumber}
        </td>
        <td className="px-2.5 py-2.5 space-y-1">
          <input
            type="date"
            value={draft.invoiceDate}
            onChange={(e) => setDraft({ ...draft, invoiceDate: e.target.value })}
            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
          />
          <input
            type="date"
            value={draft.dueDate}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
          />
        </td>
        <td className="px-2.5 py-2.5 space-y-1 min-w-[180px]">
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
            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
          >
            <option value="">-- Pilih Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={draft.customerPoId}
            onChange={(e) => setDraft({ ...draft, customerPoId: e.target.value })}
            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
          >
            <option value="">-- Tanpa Link PO --</option>
            {customerPos
              .filter((po) => !draft.customerId || po.customerId === draft.customerId)
              .map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber}
                </option>
              ))}
          </select>
        </td>
        <td className="px-2.5 py-2.5 space-y-1 min-w-[180px]">
          <select
            value={draft.invoiceType}
            onChange={(e) => setDraft({ ...draft, invoiceType: e.target.value as InvoiceType })}
            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
          >
            <option value="FINAL_PAYMENT_100">Pelunasan 100%</option>
            <option value="DOWN_PAYMENT">Down Payment</option>
            <option value="FINAL_PAYMENT_UNDER_100">Pelunasan &lt; 100%</option>
            <option value="RETENTION">Retensi</option>
          </select>
          <select
            value={draft.formulaId}
            onChange={(e) => setDraft({ ...draft, formulaId: Number(e.target.value) })}
            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
          >
            {formulas.map((f) => (
              <option key={f.id} value={f.id}>
                #{f.id} {f.name?.replace(/^Rumus #\d+\s*[—-]\s*/i, '') || ''}
              </option>
            ))}
          </select>
        </td>
        <td className="px-2.5 py-2.5 space-y-1">
          <input
            type="text"
            placeholder="No. Faktur Pajak"
            value={draft.taxFactureNumber}
            onChange={(e) => setDraft({ ...draft, taxFactureNumber: e.target.value })}
            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
          />
          <div className="flex gap-1">
            <select
              value={draft.paymentTerm}
              onChange={(e) => setDraft({ ...draft, paymentTerm: e.target.value })}
              className="w-1/2 px-1.5 py-1 rounded-md border border-slate-300 text-[11px] bg-white"
            >
              {termsDict.paymentTerms.map((pt) => (
                <option key={pt.code} value={pt.code}>
                  {pt.code}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={draft.taxPeriod}
              onChange={(e) => setDraft({ ...draft, taxPeriod: e.target.value })}
              className="w-1/2 px-1 py-1 rounded-md border border-slate-300 text-[11px] bg-white"
            />
          </div>
        </td>
        <td className="px-2.5 py-2.5 text-right font-mono text-xs font-bold text-emerald-700">
          {formatIDR(calcPreview?.grandTotal ?? 0)}
        </td>
        <td className="px-2.5 py-2.5 text-right font-mono text-xs text-slate-400">-</td>
        <td className="px-2.5 py-2.5 text-right font-mono text-xs text-slate-400">-</td>
        <td className="px-2.5 py-2.5 text-center">
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
            {rowId ? 'EDIT' : 'BARU'}
          </span>
        </td>
        <td className="px-2.5 py-2.5">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
            <button
              type="button"
              onClick={cancelEditor}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>
          </div>
        </td>
      </tr>
      {renderInlineEditorSubPanel(10)}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar: Search, Filters & Inline Add Trigger */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Invoice / Faktur Pajak..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <select
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white max-w-[180px]"
          >
            <option value="ALL">Semua Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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

        {canMutate && (
          <button
            type="button"
            onClick={startAdd}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Invoice</span>
          </button>
        )}
      </div>

      {/* Main Inline Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. Invoice</th>
                <th className="px-3 py-2.5">Tgl / Jatuh Tempo</th>
                <th className="px-3 py-2.5">Customer &amp; No. PO</th>
                <th className="px-3 py-2.5">Tipe &amp; Rumus (#1–13)</th>
                <th className="px-3 py-2.5">Faktur Pajak</th>
                <th className="px-3 py-2.5 text-right">Grand Total</th>
                <th className="px-3 py-2.5 text-right">Terbayar</th>
                <th className="px-3 py-2.5 text-right">Sisa (Outstanding)</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isAdding && renderInlineEditorRow(true)}

              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat daftar Sales Invoice...
                  </td>
                </tr>
              ) : invoices.length === 0 && !isAdding ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Belum ada data Sales Invoice.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isEditingThis = editingId === inv.id;
                  if (isEditingThis) {
                    return <React.Fragment key={inv.id}>{renderInlineEditorRow(false, inv.id, inv.invoiceNumber)}</React.Fragment>;
                  }

                  const isExpanded = expandedId === inv.id;
                  const isPaid = inv.status === 'PAID';
                  const isVoid = inv.status === 'CANCELLED' || inv.status === 'VOID';
                  const hasPayment = inv.paidAmount > 0;

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isVoid ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                            className="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer"
                            title="Lihat rincian rumus & riwayat pelunasan"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{inv.invoiceNumber}</span>
                          </button>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="font-medium text-slate-800">{inv.invoiceDate}</div>
                          <div className="text-[11px] text-slate-400">JT: {inv.dueDate || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{inv.customerName}</div>
                          <div className="text-[11px] text-slate-400">
                            PO: {inv.customerPoNumber || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-slate-700 font-medium">
                            {INVOICE_TYPE_LABELS[inv.invoiceType] || inv.invoiceType}
                          </div>
                          <div className="text-[11px] text-blue-600 font-semibold">
                            Rumus #{inv.formulaId}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="font-mono text-slate-700">{inv.taxFactureNumber || '-'}</div>
                          <div className="text-[11px] text-slate-400">{inv.taxPeriod || inv.paymentTerm || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatIDR(inv.grandTotal)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-700 whitespace-nowrap">
                          {formatIDR(inv.paidAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                          {formatIDR(inv.outstandingAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-center">{getStatusBadge(inv.status)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {canMutate && !isPaid && !isVoid && (
                              <button
                                type="button"
                                onClick={() => startEdit(inv)}
                                title="Edit Inline"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                printFinanceInvoice(inv.id).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak invoice')
                                )
                              }
                              title="Cetak Invoice"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canMutate && !hasPayment && !isVoid && (
                              <button
                                type="button"
                                onClick={() => setVoidTarget(inv)}
                                title="Void / Batal"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Sub-Row: Formula Breakdown + AR Payment History + Inline Quick Payment */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={10} className="p-4 space-y-3">
                            {/* Formula breakdown strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-white rounded-xl border border-slate-200 p-3 text-[11px]">
                              <div>
                                <div className="text-slate-400">TOT Barang</div>
                                <div className="font-mono font-bold">{formatIDR(inv.totalOrderAmount)}</div>
                              </div>
                              <div>
                                <div className="text-slate-400">Freight</div>
                                <div className="font-mono font-bold">{formatIDR(inv.freightCost)}</div>
                              </div>
                              <div>
                                <div className="text-slate-400">Diskon</div>
                                <div className="font-mono font-bold">{formatIDR(inv.discountAmount)}</div>
                              </div>
                              <div>
                                <div className="text-slate-400">Pot. UM / Retensi</div>
                                <div className="font-mono font-bold">
                                  {formatIDR(inv.downPaymentDeduction + inv.retentionDeduction)}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-400">DPP</div>
                                <div className="font-mono font-bold text-slate-800">{formatIDR(inv.dpp)}</div>
                              </div>
                              <div>
                                <div className="text-slate-400">PPN ({inv.ppnRate}%)</div>
                                <div className="font-mono font-bold text-blue-700">{formatIDR(inv.ppnAmount)}</div>
                              </div>
                              <div>
                                <div className="text-slate-400">PPh ({inv.pphRate}%)</div>
                                <div className="font-mono font-bold text-rose-700">{formatIDR(inv.pphAmount)}</div>
                              </div>
                              <div>
                                <div className="text-slate-400">Grand Total</div>
                                <div className="font-mono font-extrabold text-emerald-700">{formatIDR(inv.grandTotal)}</div>
                              </div>
                            </div>

                            {/* AR Payments sub-table */}
                            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">
                                  Riwayat Pelunasan AR ({expandedPayments.length})
                                </span>
                                {canMutate && !isPaid && !isVoid && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInlinePayInvoiceId(inv.id);
                                      setInlinePayDraft({
                                        paymentDate: todayStr(),
                                        paymentAmount: inv.outstandingAmount,
                                        paymentMethod: 'BANK_TRANSFER',
                                        bankAccount: '',
                                        referenceNumber: '',
                                        notes: '',
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Catat Pembayaran</span>
                                  </button>
                                )}
                              </div>

                              {inlinePayInvoiceId === inv.id && (
                                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end text-xs">
                                  <label className="space-y-0.5">
                                    <span className="text-[10px] font-semibold text-slate-600">Tgl Bayar</span>
                                    <input
                                      type="date"
                                      value={inlinePayDraft.paymentDate}
                                      onChange={(e) => setInlinePayDraft({ ...inlinePayDraft, paymentDate: e.target.value })}
                                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                                    />
                                  </label>
                                  <label className="space-y-0.5">
                                    <span className="text-[10px] font-semibold text-slate-600">Nominal</span>
                                    <input
                                      type="number"
                                      value={inlinePayDraft.paymentAmount}
                                      onChange={(e) =>
                                        setInlinePayDraft({ ...inlinePayDraft, paymentAmount: Number(e.target.value) })
                                      }
                                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono"
                                    />
                                  </label>
                                  <label className="space-y-0.5">
                                    <span className="text-[10px] font-semibold text-slate-600">Metode</span>
                                    <select
                                      value={inlinePayDraft.paymentMethod}
                                      onChange={(e) =>
                                        setInlinePayDraft({
                                          ...inlinePayDraft,
                                          paymentMethod: e.target.value as ArPaymentPayload['paymentMethod'],
                                        })
                                      }
                                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                                    >
                                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                      <option value="CASH">CASH</option>
                                      <option value="GIRO">GIRO</option>
                                      <option value="CHEQUE">CHEQUE</option>
                                      <option value="VIRTUAL_ACCOUNT">VIRTUAL ACCOUNT</option>
                                    </select>
                                  </label>
                                  <label className="space-y-0.5">
                                    <span className="text-[10px] font-semibold text-slate-600">Rekening</span>
                                    <input
                                      type="text"
                                      placeholder="BCA / Mandiri..."
                                      value={inlinePayDraft.bankAccount || ''}
                                      onChange={(e) => setInlinePayDraft({ ...inlinePayDraft, bankAccount: e.target.value })}
                                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                                    />
                                  </label>
                                  <label className="space-y-0.5">
                                    <span className="text-[10px] font-semibold text-slate-600">No. Referensi</span>
                                    <input
                                      type="text"
                                      placeholder="TRF-001"
                                      value={inlinePayDraft.referenceNumber || ''}
                                      onChange={(e) => setInlinePayDraft({ ...inlinePayDraft, referenceNumber: e.target.value })}
                                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                                    />
                                  </label>
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        inlinePayMutation.mutate({ invoiceId: inv.id, payload: inlinePayDraft })
                                      }
                                      disabled={inlinePayMutation.isPending}
                                      className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      Simpan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setInlinePayInvoiceId(null)}
                                      className="px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-[11px] font-bold cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isLoadingPayments ? (
                                <div className="text-xs text-slate-400 py-2">Memuat riwayat pembayaran...</div>
                              ) : expandedPayments.length === 0 ? (
                                <div className="text-xs text-slate-400 py-2">Belum ada mutasi pelunasan untuk invoice ini.</div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-100">
                                      <th className="py-1.5 text-left">No. Pembayaran</th>
                                      <th className="py-1.5 text-left">Tanggal</th>
                                      <th className="py-1.5 text-left">Metode &amp; Rekening</th>
                                      <th className="py-1.5 text-left">Referensi</th>
                                      <th className="py-1.5 text-right">Nominal</th>
                                      <th className="py-1.5 text-center">Rekonsiliasi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {expandedPayments.map((p) => (
                                      <tr key={p.id}>
                                        <td className="py-1.5 font-mono font-semibold">{p.paymentNumber}</td>
                                        <td className="py-1.5">{p.paymentDate}</td>
                                        <td className="py-1.5">
                                          {p.paymentMethod} {p.bankAccount ? `(${p.bankAccount})` : ''}
                                        </td>
                                        <td className="py-1.5 font-mono">{p.referenceNumber || '-'}</td>
                                        <td className="py-1.5 text-right font-mono font-bold text-emerald-700">
                                          {formatIDR(p.paymentAmount)}
                                        </td>
                                        <td className="py-1.5 text-center">
                                          {p.reconciliationStatus === 'RECONCILED' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                              <CheckCircle2 className="w-3 h-3" /> RECONCILED
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                                              UNRECONCILED
                                            </span>
                                          )}
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
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Soft Delete / Void Confirmation */}
      <ConfirmActionModal
        open={Boolean(voidTarget)}
        title="Batalkan / Void Sales Invoice?"
        message={`Anda yakin ingin membatalkan Sales Invoice ${voidTarget?.invoiceNumber || ''}? Data akan ditandai Void (Soft Delete).`}
        confirmLabel="Ya, Void Invoice"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
