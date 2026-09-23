import { apiClient } from '../lib/apiClient';
import type { MasterItem } from '../types';

export async function getMasterItemsApi(page: number = 1, limit: number = 10, search?: string) {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    const response = await apiClient.get('/mdm/items', { params }); // Assuming backend path is /mdm/items as per user's list
    const rawData = response.data?.data || response.data || [];
    const meta = response.data?.meta || { total_pages: 1, page: 1 };
    
    const data = rawData.map((item: any) => {
      const baseCost = item.standardCostHpp || item.unitCost || item.costPrice || item.basePrice || item.hpp || 15000;
      return {
        id: item.id || `ITM-${Math.random()}`,
        code: item.itemCode || item.code || '',
        name: item.itemName || item.name || '',
        unit: item.uomCode || item.unit || 'PCS',
        category: item.categoryName || item.category || 'Uncategorized',
        stockQty: item.safetyStockQty || item.stockQty || item.quantity || 0,
        minStock: item.reorderPointQty || item.minStock || 0,
        unitCost: baseCost,
        sellingPrice: item.sellingPrice || item.salePrice || (baseCost * 1.25),
        grossMarginPercent: item.grossMarginPercent || item.marginPercent || 25,
        lotNumber: item.lotNumber || 'LOT-N/A',
        barcode: item.barcode || `899${Math.floor(Math.random() * 90000)}`,
        locationRack: item.locationRack || 'GUDANG-DEFAULT',
        status: item.isActive ?? item.status === 'ACTIVE' ? 'ACTIVE' : 'DISCONTINUED',
      };
    }) as MasterItem[];
    return { data, meta };
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn("Endpoint GET /mdm/items belum siap (404/405). Mengembalikan array kosong.");
      return { data: [], meta: { total_pages: 1, page: 1 } };
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
