import { apiClient } from '../lib/apiClient';
import type {
  InvoiceCalculateOut,
  InvoiceOut,
  ARPaymentOut,
  ComplaintOut,
  RMAResolveOut,
} from '../lib/schemas';
import type { DeliveryOrder } from '../types';

// ─── Shared Helpers ───────────────────────────────────────────

export function extractFinanceErrorMessage(err: any, fallback: string = 'Terjadi kesalahan'): string {
  const data = err?.response?.data;
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        return `${data.message}: ${data.errors.map((e: any) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e))).join(', ')}`;
      }
      return data.message;
    }
    if (typeof data.detail === 'string' && data.detail.trim()) return data.detail;
    if (data.detail && typeof data.detail.message === 'string') return data.detail.message;
  }
  return err?.message || fallback;
}

export function resolveFinanceFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl || !fileUrl.trim()) return null;
  const trimmed = fileUrl.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const baseApi = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const backendOrigin = baseApi.replace(/\/api\/v1\/?$/, '');
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendOrigin}${normalizedPath}`;
}

export type FinanceDocType =
  | 'customer_po'
  | 'payment_proof'
  | 'faktur_pajak'
  | 'supplier_invoice'
  | 'ap_payment_proof'
  | 'entertainment_receipt'
  | 'complaint_evidence';

export async function uploadFinanceDocument(
  docType: FinanceDocType,
  file: File
): Promise<string> {
  const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const token = localStorage.getItem('samhance_access_token') || '';
  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('file', file);

  const res = await fetch(`${baseUrl}/finance/upload-document`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.detail || 'Gagal mengunggah dokumen finance');
  }
  return json?.data?.file_url || json?.data?.fileUrl || json?.file_url || json?.fileUrl || '';
}

export async function printFinanceHtmlReport(path: string): Promise<void> {
  const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const token = localStorage.getItem('samhance_access_token') || '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${baseUrl}${normalized}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Gagal memuat dokumen cetak (${res.status})`);
  }
  const html = await res.text();
  const win = window.open('', '_blank', 'width=960,height=740');
  if (!win) {
    throw new Error('Popup diblokir browser. Izinkan popup untuk mencetak dokumen.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      // ignore if window was closed
    }
  }, 350);
}

export async function printFinanceInvoice(invoiceId: string): Promise<void> {
  return printFinanceHtmlReport(`/finance/invoices/${invoiceId}/print`);
}

// ─── Types ────────────────────────────────────────────────────

export interface FinanceFormula {
  id: number;
  name?: string;
  code?: string;
  formula?: string;
  description?: string;
}

export interface FinanceCalculatePayload {
  customer_id?: string;
  delivery_order_ids?: string[];
  formula_id: number;
  total_order_amount: number;
  freight_cost: number;
  discount_amount: number;
  down_payment_deduction: number;
  retention_deduction: number;
  ppn_rate: number;
  pph_rate: number;
}

export interface FinanceCalculateResult {
  formulaId?: number;
  totalOrderAmount: number;
  freightCost: number;
  discountAmount: number;
  downPaymentDeduction: number;
  retentionDeduction: number;
  dpp: number;
  ppnAmount: number;
  pphAmount: number;
  grandTotal: number;
}

export interface SalesInvoicePayload {
  customerId: string;
  customerPoId?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  invoiceType: 'DOWN_PAYMENT' | 'FINAL_PAYMENT_UNDER_100' | 'FINAL_PAYMENT_100' | 'RETENTION';
  paymentTerm?: string;
  billingStage?: string | null;
  terminNumber?: number | null;
  terminPercentage?: number | null;
  taxFactureNumber?: string | null;
  taxPeriod?: string | null;
  formulaId: number;
  totalOrderAmount: number;
  freightCost: number;
  discountAmount: number;
  downPaymentDeduction: number;
  retentionDeduction: number;
  ppnRate: number;
  pphRate: number;
  notes?: string | null;
}

export interface SalesInvoiceRecord {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerPoId?: string | null;
  customerPoNumber?: string | null;
  invoiceDate: string;
  dueDate: string;
  invoiceType: string;
  paymentTerm?: string;
  billingStage?: string | null;
  terminNumber?: number | null;
  terminPercentage?: number | null;
  isOverdue?: boolean;
  taxFactureNumber?: string | null;
  taxPeriod?: string | null;
  formulaId: number;
  formulaName?: string;
  totalOrderAmount: number;
  freightCost: number;
  discountAmount: number;
  downPaymentDeduction: number;
  retentionDeduction: number;
  ppnRate: number;
  pphRate: number;
  dpp: number;
  ppnAmount: number;
  pphAmount: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  notes?: string | null;
  payments?: ArPaymentRecord[];
}

export interface AgingBuckets {
  agingCurrent: number;
  aging130: number;
  aging3160: number;
  aging6190: number;
  agingOver90: number;
}

export interface ArSummary extends AgingBuckets {
  totalBilled: number;
  totalInvoices: number;
  totalPaid: number;
  totalOutstanding: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  unreconciledPaymentsCount: number;
}

export interface ArPaymentPayload {
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'GIRO' | 'CHEQUE' | 'VIRTUAL_ACCOUNT';
  bankAccount?: string;
  referenceNumber?: string;
  proofFileUrl?: string | null;
  notes?: string | null;
}

export interface ArPaymentRecord {
  id: string;
  paymentNumber: string;
  salesInvoiceId: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: string;
  bankAccount?: string;
  referenceNumber?: string;
  proofFileUrl?: string | null;
  reconciliationStatus: 'UNRECONCILED' | 'RECONCILED' | string;
  notes?: string | null;
}

export interface CustomerPoItemPayload {
  itemId: string;
  itemCode?: string;
  itemName?: string;
  qty: number;
  unitPrice: number;
  subtotal?: number;
}

export interface CustomerPoPayload {
  poNumber: string;
  customerId: string;
  date: string;
  paymentTerm?: string;
  emailSender?: string;
  emailSubject?: string;
  discount: number;
  freight: number;
  taxRate: number;
  totalAmount: number;
  fileUrl?: string | null;
  notes?: string | null;
  items: CustomerPoItemPayload[];
}

export interface CustomerPoRecord {
  id: string;
  poNumber: string;
  customerId: string;
  customerName?: string;
  date: string;
  paymentTerm?: string;
  emailSender?: string;
  emailSubject?: string;
  discount: number;
  freight: number;
  taxRate: number;
  totalAmount: number;
  fileUrl?: string | null;
  status: string;
  notes?: string | null;
  items?: CustomerPoItemPayload[];
}

export interface MdmCustomerOption {
  id: string;
  code?: string;
  name: string;
  paymentTerm?: string;
}

export interface MdmItemOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  sellingPrice: number;
}

// ─── 13 Formulas & Calculation ────────────────────────────────

