import { apiClient } from '../lib/apiClient';
import type { WorkOrderSpk, QcInspectionRecord as LegacyQcRecord, QcStatus } from '../types';
import type {
  ProductionQCSummary,
  StockBatch,
  StockStatus,
  ProductionPlan,
  BOMAllocationItem,
  ProductionOutputRecord,
  RMConsumptionItem,
  ProductDevelopment,
  QCInspectionRecord,
  QCType,
  ReworkOrder,
  WasteRecord,
  WasteType,
  WasteSeverity,
} from '../types/productionQc';

export type ProductionDocType = 'spec_document' | 'tds_report' | 'qc_photo' | 'coa_attachment';

// ─── Shared Helpers ───────────────────────────────────────────

export function extractProductionError(err: any, fallback: string = 'Terjadi kesalahan'): { message: string; isHoldLockout: boolean } {
  const data = err?.response?.data;
  const detail = data?.detail;
  const code = detail?.code || data?.code || '';
  const isHoldLockout = err?.response?.status === 422 && String(code).toUpperCase() === 'HOLD_LOCKOUT';

  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return { message: detail.message, isHoldLockout };
  }
  if (typeof detail === 'string' && detail.trim()) {
    return { message: detail, isHoldLockout };
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return { message: data.message, isHoldLockout };
  }
  return { message: err?.message || fallback, isHoldLockout };
}

export function resolveProductionFileUrl(fileUrl?: string | null): string | null {
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

export async function uploadProductionDocument(docType: ProductionDocType, file: File): Promise<string> {
  const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const token = localStorage.getItem('samhance_access_token') || '';
  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('file', file);

  const res = await fetch(`${baseUrl}/production/upload-document`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.detail || 'Gagal mengunggah dokumen produksi/QC');
  }
  return json?.data?.file_url || json?.data?.fileUrl || json?.file_url || json?.fileUrl || '';
}

