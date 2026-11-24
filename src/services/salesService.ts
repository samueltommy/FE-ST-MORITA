import { apiClient } from '../lib/apiClient';
import type { SalesTrackingOrder, Quotation } from '../types';

// ─── Shared Helpers ───────────────────────────────────────────

export function extractSalesErrorMessage(err: any, fallback: string = 'Terjadi kesalahan'): string {
  const data = err?.response?.data;
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        return `${data.message}: ${data.errors
          .map((e: any) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e)))
          .join(', ')}`;
      }
      return data.message;
    }
    if (typeof data.detail === 'string' && data.detail.trim()) return data.detail;
    if (data.detail && typeof data.detail.message === 'string') return data.detail.message;
  }
  return err?.message || fallback;
}

export function resolveSalesFileUrl(fileUrl?: string | null): string | null {
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

export type SalesDocType =
  | 'e_catalog'
  | 'brochure'
  | 'company_profile'
  | 'introduction_letter'
  | 'product_knowledge'
  | 'price_increase_letter'
  | 'stock_delay_info'
  | 'customer_po'
  | 'entertainment_receipt'
  | 'complaint_evidence';

export interface SalesUploadResult {
  docType: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
}

export async function uploadSalesDocumentApi(
  docType: SalesDocType,
  file: File
): Promise<SalesUploadResult> {
  const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const token = localStorage.getItem('samhance_access_token') || '';
  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('file', file);

  const res = await fetch(`${baseUrl}/sales/upload-document`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.detail?.message || json?.detail || 'Gagal mengunggah dokumen sales');
  }
  const d = json?.data || json || {};
  return {
    docType: String(d.doc_type || d.docType || docType),
    fileName: String(d.file_name || d.fileName || file.name),
    fileType: String(d.file_type || d.fileType || ''),
    fileUrl: String(d.file_url || d.fileUrl || ''),
  };
}

export async function printSalesHtmlReport(path: string, query?: Record<string, string | number | undefined>): Promise<void> {
  const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const token = localStorage.getItem('samhance_access_token') || '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const searchParams = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        searchParams.set(k, String(v));
      }
    });
  }
  const qs = searchParams.toString();
  const res = await fetch(`${baseUrl}${normalized}${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Gagal memuat dokumen cetak (${res.status})`);
  }
  const html = await res.text();
  const win = window.open('', '_blank', 'width=980,height=760');
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

// ─── Dropdown Lookups ─────────────────────────────────────────

export interface SalesEmployeeOption {
  id: string;
  nik?: string;
  fullName: string;
  department?: string;
}

export interface SalesItemOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  category?: string;
  sellingPrice: number;
  hppCost: number;
}

export interface SalesCustomerOption {
  id: string;
  code: string;
  name: string;
  status?: string;
  paymentTerm?: string;
  zoning?: string;
}

export async function listSalesDropdownEmployeesApi(): Promise<SalesEmployeeOption[]> {
  try {
    const res = await apiClient.get('/hrd/employees', { params: { page: 1, limit: 100, department: 'SALES' } });
    const raw = res.data?.data || res.data?.employees || (Array.isArray(res.data) ? res.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: String(e.id),
      nik: e.nik || e.employeeCode || '',
      fullName: String(e.fullName || e.name || e.username || e.id),
      department: e.department || 'SALES',
    }));
  } catch {
    return [];
  }
}