export const DEFAULT_FINANCE_FORMULAS: FinanceFormula[] = [
  { id: 1, name: 'Rumus #1 — Standar DPP = TOT + Freight - Disc', formula: 'TOT + FREIGHT - DISC + PPN(rate × (TOT + FREIGHT - DISC)) - UM - RET' },
  { id: 2, name: 'Rumus #2 — PPN atas TOT + Freight sebelum Disc', formula: 'TOT + FREIGHT + PPN(rate × (TOT + FREIGHT)) - DISC - UM - RET' },
  { id: 3, name: 'Rumus #3 — (TOT - Disc) + Freight + PPN', formula: '(TOT - DISC) + FREIGHT + PPN(rate × (TOT - DISC + FREIGHT)) - UM - RET' },
  { id: 4, name: 'Rumus #4 — PPN atas TOT saja (tanpa freight)', formula: 'TOT + PPN(rate × TOT) - DISC - UM - RET' },
  { id: 5, name: 'Rumus #5 — TOT × (1 + PPN) - Disc - UM - RET', formula: '(TOT × (1 + PPN_RATE)) - DISC - UM - RET' },
  { id: 6, name: 'Rumus #6 — NON-PKP (Tanpa PPN)', formula: 'TOT + FREIGHT - DISC - UM - RET' },
  { id: 7, name: 'Rumus #7 — TOT × (1 + PPN) + Freight', formula: 'TOT × (1 + PPN_RATE) + FREIGHT - DISC - UM - RET' },
  { id: 8, name: 'Rumus #8 — (TOT + Freight) × (1 + PPN)', formula: '(TOT + FREIGHT) × (1 + PPN_RATE) - DISC - UM - RET' },
  { id: 9, name: 'Rumus #9 — PPN setelah Potong Uang Muka', formula: '(TOT - DISC - UM) + FREIGHT + PPN(rate × (TOT - DISC - UM + FREIGHT)) - RET' },
  { id: 10, name: 'Rumus #10 — Dengan PPN & PPh atas TOT', formula: 'TOT - DISC - UM - RET + PPN(rate × TOT) - PPH(rate × TOT)' },
  { id: 11, name: 'Rumus #11 — PPh atas (TOT + Freight - Disc)', formula: 'TOT + FREIGHT - DISC - UM - RET - PPH(rate × (TOT + FREIGHT - DISC))' },
  { id: 12, name: 'Rumus #12 — (TOT - Disc) × (1 - PPh) + Freight', formula: '(TOT - DISC) × (1 - PPH_RATE) + FREIGHT - UM - RET' },
  { id: 13, name: 'Rumus #13 — Gabungan PPN & PPh Multiplikatif', formula: '(TOT + FREIGHT - DISC) × (1 + PPN_RATE) × (1 - PPH_RATE) - UM - RET' },
];

export async function getFinanceFormulasApi(): Promise<FinanceFormula[]> {
  try {
    const res = await apiClient.get('/finance/formulas');
    const raw = res.data?.data || res.data || [];
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((f: any, i: number) => ({
        id: Number(f.id ?? f.formulaId ?? i + 1),
        name: f.name || f.label || f.title || `Rumus #${f.id ?? i + 1}`,
        code: f.code,
        formula: f.formula || f.expression || f.description || '',
        description: f.description || '',
      }));
    }
    return DEFAULT_FINANCE_FORMULAS;
  } catch {
    return DEFAULT_FINANCE_FORMULAS;
  }
}

export async function calculateFinanceInvoiceApi(payload: FinanceCalculatePayload): Promise<FinanceCalculateResult> {
  const res = await apiClient.post('/finance/invoices/calculate', payload, {
    headers: { 'X-Skip-Snake-Case': 'true' },
  });
  const d = (res.data?.data || res.data || {}) as any;
  return {
    formulaId: Number(d.formulaId ?? payload.formula_id),
    totalOrderAmount: Number(d.totalOrderAmount ?? payload.total_order_amount ?? 0),
    freightCost: Number(d.freightCost ?? payload.freight_cost ?? 0),
    discountAmount: Number(d.discountAmount ?? payload.discount_amount ?? 0),
    downPaymentDeduction: Number(d.downPaymentDeduction ?? payload.down_payment_deduction ?? 0),
    retentionDeduction: Number(d.retentionDeduction ?? payload.retention_deduction ?? 0),
    dpp: Number(d.dpp ?? d.taxableBaseDpp ?? d.taxableBase ?? 0),
    ppnAmount: Number(d.ppnAmount ?? d.ppn ?? 0),
    pphAmount: Number(d.pphAmount ?? d.pph ?? 0),
    grandTotal: Number(d.grandTotal ?? d.finalPayableAmount ?? d.totalAmount ?? 0),
  };
}

// ─── 6.1.1 Sales Invoice CRUD ─────────────────────────────────

function normalizeInvoice(inv: any): SalesInvoiceRecord {
  const grandTotal = Number(inv.grandTotal ?? inv.finalPayableAmount ?? inv.totalAmount ?? 0);
  const paidAmount = Number(inv.paidAmount ?? inv.totalPaid ?? 0);
  const outstandingAmount = Number(inv.outstandingAmount ?? Math.max(0, grandTotal - paidAmount));
  return {
    id: String(inv.id),
    invoiceNumber: String(inv.invoiceNumber || inv.noInvoice || '-'),
    customerId: String(inv.customerId || ''),
    customerName: String(inv.customerName || inv.customer?.name || inv.customer?.customerName || '-'),
    customerPoId: inv.customerPoId ? String(inv.customerPoId) : null,
    customerPoNumber: inv.customerPoNumber || inv.customerPo?.poNumber || null,
    invoiceDate: String(inv.invoiceDate || '').split('T')[0],
    dueDate: String(inv.dueDate || '').split('T')[0],
    invoiceType: String(inv.invoiceType || 'FINAL_PAYMENT_100'),
    paymentTerm: inv.paymentTerm || 'NET 30',
    billingStage: inv.billingStage || null,
    terminNumber: inv.terminNumber ?? null,
    terminPercentage: inv.terminPercentage ?? null,
    isOverdue: Boolean(inv.isOverdue),
    taxFactureNumber: inv.taxFactureNumber || null,
    taxPeriod: inv.taxPeriod || null,
    formulaId: Number(inv.formulaId || 1),
    formulaName: inv.formulaName || undefined,
    totalOrderAmount: Number(inv.totalOrderAmount ?? inv.subtotal ?? 0),
    freightCost: Number(inv.freightCost ?? 0),
    discountAmount: Number(inv.discountAmount ?? 0),
    downPaymentDeduction: Number(inv.downPaymentDeduction ?? 0),
    retentionDeduction: Number(inv.retentionDeduction ?? 0),
    ppnRate: Number(inv.ppnRate ?? 11),
    pphRate: Number(inv.pphRate ?? 0),
    dpp: Number(inv.dpp ?? inv.taxableBaseDpp ?? 0),
    ppnAmount: Number(inv.ppnAmount ?? 0),
    pphAmount: Number(inv.pphAmount ?? 0),
    grandTotal,
    paidAmount,
    outstandingAmount,
    status: String(inv.status || 'UNPAID').toUpperCase(),
    notes: inv.notes || null,
    payments: Array.isArray(inv.payments) ? inv.payments.map(normalizePayment) : undefined,
  };
}

