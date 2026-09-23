import { apiClient } from '../lib/apiClient';
import type {
  GenericResponse,
  InvoiceCalculateOut,
  InvoiceOut,
  ARPaymentOut,
  ComplaintOut,
  RMAResolveOut,
} from '../lib/schemas';
import type { DeliveryOrder } from '../types';

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
  // ... other fields based on backend
}

export interface RMAResolveRequestPayload {
  credit_note_amount: number;
  notes: string;
}

// ─── Core 6 Finance Services ────────────────────────────────

export async function calculateInvoiceApi(payload: InvoiceCalculatePayload): Promise<InvoiceCalculateOut> {
  const response = await apiClient.post('/finance/invoices/calculate', payload);
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

// ─── External / Logistics (Core 5) Dependency ────────────────

export async function getDeliveryOrdersApi(page: number = 1, limit: number = 10, search?: string) {
  // Mock endpoint calling until backend exposes GET /logistics/delivery-orders
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    const response = await apiClient.get('/logistics/delivery-orders', { params });
    const data = (response.data?.data || response.data) as DeliveryOrder[];
    const meta = response.data?.meta || { total_pages: 1, page: 1 };
    return { data, meta };
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /logistics/delivery-orders belum siap (404/405). Mengembalikan array kosong.");
      return { data: [], meta: { total_pages: 1, page: 1 } };
    }
    throw err;
  }
}
