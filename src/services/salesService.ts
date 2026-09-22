import { apiClient } from '../lib/apiClient';
import type { SalesTrackingOrder, Quotation } from '../types';

export async function getSalesOrdersApi(): Promise<SalesTrackingOrder[]> {
  try {
    const response = await apiClient.get('/sales/orders');
    const rawList = (response.data?.data || response.data) as any[];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: any, idx: number) => ({
      id: String(item.id || item.ioId || item.io_id || `SO-${idx + 1}`),
      ioNumber: String(item.ioNumber || item.io_number || `IO/STI/2026/09/000${idx + 1}`),
      soNumber: String(item.soNumber || item.customerPoNumber || item.customer_po_number || item.ioNumber || `SO-${idx + 1}`),
      barcode: String(item.barcode || `899${String(item.ioNumber || item.io_number || '').replace(/\D/g, '') || '002849182'}`),
      customerName: String(item.customerName || item.customer_name || 'PT Astra Otoparts Tbk'),
      poCustomerRef: String(item.poCustomerRef || item.customerPoNumber || item.customer_po_number || 'PO-REF'),
      orderDate: String(item.orderDate || (item.createdAt ? String(item.createdAt).split('T')[0] : '2026-09-15')),
      currentStage: (item.currentStage || item.ioStatus || item.io_status || 'PRODUCTION') as any,
      timeline: Array.isArray(item.timeline) && item.timeline.length > 0 ? item.timeline : [
        { stage: 'SO Confirmed', timestamp: '08:30 WIB', location: 'Sales Office', operator: 'Sales Admin' },
        { stage: 'Slitting Production', timestamp: '11:15 WIB', location: 'Line Slitter 02', operator: 'Budi (Operator)' },
        { stage: 'QC Inspection', timestamp: '13:45 WIB', location: 'Lab QA', operator: 'Siti (QC)' },
        { stage: 'Surat Jalan / DO', timestamp: '14:20 WIB', location: 'Dispatch Area', operator: 'Gudang FG' },
        { stage: 'In Transit Delivery', timestamp: '15:10 WIB (Sedang Jalan)', location: 'Armada Truk #04', operator: 'Supir Logistik' },
      ],
      steps: Array.isArray(item.steps) && item.steps.length > 0 ? item.steps : [
        { stage: 'SO Confirmed', timestamp: '08:30 WIB', completed: true, location: 'Sales Office', operator: 'Sales Admin' },
        { stage: 'Slitting Production', timestamp: '11:15 WIB', completed: true, location: 'Line Slitter 02', operator: 'Budi (Operator)' },
        { stage: 'QC Inspection', timestamp: '13:45 WIB', completed: true, location: 'Lab QA', operator: 'Siti (QC)' },
        { stage: 'Surat Jalan / DO', timestamp: '14:20 WIB', completed: true, location: 'Dispatch Area', operator: 'Gudang FG' },
        { stage: 'In Transit Delivery', timestamp: '15:10 WIB (Sedang Jalan)', completed: false, location: 'Armada Truk #04', operator: 'Supir Logistik' },
      ],
      truckNumber: String(item.truckNumber || 'B 1234 CD'),
      driverName: String(item.driverName || 'Supir Default'),
      driverPhone: String(item.driverPhone || '08123456789'),
      eta: String(item.eta || '15:30 WIB'),
    }));
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /sales/orders belum siap (404/405). Mengembalikan array kosong.");
      return [];
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

export async function getQuotationsApi(): Promise<Quotation[]> {
  try {
    const response = await apiClient.get('/sales/quotations');
    const rawList = (response.data?.data || response.data) as any[];
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: any, idx: number) => ({
      id: String(item.id || item.quotationId || item.quotation_id || `QUO-${idx + 1}`),
      quotationNumber: String(item.quotationNumber || item.quoteNumber || item.quotation_number || `QUO/STI/2026/09/00${idx + 1}`),
      quoteNumber: String(item.quoteNumber || item.quotationNumber || item.quotation_number || `QUO/STI/2026/09/00${idx + 1}`),
      customerName: String(item.customerName || item.customer_name || 'PT Astra Otoparts Tbk'),
      productName: String(item.productName || item.itemSummary || 'Slit Tape OPP Masking Jumbo'),
      quantity: Number(item.quantity || 500),
      unit: String(item.unit || 'Roll'),
      currency: (item.currency || 'IDR') as any,
      targetPrice: Number(item.targetPrice || item.grandTotalAmount || item.subtotalAmount || 23976250),
      hppUnitCost: Number(item.hppUnitCost || 19500000),
      grossMarginPercent: Number(item.grossMarginPercent ?? item.estimatedMarginPercent ?? 18.5),
      totalValue: Number(item.totalValue || item.grandTotalAmount || item.subtotalAmount || 23976250),
      status: (item.status || item.quotationStatus || item.costControlApprovalStatus || 'PENDING_COST_CONTROL') as any,
      createdDate: String(item.createdDate || (item.createdAt ? String(item.createdAt).split('T')[0] : '2026-09-15')),
      salesRepresentative: String(item.salesRepresentative || item.salesRep || 'Sales Admin Commercial'),
      costControlNotes: item.costControlNotes || undefined,
    }));
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /sales/quotations belum siap (404/405). Mengembalikan array kosong.");
      return [];
    }
    throw err;
  }
}

export async function approveQuotationApi(id: string): Promise<Quotation> {
  const response = await apiClient.post(`/sales/quotations/${id}/approve`);
  return (response.data?.data || response.data) as Quotation;
}