export async function listFinanceInvoicesApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  overdueOnly?: boolean;
}) {
  const query: Record<string, unknown> = {
    page: params.page || 1,
    limit: params.limit || 20,
  };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;
  if (params.overdueOnly) query.overdueOnly = true;

  const res = await apiClient.get('/finance/invoices', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1, total: Array.isArray(raw) ? raw.length : 0 };
  return {
    data: Array.isArray(raw) ? raw.map(normalizeInvoice) : [],
    meta,
  };
}

export async function getFinanceInvoiceByIdApi(invoiceId: string): Promise<SalesInvoiceRecord> {
  const res = await apiClient.get(`/finance/invoices/${invoiceId}`);
  return normalizeInvoice(res.data?.data || res.data);
}

export async function createFinanceInvoiceApi(payload: SalesInvoicePayload): Promise<SalesInvoiceRecord> {
  const res = await apiClient.post('/finance/invoices', payload);
  return normalizeInvoice(res.data?.data || res.data);
}

export async function updateFinanceInvoiceApi(invoiceId: string, payload: Partial<SalesInvoicePayload>): Promise<SalesInvoiceRecord> {
  const res = await apiClient.put(`/finance/invoices/${invoiceId}`, payload);
  return normalizeInvoice(res.data?.data || res.data);
}

export async function deleteFinanceInvoiceApi(invoiceId: string): Promise<void> {
  await apiClient.delete(`/finance/invoices/${invoiceId}`);
}

// ─── 6.1.2 Account Receivables & Payments ─────────────────────

export async function getArSummaryApi(): Promise<ArSummary> {
  const res = await apiClient.get('/finance/account-receivables/summary');
  const d = (res.data?.data || res.data || {}) as any;
  return {
    totalBilled: Number(d.totalBilled ?? 0),
    totalInvoices: Number(d.totalInvoices ?? 0),
    totalPaid: Number(d.totalPaid ?? 0),
    totalOutstanding: Number(d.totalOutstanding ?? 0),
    unpaidCount: Number(d.unpaidCount ?? 0),
    partiallyPaidCount: Number(d.partiallyPaidCount ?? 0),
    unreconciledPaymentsCount: Number(d.unreconciledPaymentsCount ?? 0),
    agingCurrent: Number(d.agingCurrent ?? 0),
    aging130: Number(d.aging130 ?? d.aging1_30 ?? d.aging_1_30 ?? 0),
    aging3160: Number(d.aging3160 ?? d.aging31_60 ?? d.aging_31_60 ?? 0),
    aging6190: Number(d.aging6190 ?? d.aging61_90 ?? d.aging_61_90 ?? 0),
    agingOver90: Number(d.agingOver90 ?? d.agingOver_90 ?? d.aging_over_90 ?? 0),
  };
}

function normalizePayment(p: any): ArPaymentRecord {
  return {
    id: String(p.id),
    paymentNumber: String(p.paymentNumber || p.noPembayaran || '-'),
    salesInvoiceId: String(p.salesInvoiceId || p.invoiceId || ''),
    invoiceNumber: p.invoiceNumber || p.salesInvoice?.invoiceNumber || '-',
    customerId: p.customerId || p.salesInvoice?.customerId,
    customerName: p.customerName || p.salesInvoice?.customerName || p.salesInvoice?.customer?.name || '-',
    paymentDate: String(p.paymentDate || '').split('T')[0],
    paymentAmount: Number(p.paymentAmount ?? 0),
    paymentMethod: String(p.paymentMethod || 'BANK_TRANSFER'),
    bankAccount: p.bankAccount || '',
    referenceNumber: p.referenceNumber || '',
    proofFileUrl: p.proofFileUrl || p.fileUrl || null,
    reconciliationStatus: String(p.reconciliationStatus || 'UNRECONCILED').toUpperCase(),
    notes: p.notes || null,
  };
}

export async function listFinancePaymentsApi(params: {
  page?: number;
  limit?: number;
  reconciliationStatus?: string;
  paymentMethod?: string;
  salesInvoiceId?: string;
}) {
  const query: Record<string, unknown> = {
    page: params.page || 1,
    limit: params.limit || 20,
  };
  if (params.reconciliationStatus && params.reconciliationStatus !== 'ALL') {
    query.reconciliationStatus = params.reconciliationStatus;
  }
  if (params.paymentMethod && params.paymentMethod !== 'ALL') {
    query.paymentMethod = params.paymentMethod;
  }
  if (params.salesInvoiceId && params.salesInvoiceId !== 'ALL') {
    query.salesInvoiceId = params.salesInvoiceId;
  }
  const res = await apiClient.get('/finance/payments', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1, total: Array.isArray(raw) ? raw.length : 0 };
  return {
    data: Array.isArray(raw) ? raw.map(normalizePayment) : [],
    meta,
  };
}

export async function createInvoicePaymentApi(invoiceId: string, payload: ArPaymentPayload): Promise<ArPaymentRecord> {
  const res = await apiClient.post(`/finance/invoices/${invoiceId}/payments`, payload);
  return normalizePayment(res.data?.data || res.data);
}

export async function updateFinancePaymentApi(paymentId: string, payload: Partial<ArPaymentPayload>): Promise<ArPaymentRecord> {
  const res = await apiClient.put(`/finance/payments/${paymentId}`, payload);
  return normalizePayment(res.data?.data || res.data);
}

export async function deleteFinancePaymentApi(paymentId: string): Promise<void> {
  await apiClient.delete(`/finance/payments/${paymentId}`);
}

export async function reconcileFinancePaymentApi(
  paymentId: string,
  reconciliationStatus: 'RECONCILED' | 'UNRECONCILED' = 'RECONCILED'
): Promise<ArPaymentRecord> {
  const res = await apiClient.patch(`/finance/payments/${paymentId}/reconcile`, {
    reconciliationStatus,
  });
  return normalizePayment(res.data?.data || res.data);
}

// ─── 5.2.1 Customer Purchase Orders ──────────────────────────

function normalizeCustomerPo(po: any): CustomerPoRecord {
  const items = Array.isArray(po.items)
    ? po.items.map((it: any) => ({
        itemId: String(it.itemId || ''),
        itemCode: it.itemCode || it.item?.itemCode || '',
        itemName: it.itemName || it.item?.itemName || '',
        qty: Number(it.qty ?? it.quantity ?? 0),
        unitPrice: Number(it.unitPrice ?? 0),
        subtotal: Number(it.subtotal ?? Number(it.qty ?? 0) * Number(it.unitPrice ?? 0)),
      }))
    : [];
  return {
    id: String(po.id),
    poNumber: String(po.poNumber || '-'),
    customerId: String(po.customerId || ''),
    customerName: String(po.customerName || po.customer?.name || po.customer?.customerName || '-'),
    date: String(po.date || po.poDate || '').split('T')[0],
    paymentTerm: po.paymentTerm || 'NET 30',
    emailSender: po.emailSender || '',
    emailSubject: po.emailSubject || '',
    discount: Number(po.discount ?? 0),
    freight: Number(po.freight ?? 0),
    taxRate: Number(po.taxRate ?? 11),
    totalAmount: Number(po.totalAmount ?? 0),
    fileUrl: po.fileUrl || null,
    status: String(po.status || 'OPEN').toUpperCase(),
    notes: po.notes || null,
    items,
  };
}

