import { apiClient } from '../lib/apiClient';
import type {
  LogisticsDashboardSummary,
  DeliveryPlan,
  DeliveryPlanItem,
  DeliveryRequest,
  DeliveryRequestItem,
  DeliveryOrderRecord,
  DeliveryOrderItem,
  TrackingEvent,
  RMStockItemSummary,
  StockMovement,
  StockMovementType,
  ShippingMethod,
} from '../types/logisticsRmStock';

export type LogisticsDocType =
  | 'pod_photo'
  | 'delivery_note'
  | 'bc_document'
  | 'stock_opname_sheet'
  | 'transfer_slip'
  | 'tracking_photo';

// ─── Shared Helpers ───────────────────────────────────────────

export function extractLogisticsError(
  err: any,
  fallback: string = 'Terjadi kesalahan'
): { message: string; code: string; isHoldLockout: boolean; isInsufficientStock: boolean } {
  const data = err?.response?.data;
  const detail = data?.detail;
  const code = String(detail?.code || data?.code || '').toUpperCase();
  const isHoldLockout = err?.response?.status === 422 && code === 'HOLD_LOCKOUT';
  const isInsufficientStock = err?.response?.status === 422 && code === 'INSUFFICIENT_STOCK';

  let message = err?.message || fallback;
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    message = detail.message;
  } else if (typeof detail === 'string' && detail.trim()) {
    message = detail;
  } else if (typeof data?.message === 'string' && data.message.trim()) {
    message = data.message;
  }
  return { message, code, isHoldLockout, isInsufficientStock };
}

export function resolveLogisticsFileUrl(fileUrl?: string | null): string | null {
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

export async function uploadLogisticsDocument(docType: LogisticsDocType, file: File): Promise<string> {
  const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const token = localStorage.getItem('samhance_access_token') || '';
  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('file', file);

  const res = await fetch(`${baseUrl}/logistics/upload-document`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.detail || 'Gagal mengunggah dokumen logistik');
  }
  return json?.data?.file_url || json?.data?.fileUrl || json?.file_url || json?.fileUrl || '';
}

export async function printLogisticsHtmlReport(path: string): Promise<void> {
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
    throw new Error('Popup browser diblokir, mohon izinkan pop-up untuk mencetak.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      // ignore
    }
  }, 350);
}

// ─── Dashboard Summary ───────────────────────────────────────

export async function getLogisticsDashboardSummaryApi(): Promise<LogisticsDashboardSummary> {
  try {
    const res = await apiClient.get('/logistics/dashboard-summary');
    const d = (res.data?.data || res.data || {}) as any;
    return {
      deliveryPlansTotal: Number(d.deliveryPlansTotal ?? 0),
      deliveryPlansActive: Number(d.deliveryPlansActive ?? 0),
      rdoPendingCount: Number(d.rdoPendingCount ?? 0),
      doTotal: Number(d.doTotal ?? 0),
      doPreparing: Number(d.doPreparing ?? 0),
      doOnTheWay: Number(d.doOnTheWay ?? 0),
      doDelivered: Number(d.doDelivered ?? 0),
      trackingEventsTotal: Number(d.trackingEventsTotal ?? 0),
      rmItemsTotal: Number(d.rmItemsTotal ?? 0),
      rmLowStockCount: Number(d.rmLowStockCount ?? 0),
      rmOutOfStockCount: Number(d.rmOutOfStockCount ?? 0),
      stockAdjustmentsCount: Number(d.stockAdjustmentsCount ?? 0),
      rmTransfersCount: Number(d.rmTransfersCount ?? 0),
    };
  } catch {
    return {
      deliveryPlansTotal: 0,
      deliveryPlansActive: 0,
      rdoPendingCount: 0,
      doTotal: 0,
      doPreparing: 0,
      doOnTheWay: 0,
      doDelivered: 0,
      trackingEventsTotal: 0,
      rmItemsTotal: 0,
      rmLowStockCount: 0,
      rmOutOfStockCount: 0,
      stockAdjustmentsCount: 0,
      rmTransfersCount: 0,
    };
  }
}

// ─── Incoming Order Dropdown (limit <= 100) ──────────────────