export async function printProductionHtmlReport(path: string): Promise<void> {
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

export async function getProductionDashboardSummaryApi(): Promise<ProductionQCSummary> {
  try {
    const res = await apiClient.get('/production/dashboard-summary');
    const d = (res.data?.data || res.data || {}) as any;
    return {
      plansTotal: Number(d.plansTotal ?? 0),
      plansPlanned: Number(d.plansPlanned ?? 0),
      spkActive: Number(d.spkActive ?? 0),
      spkCompleted: Number(d.spkCompleted ?? 0),
      stockAvailableBatches: Number(d.stockAvailableBatches ?? 0),
      stockHoldBatches: Number(d.stockHoldBatches ?? 0),
      qcTotal: Number(d.qcTotal ?? 0),
      qcIqcCount: Number(d.qcIqcCount ?? 0),
      qcPqcCount: Number(d.qcPqcCount ?? 0),
      qcOqcCount: Number(d.qcOqcCount ?? 0),
      qcPassRatePct: Number(d.qcPassRatePct ?? 0),
      reworkOpen: Number(d.reworkOpen ?? 0),
      reworkPassed: Number(d.reworkPassed ?? 0),
      reworkScrapped: Number(d.reworkScrapped ?? 0),
      rmWasteQty: Number(d.rmWasteQty ?? 0),
      productWasteQty: Number(d.productWasteQty ?? 0),
      productWasteCriticalCount: Number(d.productWasteCriticalCount ?? 0),
      rndProjectsTotal: Number(d.rndProjectsTotal ?? 0),
      rndPendingApproval: Number(d.rndPendingApproval ?? 0),
      rndApproved: Number(d.rndApproved ?? 0),
    };
  } catch {
    return {
      plansTotal: 0,
      plansPlanned: 0,
      spkActive: 0,
      spkCompleted: 0,
      stockAvailableBatches: 0,
      stockHoldBatches: 0,
      qcTotal: 0,
      qcIqcCount: 0,
      qcPqcCount: 0,
      qcOqcCount: 0,
      qcPassRatePct: 0,
      reworkOpen: 0,
      reworkPassed: 0,
      reworkScrapped: 0,
      rmWasteQty: 0,
      productWasteQty: 0,
      productWasteCriticalCount: 0,
      rndProjectsTotal: 0,
      rndPendingApproval: 0,
      rndApproved: 0,
    };
  }
}

// ─── Operators Dropdown (limit <= 100) ───────────────────────

export async function listProductionOperatorsApi(): Promise<{ id: string; nik?: string; fullName: string }[]> {
  try {
    const res = await apiClient.get('/hrd/employees', {
      params: { page: 1, limit: 100, department: 'PRODUKSI_QC' },
    });
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

// ─── Tab 1: 4.1.1 Planning & 4.1.2 SPK ───────────────────────

function normalizePlan(p: any): ProductionPlan {
  const allocs: BOMAllocationItem[] = Array.isArray(p.bomAllocations)
    ? p.bomAllocations.map((a: any) => ({
        stockInventoryId: String(a.stockInventoryId || ''),
        itemId: a.itemId ? String(a.itemId) : null,
        lotNumber: a.lotNumber || null,
        requiredQty: Number(a.requiredQty ?? 0),
      }))
    : [];
  return {
    id: String(p.id),
    planNumber: p.planNumber || null,
    spkNumber: String(p.spkNumber || p.planNumber || '-'),
    incomingOrderItemId: p.incomingOrderItemId ? String(p.incomingOrderItemId) : null,
    itemId: p.itemId ? String(p.itemId) : null,
    itemCode: p.itemCode || null,
    itemName: p.itemName || '-',
    targetQty: Number(p.targetQty ?? 0),
    accumulatedGoodQty: Number(p.accumulatedGoodQty ?? 0),
    accumulatedNgQty: Number(p.accumulatedNgQty ?? 0),
    planDate: String(p.planDate || '').split('T')[0],
    scheduledEndDate: p.scheduledEndDate ? String(p.scheduledEndDate).split('T')[0] : null,
    machineLine: p.machineLine || null,
    operatorId: p.operatorId ? String(p.operatorId) : null,
    operatorName: p.operatorName || null,
    bomAllocations: allocs,
    spkIssued: Boolean(p.spkIssued),
    spkIssuedBy: p.spkIssuedBy || null,
    spkIssuedAt: p.spkIssuedAt || null,
    status: String(p.status || 'PLANNED').toUpperCase(),
    notes: p.notes || null,
    createdAt: p.createdAt ? String(p.createdAt).split('T')[0] : null,
  };
}

export interface ProductionPlanPayload {
  itemId: string;
  targetQty: number;
  planDate: string;
  scheduledEndDate?: string | null;
  machineLine?: string | null;
  operatorId?: string | null;
  bomAllocations?: BOMAllocationItem[];
  notes?: string | null;
}

export async function listProductionPlansApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  spkOnly?: boolean;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.spkOnly) query.spkOnly = true;
  const res = await apiClient.get('/production/plans', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizePlan) : [], meta };
}

export async function createProductionPlanApi(payload: ProductionPlanPayload): Promise<ProductionPlan> {
  const res = await apiClient.post('/production/plans', payload);
  return normalizePlan(res.data?.data || res.data);
}

export async function updateProductionPlanApi(id: string, payload: Partial<ProductionPlanPayload>): Promise<ProductionPlan> {
  const res = await apiClient.put(`/production/plans/${id}`, payload);
  return normalizePlan(res.data?.data || res.data);
}

export async function deleteProductionPlanApi(id: string): Promise<void> {
  await apiClient.delete(`/production/plans/${id}`);
}

export async function issueSpkApi(
  id: string,
  payload: { operatorId?: string | null; machineLine?: string | null; notes?: string | null }
): Promise<ProductionPlan> {
  const res = await apiClient.patch(`/production/plans/${id}/issue-spk`, payload);
  return normalizePlan(res.data?.data || res.data);
}

// ─── Tab 2: 4.1.3 Production Outputs ─────────────────────────