export async function listCustomerPosApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  status?: string;
}) {
  const query: Record<string, unknown> = {
    page: params.page || 1,
    limit: params.limit || 20,
  };
  if (params.search) query.search = params.search;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;
  if (params.status && params.status !== 'ALL') query.status = params.status;

  const res = await apiClient.get('/finance/customer-pos', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1, total: Array.isArray(raw) ? raw.length : 0 };
  return {
    data: Array.isArray(raw) ? raw.map(normalizeCustomerPo) : [],
    meta,
  };
}

export async function getCustomerPoByIdApi(poId: string): Promise<CustomerPoRecord> {
  const res = await apiClient.get(`/finance/customer-pos/${poId}`);
  return normalizeCustomerPo(res.data?.data || res.data);
}

export async function createCustomerPoApi(payload: CustomerPoPayload): Promise<CustomerPoRecord> {
  const res = await apiClient.post('/finance/customer-pos', payload);
  return normalizeCustomerPo(res.data?.data || res.data);
}

export async function updateCustomerPoApi(poId: string, payload: Partial<CustomerPoPayload>): Promise<CustomerPoRecord> {
  const res = await apiClient.put(`/finance/customer-pos/${poId}`, payload);
  return normalizeCustomerPo(res.data?.data || res.data);
}

export async function deleteCustomerPoApi(poId: string): Promise<void> {
  await apiClient.delete(`/finance/customer-pos/${poId}`);
}

// ─── MDM Dropdown Lookups ─────────────────────────────────────

export async function listMdmCustomersApi(): Promise<MdmCustomerOption[]> {
  try {
    const res = await apiClient.get('/mdm/customers', { params: { page: 1, limit: 100 } });
    const raw = res.data?.data || res.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((c: any) => ({
      id: String(c.id),
      code: c.customerCode || c.code || '',
      name: String(c.customerName || c.name || c.companyName || c.id),
      paymentTerm: c.paymentTerm || 'NET 30',
    }));
  } catch {
    return [];
  }
}

export async function listMdmItemsApi(): Promise<MdmItemOption[]> {
  try {
    const res = await apiClient.get('/mdm/items', { params: { page: 1, limit: 100 } });
    const raw = res.data?.data || res.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((it: any) => ({
      id: String(it.id),
      code: String(it.itemCode || it.code || ''),
      name: String(it.itemName || it.name || it.id),
      unit: String(it.uomCode || it.unit || 'PCS'),
      sellingPrice: Number(it.sellingPrice ?? it.salePrice ?? it.standardCostHpp ?? it.unitCost ?? 0),
    }));
  } catch {
    return [];
  }
}

// ─── Account Payable (AP) Types & API ────────────────────────

export interface ApSummary extends AgingBuckets {
  totalBilled: number;
  totalInvoices: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
  unreconciledPaymentsCount: number;
}

export interface SupplierInvoicePayload {
  invoiceNumber: string;
  supplierId: string;
  invoiceDate: string;
  dueDate?: string | null;
  paymentTerm?: string;
  billingStage?: string | null;
  terminNumber?: number | null;
  terminPercentage?: number | null;
  fakturPajakNumber?: string | null;
  subtotal: number;
  freight: number;
  discount: number;
  taxRate: number;
  pphRate: number;
  fileUrl?: string | null;
  notes?: string | null;
}

export interface SupplierPaymentPayload {
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'GIRO' | 'CHEQUE' | 'VIRTUAL_ACCOUNT';
  bankAccount?: string;
  referenceNumber?: string;
  proofFileUrl?: string | null;
  notes?: string | null;
}

export interface SupplierPaymentRecord {
  id: string;
  paymentNumber: string;
  supplierInvoiceId: string;
  invoiceNumber?: string;
  supplierName?: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: string;
  bankAccount?: string;
  referenceNumber?: string;
  proofFileUrl?: string | null;
  reconciliationStatus: string;
  notes?: string | null;
}

export interface SupplierInvoiceRecord {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName?: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerm?: string;
  billingStage?: string | null;
  terminNumber?: number | null;
  terminPercentage?: number | null;
  fakturPajakNumber?: string | null;
  subtotal: number;
  freight: number;
  discount: number;
  taxRate: number;
  pphRate: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  isOverdue: boolean;
  status: string;
  fileUrl?: string | null;
  notes?: string | null;
}

export interface MdmSupplierOption {
  id: string;
  code?: string;
  name: string;
  paymentTerm?: string;
}

export async function getApSummaryApi(): Promise<ApSummary> {
  try {
    const res = await apiClient.get('/finance/ap/summary');
    const d = (res.data?.data || res.data || {}) as any;
    return {
      totalBilled: Number(d.totalBilled ?? 0),
      totalInvoices: Number(d.totalInvoices ?? 0),
      totalPaid: Number(d.totalPaid ?? 0),
      totalOutstanding: Number(d.totalOutstanding ?? 0),
      overdueCount: Number(d.overdueCount ?? 0),
      overdueAmount: Number(d.overdueAmount ?? 0),
      unreconciledPaymentsCount: Number(d.unreconciledPaymentsCount ?? 0),
      agingCurrent: Number(d.agingCurrent ?? 0),
      aging130: Number(d.aging130 ?? d.aging1_30 ?? d.aging_1_30 ?? 0),
      aging3160: Number(d.aging3160 ?? d.aging31_60 ?? d.aging_31_60 ?? 0),
      aging6190: Number(d.aging6190 ?? d.aging61_90 ?? d.aging_61_90 ?? 0),
      agingOver90: Number(d.agingOver90 ?? d.agingOver_90 ?? d.aging_over_90 ?? 0),
    };
  } catch {
    return {
      totalBilled: 0,
      totalInvoices: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      overdueCount: 0,
      overdueAmount: 0,
      unreconciledPaymentsCount: 0,
      agingCurrent: 0,
      aging130: 0,
      aging3160: 0,
      aging6190: 0,
      agingOver90: 0,
    };
  }
}

function normalizeSupplierInvoice(inv: any): SupplierInvoiceRecord {
  const grandTotal = Number(inv.grandTotal ?? inv.totalAmount ?? 0);
  const paidAmount = Number(inv.paidAmount ?? inv.totalPaid ?? 0);
  const outstandingAmount = Number(inv.outstandingAmount ?? Math.max(0, grandTotal - paidAmount));
  const dueDate = String(inv.dueDate || '').split('T')[0];
  const status = String(inv.status || 'UNPAID').toUpperCase();
  const isOverdue =
    typeof inv.isOverdue === 'boolean'
      ? inv.isOverdue
      : Boolean(dueDate && status !== 'PAID' && status !== 'CANCELLED' && dueDate < new Date().toISOString().split('T')[0]);
  return {
    id: String(inv.id),
    invoiceNumber: String(inv.invoiceNumber || '-'),
    supplierId: String(inv.supplierId || ''),
    supplierName: String(inv.supplierName || inv.supplier?.name || inv.supplier?.supplierName || '-'),
    invoiceDate: String(inv.invoiceDate || '').split('T')[0],
    dueDate,
    paymentTerm: inv.paymentTerm || 'NET 30',
    billingStage: inv.billingStage || null,
    terminNumber: inv.terminNumber ?? null,
    terminPercentage: inv.terminPercentage ?? null,
    fakturPajakNumber: inv.fakturPajakNumber || null,
    subtotal: Number(inv.subtotal ?? 0),
    freight: Number(inv.freight ?? 0),
    discount: Number(inv.discount ?? 0),
    taxRate: Number(inv.taxRate ?? 11),
    pphRate: Number(inv.pphRate ?? 0),
    grandTotal,
    paidAmount,
    outstandingAmount,
    isOverdue,
    status,
    fileUrl: inv.fileUrl || null,
    notes: inv.notes || null,
  };
}