export async function listIncomingOrdersDropdownApi(): Promise<{ id: string; ioNumber: string; customerId?: string; customerName?: string }[]> {
  try {
    const res = await apiClient.get('/sales/incoming-orders', { params: { page: 1, limit: 100 } });
    const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((x: any) => ({
        id: String(x.id),
        ioNumber: String(x.ioNumber || x.number || x.id),
        customerId: x.customerId ? String(x.customerId) : undefined,
        customerName: x.customerName || x.customer?.name || '',
      }));
    }
  } catch {
    // fallback to /finance/incoming-orders
  }
  try {
    const res = await apiClient.get('/finance/incoming-orders', { params: { page: 1, limit: 100 } });
    const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
    return Array.isArray(raw)
      ? raw.map((x: any) => ({
          id: String(x.id),
          ioNumber: String(x.ioNumber || x.number || x.id),
          customerId: x.customerId ? String(x.customerId) : undefined,
          customerName: x.customerName || x.customer?.name || '',
        }))
      : [];
  } catch {
    return [];
  }
}

// ─── Tab 1: 5.3.1 Delivery Plans ─────────────────────────────

function normalizePlan(p: any): DeliveryPlan {
  const items: DeliveryPlanItem[] = Array.isArray(p.items)
    ? p.items.map((it: any) => ({
        id: it.id ? String(it.id) : undefined,
        itemId: String(it.itemId || ''),
        itemCode: it.itemCode || null,
        itemName: it.itemName || '-',
        unit: it.unit || 'PCS',
        plannedQty: Number(it.plannedQty ?? 0),
        lotNumber: it.lotNumber || null,
        notes: it.notes || null,
      }))
    : [];
  return {
    id: String(p.id),
    planNumber: String(p.planNumber || '-'),
    planDate: String(p.planDate || '').split('T')[0],
    customerId: p.customerId ? String(p.customerId) : null,
    customerName: p.customerName || '-',
    incomingOrderId: p.incomingOrderId ? String(p.incomingOrderId) : null,
    ioNumber: p.ioNumber || null,
    deliveryRequestId: p.deliveryRequestId ? String(p.deliveryRequestId) : null,
    requestNumber: p.requestNumber || null,
    vehicleNumber: p.vehicleNumber || null,
    driverName: p.driverName || null,
    shippingMethod: p.shippingMethod || 'OWN_VEHICLE',
    destinationAddress: p.destinationAddress || null,
    zoning: p.zoning || null,
    estimatedDepartureTime: p.estimatedDepartureTime || null,
    priority: String(p.priority || 'NORMAL').toUpperCase(),
    status: String(p.status || 'PLANNED').toUpperCase(),
    plannedBy: p.plannedBy || null,
    notes: p.notes || null,
    items,
    createdAt: p.createdAt ? String(p.createdAt).split('T')[0] : null,
  };
}

export interface DeliveryPlanPayload {
  planDate: string;
  customerId?: string | null;
  incomingOrderId?: string | null;
  deliveryRequestId?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  shippingMethod: ShippingMethod;
  destinationAddress?: string | null;
  zoning?: string | null;
  estimatedDepartureTime?: string | null;
  priority: 'NORMAL' | 'URGENT';
  notes?: string | null;
  items: DeliveryPlanItem[];
}

export async function listDeliveryPlansApi(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/logistics/delivery-plans', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizePlan) : [], meta };
}

export async function createDeliveryPlanApi(payload: DeliveryPlanPayload): Promise<DeliveryPlan> {
  const res = await apiClient.post('/logistics/delivery-plans', payload);
  return normalizePlan(res.data?.data || res.data);
}

export async function updateDeliveryPlanApi(id: string, payload: Partial<DeliveryPlanPayload>): Promise<DeliveryPlan> {
  const res = await apiClient.put(`/logistics/delivery-plans/${id}`, payload);
  return normalizePlan(res.data?.data || res.data);
}

export async function deleteDeliveryPlanApi(id: string): Promise<void> {
  await apiClient.delete(`/logistics/delivery-plans/${id}`);
}

// ─── Tab 2: 5.3.2 Request Delivery Orders (RDO) ──────────────

function normalizeRdo(r: any): DeliveryRequest {
  const items: DeliveryRequestItem[] = Array.isArray(r.items)
    ? r.items.map((it: any) => ({
        id: it.id ? String(it.id) : undefined,
        itemId: String(it.itemId || ''),
        itemCode: it.itemCode || null,
        itemName: it.itemName || '-',
        unit: it.unit || 'PCS',
        qtyToShip: Number(it.qtyToShip ?? 0),
      }))
    : [];
  return {
    id: String(r.id),
    requestNumber: String(r.requestNumber || '-'),
    incomingOrderId: r.incomingOrderId ? String(r.incomingOrderId) : null,
    ioNumber: r.ioNumber || null,
    customerPoId: r.customerPoId ? String(r.customerPoId) : null,
    poNumber: r.poNumber || null,
    customerId: r.customerId ? String(r.customerId) : null,
    customerName: r.customerName || '-',
    requestDate: String(r.requestDate || '').split('T')[0],
    requestedDeliveryDate: r.requestedDeliveryDate ? String(r.requestedDeliveryDate).split('T')[0] : null,
    deliverTo: r.deliverTo || null,
    poDeliveryNote: r.poDeliveryNote || null,
    requestedBy: r.requestedBy || '-',
    approvedBy: r.approvedBy || null,
    approvedAt: r.approvedAt || null,
    status: String(r.status || 'PENDING').toUpperCase(),
    notes: r.notes || null,
    items,
    createdAt: r.createdAt ? String(r.createdAt).split('T')[0] : null,
  };
}