function normalizeOutput(o: any): ProductionOutputRecord {
  const consumptions: RMConsumptionItem[] = Array.isArray(o.rmConsumptions)
    ? o.rmConsumptions.map((c: any) => ({
        stockInventoryId: String(c.stockInventoryId || ''),
        lotNumber: c.lotNumber || undefined,
        qtyUsed: Number(c.qtyUsed ?? 0),
        notes: c.notes || undefined,
      }))
    : [];
  return {
    id: String(o.id),
    productionPlanId: String(o.productionPlanId || ''),
    spkNumber: o.spkNumber || '-',
    itemId: String(o.itemId || ''),
    itemCode: o.itemCode || null,
    itemName: o.itemName || '-',
    operatorId: o.operatorId ? String(o.operatorId) : null,
    operatorName: o.operatorName || '-',
    shiftNumber: Number(o.shiftNumber ?? 1),
    machineLine: o.machineLine || null,
    goodQty: Number(o.goodQty ?? 0),
    ngQty: Number(o.ngQty ?? 0),
    reworkQty: Number(o.reworkQty ?? 0),
    wasteQty: Number(o.wasteQty ?? 0),
    lotNumber: String(o.lotNumber || '-'),
    rmConsumptions: consumptions,
    defectReason: o.defectReason || null,
    downtimeMinutes: Number(o.downtimeMinutes ?? 0),
    notes: o.notes || null,
    completedAt: o.completedAt || null,
  };
}

export interface ProductionOutputPayload {
  productionPlanId: string;
  itemId: string;
  operatorId?: string | null;
  shiftNumber: number;
  machineLine?: string | null;
  goodQty: number;
  ngQty: number;
  reworkQty: number;
  wasteQty: number;
  lotNumber?: string | null;
  downtimeMinutes: number;
  defectReason?: string | null;
  rmConsumptions: RMConsumptionItem[];
  notes?: string | null;
}

export async function listProductionOutputsApi(params: { page?: number; limit?: number; search?: string; productionPlanId?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.productionPlanId && params.productionPlanId !== 'ALL') query.productionPlanId = params.productionPlanId;
  const res = await apiClient.get('/production/outputs', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeOutput) : [], meta };
}

export async function createProductionOutputApi(payload: ProductionOutputPayload): Promise<ProductionOutputRecord> {
  const res = await apiClient.post('/production/outputs', payload);
  return normalizeOutput(res.data?.data || res.data);
}

export async function updateProductionOutputApi(id: string, payload: Partial<ProductionOutputPayload>): Promise<ProductionOutputRecord> {
  const res = await apiClient.put(`/production/outputs/${id}`, payload);
  return normalizeOutput(res.data?.data || res.data);
}

export async function deleteProductionOutputApi(id: string): Promise<void> {
  await apiClient.delete(`/production/outputs/${id}`);
}

// ─── Tab 3: 4.5.3 Stock Batches & HOLD Lockout ───────────────

function normalizeStock(s: any): StockBatch {
  return {
    id: String(s.id),
    itemId: String(s.itemId || ''),
    itemCode: s.itemCode || null,
    itemName: s.itemName || '-',
    itemCategory: s.itemCategory || null,
    unit: s.unit || 'PCS',
    lotNumber: String(s.lotNumber || '-'),
    rackNumber: s.rackNumber || null,
    qty: Number(s.qty ?? 0),
    expiredDate: s.expiredDate ? String(s.expiredDate).split('T')[0] : null,
    stockStatus: (String(s.stockStatus || 'HOLD').toUpperCase() as StockStatus),
    holdReason: s.holdReason || null,
    releasedBy: s.releasedBy || null,
    releasedAt: s.releasedAt || null,
  };
}

export interface StockBatchPayload {
  itemId: string;
  lotNumber: string;
  rackNumber?: string | null;
  qty: number;
  expiredDate?: string | null;
  stockStatus: StockStatus;
  holdReason?: string | null;
}