function normalizeSupplierPayment(p: any): SupplierPaymentRecord {
  return {
    id: String(p.id),
    paymentNumber: String(p.paymentNumber || '-'),
    supplierInvoiceId: String(p.supplierInvoiceId || ''),
    invoiceNumber: p.invoiceNumber || p.supplierInvoice?.invoiceNumber || '-',
    supplierName: p.supplierName || p.supplierInvoice?.supplierName || '-',
    paymentDate: String(p.paymentDate || '').split('T')[0],
    paymentAmount: Number(p.paymentAmount ?? 0),
    paymentMethod: String(p.paymentMethod || 'BANK_TRANSFER'),
    bankAccount: p.bankAccount || '',
    referenceNumber: p.referenceNumber || '',
    proofFileUrl: p.proofFileUrl || p.fileUrl || null,
    reconciliationStatus: String(p.reconciliationStatus || 'UNRECONCILED').toUpperCase(),
    notes: p.notes || null,
  };
}

export async function listSupplierInvoicesApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
  overdueOnly?: boolean;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.supplierId && params.supplierId !== 'ALL') query.supplierId = params.supplierId;
  if (params.overdueOnly) query.overdueOnly = true;
  const res = await apiClient.get('/finance/supplier-invoices', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1, total: Array.isArray(raw) ? raw.length : 0 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSupplierInvoice) : [], meta };
}

export async function createSupplierInvoiceApi(payload: SupplierInvoicePayload): Promise<SupplierInvoiceRecord> {
  const res = await apiClient.post('/finance/supplier-invoices', payload);
  return normalizeSupplierInvoice(res.data?.data || res.data);
}

export async function updateSupplierInvoiceApi(id: string, payload: Partial<SupplierInvoicePayload>): Promise<SupplierInvoiceRecord> {
  const res = await apiClient.put(`/finance/supplier-invoices/${id}`, payload);
  return normalizeSupplierInvoice(res.data?.data || res.data);
}

export async function deleteSupplierInvoiceApi(id: string): Promise<void> {
  await apiClient.delete(`/finance/supplier-invoices/${id}`);
}

export async function listSupplierPaymentsApi(params: {
  page?: number;
  limit?: number;
  supplierInvoiceId?: string;
  reconciliationStatus?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 50 };
  if (params.supplierInvoiceId && params.supplierInvoiceId !== 'ALL') query.supplierInvoiceId = params.supplierInvoiceId;
  if (params.reconciliationStatus && params.reconciliationStatus !== 'ALL') query.reconciliationStatus = params.reconciliationStatus;
  const res = await apiClient.get('/finance/supplier-payments', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSupplierPayment) : [], meta };
}

export async function createSupplierPaymentApi(invoiceId: string, payload: SupplierPaymentPayload): Promise<SupplierPaymentRecord> {
  const res = await apiClient.post(`/finance/supplier-invoices/${invoiceId}/payments`, payload);
  return normalizeSupplierPayment(res.data?.data || res.data);
}

export async function reconcileSupplierPaymentApi(paymentId: string, reconciliationStatus: 'RECONCILED' | 'UNRECONCILED' = 'RECONCILED') {
  const res = await apiClient.patch(`/finance/supplier-payments/${paymentId}/reconcile`, { reconciliationStatus });
  return normalizeSupplierPayment(res.data?.data || res.data);
}

export async function deleteSupplierPaymentApi(paymentId: string): Promise<void> {
  await apiClient.delete(`/finance/supplier-payments/${paymentId}`);
}

export async function listMdmSuppliersApi(): Promise<MdmSupplierOption[]> {
  try {
    const res = await apiClient.get('/mdm/suppliers', { params: { page: 1, limit: 100 } });
    const raw = res.data?.data || res.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((s: any) => ({
      id: String(s.id),
      code: s.supplierCode || s.code || '',
      name: String(s.supplierName || s.name || s.companyName || s.id),
      paymentTerm: s.paymentTerm || 'NET 30',
    }));
  } catch {
    return [];
  }
}

// ─── 5.2.2 & 5.2.3 Incoming Orders (IO) ──────────────────────

export interface IncomingOrderPayload {
  customerPoId: string;
  date: string;
  estimatedDeliveryDate?: string | null;
  notes?: string | null;
}

export interface IncomingOrderRecord {
  id: string;
  ioNumber: string;
  customerPoId?: string | null;
  poNumber?: string | null;
  customerId?: string | null;
  customerName?: string;
  date: string;
  estimatedDeliveryDate?: string | null;
  totalAmount: number;
  managerMarketingConfirmed: boolean;
  managerMarketingConfirmedBy?: string | null;
  costControlConfirmed: boolean;
  costControlConfirmedBy?: string | null;
  status: string;
  notes?: string | null;
}

function normalizeIncomingOrder(io: any): IncomingOrderRecord {
  return {
    id: String(io.id),
    ioNumber: String(io.ioNumber || io.number || '-'),
    customerPoId: io.customerPoId ? String(io.customerPoId) : null,
    poNumber: io.poNumber || io.customerPoNumber || io.customerPo?.poNumber || '-',
    customerId: io.customerId ? String(io.customerId) : null,
    customerName: String(io.customerName || io.customer?.name || io.customerPo?.customerName || '-'),
    date: String(io.date || io.ioDate || '').split('T')[0],
    estimatedDeliveryDate: io.estimatedDeliveryDate ? String(io.estimatedDeliveryDate).split('T')[0] : null,
    totalAmount: Number(io.totalAmount ?? io.grandTotal ?? 0),
    managerMarketingConfirmed: Boolean(io.managerMarketingConfirmed || io.managerMarketingStatus === 'CONFIRMED' || io.managerMarketingStatus === 'APPROVED'),
    managerMarketingConfirmedBy: io.managerMarketingConfirmedBy || null,
    costControlConfirmed: Boolean(io.costControlConfirmed || io.costControlStatus === 'CONFIRMED' || io.costControlStatus === 'APPROVED'),
    costControlConfirmedBy: io.costControlConfirmedBy || null,
    status: String(io.status || 'OPEN').toUpperCase(),
    notes: io.notes || null,
  };
}

export async function listIncomingOrdersApi(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/finance/incoming-orders', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeIncomingOrder) : [], meta };
}

export async function createIncomingOrderApi(payload: IncomingOrderPayload): Promise<IncomingOrderRecord> {
  const res = await apiClient.post('/finance/incoming-orders', payload);
  return normalizeIncomingOrder(res.data?.data || res.data);
}

