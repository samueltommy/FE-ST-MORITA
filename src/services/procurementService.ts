import { apiClient } from '../lib/apiClient';
import type { ProcurementOrder, EximDocument } from '../types';

export async function getPurchaseOrdersApi(): Promise<ProcurementOrder[]> {
  try {
    const response = await apiClient.get('/procurement/orders');
    return (response.data?.data || response.data) as ProcurementOrder[];
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
    return (response.data?.data || response.data) as EximDocument[];
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