export async function listProductionStocksApi(params: { page?: number; limit?: number; search?: string; stockStatus?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 50) };
  if (params.search) query.search = params.search;
  if (params.stockStatus && params.stockStatus !== 'ALL') query.stockStatus = params.stockStatus;
  const res = await apiClient.get('/production/stocks', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeStock) : [], meta };
}

export async function listAvailableStocksForSpkApi(): Promise<StockBatch[]> {
  try {
    const res = await apiClient.get('/production/stocks/available-for-spk', { params: { page: 1, limit: 100 } });
    const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
    return Array.isArray(raw) ? raw.map(normalizeStock) : [];
  } catch {
    return [];
  }
}

export async function createProductionStockApi(payload: StockBatchPayload): Promise<StockBatch> {
  const res = await apiClient.post('/production/stocks', payload);
  return normalizeStock(res.data?.data || res.data);
}

export async function updateStockStatusApi(
  id: string,
  payload: { stockStatus: StockStatus; holdReason?: string | null }
): Promise<StockBatch> {
  const res = await apiClient.patch(`/production/stocks/${id}/status`, payload);
  return normalizeStock(res.data?.data || res.data);
}

export async function releaseHoldLockoutApi(payload: { stockInventoryId: string; reason: string }) {
  const res = await apiClient.post('/qc/hold-lockout/release', payload);
  return res.data?.data || res.data;
}

// ─── Tabs 4, 5, 7: IQC / PQC / OQC (COA) ─────────────────────

function normalizeQcInspection(q: any): QCInspectionRecord {
  return {
    id: String(q.id),
    inspectionNumber: q.inspectionNumber || null,
    qcType: (String(q.qcType || 'IQC').toUpperCase() as QCType),
    referenceType: String(q.referenceType || 'RECEIPT'),
    referenceId: String(q.referenceId || ''),
    itemId: q.itemId ? String(q.itemId) : null,
    itemCode: q.itemCode || null,
    itemName: q.itemName || '-',
    stockInventoryId: q.stockInventoryId ? String(q.stockInventoryId) : null,
    productionPlanId: q.productionPlanId ? String(q.productionPlanId) : null,
    spkNumber: q.spkNumber || null,
    lotNumber: q.lotNumber || null,
    checkedBy: String(q.checkedBy || ''),
    inspectorName: q.inspectorName || '-',
    sampleSizeQty: Number(q.sampleSizeQty ?? 0),
    passQty: Number(q.passQty ?? 0),
    failQty: Number(q.failQty ?? 0),
    status: String(q.status || 'HOLD').toUpperCase(),
    coaNumber: q.coaNumber || null,
    tdsStandard: q.tdsStandard || null,
    customerName: q.customerName || null,
    routedToRework: Boolean(q.routedToRework),
    inspectionData: q.inspectionData && typeof q.inspectionData === 'object' ? q.inspectionData : {},
    notes: q.notes || null,
    createdAt: q.createdAt ? String(q.createdAt).split('T')[0] : null,
  };
}

export interface QCInspectionPayload {
  qcType: QCType;
  referenceType: 'RECEIPT' | 'PRODUCTION' | 'DO';
  stockInventoryId?: string | null;
  productionPlanId?: string | null;
  itemId?: string | null;
  lotNumber?: string | null;
  tdsStandard?: string | null;
  customerName?: string | null;
  coaNumber?: string | null;
  sampleSizeQty: number;
  passQty: number;
  failQty: number;
  status: string;
  routeToRework?: boolean;
  reworkInstruction?: string | null;
  inspectionData?: Record<string, string | number>;
  notes?: string | null;
}