export async function deleteIncomingOrderApi(id: string): Promise<void> {
  await apiClient.delete(`/finance/incoming-orders/${id}`);
}

export async function confirmIoManagerMarketingApi(id: string): Promise<IncomingOrderRecord> {
  const res = await apiClient.patch(`/finance/incoming-orders/${id}/confirm-manager-marketing`, {});
  return normalizeIncomingOrder(res.data?.data || res.data);
}

export async function confirmIoCostControlApi(id: string): Promise<IncomingOrderRecord> {
  const res = await apiClient.patch(`/finance/incoming-orders/${id}/confirm-cost-control`, {});
  return normalizeIncomingOrder(res.data?.data || res.data);
}

// ─── 6.3 Sales Commissions ───────────────────────────────────

export interface SalesCommissionPayload {
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  existingSalesAmount: number;
  existingSalesRate: number;
  newCustomerSalesAmount: number;
  newCustomerRate: number;
  newCustomerCount: number;
  bonusAmount: number;
  deductionAmount: number;
  notes?: string | null;
}

export interface SalesCommissionRecord extends SalesCommissionPayload {
  id: string;
  commissionNumber?: string;
  employeeName?: string;
  employeeNik?: string;
  totalCommission: number;
  status: string;
}

function normalizeCommission(c: any): SalesCommissionRecord {
  const existingAmt = Number(c.existingSalesAmount ?? 0);
  const existingRate = Number(c.existingSalesRate ?? 0);
  const newAmt = Number(c.newCustomerSalesAmount ?? 0);
  const newRate = Number(c.newCustomerRate ?? 0);
  const bonus = Number(c.bonusAmount ?? 0);
  const deduction = Number(c.deductionAmount ?? 0);
  const fallbackTotal = Math.round((existingAmt * existingRate) / 100 + (newAmt * newRate) / 100 + bonus - deduction);
  return {
    id: String(c.id),
    commissionNumber: c.commissionNumber || c.number || undefined,
    employeeId: String(c.employeeId || ''),
    employeeName: c.employeeName || c.employee?.fullName || c.employee?.name || '-',
    employeeNik: c.employeeNik || c.employee?.nik || '',
    periodMonth: Number(c.periodMonth ?? 1),
    periodYear: Number(c.periodYear ?? new Date().getFullYear()),
    existingSalesAmount: existingAmt,
    existingSalesRate: existingRate,
    newCustomerSalesAmount: newAmt,
    newCustomerRate: newRate,
    newCustomerCount: Number(c.newCustomerCount ?? 0),
    bonusAmount: bonus,
    deductionAmount: deduction,
    totalCommission: Number(c.totalCommission ?? fallbackTotal),
    status: String(c.status || 'DRAFT').toUpperCase(),
    notes: c.notes || null,
  };
}

export async function listSalesCommissionsApi(params: {
  page?: number;
  limit?: number;
  employeeId?: string;
  periodMonth?: number;
  periodYear?: number;
  status?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.employeeId && params.employeeId !== 'ALL') query.employeeId = params.employeeId;
  if (params.periodMonth) query.periodMonth = params.periodMonth;
  if (params.periodYear) query.periodYear = params.periodYear;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/finance/commissions', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeCommission) : [], meta };
}

export async function createSalesCommissionApi(payload: SalesCommissionPayload): Promise<SalesCommissionRecord> {
  const res = await apiClient.post('/finance/commissions', payload);
  return normalizeCommission(res.data?.data || res.data);
}

export async function updateSalesCommissionApi(id: string, payload: Partial<SalesCommissionPayload>): Promise<SalesCommissionRecord> {
  const res = await apiClient.put(`/finance/commissions/${id}`, payload);
  return normalizeCommission(res.data?.data || res.data);
}

export async function deleteSalesCommissionApi(id: string): Promise<void> {
  await apiClient.delete(`/finance/commissions/${id}`);
}

export async function approveSalesCommissionApi(id: string): Promise<SalesCommissionRecord> {
  const res = await apiClient.patch(`/finance/commissions/${id}/approve`, {});
  return normalizeCommission(res.data?.data || res.data);
}

export async function markPaidSalesCommissionApi(id: string): Promise<SalesCommissionRecord> {
  const res = await apiClient.patch(`/finance/commissions/${id}/mark-paid`, {});
  return normalizeCommission(res.data?.data || res.data);
}

export async function listSalesEmployeesApi(): Promise<{ id: string; nik?: string; fullName: string }[]> {
  try {
    const res = await apiClient.get('/hrd/employees', { params: { page: 1, limit: 100, department: 'SALES' } });
    const raw = res.data?.data || res.data?.employees || (Array.isArray(res.data) ? res.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: String(e.id),
      nik: e.nik || '',
      fullName: String(e.fullName || e.name || e.username || e.id),
    }));
  } catch {
    return [];
  }
}

// ─── 6.4 Sales Entertainments ────────────────────────────────

export interface SalesEntertainmentPayload {
  customerId?: string | null;
  customerName?: string | null;
  entertainmentDate: string;
  location: string;
  attendees: string;
  purpose: string;
  estimatedAmount: number;
  actualAmount: number;
  receiptFileUrl?: string | null;
  notes?: string | null;
}

export interface SalesEntertainmentRecord extends SalesEntertainmentPayload {
  id: string;
  entertainmentNumber?: string;
  requesterName?: string;
  managerStatus: string;
  financeStatus: string;
  status: string;
}

function normalizeEntertainment(e: any): SalesEntertainmentRecord {
  return {
    id: String(e.id),
    entertainmentNumber: e.entertainmentNumber || e.number || undefined,
    requesterName: e.requesterName || e.employeeName || e.employee?.fullName || '-',
    customerId: e.customerId ? String(e.customerId) : null,
    customerName: e.customerName || e.customer?.name || '-',
    entertainmentDate: String(e.entertainmentDate || '').split('T')[0],
    location: e.location || '',
    attendees: e.attendees || '',
    purpose: e.purpose || '',
    estimatedAmount: Number(e.estimatedAmount ?? 0),
    actualAmount: Number(e.actualAmount ?? 0),
    receiptFileUrl: e.receiptFileUrl || e.fileUrl || null,
    notes: e.notes || null,
    managerStatus: String(e.managerStatus || 'PENDING').toUpperCase(),
    financeStatus: String(e.financeStatus || 'PENDING').toUpperCase(),
    status: String(e.status || 'PENDING').toUpperCase(),
  };
}

export async function listSalesEntertainmentsApi(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/finance/entertainments', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeEntertainment) : [], meta };
}

export async function createSalesEntertainmentApi(payload: SalesEntertainmentPayload): Promise<SalesEntertainmentRecord> {
  const res = await apiClient.post('/finance/entertainments', payload);
  return normalizeEntertainment(res.data?.data || res.data);
}

export async function updateSalesEntertainmentApi(id: string, payload: Partial<SalesEntertainmentPayload>): Promise<SalesEntertainmentRecord> {
  const res = await apiClient.put(`/finance/entertainments/${id}`, payload);
  return normalizeEntertainment(res.data?.data || res.data);
}