export interface DeliveryRequestPayload {
  incomingOrderId?: string | null;
  customerPoId?: string | null;
  customerId?: string | null;
  requestedDeliveryDate?: string | null;
  deliverTo?: string | null;
  poDeliveryNote?: string | null;
  notes?: string | null;
  items: DeliveryRequestItem[];
}

export async function listDeliveryRequestsApi(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/logistics/delivery-requests', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeRdo) : [], meta };
}

export async function createDeliveryRequestApi(payload: DeliveryRequestPayload): Promise<DeliveryRequest> {
  const res = await apiClient.post('/logistics/delivery-requests', payload);
  return normalizeRdo(res.data?.data || res.data);
}

export async function updateDeliveryRequestApi(id: string, payload: Partial<DeliveryRequestPayload>): Promise<DeliveryRequest> {
  const res = await apiClient.put(`/logistics/delivery-requests/${id}`, payload);
  return normalizeRdo(res.data?.data || res.data);
}

export async function deleteDeliveryRequestApi(id: string): Promise<void> {
  await apiClient.delete(`/logistics/delivery-requests/${id}`);
}

export async function reviewDeliveryRequestApi(id: string, payload: { action: 'APPROVE' | 'REJECT'; notes?: string | null }) {
  const res = await apiClient.patch(`/logistics/delivery-requests/${id}/review`, payload);
  return normalizeRdo(res.data?.data || res.data);
}

// ─── Tab 3: 5.3.3 Delivery Orders (DO / Surat Jalan) ─────────

function normalizeDo(d: any): DeliveryOrderRecord {
  const items: DeliveryOrderItem[] = Array.isArray(d.items)
    ? d.items.map((it: any) => ({
        id: it.id ? String(it.id) : undefined,
        itemId: String(it.itemId || ''),
        itemCode: it.itemCode || null,
        itemName: it.itemName || '-',
        unit: it.unit || 'PCS',
        stockInventoryId: it.stockInventoryId ? String(it.stockInventoryId) : null,
        qtyShipped: Number(it.qtyShipped ?? 0),
        lotNumber: it.lotNumber || '',
        notes: it.notes || null,
      }))
    : [];
  return {
    id: String(d.id),
    doNumber: String(d.doNumber || '-'),
    deliveryRequestId: d.deliveryRequestId ? String(d.deliveryRequestId) : null,
    requestNumber: d.requestNumber || null,
    deliveryPlanId: d.deliveryPlanId ? String(d.deliveryPlanId) : null,
    planNumber: d.planNumber || null,
    incomingOrderId: d.incomingOrderId ? String(d.incomingOrderId) : null,
    ioNumber: d.ioNumber || null,
    customerId: d.customerId ? String(d.customerId) : null,
    customerName: d.customerName || '-',
    doDate: String(d.doDate || '').split('T')[0],
    vehicleNumber: d.vehicleNumber || null,
    driverName: d.driverName || null,
    shippingMethod: d.shippingMethod || 'OWN_VEHICLE',
    customsDocType: d.customsDocType || 'NONE',
    customsDocNumber: d.customsDocNumber || null,
    deliverTo: d.deliverTo || null,
    recipientName: d.recipientName || null,
    recipientPhone: d.recipientPhone || null,
    coaNumber: d.coaNumber || null,
    oqcInspectionId: d.oqcInspectionId ? String(d.oqcInspectionId) : null,
    podFileUrl: d.podFileUrl || null,
    deliveredAt: d.deliveredAt || null,
    issuedBy: d.issuedBy || null,
    status: String(d.status || 'PREPARING_LOADING').toUpperCase(),
    notes: d.notes || null,
    items,
    createdAt: d.createdAt ? String(d.createdAt).split('T')[0] : null,
  };
}

export interface DeliveryOrderPayload {
  deliveryPlanId?: string | null;
  deliveryRequestId?: string | null;
  incomingOrderId?: string | null;
  customerId?: string | null;
  doDate: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  shippingMethod?: string | null;
  customsDocType?: string | null;
  customsDocNumber?: string | null;
  deliverTo?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  coaNumber?: string | null;
  oqcInspectionId?: string | null;
  notes?: string | null;
  items: DeliveryOrderItem[];
}