export async function listQcInspectionsApi(params: { qcType: QCType; page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = {
    qcType: params.qcType,
    page: params.page || 1,
    limit: Math.min(100, params.limit || 20),
  };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/qc/inspections', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeQcInspection) : [], meta };
}

export async function createQcInspectionApi(payload: QCInspectionPayload): Promise<QCInspectionRecord> {
  const res = await apiClient.post('/qc/inspections', payload);
  return normalizeQcInspection(res.data?.data || res.data);
}

export async function updateQcInspectionApi(id: string, payload: Partial<QCInspectionPayload>): Promise<QCInspectionRecord> {
  const res = await apiClient.put(`/qc/inspections/${id}`, payload);
  return normalizeQcInspection(res.data?.data || res.data);
}

export async function deleteQcInspectionApi(id: string): Promise<void> {
  await apiClient.delete(`/qc/inspections/${id}`);
}

// ─── Tab 6: 4.5.2 Rework / Repair ────────────────────────────

function normalizeRework(r: any): ReworkOrder {
  return {
    id: String(r.id),
    reworkNumber: String(r.reworkNumber || '-'),
    qualityControlId: r.qualityControlId ? String(r.qualityControlId) : null,
    productionPlanId: r.productionPlanId ? String(r.productionPlanId) : null,
    spkNumber: r.spkNumber || null,
    itemId: r.itemId ? String(r.itemId) : null,
    itemCode: r.itemCode || null,
    itemName: r.itemName || '-',
    lotNumber: r.lotNumber || null,
    reworkQty: Number(r.reworkQty ?? 0),
    goodAfterReworkQty: Number(r.goodAfterReworkQty ?? 0),
    scrapAfterReworkQty: Number(r.scrapAfterReworkQty ?? 0),
    defectDescription: r.defectDescription || '',
    repairInstruction: r.repairInstruction || null,
    assignedOperatorId: r.assignedOperatorId ? String(r.assignedOperatorId) : null,
    assignedOperatorName: r.assignedOperatorName || null,
    status: String(r.status || 'OPEN').toUpperCase(),
    reinspectedBy: r.reinspectedBy || null,
    reinspectedAt: r.reinspectedAt || null,
    reinspectionNotes: r.reinspectionNotes || null,
    createdAt: r.createdAt ? String(r.createdAt).split('T')[0] : null,
  };
}

export interface ReworkOrderPayload {
  productionPlanId?: string | null;
  itemId: string;
  lotNumber?: string | null;
  reworkQty: number;
  defectDescription: string;
  repairInstruction?: string | null;
  assignedOperatorId?: string | null;
}

export interface ReworkReinspectPayload {
  goodAfterReworkQty: number;
  scrapAfterReworkQty: number;
  verdict: 'PASSED' | 'SCRAPPED';
  autoLogProductWaste: boolean;
  notes?: string | null;
}

export async function listReworkOrdersApi(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/production/reworks', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeRework) : [], meta };
}

export async function createReworkOrderApi(payload: ReworkOrderPayload): Promise<ReworkOrder> {
  const res = await apiClient.post('/production/reworks', payload);
  return normalizeRework(res.data?.data || res.data);
}

export async function updateReworkOrderApi(id: string, payload: Partial<ReworkOrderPayload>): Promise<ReworkOrder> {
  const res = await apiClient.put(`/production/reworks/${id}`, payload);
  return normalizeRework(res.data?.data || res.data);
}

export async function deleteReworkOrderApi(id: string): Promise<void> {
  await apiClient.delete(`/production/reworks/${id}`);
}

export async function reinspectReworkOrderApi(id: string, payload: ReworkReinspectPayload): Promise<ReworkOrder> {
  const res = await apiClient.patch(`/production/reworks/${id}/reinspect`, payload);
  return normalizeRework(res.data?.data || res.data);
}

// ─── Tab 8: 4.2.1 & 4.2.2 Product Developments ──────────────

function normalizeProductDev(d: any): ProductDevelopment {
  return {
    id: String(d.id),
    projectCode: String(d.projectCode || '-'),
    category: String(d.category || ''),
    productName: String(d.productName || '-'),
    sizeSpec: d.sizeSpec || null,
    targetPrice: Number(d.targetPrice ?? 0),
    monthlyQtyEstimate: Number(d.monthlyQtyEstimate ?? 0),
    customerId: d.customerId ? String(d.customerId) : null,
    customerName: d.customerName || null,
    requestedById: d.requestedById ? String(d.requestedById) : null,
    requestedByName: d.requestedByName || null,
    specDocumentUrl: d.specDocumentUrl || null,
    specVersion: String(d.specVersion || 'v1.0'),
    specNotes: d.specNotes || null,
    trialNotes: d.trialNotes || null,
    status: String(d.status || 'DRAFT').toUpperCase(),
    approvedBy: d.approvedBy || null,
    approvedAt: d.approvedAt || null,
    approvalNotes: d.approvalNotes || null,
    createdAt: d.createdAt ? String(d.createdAt).split('T')[0] : null,
  };
}

export interface ProductDevelopmentPayload {
  category: string;
  productName: string;
  sizeSpec?: string | null;
  targetPrice: number;
  monthlyQtyEstimate: number;
  customerId?: string | null;
  customerName?: string | null;
  specVersion?: string;
  specDocumentUrl?: string | null;
  specNotes?: string | null;
  trialNotes?: string | null;
}

export async function listProductDevelopmentsApi(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  const res = await apiClient.get('/production/product-developments', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeProductDev) : [], meta };
}