export async function deleteSalesEntertainmentApi(id: string): Promise<void> {
  await apiClient.delete(`/finance/entertainments/${id}`);
}

export async function approveEntertainmentManagerApi(id: string, action: 'APPROVE' | 'REJECT', notes?: string) {
  const res = await apiClient.patch(`/finance/entertainments/${id}/approve-manager`, { action, notes });
  return normalizeEntertainment(res.data?.data || res.data);
}

export async function approveEntertainmentFinanceApi(id: string, action: 'APPROVE' | 'REJECT', notes?: string) {
  const res = await apiClient.patch(`/finance/entertainments/${id}/approve-finance`, { action, notes });
  return normalizeEntertainment(res.data?.data || res.data);
}

// ─── Payment Terms, Billing Stages & PO Billing Progress ─────

export interface PaymentTermOption {
  code: string;
  label: string;
  days?: number;
}

export interface FinancePaymentTermsDictionary {
  paymentTerms: PaymentTermOption[];
  billingStages: PaymentTermOption[];
}

export const DEFAULT_PAYMENT_TERMS: FinancePaymentTermsDictionary = {
  paymentTerms: [
    { code: 'COD', label: 'COD (Cash on Delivery)', days: 0 },
    { code: 'CBD', label: 'CBD (Cash Before Delivery)', days: 0 },
    { code: 'NET 7', label: 'NET 7 Hari', days: 7 },
    { code: 'NET 14', label: 'NET 14 Hari', days: 14 },
    { code: 'NET 30', label: 'NET 30 Hari', days: 30 },
    { code: 'NET 45', label: 'NET 45 Hari', days: 45 },
    { code: 'NET 60', label: 'NET 60 Hari', days: 60 },
    { code: 'NET 90', label: 'NET 90 Hari', days: 90 },
    { code: 'TERMIN', label: 'Termin Bertahap' },
  ],
  billingStages: [
    { code: 'DOWN_PAYMENT', label: 'Down Payment (DP)' },
    { code: 'TERMIN_1', label: 'Termin 1' },
    { code: 'TERMIN_2', label: 'Termin 2' },
    { code: 'TERMIN_3', label: 'Termin 3' },
    { code: 'FINAL_PAYMENT', label: 'Pelunasan / Final Payment' },
    { code: 'RETENTION', label: 'Retensi' },
  ],
};

