import { apiClient } from '../lib/apiClient';
import type { MasterItem } from '../types';

export async function getMasterItemsApi(): Promise<MasterItem[]> {
  try {
    const response = await apiClient.get('/master-data/items');
    return (response.data?.data || response.data) as MasterItem[];
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /master-data/items belum siap (404/405). Mengembalikan array kosong.");
      return [];
    }
    throw err;
  }
}

export async function createMasterItemApi(payload: Partial<MasterItem>): Promise<MasterItem> {
  const response = await apiClient.post('/master-data/items', payload);
  return (response.data?.data || response.data) as MasterItem;
}

export async function updateMasterItemApi(id: string, payload: Partial<MasterItem>): Promise<MasterItem> {
  const response = await apiClient.put(`/master-data/items/${id}`, payload);
  return (response.data?.data || response.data) as MasterItem;
}

export async function deleteMasterItemApi(id: string): Promise<void> {
  await apiClient.delete(`/master-data/items/${id}`);
}