export async function createProductDevelopmentApi(payload: ProductDevelopmentPayload): Promise<ProductDevelopment> {
  const res = await apiClient.post('/production/product-developments', payload);
  return normalizeProductDev(res.data?.data || res.data);
}

export async function updateProductDevelopmentApi(id: string, payload: Partial<ProductDevelopmentPayload>): Promise<ProductDevelopment> {
  const res = await apiClient.put(`/production/product-developments/${id}`, payload);
  return normalizeProductDev(res.data?.data || res.data);
}

export async function deleteProductDevelopmentApi(id: string): Promise<void> {
  await apiClient.delete(`/production/product-developments/${id}`);
}

export async function approveProductSampleApi(
  id: string,
  payload: { action: 'APPROVE' | 'REJECT'; specVersion?: string; specDocumentUrl?: string | null; notes?: string | null }
): Promise<ProductDevelopment> {
  const res = await apiClient.patch(`/production/product-developments/${id}/approve-sample`, payload);
  return normalizeProductDev(res.data?.data || res.data);
}

// ─── Tab 9: 3.5.1 RM Wastes & 3.6.1 Product Wastes (CAPA) ───

function normalizeWaste(w: any): WasteRecord {
  return {
    id: String(w.id),
    wasteCode: String(w.wasteCode || '-'),
    type: (String(w.type || 'RM_WASTE').toUpperCase() as WasteType),
    itemId: String(w.itemId || ''),
    itemCode: w.itemCode || null,
    itemName: w.itemName || '-',
    unit: w.unit || 'PCS',
    productionPlanId: w.productionPlanId ? String(w.productionPlanId) : null,
    stockInventoryId: w.stockInventoryId ? String(w.stockInventoryId) : null,
    wasteDate: w.wasteDate ? String(w.wasteDate).split('T')[0] : null,
    lotNumber: w.lotNumber || null,
    qty: Number(w.qty ?? 0),
    severity: (w.severity ? String(w.severity).toUpperCase() : 'MINOR') as WasteSeverity,
    reason: w.reason || null,
    rootCause: w.rootCause || null,
    correctiveAction: w.correctiveAction || null,
    preventiveAction: w.preventiveAction || null,
    reportedBy: String(w.reportedBy || ''),
    reportedByName: w.reportedByName || '-',
    createdAt: w.createdAt ? String(w.createdAt).split('T')[0] : null,
  };
}

export interface WastePayload {
  type: WasteType;
  itemId: string;
  stockInventoryId?: string | null;
  productionPlanId?: string | null;
  wasteDate: string;
  lotNumber?: string | null;
  qty: number;
  severity: WasteSeverity;
  reason?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
}