export interface DeliveryOrderStatusPayload {
  status: 'PREPARING_LOADING' | 'ON_THE_WAY' | 'DELIVERED_RECEIVED' | 'DELIVERY_FAILED_RETURNED';
  location?: string | null;
  recipientName?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  podFileUrl?: string | null;
  notes?: string | null;
}

export async function listDeliveryOrdersApi(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/logistics/delivery-orders', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeDo) : [], meta };
}

export async function createDeliveryOrderApi(payload: DeliveryOrderPayload): Promise<DeliveryOrderRecord> {
  const res = await apiClient.post('/logistics/delivery-orders', payload);
  return normalizeDo(res.data?.data || res.data);
}

export async function updateDeliveryOrderApi(id: string, payload: Partial<DeliveryOrderPayload>): Promise<DeliveryOrderRecord> {
  const res = await apiClient.put(`/logistics/delivery-orders/${id}`, payload);
  return normalizeDo(res.data?.data || res.data);
}

export async function deleteDeliveryOrderApi(id: string): Promise<void> {
  await apiClient.delete(`/logistics/delivery-orders/${id}`);
}

export async function updateDeliveryOrderStatusApi(id: string, payload: DeliveryOrderStatusPayload): Promise<DeliveryOrderRecord> {
  const res = await apiClient.patch(`/logistics/delivery-orders/${id}/status`, payload);
  return normalizeDo(res.data?.data || res.data);
}

// ─── Tab 4: 5.4.1 & 5.4.2 E-Tracking ─────────────────────────

function normalizeTracking(t: any): TrackingEvent {
  return {
    id: String(t.id),
    trackingCode: String(t.trackingCode || '-'),
    incomingOrderId: t.incomingOrderId ? String(t.incomingOrderId) : null,
    ioNumber: t.ioNumber || null,
    customerPoId: t.customerPoId ? String(t.customerPoId) : null,
    deliveryOrderId: t.deliveryOrderId ? String(t.deliveryOrderId) : null,
    doNumber: t.doNumber || null,
    productionPlanId: t.productionPlanId ? String(t.productionPlanId) : null,
    customerName: t.customerName || '-',
    referenceNumber: t.referenceNumber || t.doNumber || t.ioNumber || '-',
    stage: String(t.stage || 'WAITING_FOR_MATERIAL').toUpperCase(),
    location: t.location || null,
    gpsLatitude: t.gpsLatitude != null ? Number(t.gpsLatitude) : null,
    gpsLongitude: t.gpsLongitude != null ? Number(t.gpsLongitude) : null,
    notes: t.notes || null,
    photoUrl: t.photoUrl || null,
    updatedBy: t.updatedBy || '-',
    eventTime: t.eventTime || t.createdAt || null,
  };
}

export interface TrackingEventPayload {
  deliveryOrderId?: string | null;
  incomingOrderId?: string | null;
  referenceNumber?: string | null;
  customerName?: string | null;
  stage: string;
  location?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  photoUrl?: string | null;
  notes?: string | null;
}

export async function lookupTrackingApi(code: string): Promise<{ reference: string; events: TrackingEvent[] }> {
  const res = await apiClient.get('/logistics/tracking/lookup', { params: { code } });
  const d = res.data?.data || res.data || {};
  const rawEvents = Array.isArray(d) ? d : Array.isArray(d.events) ? d.events : Array.isArray(d.timeline) ? d.timeline : [];
  return {
    reference: String(d.referenceNumber || d.trackingCode || code),
    events: rawEvents.map(normalizeTracking),
  };
}

export async function listTrackingEventsApi(params: { page?: number; limit?: number; search?: string; stage?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.stage && params.stage !== 'ALL') query.stage = params.stage;
  const res = await apiClient.get('/logistics/tracking-events', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeTracking) : [], meta };
}

export async function createTrackingEventApi(payload: TrackingEventPayload): Promise<TrackingEvent> {
  const res = await apiClient.post('/logistics/tracking-events', payload);
  return normalizeTracking(res.data?.data || res.data);
}

export async function updateTrackingEventApi(id: string, payload: Partial<TrackingEventPayload>): Promise<TrackingEvent> {
  const res = await apiClient.put(`/logistics/tracking-events/${id}`, payload);
  return normalizeTracking(res.data?.data || res.data);
}

export async function deleteTrackingEventApi(id: string): Promise<void> {
  await apiClient.delete(`/logistics/tracking-events/${id}`);
}

