import { apiClient } from '../lib/apiClient';
import type { WorkOrderSpk, QcInspectionRecord, QcStatus } from '../types';

export async function getProductionOrdersApi(): Promise<WorkOrderSpk[]> {
  try {
    const response = await apiClient.get('/production/orders');
    const rawList = (response.data?.data || response.data) as any[];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: any, idx: number) => ({
      ...item,
      id: String(item.id || item.spk_number || `WO-${idx + 1}`),
      spkNumber: String(item.spkNumber || item.spk_number || `SPK-${idx + 1}`),
      customerIoRef: item.customerIoRef || item.customer_io_ref,
      itemCode: String(item.itemCode || item.item_code || 'ITM-01'),
      itemName: String(item.itemName || item.item_name || 'Production Item'),
      targetQuantity: Number(item.targetQuantity ?? item.target_quantity ?? 100),
      producedGoodQty: Number(item.producedGoodQty ?? item.produced_good_qty ?? 0),
      producedNgQty: Number(item.producedNgQty ?? item.produced_ng_qty ?? 0),
      unit: String(item.unit || 'Roll'),
      targetWidthMm: Number(item.targetWidthMm ?? item.target_width_mm ?? 0),
      targetLengthM: Number(item.targetLengthM ?? item.target_length_m ?? 0),
      targetMicron: item.targetMicron ?? item.target_micron,
      productionLine: String(item.productionLine || item.production_line || 'Line 1'),
      operatorName: String(item.operatorName || item.operator_name || 'Operator'),
      spkStatus: item.spkStatus || item.spk_status || 'QUEUED',
      startDate: String(item.startDate || item.start_date || '2026-09-15'),
      dueDate: String(item.dueDate || item.due_date || '2026-09-30'),
      rawMaterialLotChecked: Boolean(item.rawMaterialLotChecked ?? item.raw_material_lot_checked ?? false),
    })) as WorkOrderSpk[];
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /production/orders belum siap (404/405). Mengembalikan array kosong.");
      return [];
    }
    throw err;
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
      id: String(rec.id || rec.inspectionId || rec.inspection_id || `QC-${idx + 1}`),
      lotNumber: String(rec.lotNumber || rec.inspectionNumber || rec.inspection_number || `LOT-QC-00${idx + 1}`),
      itemCode: String(rec.itemCode || rec.item_code || 'ITM-BOPP-01'),
      itemName: String(rec.itemName || rec.item_name || `Inspeksi ${rec.inspectionNumber || rec.inspection_number || 'Batch Sample'}`),
      batchSize: Number(rec.batchSize || rec.batch_size || 100),
      unit: String(rec.unit || 'Roll'),
      status: ((rec.status || rec.qcResult || rec.qc_result || 'PASS').toUpperCase()) as QcStatus,
      inspectionDate: String(rec.inspectionDate || (rec.createdAt ? String(rec.createdAt).split('T')[0] : '2026-09-15')),
      inspectorName: String(rec.inspectorName || rec.inspector_name || 'Siti (QC Lab)'),
      inspectorRole: String(rec.inspectorRole || 'Quality Assurance Specialist'),
      defectReason: rec.defectReason || rec.defect_reason || undefined,
      holdTimestamp: rec.holdTimestamp || undefined,
      overrideBy: rec.overrideBy || undefined,
      overrideReason: rec.overrideReason || undefined,
      testedParameters: Array.isArray(rec.testedParameters) && rec.testedParameters.length > 0 ? rec.testedParameters : [
        { name: 'Kekuatan Rekat 180°', standard: '≥ 7.0 N/25mm', actual: '7.8 N/25mm', result: 'OK' },
        { name: 'Tebal Adhesive', standard: '45 ± 2 μm', actual: '46.1 μm', result: 'OK' },
        { name: 'Tensile Strength', standard: '≥ 140 MPa', actual: '158 MPa', result: 'OK' },
        { name: 'Elongation at Break', standard: '120 - 180 %', actual: '148 %', result: 'OK' },
      ],
      coaNumber: rec.coaNumber || rec.coa_number || undefined,
    }));
    return { data, meta };
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /production/qc-records belum siap. Mengembalikan array kosong.");
      return { data: [], meta: { total_pages: 1, page: 1 } };
    }
    throw err;
  }
}

export async function overrideQcHoldApi(id: string, overrideReason: string): Promise<QcInspectionRecord> {
  const response = await apiClient.post(`/production/qc-records/${id}/override`, { overrideReason });
  return (response.data?.data || response.data) as QcInspectionRecord;
}