export async function listProductionWastesApi(params: {
  page?: number;
  limit?: number;
  search?: string;
  wasteType?: string;
  severity?: string;
}) {
  const query: Record<string, unknown> = { page: params.page || 1, limit: Math.min(100, params.limit || 20) };
  if (params.search) query.search = params.search;
  if (params.wasteType && params.wasteType !== 'ALL') query.wasteType = params.wasteType;
  if (params.severity && params.severity !== 'ALL') query.severity = params.severity;
  const res = await apiClient.get('/production/wastes', { params: query });
  const raw = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
  const meta = res.data?.meta || { totalPages: 1, page: 1 };
  return { data: Array.isArray(raw) ? raw.map(normalizeWaste) : [], meta };
}

export async function createProductionWasteApi(payload: WastePayload): Promise<WasteRecord> {
  const res = await apiClient.post('/production/wastes', payload);
  return normalizeWaste(res.data?.data || res.data);
}

export async function updateProductionWasteApi(id: string, payload: Partial<WastePayload>): Promise<WasteRecord> {
  const res = await apiClient.put(`/production/wastes/${id}`, payload);
  return normalizeWaste(res.data?.data || res.data);
}

export async function deleteProductionWasteApi(id: string): Promise<void> {
  await apiClient.delete(`/production/wastes/${id}`);
}

// ─── Backward-compatible Legacy Exports ──────────────────────

export async function getProductionOrdersApi(): Promise<WorkOrderSpk[]> {
  try {
    const response = await apiClient.get('/production/orders');
    const rawList = (response.data?.data || response.data) as any[];
    if (!Array.isArray(rawList)) return [];
    return rawList.map((item: any, idx: number) => ({
      ...item,
      id: String(item.id || item.spk_number || `WO-${idx + 1}`),
      spkNumber: String(item.spkNumber || item.spk_number || `SPK-${idx + 1}`),
    })) as WorkOrderSpk[];
  } catch {
    return [];
  }
}

export async function createProductionOrderApi(payload: Partial<WorkOrderSpk>): Promise<WorkOrderSpk> {
  const response = await apiClient.post('/production/orders', payload);
  return (response.data?.data || response.data) as WorkOrderSpk;
}

export async function updateProductionOrderApi(id: string, payload: Partial<WorkOrderSpk>): Promise<WorkOrderSpk> {
  const response = await apiClient.put(`/production/orders/${id}`, payload);
  return (response.data?.data || response.data) as WorkOrderSpk;
}

export async function getQcRecordsApi(page: number = 1, limit: number = 10, search?: string) {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    const response = await apiClient.get('/production/qc-records', { params });
    const rawList = (response.data?.data || response.data) as any[];
    if (!Array.isArray(rawList)) return { data: [], meta: { total_pages: 1, page: 1 } };
    const meta = response.data?.meta || { total_pages: 1, page: 1 };
    const data = rawList.map((rec: any, idx: number) => ({
      id: String(rec.id || `QC-${idx + 1}`),
      lotNumber: String(rec.lotNumber || `LOT-${idx + 1}`),
      itemCode: String(rec.itemCode || ''),
      itemName: String(rec.itemName || ''),
      batchSize: Number(rec.batchSize || 0),
      unit: String(rec.unit || 'PCS'),
      status: String(rec.status || 'PASS').toUpperCase() as QcStatus,
      inspectionDate: String(rec.inspectionDate || ''),
      inspectorName: String(rec.inspectorName || ''),
      inspectorRole: String(rec.inspectorRole || ''),
      testedParameters: Array.isArray(rec.testedParameters) ? rec.testedParameters : [],
    })) as LegacyQcRecord[];
    return { data, meta };
  } catch {
    return { data: [], meta: { total_pages: 1, page: 1 } };
  }
}

export async function overrideQcHoldApi(id: string, overrideReason: string): Promise<LegacyQcRecord> {
  const response = await apiClient.post(`/production/qc-records/${id}/override`, { overrideReason });
  return (response.data?.data || response.data) as LegacyQcRecord;
}