export async function listSalesDropdownItemsApi(): Promise<SalesItemOption[]> {
  try {
    const res = await apiClient.get('/mdm/items', { params: { page: 1, limit: 200 } });
    const raw = res.data?.data || res.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((it: any) => ({
      id: String(it.id),
      code: String(it.itemCode || it.code || ''),
      name: String(it.itemName || it.name || it.id),
      unit: String(it.uomCode || it.unit || 'PCS'),
      category: it.category || it.categoryName || '',
      sellingPrice: Number(it.sellingPrice ?? it.salePrice ?? it.basePrice ?? 0),
      hppCost: Number(it.standardCostHpp ?? it.unitCost ?? it.costPrice ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function listSalesDropdownCustomersApi(): Promise<SalesCustomerOption[]> {
  try {
    const res = await apiClient.get('/sales/customers', { params: { page: 1, limit: 200 } });
    const raw = res.data?.data || res.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((c: any) => ({
      id: String(c.id),
      code: String(c.customerCode || c.code || ''),
      name: String(c.name || c.companyName || c.customerName || c.id),
      status: c.status || 'OLD',
      paymentTerm: c.paymentTerm || 'NET 30',
      zoning: c.zoning || c.province || c.city || '',
    }));
  } catch {
    return [];
  }
}

// ===========================================================================
// 2.1.1 MASTER CUSTOMER & MULTI-ALAMAT (/sales/customers)
// ===========================================================================

export type CustomerAddressType = 'SHIPPING' | 'BILLING' | 'OFFICE' | 'WAREHOUSE';

export interface CustomerAddressRecord {
  id: string;
  customerId: string;
  addressLabel: string;
  addressType: CustomerAddressType | string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  fullAddress: string;
  city?: string | null;
  province?: string | null;
  zoning?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary: boolean;
}

export interface CustomerAddressPayload {
  addressLabel: string;
  addressType: CustomerAddressType;
  recipientName?: string | null;
  recipientPhone?: string | null;
  fullAddress: string;
  city?: string | null;
  province?: string | null;
  zoning?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary?: boolean;
}

export interface SalesCustomerRecord {
  id: string;
  customerCode: string;
  name: string;
  companyName: string;
  status: 'NEW' | 'OLD' | string;
  businessType?: string | null;
  npwp?: string | null;
  nik?: string | null;
  taxCode?: string | null;
  taxTransactionCode?: string | null;
  pkpStatus: 'PKP' | 'NON_PKP' | string;
  namaNpwp?: string | null;
  alamatPajakLengkap?: string | null;
  salesPersonId?: string | null;
  salesPersonName?: string | null;
  website?: string | null;
  creditLimit: number;
  paymentTerm: string;
  paymentTermsDays: number;
  contactPersonName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  billingAddress?: string | null;
  city?: string | null;
  province?: string | null;
  zoning?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addresses: CustomerAddressRecord[];
  isActive: boolean;
  createdAt?: string | null;
}

export interface SalesCustomerPayload {
  customerCode?: string;
  name: string;
  companyName?: string;
  status: 'NEW' | 'OLD';
  businessType?: string | null;
  npwp?: string | null;
  nik?: string | null;
  taxTransactionCode?: string | null;
  pkpStatus: 'PKP' | 'NON_PKP';
  namaNpwp?: string | null;
  alamatPajakLengkap?: string | null;
  salesPersonId?: string | null;
  website?: string | null;
  creditLimit?: number;
  paymentTerm?: string;
  paymentTermsDays?: number;
  contactPersonName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  billingAddress?: string | null;
  city?: string | null;
  province?: string | null;
  zoning?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
  addresses?: CustomerAddressPayload[];
}

function normalizeCustomerAddress(a: any): CustomerAddressRecord {
  return {
    id: String(a.id),
    customerId: String(a.customerId || ''),
    addressLabel: String(a.addressLabel || '-'),
    addressType: String(a.addressType || 'SHIPPING').toUpperCase(),
    recipientName: a.recipientName || null,
    recipientPhone: a.recipientPhone || null,
    fullAddress: String(a.fullAddress || ''),
    city: a.city || null,
    province: a.province || null,
    zoning: a.zoning || null,
    postalCode: a.postalCode || null,
    latitude: a.latitude != null ? Number(a.latitude) : null,
    longitude: a.longitude != null ? Number(a.longitude) : null,
    isPrimary: Boolean(a.isPrimary),
  };
}

function normalizeCustomer(c: any): SalesCustomerRecord {
  const rawAddrs = Array.isArray(c.addresses)
    ? c.addresses
    : Array.isArray(c.shippingAddresses)
    ? c.shippingAddresses
    : [];
  return {
    id: String(c.id),
    customerCode: String(c.customerCode || '-'),
    name: String(c.name || c.companyName || '-'),
    companyName: String(c.companyName || c.name || '-'),
    status: String(c.status || 'OLD').toUpperCase(),
    businessType: c.businessType || null,
    npwp: c.npwp || c.npwpNumber || null,
    nik: c.nik || null,
    taxCode: c.taxCode || c.taxTransactionCode || null,
    taxTransactionCode: c.taxTransactionCode || c.taxCode || null,
    pkpStatus: String(c.pkpStatus || 'NON_PKP').toUpperCase(),
    namaNpwp: c.namaNpwp || null,
    alamatPajakLengkap: c.alamatPajakLengkap || null,
    salesPersonId: c.salesPersonId ? String(c.salesPersonId) : null,
    salesPersonName: c.salesPersonName || null,
    website: c.website || null,
    creditLimit: Number(c.creditLimit ?? 0),
    paymentTerm: String(c.paymentTerm || 'NET 30'),
    paymentTermsDays: Number(c.paymentTermsDays ?? 30),
    contactPersonName: c.contactPersonName || null,
    contactEmail: c.contactEmail || null,
    contactPhone: c.contactPhone || null,
    address: c.address || null,
    billingAddress: c.billingAddress || null,
    city: c.city || null,
    province: c.province || null,
    zoning: c.zoning || null,
    postalCode: c.postalCode || null,
    latitude: c.latitude != null ? Number(c.latitude) : null,
    longitude: c.longitude != null ? Number(c.longitude) : null,
    addresses: rawAddrs.map(normalizeCustomerAddress),
    isActive: c.isActive !== false,
    createdAt: c.createdAt || null,
  };
}

export async function listSalesCustomersApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  pkpStatus?: string;
  zoning?: string;
  salesPersonId?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.pkpStatus && params.pkpStatus !== 'ALL') query.pkpStatus = params.pkpStatus;
  if (params.zoning) query.zoning = params.zoning;
  if (params.salesPersonId && params.salesPersonId !== 'ALL') query.salesPersonId = params.salesPersonId;
  const res = await apiClient.get('/sales/customers', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1, totalItems: Array.isArray(raw) ? raw.length : 0 };
  return { data: Array.isArray(raw) ? raw.map(normalizeCustomer) : [], meta };
}

export async function getSalesCustomerByIdApi(customerId: string): Promise<SalesCustomerRecord> {
  const res = await apiClient.get(`/sales/customers/${customerId}`);
  return normalizeCustomer(res.data?.data || res.data);
}

export async function createSalesCustomerApi(payload: SalesCustomerPayload): Promise<SalesCustomerRecord> {
  const res = await apiClient.post('/sales/customers', payload);
  return normalizeCustomer(res.data?.data || res.data);
}

export async function updateSalesCustomerApi(
  customerId: string,
  payload: Partial<SalesCustomerPayload>
): Promise<SalesCustomerRecord> {
  const res = await apiClient.put(`/sales/customers/${customerId}`, payload);
  return normalizeCustomer(res.data?.data || res.data);
}

export async function deleteSalesCustomerApi(customerId: string): Promise<void> {
  await apiClient.delete(`/sales/customers/${customerId}`);
}

export async function createCustomerAddressApi(
  customerId: string,
  payload: CustomerAddressPayload
): Promise<CustomerAddressRecord> {
  const res = await apiClient.post(`/sales/customers/${customerId}/addresses`, payload);
  return normalizeCustomerAddress(res.data?.data || res.data);
}

export async function updateCustomerAddressApi(
  customerId: string,
  addressId: string,
  payload: Partial<CustomerAddressPayload>
): Promise<CustomerAddressRecord> {
  const res = await apiClient.put(`/sales/customers/${customerId}/addresses/${addressId}`, payload);
  return normalizeCustomerAddress(res.data?.data || res.data);
}

export async function deleteCustomerAddressApi(customerId: string, addressId: string): Promise<void> {
  await apiClient.delete(`/sales/customers/${customerId}/addresses/${addressId}`);
}

// ===========================================================================
// 5.1 QUOTATION & 2-STAGE APPROVAL (/sales/quotations)
// ===========================================================================

export interface QuotationItemPayload {
  itemId: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  hppUnitCost?: number;
}

export interface QuotationItemRecord {
  id: string;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  hppUnitCost: number;
  subtotal: number;
}

export interface SalesQuotationRecord {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName?: string | null;
  customerCode?: string | null;
  salesPersonId: string;
  salesPersonName?: string | null;
  date: string;
  validUntilDate?: string | null;
  currency: string;
  paymentTerm?: string | null;
  deliveryTerm?: string | null;
  taxIncluded: boolean;
  subtotalAmount: number;
  discountAmount: number;
  freightCost: number;
  taxRate: number;
  taxAmount: number;
  grandTotalAmount: number;
  estimatedMarginPercent: number;
  status: string;
  managerStatus: string;
  managerApprovedBy?: string | null;
  managerApprovedAt?: string | null;
  managerNotes?: string | null;
  costControlStatus: string;
  costControlApprovedBy?: string | null;
  costControlApprovedAt?: string | null;
  costControlNotes?: string | null;
  adjustedCreditLimitOverride?: number | null;
  notes?: string | null;
  items: QuotationItemRecord[];
  createdAt?: string | null;
}

export interface SalesQuotationPayload {
  customerId: string;
  salesPersonId?: string | null;
  date?: string;
  validUntilDate?: string | null;
  currency?: string;
  paymentTerm?: string | null;
  deliveryTerm?: string | null;
  taxIncluded?: boolean;
  taxRate?: number;
  freightCost?: number;
  notes?: string | null;
  items: QuotationItemPayload[];
}

function normalizeQuotationRecord(q: any): SalesQuotationRecord {
  const items = Array.isArray(q.items)
    ? q.items.map((it: any) => ({
        id: String(it.id || ''),
        itemId: String(it.itemId || ''),
        itemCode: it.itemCode || null,
        itemName: it.itemName || null,
        unit: it.unit || null,
        qty: Number(it.qty ?? 0),
        unitPrice: Number(it.unitPrice ?? 0),
        discountPercent: Number(it.discountPercent ?? 0),
        hppUnitCost: Number(it.hppUnitCost ?? 0),
        subtotal: Number(it.subtotal ?? Number(it.qty ?? 0) * Number(it.unitPrice ?? 0)),
      }))
    : [];
  return {
    id: String(q.id || q.quotationId || ''),
    quotationNumber: String(q.quotationNumber || '-'),
    customerId: String(q.customerId || ''),
    customerName: q.customerName || '-',
    customerCode: q.customerCode || null,
    salesPersonId: String(q.salesPersonId || ''),
    salesPersonName: q.salesPersonName || '-',
    date: String(q.date || '').split('T')[0],
    validUntilDate: q.validUntilDate ? String(q.validUntilDate).split('T')[0] : null,
    currency: String(q.currency || 'IDR'),
    paymentTerm: q.paymentTerm || 'NET 30',
    deliveryTerm: q.deliveryTerm || null,
    taxIncluded: Boolean(q.taxIncluded),
    subtotalAmount: Number(q.subtotalAmount ?? 0),
    discountAmount: Number(q.discountAmount ?? 0),
    freightCost: Number(q.freightCost ?? 0),
    taxRate: Number(q.taxRate ?? 11),
    taxAmount: Number(q.taxAmount ?? 0),
    grandTotalAmount: Number(q.grandTotalAmount ?? 0),
    estimatedMarginPercent: Number(q.estimatedMarginPercent ?? 0),
    status: String(q.status || q.quotationStatus || 'PENDING_MANAGER').toUpperCase(),
    managerStatus: String(q.managerStatus || 'PENDING').toUpperCase(),
    managerApprovedBy: q.managerApprovedBy || null,
    managerApprovedAt: q.managerApprovedAt || null,
    managerNotes: q.managerNotes || null,
    costControlStatus: String(q.costControlStatus || q.costControlApprovalStatus || 'PENDING').toUpperCase(),
    costControlApprovedBy: q.costControlApprovedBy || null,
    costControlApprovedAt: q.costControlApprovedAt || null,
    costControlNotes: q.costControlNotes || null,
    adjustedCreditLimitOverride: q.adjustedCreditLimitOverride != null ? Number(q.adjustedCreditLimitOverride) : null,
    notes: q.notes || null,
    items,
    createdAt: q.createdAt || null,
  };
}

export async function listSalesQuotationsApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  salesPersonId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;
  if (params.salesPersonId && params.salesPersonId !== 'ALL') query.salesPersonId = params.salesPersonId;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  const res = await apiClient.get('/sales/quotations', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1, totalItems: Array.isArray(raw) ? raw.length : 0 };
  return { data: Array.isArray(raw) ? raw.map(normalizeQuotationRecord) : [], meta };
}

export async function createSalesQuotationApi(payload: SalesQuotationPayload): Promise<SalesQuotationRecord> {
  const res = await apiClient.post('/sales/quotations', payload);
  return normalizeQuotationRecord(res.data?.data || res.data);
}

export async function updateSalesQuotationApi(
  quotationId: string,
  payload: Partial<SalesQuotationPayload>
): Promise<SalesQuotationRecord> {
  const res = await apiClient.put(`/sales/quotations/${quotationId}`, payload);
  return normalizeQuotationRecord(res.data?.data || res.data);
}

export async function deleteSalesQuotationApi(quotationId: string): Promise<void> {
  await apiClient.delete(`/sales/quotations/${quotationId}`);
}

export async function confirmQuotationManagerApi(
  quotationId: string,
  payload: { action: 'APPROVE' | 'REJECT'; notes?: string }
): Promise<SalesQuotationRecord> {
  const res = await apiClient.patch(`/sales/quotations/${quotationId}/confirm-manager`, payload);
  return normalizeQuotationRecord(res.data?.data || res.data);
}

export async function confirmQuotationCostControlApi(
  quotationId: string,
  payload: {
    action: 'APPROVE' | 'REJECT';
    notes?: string;
    costControlNotes?: string;
    adjustedCreditLimitOverride?: number | null;
  }
): Promise<SalesQuotationRecord> {
  const res = await apiClient.patch(`/sales/quotations/${quotationId}/confirm-cost-control`, payload);
  return normalizeQuotationRecord(res.data?.data || res.data);
}

export async function printSalesQuotationApi(quotationId: string): Promise<void> {
  return printSalesHtmlReport(`/sales/quotations/${quotationId}/print`);
}

// ===========================================================================
// 5.2 CUSTOMER PO & INCOMING ORDER (/sales/customer-pos & /sales/incoming-orders)
// ===========================================================================

export interface SalesCustomerPoItemPayload {
  itemId: string;
  itemCode?: string;
  itemName?: string;
  qty: number;
  unitPrice: number;
  subtotal?: number;
  deliveryDeadline?: string | null;
}

export interface SalesCustomerPoPayload {
  poNumber: string;
  customerId: string;
  quotationId?: string | null;
  date: string;
  paymentTerm?: string;
  discount: number;
  freight: number;
  taxRate: number;
  totalAmount?: number;
  fileUrl?: string | null;
  emailSender?: string | null;
  emailSubject?: string | null;
  notes?: string | null;
  status?: string;
  items: SalesCustomerPoItemPayload[];
}

export interface SalesCustomerPoRecord {
  id: string;
  poNumber: string;
  customerId: string;
  customerCode?: string | null;
  customerName?: string | null;
  quotationId?: string | null;
  date: string;
  paymentTerm?: string | null;
  discount: number;
  freight: number;
  taxRate: number;
  totalAmount: number;
  fileUrl?: string | null;
  emailSender?: string | null;
  emailSubject?: string | null;
  notes?: string | null;
  status: string;
  uploadedBy?: string | null;
  items: SalesCustomerPoItemPayload[];
  createdAt?: string | null;
}

export interface SalesIncomingOrderItemRecord {
  id: string;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface SalesIncomingOrderRecord {
  id: string;
  ioNumber: string;
  customerPoId: string;
  customerPoNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  date: string;
  estimatedDeliveryDate?: string | null;
  deliverTo?: string | null;
  notes?: string | null;
  status: string;
  managerMarketingStatus: string;
  managerMarketingApprovedBy?: string | null;
  managerMarketingApprovedAt?: string | null;
  costControlStatus: string;
  costControlApprovedBy?: string | null;
  costControlApprovedAt?: string | null;
  totalAmount: number;
  items: SalesIncomingOrderItemRecord[];
  createdAt?: string | null;
}

export interface SalesIncomingOrderPayload {
  customerPoId: string;
  ioNumber?: string | null;
  date?: string;
  estimatedDeliveryDate?: string | null;
  deliverTo?: string | null;
  notes?: string | null;
}

export interface SalesIncomingOrderFromQuotationPayload {
  quotationId: string;
  customerPoNumber: string;
  customerPoDate: string;
  downPaymentAmount?: number;
  retentionPercent?: number;
  notes?: string | null;
  items: Array<{ itemId: string; orderedQty: number; unitPrice: number }>;
}

function normalizeSalesCustomerPo(po: any): SalesCustomerPoRecord {
  const items = Array.isArray(po.items)
    ? po.items.map((it: any) => ({
        itemId: String(it.itemId || ''),
        itemCode: it.itemCode || '',
        itemName: it.itemName || '',
        qty: Number(it.qty ?? 0),
        unitPrice: Number(it.unitPrice ?? 0),
        subtotal: Number(it.subtotal ?? Number(it.qty ?? 0) * Number(it.unitPrice ?? 0)),
        deliveryDeadline: it.deliveryDeadline ? String(it.deliveryDeadline).split('T')[0] : null,
      }))
    : [];
  return {
    id: String(po.id),
    poNumber: String(po.poNumber || '-'),
    customerId: String(po.customerId || ''),
    customerCode: po.customerCode || null,
    customerName: po.customerName || '-',
    quotationId: po.quotationId ? String(po.quotationId) : null,
    date: String(po.date || '').split('T')[0],
    paymentTerm: po.paymentTerm || 'NET 30',
    discount: Number(po.discount ?? 0),
    freight: Number(po.freight ?? 0),
    taxRate: Number(po.taxRate ?? 11),
    totalAmount: Number(po.totalAmount ?? 0),
    fileUrl: po.fileUrl || null,
    emailSender: po.emailSender || null,
    emailSubject: po.emailSubject || null,
    notes: po.notes || null,
    status: String(po.status || 'OPEN').toUpperCase(),
    uploadedBy: po.uploadedBy || null,
    items,
    createdAt: po.createdAt || null,
  };
}

function normalizeSalesIo(io: any): SalesIncomingOrderRecord {
  const items = Array.isArray(io.items)
    ? io.items.map((it: any) => ({
        id: String(it.id || ''),
        itemId: String(it.itemId || ''),
        itemCode: it.itemCode || null,
        itemName: it.itemName || null,
        qty: Number(it.qty ?? 0),
        unitPrice: Number(it.unitPrice ?? 0),
        subtotal: Number(it.subtotal ?? Number(it.qty ?? 0) * Number(it.unitPrice ?? 0)),
      }))
    : [];
  return {
    id: String(io.id),
    ioNumber: String(io.ioNumber || '-'),
    customerPoId: String(io.customerPoId || ''),
    customerPoNumber: io.customerPoNumber || '-',
    customerId: io.customerId ? String(io.customerId) : null,
    customerName: io.customerName || '-',
    date: String(io.date || '').split('T')[0],
    estimatedDeliveryDate: io.estimatedDeliveryDate ? String(io.estimatedDeliveryDate).split('T')[0] : null,
    deliverTo: io.deliverTo || null,
    notes: io.notes || null,
    status: String(io.status || 'OPEN').toUpperCase(),
    managerMarketingStatus: String(io.managerMarketingStatus || 'PENDING').toUpperCase(),
    managerMarketingApprovedBy: io.managerMarketingApprovedBy || null,
    managerMarketingApprovedAt: io.managerMarketingApprovedAt || null,
    costControlStatus: String(io.costControlStatus || 'PENDING').toUpperCase(),
    costControlApprovedBy: io.costControlApprovedBy || null,
    costControlApprovedAt: io.costControlApprovedAt || null,
    totalAmount: Number(io.totalAmount ?? 0),
    items,
    createdAt: io.createdAt || null,
  };
}

export async function listSalesCustomerPosApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  status?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/sales/customer-pos', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSalesCustomerPo) : [], meta };
}

export async function createSalesCustomerPoApi(payload: SalesCustomerPoPayload): Promise<SalesCustomerPoRecord> {
  const res = await apiClient.post('/sales/customer-pos', payload);
  return normalizeSalesCustomerPo(res.data?.data || res.data);
}

export async function updateSalesCustomerPoApi(
  poId: string,
  payload: Partial<SalesCustomerPoPayload>
): Promise<SalesCustomerPoRecord> {
  const res = await apiClient.put(`/sales/customer-pos/${poId}`, payload);
  return normalizeSalesCustomerPo(res.data?.data || res.data);
}

export async function deleteSalesCustomerPoApi(poId: string): Promise<void> {
  await apiClient.delete(`/sales/customer-pos/${poId}`);
}

export async function listSalesIncomingOrdersApi(params: { page?: number; limit?: number; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/sales/incoming-orders', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSalesIo) : [], meta };
}

export async function createSalesIncomingOrderApi(
  payload: SalesIncomingOrderPayload
): Promise<SalesIncomingOrderRecord> {
  const res = await apiClient.post('/sales/incoming-orders', payload);
  return normalizeSalesIo(res.data?.data || res.data);
}

export async function createSalesIncomingOrderFromQuotationApi(
  payload: SalesIncomingOrderFromQuotationPayload
): Promise<SalesIncomingOrderRecord> {
  const res = await apiClient.post('/sales/incoming-orders/from-quotation', payload);
  return normalizeSalesIo(res.data?.data || res.data);
}

export async function deleteSalesIncomingOrderApi(ioId: string): Promise<void> {
  await apiClient.delete(`/sales/incoming-orders/${ioId}`);
}

export async function confirmSalesIoManagerMarketingApi(
  ioId: string,
  action: 'APPROVE' | 'REJECT' = 'APPROVE',
  notes?: string
): Promise<SalesIncomingOrderRecord> {
  const res = await apiClient.patch(`/sales/incoming-orders/${ioId}/confirm-manager-marketing`, { action, notes });
  return normalizeSalesIo(res.data?.data || res.data);
}

export async function confirmSalesIoCostControlApi(
  ioId: string,
  action: 'APPROVE' | 'REJECT' = 'APPROVE',
  notes?: string
): Promise<SalesIncomingOrderRecord> {
  const res = await apiClient.patch(`/sales/incoming-orders/${ioId}/confirm-cost-control`, { action, notes });
  return normalizeSalesIo(res.data?.data || res.data);
}

export async function printSalesIncomingOrderApi(ioId: string): Promise<void> {
  return printSalesHtmlReport(`/sales/incoming-orders/${ioId}/print`);
}

// ===========================================================================
// 5.5 E-KATALOG / MARKETING DIGITAL (/sales/e-catalog)
// ===========================================================================

export type ECatalogCategory =
  | 'INTRODUCTION_LETTER'
  | 'BROCHURE'
  | 'COMPANY_PROFILE'
  | 'PRODUCT_KNOWLEDGE'
  | 'PRICE_INCREASE_LETTER'
  | 'STOCK_DELAY_INFO';

export type ECatalogCategoryGroup = 'PROMOTIONAL_PROFILE' | 'PRODUCT_KNOWLEDGE' | 'COMMERCIAL_NOTICE';

export interface ECatalogRecord {
  id: string;
  materialCode: string;
  title: string;
  category: ECatalogCategory | string;
  categoryGroup: ECatalogCategoryGroup | string;
  description?: string | null;
  itemId?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  version: string;
  effectiveDate?: string | null;
  isPublished: boolean;
  uploadedBy?: string | null;
  createdAt?: string | null;
}

export interface ECatalogPayload {
  title: string;
  category: ECatalogCategory;
  description?: string | null;
  itemId?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  version?: string;
  effectiveDate?: string | null;
  isPublished?: boolean;
}

function normalizeECatalog(m: any): ECatalogRecord {
  return {
    id: String(m.id),
    materialCode: String(m.materialCode || '-'),
    title: String(m.title || '-'),
    category: String(m.category || 'BROCHURE').toUpperCase(),
    categoryGroup: String(m.categoryGroup || 'PROMOTIONAL_PROFILE').toUpperCase(),
    description: m.description || null,
    itemId: m.itemId ? String(m.itemId) : null,
    itemCode: m.itemCode || null,
    itemName: m.itemName || null,
    fileUrl: m.fileUrl || null,
    fileName: m.fileName || null,
    fileType: m.fileType || null,
    version: String(m.version || '1.0'),
    effectiveDate: m.effectiveDate ? String(m.effectiveDate).split('T')[0] : null,
    isPublished: m.isPublished !== false,
    uploadedBy: m.uploadedBy || null,
    createdAt: m.createdAt || null,
  };
}

export async function listECatalogApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  categoryGroup?: string;
  itemId?: string;
  isPublished?: boolean;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.category && params.category !== 'ALL') query.category = params.category;
  if (params.categoryGroup && params.categoryGroup !== 'ALL') query.categoryGroup = params.categoryGroup;
  if (params.itemId && params.itemId !== 'ALL') query.itemId = params.itemId;
  if (typeof params.isPublished === 'boolean') query.isPublished = params.isPublished;
  const res = await apiClient.get('/sales/e-catalog', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeECatalog) : [], meta };
}

export async function createECatalogApi(payload: ECatalogPayload): Promise<ECatalogRecord> {
  const res = await apiClient.post('/sales/e-catalog', payload);
  return normalizeECatalog(res.data?.data || res.data);
}

export async function updateECatalogApi(
  materialId: string,
  payload: Partial<ECatalogPayload>
): Promise<ECatalogRecord> {
  const res = await apiClient.put(`/sales/e-catalog/${materialId}`, payload);
  return normalizeECatalog(res.data?.data || res.data);
}

export async function deleteECatalogApi(materialId: string): Promise<void> {
  await apiClient.delete(`/sales/e-catalog/${materialId}`);
}

// ===========================================================================
// 5.6 ANALISA MARKET (/sales/market-analysis/*)
// ===========================================================================

export type MarketPeriodMode = 'YEAR_YEAR' | 'MONTH_MONTH' | 'DATE_DATE';
export type MarketDimension = 'by-sales-person' | 'by-customer' | 'by-product' | 'by-zoning';

export interface MarketComparisonParams {
  periodMode: MarketPeriodMode;
  yearA?: number;
  yearB?: number;
  monthA?: number;
  monthB?: number;
  startDateA?: string;
  endDateA?: string;
  startDateB?: string;
  endDateB?: string;
}

export interface MarketComparisonRow {
  entityId?: string | null;
  entityCode?: string | null;
  entityName: string;
  extra?: Record<string, any>;
  periodAAmount: number;
  periodAQty: number;
  periodACount: number;
  periodBAmount: number;
  periodBQty: number;
  periodBCount: number;
  deltaAmount: number;
  growthPercent?: number | null;
}

export interface MarketAnalysisResult {
  dimension: string;
  periodMode: string;
  periodALabel: string;
  periodBLabel: string;
  periodARange: { start?: string; end?: string };
  periodBRange: { start?: string; end?: string };
  totalPeriodAAmount: number;
  totalPeriodBAmount: number;
  totalDeltaAmount: number;
  totalGrowthPercent?: number | null;
  rows: MarketComparisonRow[];
}

export interface MarketVisualizationResult {
  range: { start: string; end: string };
  kpis: {
    totalSales: number;
    totalInvoices: number;
    totalCustomers: number;
    activeZones: number;
  };
  salesTrend: Array<{ period: string; month: number; totalSales: number; invoiceCount: number }>;
  byZoning: Array<{ zoning: string; customerCount: number; newCustomers: number; oldCustomers: number; totalSales: number }>;
  byProductCategory: Array<{ category: string; totalQty: number; totalSales: number; orderCount: number }>;
  byProductNumber: Array<{ itemId: string; itemCode: string; itemName: string; category: string; unit: string; totalQty: number; totalSales: number; orderCount: number }>;
  byCustomer: Array<{
    customerId: string;
    customerCode: string;
    customerName: string;
    status: string;
    zoning: string;
    city?: string | null;
    province?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    totalSales: number;
    invoiceCount: number;
  }>;
}

export async function getMarketAnalysisApi(
  dimension: MarketDimension,
  params: MarketComparisonParams
): Promise<MarketAnalysisResult> {
  const query: Record<string, unknown> = { periodMode: params.periodMode };
  if (params.yearA) query.yearA = params.yearA;
  if (params.yearB) query.yearB = params.yearB;
  if (params.monthA) query.monthA = params.monthA;
  if (params.monthB) query.monthB = params.monthB;
  if (params.startDateA) query.startDateA = params.startDateA;
  if (params.endDateA) query.endDateA = params.endDateA;
  if (params.startDateB) query.startDateB = params.startDateB;
  if (params.endDateB) query.endDateB = params.endDateB;

  const res = await apiClient.get(`/sales/market-analysis/${dimension}`, { params: query });
  const d = (res.data?.data || res.data || {}) as any;
  return {
    dimension: String(d.dimension || dimension),
    periodMode: String(d.periodMode || params.periodMode),
    periodALabel: String(d.periodALabel || 'Periode A'),
    periodBLabel: String(d.periodBLabel || 'Periode B'),
    periodARange: d.periodARange || {},
    periodBRange: d.periodBRange || {},
    totalPeriodAAmount: Number(d.totalPeriodAAmount ?? 0),
    totalPeriodBAmount: Number(d.totalPeriodBAmount ?? 0),
    totalDeltaAmount: Number(d.totalDeltaAmount ?? 0),
    totalGrowthPercent: d.totalGrowthPercent != null ? Number(d.totalGrowthPercent) : null,
    rows: Array.isArray(d.rows)
      ? d.rows.map((r: any) => ({
          entityId: r.entityId || null,
          entityCode: r.entityCode || null,
          entityName: String(r.entityName || '-'),
          extra: r.extra || {},
          periodAAmount: Number(r.periodAAmount ?? 0),
          periodAQty: Number(r.periodAQty ?? 0),
          periodACount: Number(r.periodACount ?? 0),
          periodBAmount: Number(r.periodBAmount ?? 0),
          periodBQty: Number(r.periodBQty ?? 0),
          periodBCount: Number(r.periodBCount ?? 0),
          deltaAmount: Number(r.deltaAmount ?? 0),
          growthPercent: r.growthPercent != null ? Number(r.growthPercent) : null,
        }))
      : [],
  };
}

export async function getMarketVisualizationsApi(params: {
  year?: number;
  dateFrom?: string;
  dateTo?: string;
  zoning?: string;
  productCategory?: string;
  itemCode?: string;
  customerId?: string;
}): Promise<MarketVisualizationResult> {
  const query: Record<string, unknown> = {};
  if (params.year) query.year = params.year;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  if (params.zoning) query.zoning = params.zoning;
  if (params.productCategory) query.productCategory = params.productCategory;
  if (params.itemCode) query.itemCode = params.itemCode;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;

  const res = await apiClient.get('/sales/market-analysis/visualizations', { params: query });
  const d = (res.data?.data || res.data || {}) as any;
  return {
    range: d.range || { start: '', end: '' },
    kpis: {
      totalSales: Number(d.kpis?.totalSales ?? 0),
      totalInvoices: Number(d.kpis?.totalInvoices ?? 0),
      totalCustomers: Number(d.kpis?.totalCustomers ?? 0),
      activeZones: Number(d.kpis?.activeZones ?? 0),
    },
    salesTrend: Array.isArray(d.salesTrend) ? d.salesTrend : [],
    byZoning: Array.isArray(d.byZoning) ? d.byZoning : [],
    byProductCategory: Array.isArray(d.byProductCategory) ? d.byProductCategory : [],
    byProductNumber: Array.isArray(d.byProductNumber) ? d.byProductNumber : [],
    byCustomer: Array.isArray(d.byCustomer) ? d.byCustomer : [],
  };
}

// ===========================================================================
// 6.2 SALES DAILY ACTIVITY (SDA) & SAMPLE REQUESTS
// ===========================================================================

export type AttendanceStatus = 'HADIR' | 'DINAS_LUAR' | 'IZIN' | 'SAKIT' | 'CUTI' | 'ALPHA';

export interface SalesDailyActivityRecord {
  id: string;
  activityNumber: string;
  employeeId: string;
  employeeName?: string | null;
  nik?: string | null;
  activityDate: string;
  attendanceStatus: AttendanceStatus | string;
  targetSalesAmount: number;
  actualSalesAmount: number;
  achievementPercent: number;
  visitingCount: number;
  callingCount: number;
  quotationCount: number;
  newCompanyCount: number;
  visitDetails: Record<string, any>[];
  customerId?: string | null;
  customerName?: string | null;
  activityType?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  notes?: string | null;
  status: string;
  createdAt?: string | null;
}

export interface SalesDailyActivityPayload {
  employeeId?: string | null;
  activityDate: string;
  attendanceStatus: AttendanceStatus;
  targetSalesAmount: number;
  actualSalesAmount: number;
  visitingCount: number;
  callingCount: number;
  quotationCount: number;
  newCompanyCount: number;
  customerId?: string | null;
  activityType?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  notes?: string | null;
}

export interface SalesDailyActivitySummary {
  totalReports: number;
  attendanceBreakdown: Record<string, number>;
  totalTargetSales: number;
  totalActualSales: number;
  achievementPercent: number;
  totalVisiting: number;
  totalCalling: number;
  totalQuotation: number;
  totalNewCompany: number;
}

function normalizeSda(r: any): SalesDailyActivityRecord {
  return {
    id: String(r.id),
    activityNumber: String(r.activityNumber || '-'),
    employeeId: String(r.employeeId || ''),
    employeeName: r.employeeName || '-',
    nik: r.nik || null,
    activityDate: String(r.activityDate || '').split('T')[0],
    attendanceStatus: String(r.attendanceStatus || 'HADIR').toUpperCase(),
    targetSalesAmount: Number(r.targetSalesAmount ?? 0),
    actualSalesAmount: Number(r.actualSalesAmount ?? 0),
    achievementPercent: Number(r.achievementPercent ?? 0),
    visitingCount: Number(r.visitingCount ?? 0),
    callingCount: Number(r.callingCount ?? 0),
    quotationCount: Number(r.quotationCount ?? 0),
    newCompanyCount: Number(r.newCompanyCount ?? 0),
    visitDetails: Array.isArray(r.visitDetails) ? r.visitDetails : [],
    customerId: r.customerId ? String(r.customerId) : null,
    customerName: r.customerName || null,
    activityType: r.activityType || null,
    gpsLatitude: r.gpsLatitude != null ? Number(r.gpsLatitude) : null,
    gpsLongitude: r.gpsLongitude != null ? Number(r.gpsLongitude) : null,
    notes: r.notes || null,
    status: String(r.status || 'SUBMITTED').toUpperCase(),
    createdAt: r.createdAt || null,
  };
}

export async function listDailyActivitiesApi(params: {
  page?: number;
  limit?: number;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  attendanceStatus?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.employeeId && params.employeeId !== 'ALL') query.employeeId = params.employeeId;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  if (params.attendanceStatus && params.attendanceStatus !== 'ALL') query.attendanceStatus = params.attendanceStatus;
  const res = await apiClient.get('/sales/daily-activities', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSda) : [], meta };
}

