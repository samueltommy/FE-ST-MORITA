import { apiClient } from '../lib/apiClient';
import type { ProcurementOrder, EximDocument, ProcurementStage } from '../types';

export async function getPurchaseOrdersApi(): Promise<ProcurementOrder[]> {
  try {
    const response = await apiClient.get('/procurement/orders');
    const rawData = response.data?.data || response.data || [];
    return rawData.map((po: any) => {
      // Map status backend ke stage Kanban FE ('PR' | 'PO' | 'LOG' | 'IQC' | 'AP')
      let mappedStage: ProcurementStage = 'PO';
      if (po.poStatus === 'RELEASED') mappedStage = 'LOG'; // In-Transit / Port
      if (po.poStatus === 'PARTIAL_RECEIVED') mappedStage = 'IQC'; // IQC Incoming Test
      return {
        id: po.poId,
        poNumber: po.poNumber,
        vendorName: po.supplierName,
        itemsCount: po.items ? po.items.length : 1,
        totalAmount: po.totalAmount || 0,
        stage: mappedStage,
        stageProgress: mappedStage === 'LOG' ? 50 : (mappedStage === 'IQC' ? 80 : 20),
        lastUpdate: po.createdAt,
        estimatedArrival: po.deliveryDate || po.createdAt,
      };
    }) as ProcurementOrder[];
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /procurement/orders belum siap (404/405). Mengembalikan array kosong.");
      return [];
    }
    throw err;
  }
}

export async function createPurchaseOrderApi(payload: Partial<ProcurementOrder>): Promise<ProcurementOrder> {
  const response = await apiClient.post('/procurement/orders', payload);
  return (response.data?.data || response.data) as ProcurementOrder;
}

export async function updatePurchaseOrderApi(id: string, payload: Partial<ProcurementOrder>): Promise<ProcurementOrder> {
  const response = await apiClient.put(`/procurement/orders/${id}`, payload);
  return (response.data?.data || response.data) as ProcurementOrder;
}

export async function getEximDocsApi(): Promise<EximDocument[]> {
  try {
    const response = await apiClient.get('/procurement/exim-docs');
    const rawData = response.data?.data || response.data || [];
    
    return rawData.map((doc: any) => {
      let mappedType: any = 'BC 2.3';
      if (doc.docType === 'BC27') mappedType = 'BC 2.7';
      if (doc.docType === 'BC40') mappedType = 'BC 4.0';
      if (doc.docType === 'SPPB') mappedType = 'SPPB Gate-Pass';
      
      let mappedStatus: 'VERIFIED' | 'PENDING_CUSTOMS' | 'REJECTED' = 'VERIFIED';
      if (doc.status === 'IN_INSPECTION' || doc.status === 'PENDING') mappedStatus = 'PENDING_CUSTOMS';
      if (doc.status === 'REJECTED') mappedStatus = 'REJECTED';

      return {
        id: doc.id,
        docType: mappedType,
        referenceNumber: doc.docNumber || doc.referenceNumber || 'DOC-000',
        referenceNo: doc.docNumber || doc.referenceNumber,
        registrationDate: doc.createdAt || doc.registrationDate || new Date().toISOString(),
        status: mappedStatus,
        fileName: `${doc.docNumber || 'doc'}.pdf`,
        fileSize: '1.4 MB',
        notes: doc.goodsDescription || doc.notes || 'Dokumen kepabeanan',
      };
    }) as EximDocument[];
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /procurement/exim-docs belum siap (404/405). Mengembalikan array kosong.");
      return [];
    }
    throw err;
  }
}

export async function uploadEximDocApi(payload: Partial<EximDocument>): Promise<EximDocument> {
  const response = await apiClient.post('/procurement/exim-docs', payload);
  return (response.data?.data || response.data) as EximDocument;
}