// ─── Tab 5: 3.2.1 RM Stock Monitoring, Adjustments & Transfers

function normalizeRmSummary(s: any): RMStockItemSummary {
  return {
    itemId: String(s.itemId || s.id || ''),
    itemCode: String(s.itemCode || '-'),
    itemName: String(s.itemName || '-'),
    category: String(s.category || 'RAW_MATERIAL'),
    unit: String(s.unit || 'PCS'),
    minStock: Number(s.minStock ?? 0),
    availableQty: Number(s.availableQty ?? 0),
    holdQty: Number(s.holdQty ?? 0),
    totalQty: Number(s.totalQty ?? 0),
    batchCount: Number(s.batchCount ?? 0),
    isLowStock: Boolean(s.isLowStock),
    shortageQty: Number(s.shortageQty ?? 0),
    stockHealth: (String(s.stockHealth || 'SAFE').toUpperCase() as RMStockItemSummary['stockHealth']),
  };
}

function normalizeMovement(m: any): StockMovement {
  return {
    id: String(m.id),
    movementNumber: String(m.movementNumber || '-'),
    movementType: (String(m.movementType || 'ADJUSTMENT_IN').toUpperCase() as StockMovementType),
    movementDate: String(m.movementDate || '').split('T')[0],
    itemId: String(m.itemId || ''),
    itemCode: m.itemCode || null,
    itemName: m.itemName || '-',
    unit: m.unit || 'PCS',
    stockInventoryId: m.stockInventoryId ? String(m.stockInventoryId) : null,
    targetStockInventoryId: m.targetStockInventoryId ? String(m.targetStockInventoryId) : null,
    lotNumber: m.lotNumber || null,
    qtyBefore: Number(m.qtyBefore ?? 0),
    qtyChange: Number(m.qtyChange ?? 0),
    qtyAfter: Number(m.qtyAfter ?? 0),
    fromRack: m.fromRack || null,
    toRack: m.toRack || null,
    fromLocation: m.fromLocation || null,
    toLocation: m.toLocation || null,
    referenceNumber: m.referenceNumber || null,
    reason: m.reason || null,
    notes: m.notes || null,
    performedBy: m.performedBy || '-',
    createdAt: m.createdAt ? String(m.createdAt).split('T')[0] : null,
  };
}

export async function getRmStockMonitoringApi(params: { category?: string; lowStockOnly?: boolean; search?: string }) {
  const query: Record<string, unknown> = {};
  if (params.category && params.category !== 'ALL') query.category = params.category;
  if (params.lowStockOnly) query.lowStockOnly = true;
  if (params.search) query.search = params.search;
  const res = await apiClient.get('/warehouse/rm-stocks/monitoring', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  return Array.isArray(raw) ? raw.map(normalizeRmSummary) : [];
}

export async function updateItemMinStockApi(itemId: string, minStock: number) {
  const res = await apiClient.patch(`/warehouse/rm-stocks/items/${itemId}/min-stock`, { minStock });
  return res.data?.data || res.data;
}

export async function listStockMovementsApi(params: { page?: number; limit?: number; movementType?: string; search?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.movementType && params.movementType !== 'ALL') query.movementType = params.movementType;
  if (params.search) query.search = params.search;
  const res = await apiClient.get('/warehouse/rm-stocks/movements', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeMovement) : [], meta };
}

export interface StockAdjustmentPayload {
  movementType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'STOCK_OPNAME';
  movementDate: string;
  stockInventoryId: string;
  qty: number;
  referenceNumber?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export async function createStockAdjustmentApi(payload: StockAdjustmentPayload): Promise<StockMovement> {
  const res = await apiClient.post('/warehouse/rm-stocks/adjustments', payload);
  return normalizeMovement(res.data?.data || res.data);
}

export interface RmTransferPayload {
  movementDate: string;
  stockInventoryId: string;
  qtyTransfer: number;
  fromLocation: string;
  toLocation: string;
  toRack?: string | null;
  referenceNumber?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export async function createRmTransferApi(payload: RmTransferPayload): Promise<StockMovement> {
  const res = await apiClient.post('/warehouse/rm-stocks/transfers', payload);
  return normalizeMovement(res.data?.data || res.data);
}

export async function updateStockMovementApi(id: string, payload: { referenceNumber?: string | null; reason?: string | null; notes?: string | null }) {
  const res = await apiClient.put(`/warehouse/rm-stocks/movements/${id}`, payload);
  return normalizeMovement(res.data?.data || res.data);
}

export async function deleteStockMovementApi(id: string): Promise<void> {
  await apiClient.delete(`/warehouse/rm-stocks/movements/${id}`);
}