export async function getFinancePaymentTermsApi(): Promise<FinancePaymentTermsDictionary> {
  try {
    const res = await apiClient.get('/finance/payment-terms');
    const d = (res.data?.data || res.data || {}) as any;
    const mapList = (arr: any[], fallback: PaymentTermOption[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return fallback;
      return arr.map((x: any) =>
        typeof x === 'string'
          ? { code: x, label: x }
          : { code: String(x.code || x.value || x.id), label: String(x.label || x.name || x.code || x.value), days: x.days }
      );
    };
    return {
      paymentTerms: mapList(d.paymentTerms, DEFAULT_PAYMENT_TERMS.paymentTerms),
      billingStages: mapList(d.billingStages, DEFAULT_PAYMENT_TERMS.billingStages),
    };
  } catch {
    return DEFAULT_PAYMENT_TERMS;
  }
}

export interface CustomerPoBillingProgress {
  poId: string;
  poNumber?: string;
  totalPoAmount: number;
  billedAmount: number;
  unbilledAmount: number;
  downPaymentTotal: number;
  billedPercentage: number;
  invoiceCount: number;
}

export async function getCustomerPoBillingProgressApi(poId: string): Promise<CustomerPoBillingProgress> {
  const res = await apiClient.get(`/finance/customer-pos/${poId}/billing-progress`);
  const d = (res.data?.data || res.data || {}) as any;
  const totalPoAmount = Number(d.totalPoAmount ?? d.totalAmount ?? 0);
  const billedAmount = Number(d.billedAmount ?? d.totalBilled ?? 0);
  const unbilledAmount = Number(d.unbilledAmount ?? Math.max(0, totalPoAmount - billedAmount));
  const billedPercentage = Number(
    d.billedPercentage ?? (totalPoAmount > 0 ? Math.min(100, Math.round((billedAmount / totalPoAmount) * 100)) : 0)
  );
  return {
    poId: String(d.poId || poId),
    poNumber: d.poNumber,
    totalPoAmount,
    billedAmount,
    unbilledAmount,
    downPaymentTotal: Number(d.downPaymentTotal ?? d.totalDp ?? 0),
    billedPercentage,
    invoiceCount: Number(d.invoiceCount ?? 0),
  };
}

// ─── Tab 8: E-Complaint (6.6.1 & 6.6.2) & RMA / CN / DN ──────

export interface FinanceComplaintPayload {
  customerId: string;
  salesInvoiceId?: string | null;
  itemId?: string | null;
  complaintType: string;
  proposedSolution?: string;
  description: string;
  rejectQty: number;
  evidenceFileUrl?: string | null;
}

export interface QcCorrectivePayload {
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  status: 'APPROVED_RMA' | 'REJECTED';
}

export interface FinanceComplaintRecord extends FinanceComplaintPayload {
  id: string;
  complaintNumber: string;
  customerName?: string;
  invoiceNumber?: string | null;
  itemName?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  status: string;
  createdAt?: string;
}

function normalizeComplaint(c: any): FinanceComplaintRecord {
  return {
    id: String(c.id),
    complaintNumber: String(c.complaintNumber || c.chrNumber || '-'),
    customerId: String(c.customerId || ''),
    customerName: c.customerName || c.customer?.name || '-',
    salesInvoiceId: c.salesInvoiceId ? String(c.salesInvoiceId) : null,
    invoiceNumber: c.invoiceNumber || c.salesInvoice?.invoiceNumber || null,
    itemId: c.itemId ? String(c.itemId) : null,
    itemName: c.itemName || c.item?.itemName || null,
    complaintType: String(c.complaintType || 'QUALITY_DEFECT'),
    proposedSolution: c.proposedSolution || 'CREDIT_NOTE',
    description: c.description || '',
    rejectQty: Number(c.rejectQty ?? 0),
    evidenceFileUrl: c.evidenceFileUrl || c.fileUrl || null,
    rootCause: c.rootCause || null,
    correctiveAction: c.correctiveAction || null,
    preventiveAction: c.preventiveAction || null,
    status: String(c.status || 'OPEN').toUpperCase(),
    createdAt: c.createdAt ? String(c.createdAt).split('T')[0] : undefined,
  };
}

export async function listFinanceComplaintsApi(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/finance/complaints', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeComplaint) : [], meta };
}

export async function createFinanceComplaintApi(payload: FinanceComplaintPayload): Promise<FinanceComplaintRecord> {
  const res = await apiClient.post('/finance/complaints', payload);
  return normalizeComplaint(res.data?.data || res.data);
}

export async function updateFinanceComplaintApi(id: string, payload: Partial<FinanceComplaintPayload>): Promise<FinanceComplaintRecord> {
  const res = await apiClient.put(`/finance/complaints/${id}`, payload);
  return normalizeComplaint(res.data?.data || res.data);
}

export async function deleteFinanceComplaintApi(id: string): Promise<void> {
  await apiClient.delete(`/finance/complaints/${id}`);
}

export async function submitComplaintQcCorrectiveApi(id: string, payload: QcCorrectivePayload): Promise<FinanceComplaintRecord> {
  const res = await apiClient.patch(`/finance/complaints/${id}/qc-corrective`, payload);
  return normalizeComplaint(res.data?.data || res.data);
}

export interface FinanceRmaPayload {
  noteType: 'CREDIT_NOTE' | 'DEBIT_NOTE';
  complaintId?: string | null;
  salesInvoiceId?: string | null;
  supplierInvoiceId?: string | null;
  itemId?: string | null;
  returnQty: number;
  unitPrice: number;
  amount: number;
  returnToStock: boolean;
  rackNumber?: string | null;
  reason: string;
}

export interface FinanceRmaRecord extends FinanceRmaPayload {
  id: string;
  rmaNumber: string;
  complaintNumber?: string | null;
  invoiceNumber?: string | null;
  itemName?: string | null;
  qcStatus: string;
  financeStatus: string;
  status: string;
  createdAt?: string;
}

function normalizeRma(r: any): FinanceRmaRecord {
  return {
    id: String(r.id),
    rmaNumber: String(r.rmaNumber || r.noteNumber || '-'),
    noteType: (String(r.noteType || 'CREDIT_NOTE').toUpperCase() as 'CREDIT_NOTE' | 'DEBIT_NOTE'),
    complaintId: r.complaintId ? String(r.complaintId) : null,
    complaintNumber: r.complaintNumber || r.complaint?.complaintNumber || null,
    salesInvoiceId: r.salesInvoiceId ? String(r.salesInvoiceId) : null,
    supplierInvoiceId: r.supplierInvoiceId ? String(r.supplierInvoiceId) : null,
    invoiceNumber:
      r.invoiceNumber || r.salesInvoice?.invoiceNumber || r.supplierInvoice?.invoiceNumber || null,
    itemId: r.itemId ? String(r.itemId) : null,
    itemName: r.itemName || r.item?.itemName || null,
    returnQty: Number(r.returnQty ?? 0),
    unitPrice: Number(r.unitPrice ?? 0),
    amount: Number(r.amount ?? 0),
    returnToStock: Boolean(r.returnToStock),
    rackNumber: r.rackNumber || 'RMA-HOLD',
    reason: r.reason || '',
    qcStatus: String(r.qcStatus || 'PENDING').toUpperCase(),
    financeStatus: String(r.financeStatus || 'PENDING').toUpperCase(),
    status: String(r.status || 'PENDING').toUpperCase(),
    createdAt: r.createdAt ? String(r.createdAt).split('T')[0] : undefined,
  };
}

export async function listFinanceRmaApi(params: { page?: number; limit?: number; noteType?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.noteType && params.noteType !== 'ALL') query.noteType = params.noteType;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/finance/rma', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeRma) : [], meta };
}

export async function createFinanceRmaApi(payload: FinanceRmaPayload): Promise<FinanceRmaRecord> {
  const res = await apiClient.post('/finance/rma', payload);
  return normalizeRma(res.data?.data || res.data);
}

export async function updateFinanceRmaApi(id: string, payload: Partial<FinanceRmaPayload>): Promise<FinanceRmaRecord> {
  const res = await apiClient.put(`/finance/rma/${id}`, payload);
  return normalizeRma(res.data?.data || res.data);
}

export async function deleteFinanceRmaApi(id: string): Promise<void> {
  await apiClient.delete(`/finance/rma/${id}`);
}

export async function approveRmaQcApi(id: string, action: 'APPROVE' | 'REJECT', notes?: string) {
  const res = await apiClient.patch(`/finance/rma/${id}/approve-qc`, { action, notes });
  return normalizeRma(res.data?.data || res.data);
}

export async function approveRmaFinanceApi(id: string, action: 'APPROVE' | 'REJECT', notes?: string) {
  const res = await apiClient.patch(`/finance/rma/${id}/approve-finance`, { action, notes });
  return normalizeRma(res.data?.data || res.data);
}

// ─── Backward-compatible Legacy Exports ──────────────────────

export interface InvoiceCalculatePayload {
  customer_id: string;
  delivery_order_ids: string[];
  formula_id: number;
  freight_cost: number;
  discount_amount: number;
  down_payment_deduction: number;
  retention_deduction: number;
  ppn_rate: number;
  pph_rate: number;
}

export interface InvoiceCreatePayload extends InvoiceCalculatePayload {
  invoice_date: string;
  due_date: string;
  tax_facture_number?: string | null;
  notes?: string | null;
}

export interface ARPaymentCreatePayload {
  payment_amount: number;
}

export interface ComplaintCreatePayload {
  description: string;
}

export interface RMAResolveRequestPayload {
  credit_note_amount: number;
  notes: string;
}

export async function calculateInvoiceApi(payload: InvoiceCalculatePayload): Promise<InvoiceCalculateOut> {
  const response = await apiClient.post('/finance/invoices/calculate', payload, {
    headers: { 'X-Skip-Snake-Case': 'true' },
  });
  return (response.data?.data || response.data) as InvoiceCalculateOut;
}

export async function createInvoiceApi(payload: InvoiceCreatePayload): Promise<InvoiceOut> {
  const response = await apiClient.post('/finance/invoices', payload);
  return (response.data?.data || response.data) as InvoiceOut;
}

export async function listInvoicesApi(page: number = 1, limit: number = 10, search?: string, customerId?: string) {
  const params: any = { page, limit };
  if (search) params.search = search;
  if (customerId) params.customer_id = customerId;
  const response = await apiClient.get('/finance/invoices', { params });
  const data = (response.data?.data || response.data) as InvoiceOut[];
  const meta = response.data?.meta || { total_pages: 1, page: 1 };
  return { data, meta };
}

export async function recordArPaymentApi(arId: string, payload: ARPaymentCreatePayload): Promise<ARPaymentOut> {
  const response = await apiClient.post(`/finance/account-receivables/${arId}/payments`, payload);
  return (response.data?.data || response.data) as ARPaymentOut;
}

export async function createComplaintApi(payload: ComplaintCreatePayload): Promise<ComplaintOut> {
  const response = await apiClient.post('/complaints', payload);
  return (response.data?.data || response.data) as ComplaintOut;
}

export async function resolveRmaApi(complaintId: string, payload: RMAResolveRequestPayload): Promise<RMAResolveOut> {
  const response = await apiClient.post(`/complaints/${complaintId}/resolve-rma`, payload);
  return (response.data?.data || response.data) as RMAResolveOut;
}

export async function getDeliveryOrdersApi(page: number = 1, limit: number = 10, search?: string) {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    const response = await apiClient.get('/logistics/delivery-orders', { params });
    const data = (response.data?.data || response.data) as DeliveryOrder[];
    const meta = response.data?.meta || { total_pages: 1, page: 1 };
    return { data, meta };
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return { data: [], meta: { total_pages: 1, page: 1 } };
    }
    throw err;
  }
}
