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

export async function uploadFinanceDocument(
  docType: 'customer_po' | 'payment_proof' | 'faktur_pajak',
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

export async function printFinanceInvoice(invoiceId: string): Promise<void> {
  const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const token = localStorage.getItem('samhance_access_token') || '';
  const res = await fetch(`${baseUrl}/finance/invoices/${invoiceId}/print`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Gagal memuat dokumen cetak Sales Invoice (${res.status})`);
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
  dueDate: string;
  invoiceType: 'DOWN_PAYMENT' | 'FINAL_PAYMENT_UNDER_100' | 'FINAL_PAYMENT_100' | 'RETENTION';
  paymentTerm?: string;
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

export interface ArSummary {
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
}) {
  const query: Record<string, unknown> = {
    page: params.page || 1,
    limit: params.limit || 20,
  };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;

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