export async function getDailyActivitiesSummaryApi(params: {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<SalesDailyActivitySummary> {
  const query: Record<string, unknown> = {};
  if (params.employeeId && params.employeeId !== 'ALL') query.employeeId = params.employeeId;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  const res = await apiClient.get('/sales/daily-activities/summary', { params: query });
  const d = (res.data?.data || res.data || {}) as any;
  return {
    totalReports: Number(d.totalReports ?? 0),
    attendanceBreakdown: d.attendanceBreakdown || {},
    totalTargetSales: Number(d.totalTargetSales ?? 0),
    totalActualSales: Number(d.totalActualSales ?? 0),
    achievementPercent: Number(d.achievementPercent ?? 0),
    totalVisiting: Number(d.totalVisiting ?? 0),
    totalCalling: Number(d.totalCalling ?? 0),
    totalQuotation: Number(d.totalQuotation ?? 0),
    totalNewCompany: Number(d.totalNewCompany ?? 0),
  };
}

export async function createDailyActivityApi(payload: SalesDailyActivityPayload): Promise<SalesDailyActivityRecord> {
  const res = await apiClient.post('/sales/daily-activities', payload);
  return normalizeSda(res.data?.data || res.data);
}

export async function updateDailyActivityApi(
  sdaId: string,
  payload: Partial<SalesDailyActivityPayload>
): Promise<SalesDailyActivityRecord> {
  const res = await apiClient.put(`/sales/daily-activities/${sdaId}`, payload);
  return normalizeSda(res.data?.data || res.data);
}

export async function deleteDailyActivityApi(sdaId: string): Promise<void> {
  await apiClient.delete(`/sales/daily-activities/${sdaId}`);
}

export async function printDailyActivitiesReportApi(params: {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<void> {
  return printSalesHtmlReport('/sales/daily-activities/print', {
    employee_id: params.employeeId && params.employeeId !== 'ALL' ? params.employeeId : undefined,
    date_from: params.dateFrom || undefined,
    date_to: params.dateTo || undefined,
  });
}

export async function printSingleDailyActivityApi(sdaId: string): Promise<void> {
  return printSalesHtmlReport(`/sales/daily-activities/${sdaId}/print`);
}

// ─── 6.2 Sample Requests & Win/Lose Report ────────────────────

export type SampleOutcome = 'PENDING' | 'WIN' | 'LOSE';

export interface SampleRequestRecord {
  id: string;
  requestNumber: string;
  salesPersonId: string;
  salesPersonName?: string | null;
  customerId?: string | null;
  customerName: string;
  contactPerson?: string | null;
  contactPhone?: string | null;
  itemId?: string | null;
  itemCode?: string | null;
  productName: string;
  specificationNotes?: string | null;
  qtyRequested: number;
  unit: string;
  requestDate: string;
  neededDate?: string | null;
  purpose?: string | null;
  approvalStatus: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  deliveryStatus: string;
  sampleOutcome: SampleOutcome | string;
  outcomeNotes?: string | null;
  outcomeUpdatedAt?: string | null;
  estimatedPotentialValue: number;
  notes?: string | null;
  createdAt?: string | null;
}

export interface SampleRequestPayload {
  salesPersonId?: string | null;
  customerId?: string | null;
  customerName: string;
  contactPerson?: string | null;
  contactPhone?: string | null;
  itemId?: string | null;
  productName: string;
  specificationNotes?: string | null;
  qtyRequested: number;
  unit: string;
  requestDate?: string;
  neededDate?: string | null;
  purpose?: string | null;
  estimatedPotentialValue?: number;
  notes?: string | null;
}

export interface SampleWinLoseReport {
  totalSamples: number;
  approvedCount: number;
  pendingApprovalCount: number;
  rejectedApprovalCount: number;
  winCount: number;
  loseCount: number;
  pendingOutcomeCount: number;
  winRatePercent: number;
  totalPotentialValueWon: number;
  totalPotentialValueLost: number;
  bySalesPerson: Array<{
    salesPersonId: string;
    salesPersonName: string;
    total: number;
    win: number;
    lose: number;
    pending: number;
    winRatePercent: number;
    wonPotentialValue: number;
  }>;
}

function normalizeSampleRequest(r: any): SampleRequestRecord {
  return {
    id: String(r.id),
    requestNumber: String(r.requestNumber || '-'),
    salesPersonId: String(r.salesPersonId || ''),
    salesPersonName: r.salesPersonName || '-',
    customerId: r.customerId ? String(r.customerId) : null,
    customerName: String(r.customerName || '-'),
    contactPerson: r.contactPerson || null,
    contactPhone: r.contactPhone || null,
    itemId: r.itemId ? String(r.itemId) : null,
    itemCode: r.itemCode || null,
    productName: String(r.productName || '-'),
    specificationNotes: r.specificationNotes || null,
    qtyRequested: Number(r.qtyRequested ?? 1),
    unit: String(r.unit || 'pcs'),
    requestDate: String(r.requestDate || '').split('T')[0],
    neededDate: r.neededDate ? String(r.neededDate).split('T')[0] : null,
    purpose: r.purpose || null,
    approvalStatus: String(r.approvalStatus || 'PENDING').toUpperCase(),
    approvedBy: r.approvedBy || null,
    approvedAt: r.approvedAt || null,
    approvalNotes: r.approvalNotes || null,
    deliveryStatus: String(r.deliveryStatus || 'PENDING').toUpperCase(),
    sampleOutcome: String(r.sampleOutcome || 'PENDING').toUpperCase(),
    outcomeNotes: r.outcomeNotes || null,
    outcomeUpdatedAt: r.outcomeUpdatedAt || null,
    estimatedPotentialValue: Number(r.estimatedPotentialValue ?? 0),
    notes: r.notes || null,
    createdAt: r.createdAt || null,
  };
}

export async function listSampleRequestsApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  approvalStatus?: string;
  sampleOutcome?: string;
  salesPersonId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.search) query.search = params.search;
  if (params.approvalStatus && params.approvalStatus !== 'ALL') query.approvalStatus = params.approvalStatus;
  if (params.sampleOutcome && params.sampleOutcome !== 'ALL') query.sampleOutcome = params.sampleOutcome;
  if (params.salesPersonId && params.salesPersonId !== 'ALL') query.salesPersonId = params.salesPersonId;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  const res = await apiClient.get('/sales/sample-requests', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSampleRequest) : [], meta };
}

export async function getSampleWinLoseReportApi(params: {
  salesPersonId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<SampleWinLoseReport> {
  const query: Record<string, unknown> = {};
  if (params.salesPersonId && params.salesPersonId !== 'ALL') query.salesPersonId = params.salesPersonId;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  const res = await apiClient.get('/sales/sample-requests/report', { params: query });
  const d = (res.data?.data || res.data || {}) as any;
  return {
    totalSamples: Number(d.totalSamples ?? 0),
    approvedCount: Number(d.approvedCount ?? 0),
    pendingApprovalCount: Number(d.pendingApprovalCount ?? 0),
    rejectedApprovalCount: Number(d.rejectedApprovalCount ?? 0),
    winCount: Number(d.winCount ?? 0),
    loseCount: Number(d.loseCount ?? 0),
    pendingOutcomeCount: Number(d.pendingOutcomeCount ?? 0),
    winRatePercent: Number(d.winRatePercent ?? 0),
    totalPotentialValueWon: Number(d.totalPotentialValueWon ?? 0),
    totalPotentialValueLost: Number(d.totalPotentialValueLost ?? 0),
    bySalesPerson: Array.isArray(d.bySalesPerson) ? d.bySalesPerson : [],
  };
}

export async function createSampleRequestApi(payload: SampleRequestPayload): Promise<SampleRequestRecord> {
  const res = await apiClient.post('/sales/sample-requests', payload);
  return normalizeSampleRequest(res.data?.data || res.data);
}

export async function updateSampleRequestApi(
  sampleId: string,
  payload: Partial<SampleRequestPayload>
): Promise<SampleRequestRecord> {
  const res = await apiClient.put(`/sales/sample-requests/${sampleId}`, payload);
  return normalizeSampleRequest(res.data?.data || res.data);
}

export async function approveSampleRequestApi(
  sampleId: string,
  action: 'APPROVE' | 'REJECT',
  notes?: string
): Promise<SampleRequestRecord> {
  const res = await apiClient.patch(`/sales/sample-requests/${sampleId}/approve`, { action, notes });
  return normalizeSampleRequest(res.data?.data || res.data);
}

export async function updateSampleOutcomeApi(
  sampleId: string,
  payload: { sampleOutcome: SampleOutcome; outcomeNotes?: string; deliveryStatus?: string }
): Promise<SampleRequestRecord> {
  const res = await apiClient.patch(`/sales/sample-requests/${sampleId}/outcome`, payload);
  return normalizeSampleRequest(res.data?.data || res.data);
}

export async function deleteSampleRequestApi(sampleId: string): Promise<void> {
  await apiClient.delete(`/sales/sample-requests/${sampleId}`);
}

// ===========================================================================
// 6.3 KOMISI SALES + AUTO-SYNC SDA (/sales/commissions/*)
// ===========================================================================

export interface SalesCommissionSyncParams {
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  existingSalesRate: number;
  newCustomerRate: number;
  bonusPerNewCustomer: number;
  targetAchievementBonus: number;
  deductionAmount: number;
  notes?: string;
}

export interface SalesCommissionSyncPreview {
  employeeId: string;
  employeeName: string;
  periodMonth: number;
  periodYear: number;
  sourceMode: string;
  sdaSummary: {
    totalDaysReported: number;
    targetSalesAmount: number;
    actualSalesAmount: number;
    achievementPercent: number;
    visitingCount: number;
    callingCount: number;
    quotationCount: number;
    newCompanyCount: number;
  };
  existingSalesAmount: number;
  existingSalesRate: number;
  existingSalesCommission: number;
  newCustomerSalesAmount: number;
  newCustomerRate: number;
  newCustomerCommission: number;
  newCustomerCount: number;
  bonusAmount: number;
  deductionAmount: number;
  totalCommission: number;
}

export interface SalesCommissionRecordV2 {
  id: string;
  commissionNumber: string;
  employeeId: string;
  employeeName?: string | null;
  nik?: string | null;
  periodMonth: number;
  periodYear: number;
  existingSalesAmount: number;
  existingSalesRate: number;
  existingSalesCommission: number;
  newCustomerSalesAmount: number;
  newCustomerRate: number;
  newCustomerCommission: number;
  newCustomerCount: number;
  bonusAmount: number;
  deductionAmount: number;
  totalCommission: number;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  notes?: string | null;
}

export interface SalesCommissionManualPayload {
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

function normalizeSalesCommission(c: any): SalesCommissionRecordV2 {
  return {
    id: String(c.id),
    commissionNumber: String(c.commissionNumber || '-'),
    employeeId: String(c.employeeId || ''),
    employeeName: c.employeeName || '-',
    nik: c.nik || null,
    periodMonth: Number(c.periodMonth ?? 1),
    periodYear: Number(c.periodYear ?? new Date().getFullYear()),
    existingSalesAmount: Number(c.existingSalesAmount ?? 0),
    existingSalesRate: Number(c.existingSalesRate ?? 1),
    existingSalesCommission: Number(c.existingSalesCommission ?? 0),
    newCustomerSalesAmount: Number(c.newCustomerSalesAmount ?? 0),
    newCustomerRate: Number(c.newCustomerRate ?? 2),
    newCustomerCommission: Number(c.newCustomerCommission ?? 0),
    newCustomerCount: Number(c.newCustomerCount ?? 0),
    bonusAmount: Number(c.bonusAmount ?? 0),
    deductionAmount: Number(c.deductionAmount ?? 0),
    totalCommission: Number(c.totalCommission ?? 0),
    status: String(c.status || 'DRAFT').toUpperCase(),
    approvedBy: c.approvedBy || null,
    approvedAt: c.approvedAt || null,
    paidAt: c.paidAt || null,
    notes: c.notes || null,
  };
}

export async function previewSalesCommissionSyncApi(
  params: SalesCommissionSyncParams
): Promise<SalesCommissionSyncPreview> {
  const res = await apiClient.get('/sales/commissions/preview-sync', { params });
  const d = (res.data?.data || res.data || {}) as any;
  return {
    employeeId: String(d.employeeId || params.employeeId),
    employeeName: String(d.employeeName || '-'),
    periodMonth: Number(d.periodMonth ?? params.periodMonth),
    periodYear: Number(d.periodYear ?? params.periodYear),
    sourceMode: String(d.sourceMode || 'INVOICE_AND_SDA'),
    sdaSummary: {
      totalDaysReported: Number(d.sdaSummary?.totalDaysReported ?? 0),
      targetSalesAmount: Number(d.sdaSummary?.targetSalesAmount ?? 0),
      actualSalesAmount: Number(d.sdaSummary?.actualSalesAmount ?? 0),
      achievementPercent: Number(d.sdaSummary?.achievementPercent ?? 0),
      visitingCount: Number(d.sdaSummary?.visitingCount ?? 0),
      callingCount: Number(d.sdaSummary?.callingCount ?? 0),
      quotationCount: Number(d.sdaSummary?.quotationCount ?? 0),
      newCompanyCount: Number(d.sdaSummary?.newCompanyCount ?? 0),
    },
    existingSalesAmount: Number(d.existingSalesAmount ?? 0),
    existingSalesRate: Number(d.existingSalesRate ?? params.existingSalesRate),
    existingSalesCommission: Number(d.existingSalesCommission ?? 0),
    newCustomerSalesAmount: Number(d.newCustomerSalesAmount ?? 0),
    newCustomerRate: Number(d.newCustomerRate ?? params.newCustomerRate),
    newCustomerCommission: Number(d.newCustomerCommission ?? 0),
    newCustomerCount: Number(d.newCustomerCount ?? 0),
    bonusAmount: Number(d.bonusAmount ?? 0),
    deductionAmount: Number(d.deductionAmount ?? 0),
    totalCommission: Number(d.totalCommission ?? 0),
  };
}

export async function syncSalesCommissionApi(payload: SalesCommissionSyncParams): Promise<any> {
  const res = await apiClient.post('/sales/commissions/sync', payload);
  return res.data?.data || res.data;
}

export async function listSalesCommissionsV2Api(params: {
  page?: number;
  limit?: number;
  periodMonth?: number;
  periodYear?: number;
  employeeId?: string;
  status?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.periodMonth) query.periodMonth = params.periodMonth;
  if (params.periodYear) query.periodYear = params.periodYear;
  if (params.employeeId && params.employeeId !== 'ALL') query.employeeId = params.employeeId;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/sales/commissions', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSalesCommission) : [], meta };
}

export async function createSalesCommissionV2Api(
  payload: SalesCommissionManualPayload
): Promise<SalesCommissionRecordV2> {
  const res = await apiClient.post('/sales/commissions', payload);
  return normalizeSalesCommission(res.data?.data || res.data);
}

export async function updateSalesCommissionV2Api(
  commId: string,
  payload: Partial<SalesCommissionManualPayload>
): Promise<SalesCommissionRecordV2> {
  const res = await apiClient.put(`/sales/commissions/${commId}`, payload);
  return normalizeSalesCommission(res.data?.data || res.data);
}

export async function deleteSalesCommissionV2Api(commId: string): Promise<void> {
  await apiClient.delete(`/sales/commissions/${commId}`);
}

export async function printSalesCommissionV2Api(commId: string): Promise<void> {
  return printSalesHtmlReport(`/sales/commissions/${commId}/print`);
}

// ===========================================================================
// 6.4 ENTERTAIN SALES (/sales/entertainments)
// ===========================================================================

export interface SalesEntertainmentRecordV2 {
  id: string;
  documentNumber: string;
  employeeId: string;
  employeeName?: string | null;
  nik?: string | null;
  department?: string | null;
  customerId?: string | null;
  customerName: string;
  entertainmentDate: string;
  location: string;
  attendees?: string | null;
  purpose: string;
  estimatedAmount: number;
  actualAmount?: number | null;
  attachmentUrl?: string | null;
  status: string;
  managerStatus: string;
  managerApprovedBy?: string | null;
  managerApprovedAt?: string | null;
  managerNotes?: string | null;
  financeStatus: string;
  financeApprovedBy?: string | null;
  financeApprovedAt?: string | null;
  financeNotes?: string | null;
  createdAt?: string | null;
}

export interface SalesEntertainmentPayloadV2 {
  employeeId?: string | null;
  customerId?: string | null;
  customerName: string;
  entertainmentDate: string;
  location: string;
  attendees?: string | null;
  purpose: string;
  estimatedAmount: number;
  actualAmount?: number | null;
  attachmentUrl?: string | null;
}

function normalizeSalesEntertainment(e: any): SalesEntertainmentRecordV2 {
  return {
    id: String(e.id),
    documentNumber: String(e.documentNumber || '-'),
    employeeId: String(e.employeeId || ''),
    employeeName: e.employeeName || '-',
    nik: e.nik || null,
    department: e.department || null,
    customerId: e.customerId ? String(e.customerId) : null,
    customerName: String(e.customerName || '-'),
    entertainmentDate: String(e.entertainmentDate || '').split('T')[0],
    location: String(e.location || '-'),
    attendees: e.attendees || null,
    purpose: String(e.purpose || '-'),
    estimatedAmount: Number(e.estimatedAmount ?? 0),
    actualAmount: e.actualAmount != null ? Number(e.actualAmount) : null,
    attachmentUrl: e.attachmentUrl || null,
    status: String(e.status || 'PENDING').toUpperCase(),
    managerStatus: String(e.managerStatus || 'PENDING').toUpperCase(),
    managerApprovedBy: e.managerApprovedBy || null,
    managerApprovedAt: e.managerApprovedAt || null,
    managerNotes: e.managerNotes || null,
    financeStatus: String(e.financeStatus || 'PENDING').toUpperCase(),
    financeApprovedBy: e.financeApprovedBy || null,
    financeApprovedAt: e.financeApprovedAt || null,
    financeNotes: e.financeNotes || null,
    createdAt: e.createdAt || null,
  };
}

export async function listSalesEntertainmentsV2Api(params: { page?: number; limit?: number; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/sales/entertainments', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSalesEntertainment) : [], meta };
}

export async function createSalesEntertainmentV2Api(
  payload: SalesEntertainmentPayloadV2
): Promise<SalesEntertainmentRecordV2> {
  const res = await apiClient.post('/sales/entertainments', payload);
  return normalizeSalesEntertainment(res.data?.data || res.data);
}

export async function updateSalesEntertainmentV2Api(
  entId: string,
  payload: Partial<SalesEntertainmentPayloadV2>
): Promise<SalesEntertainmentRecordV2> {
  const res = await apiClient.put(`/sales/entertainments/${entId}`, payload);
  return normalizeSalesEntertainment(res.data?.data || res.data);
}

export async function deleteSalesEntertainmentV2Api(entId: string): Promise<void> {
  await apiClient.delete(`/sales/entertainments/${entId}`);
}

export async function approveSalesEntertainmentManagerApi(
  entId: string,
  action: 'APPROVE' | 'REJECT',
  notes?: string
): Promise<SalesEntertainmentRecordV2> {
  const res = await apiClient.patch(`/sales/entertainments/${entId}/approve-manager`, { action, notes });
  return normalizeSalesEntertainment(res.data?.data || res.data);
}

export async function approveSalesEntertainmentFinanceApi(
  entId: string,
  action: 'APPROVE' | 'REJECT',
  notes?: string
): Promise<SalesEntertainmentRecordV2> {
  const res = await apiClient.patch(`/sales/entertainments/${entId}/approve-finance`, { action, notes });
  return normalizeSalesEntertainment(res.data?.data || res.data);
}

export async function printSalesEntertainmentV2Api(entId: string): Promise<void> {
  return printSalesHtmlReport(`/sales/entertainments/${entId}/print`);
}

// ===========================================================================
// 6.5 FORECASTING SALES (/sales/forecasts)
// ===========================================================================

export interface SalesForecastRecord {
  id: string;
  forecastNumber: string;
  customerId: string;
  customerName?: string | null;
  customerCode?: string | null;
  salesPersonId: string;
  salesPersonName?: string | null;
  itemId?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  periodYear: number;
  periodMonth: number;
  forecastQty: number;
  unit: string;
  estimatedUnitPrice: number;
  forecastAmount: number;
  actualQty: number;
  actualAmount: number;
  probabilityPercent: number;
  weightedForecastAmount: number;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface SalesForecastPayload {
  customerId: string;
  salesPersonId?: string | null;
  itemId?: string | null;
  periodYear: number;
  periodMonth: number;
  forecastQty: number;
  unit: string;
  estimatedUnitPrice: number;
  forecastAmount?: number;
  actualQty?: number;
  actualAmount?: number;
  probabilityPercent: number;
  notes?: string | null;
}

function normalizeForecast(f: any): SalesForecastRecord {
  return {
    id: String(f.id),
    forecastNumber: String(f.forecastNumber || '-'),
    customerId: String(f.customerId || ''),
    customerName: f.customerName || '-',
    customerCode: f.customerCode || null,
    salesPersonId: String(f.salesPersonId || ''),
    salesPersonName: f.salesPersonName || '-',
    itemId: f.itemId ? String(f.itemId) : null,
    itemCode: f.itemCode || null,
    itemName: f.itemName || null,
    periodYear: Number(f.periodYear ?? new Date().getFullYear()),
    periodMonth: Number(f.periodMonth ?? 1),
    forecastQty: Number(f.forecastQty ?? 0),
    unit: String(f.unit || 'pcs'),
    estimatedUnitPrice: Number(f.estimatedUnitPrice ?? 0),
    forecastAmount: Number(f.forecastAmount ?? 0),
    actualQty: Number(f.actualQty ?? 0),
    actualAmount: Number(f.actualAmount ?? 0),
    probabilityPercent: Number(f.probabilityPercent ?? 70),
    weightedForecastAmount: Number(f.weightedForecastAmount ?? 0),
    status: String(f.status || 'PENDING_APPROVAL').toUpperCase(),
    approvedBy: f.approvedBy || null,
    approvedAt: f.approvedAt || null,
    approvalNotes: f.approvalNotes || null,
    notes: f.notes || null,
    createdAt: f.createdAt || null,
  };
}

export async function listSalesForecastsApi(params: {
  page?: number;
  limit?: number;
  periodYear?: number;
  periodMonth?: number;
  customerId?: string;
  salesPersonId?: string;
  itemId?: string;
  status?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.periodYear) query.periodYear = params.periodYear;
  if (params.periodMonth) query.periodMonth = params.periodMonth;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;
  if (params.salesPersonId && params.salesPersonId !== 'ALL') query.salesPersonId = params.salesPersonId;
  if (params.itemId && params.itemId !== 'ALL') query.itemId = params.itemId;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/sales/forecasts', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeForecast) : [], meta };
}

export async function createSalesForecastApi(payload: SalesForecastPayload): Promise<SalesForecastRecord> {
  const res = await apiClient.post('/sales/forecasts', payload);
  return normalizeForecast(res.data?.data || res.data);
}

export async function updateSalesForecastApi(
  forecastId: string,
  payload: Partial<SalesForecastPayload>
): Promise<SalesForecastRecord> {
  const res = await apiClient.put(`/sales/forecasts/${forecastId}`, payload);
  return normalizeForecast(res.data?.data || res.data);
}

export async function approveSalesForecastApi(
  forecastId: string,
  action: 'APPROVE' | 'REJECT',
  approvalNotes?: string
): Promise<SalesForecastRecord> {
  const res = await apiClient.patch(`/sales/forecasts/${forecastId}/approve`, { action, approvalNotes });
  return normalizeForecast(res.data?.data || res.data);
}

export async function deleteSalesForecastApi(forecastId: string): Promise<void> {
  await apiClient.delete(`/sales/forecasts/${forecastId}`);
}

// ===========================================================================
// 6.6 E-COMPLAINT, DISPOSISI & CORRECTIVE ACTION (/sales/complaints)
// ===========================================================================

export interface SalesComplaintRecord {
  id: string;
  complaintNumber: string;
  customerId: string;
  customerName?: string | null;
  salesInvoiceId?: string | null;
  invoiceNumber?: string | null;
  itemId?: string | null;
  itemName?: string | null;
  complaintDate: string;
  complaintType: string;
  proposedSolution: string;
  description: string;
  symptom?: string | null;
  discoveredWhere?: string | null;
  rejectQty: number;
  percentReject?: number | null;
  evidencePhotoUrl?: string | null;
  priority: string;
  assignedDepartment?: string | null;
  dispositionNotes?: string | null;
  dispositionBy?: string | null;
  dispositionAt?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  qcCheckedBy?: string | null;
  qcCheckedAt?: string | null;
  status: string;
  createdBy?: string | null;
  createdAt?: string | null;
}

export interface SalesComplaintPayload {
  customerId: string;
  salesInvoiceId?: string | null;
  itemId?: string | null;
  complaintDate?: string;
  complaintType: string;
  proposedSolution: string;
  description: string;
  symptom?: string | null;
  discoveredWhere?: string | null;
  rejectQty: number;
  percentReject?: number | null;
  evidencePhotoUrl?: string | null;
  priority?: string;
  assignedDepartment?: string | null;
  dispositionNotes?: string | null;
}

function normalizeSalesComplaint(c: any): SalesComplaintRecord {
  return {
    id: String(c.id),
    complaintNumber: String(c.complaintNumber || '-'),
    customerId: String(c.customerId || ''),
    customerName: c.customerName || '-',
    salesInvoiceId: c.salesInvoiceId ? String(c.salesInvoiceId) : null,
    invoiceNumber: c.invoiceNumber || null,
    itemId: c.itemId ? String(c.itemId) : null,
    itemName: c.itemName || null,
    complaintDate: String(c.complaintDate || '').split('T')[0],
    complaintType: String(c.complaintType || 'QUALITY_DEFECT'),
    proposedSolution: String(c.proposedSolution || 'REPLACEMENT'),
    description: String(c.description || ''),
    symptom: c.symptom || null,
    discoveredWhere: c.discoveredWhere || null,
    rejectQty: Number(c.rejectQty ?? 0),
    percentReject: c.percentReject != null ? Number(c.percentReject) : null,
    evidencePhotoUrl: c.evidencePhotoUrl || null,
    priority: String(c.priority || 'NORMAL').toUpperCase(),
    assignedDepartment: c.assignedDepartment || null,
    dispositionNotes: c.dispositionNotes || null,
    dispositionBy: c.dispositionBy || null,
    dispositionAt: c.dispositionAt || null,
    rootCause: c.rootCause || null,
    correctiveAction: c.correctiveAction || null,
    preventiveAction: c.preventiveAction || null,
    qcCheckedBy: c.qcCheckedBy || null,
    qcCheckedAt: c.qcCheckedAt || null,
    status: String(c.status || 'OPEN').toUpperCase(),
    createdBy: c.createdBy || null,
    createdAt: c.createdAt || null,
  };
}

export async function listSalesComplaintsApi(params: {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: params.limit || 20 };
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.customerId && params.customerId !== 'ALL') query.customerId = params.customerId;
  const res = await apiClient.get('/sales/complaints', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeSalesComplaint) : [], meta };
}

export async function createSalesComplaintApi(payload: SalesComplaintPayload): Promise<SalesComplaintRecord> {
  const res = await apiClient.post('/sales/complaints', payload);
  return normalizeSalesComplaint(res.data?.data || res.data);
}

export async function updateSalesComplaintApi(
  complaintId: string,
  payload: Partial<SalesComplaintPayload>
): Promise<SalesComplaintRecord> {
  const res = await apiClient.put(`/sales/complaints/${complaintId}`, payload);
  return normalizeSalesComplaint(res.data?.data || res.data);
}

export async function disposeSalesComplaintApi(
  complaintId: string,
  payload: { assignedDepartment: string; priority?: string; dispositionNotes: string; status?: string }
): Promise<SalesComplaintRecord> {
  const res = await apiClient.patch(`/sales/complaints/${complaintId}/disposition`, payload);
  return normalizeSalesComplaint(res.data?.data || res.data);
}

export async function submitSalesComplaintCorrectiveApi(
  complaintId: string,
  payload: { rootCause: string; correctiveAction: string; preventiveAction?: string; status?: string }
): Promise<SalesComplaintRecord> {
  const res = await apiClient.patch(`/sales/complaints/${complaintId}/corrective-action`, payload);
  return normalizeSalesComplaint(res.data?.data || res.data);
}

export async function deleteSalesComplaintApi(complaintId: string): Promise<void> {
  await apiClient.delete(`/sales/complaints/${complaintId}`);
}

// ===========================================================================
// LEGACY COMPATIBILITY EXPORTS (used by Delivery / other modules if any)
// ===========================================================================

export async function getSalesOrdersApi(page: number = 1, limit: number = 10, search?: string) {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    const response = await apiClient.get('/sales/orders', { params });
    const rawList = (response.data?.data || response.data) as any[];
    if (!Array.isArray(rawList)) return { data: [], meta: { totalPages: 1, page: 1 } };
    const meta = response.data?.meta || { totalPages: 1, page: 1 };
    const data = rawList.map((item: any, idx: number) => ({
      id: String(item.id || item.ioId || `SO-${idx + 1}`),
      ioNumber: String(item.ioNumber || `IO-${idx + 1}`),
      soNumber: String(item.customerPoNumber || item.ioNumber || `SO-${idx + 1}`),
      barcode: String(item.barcode || `899${String(item.ioNumber || '').replace(/\D/g, '') || '000001'}`),
      customerName: String(item.customerName || '-'),
      poCustomerRef: String(item.customerPoNumber || '-'),
      orderDate: String(item.date || '').split('T')[0],
      currentStage: (item.status || 'PRODUCTION') as any,
      timeline: [],
      steps: [],
      truckNumber: '-',
      driverName: '-',
      driverPhone: '-',
      eta: item.estimatedDeliveryDate || '-',
    }));
    return { data, meta };
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return { data: [], meta: { totalPages: 1, page: 1 } };
    }
    throw err;
  }
}

export async function createSalesOrderApi(payload: Partial<SalesTrackingOrder>): Promise<SalesTrackingOrder> {
  const response = await apiClient.post('/sales/orders', payload);
  return (response.data?.data || response.data) as SalesTrackingOrder;
}

export async function updateSalesOrderApi(id: string, payload: Partial<SalesTrackingOrder>): Promise<SalesTrackingOrder> {
  const response = await apiClient.put(`/sales/orders/${id}`, payload);
  return (response.data?.data || response.data) as SalesTrackingOrder;
}

export async function getQuotationsApi(page: number = 1, limit: number = 10, search?: string) {
  return listSalesQuotationsApi({ page, limit, search });
}

export async function approveQuotationApi(id: string): Promise<Quotation> {
  const response = await apiClient.post(`/sales/quotations/${id}/approve`);
  return (response.data?.data || response.data) as Quotation;
}
