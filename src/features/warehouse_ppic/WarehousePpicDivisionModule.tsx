import React from 'react';
import {
  Boxes,
  Truck,
  Trash2,
  FileSpreadsheet,
  Plus,
  Search,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';

export const WarehousePpicDivisionModule: React.FC = () => {
  const goodsReceipts = useAppStore((state) => state.goodsReceipts);
  const wasteRecords = useAppStore((state) => state.wasteRecords);
  const workOrders = useAppStore((state) => state.workOrders);
  const items = useAppStore((state) => state.items);
  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.warehouse_ppic);

  const options: PageOptionItem[] = [
    {
      id: 'goods_receipts',
      label: '1. Penerimaan Barang (LOG)',
      subtitle: '/warehouse/goods-receipts • Receiving dock',
      icon: Truck,
      badge: `${goodsReceipts.length} LOG`,
    },
    {
      id: 'waste_logs',
      label: '2. Pencatatan Limbah (Waste)',
      subtitle: '/warehouse/waste-logs • Log limbah & scrap',
      icon: Trash2,
      badge: `${wasteRecords.length} Tiket`,
    },
    {
      id: 'work_orders',
      label: '3. SPK Produksi (Work Orders)',
      subtitle: '/production/work-orders • Perintah kerja PPIC',
      icon: FileSpreadsheet,
      badge: `${workOrders.length} SPK`,
    },
    {
      id: 'items',
      label: '4. Master Item & Stok',
      subtitle: '/mdm/items • Katalog SKU & stok gudang',
      icon: Boxes,
      badge: `${items.length} SKU`,
    },
  ];

  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'goods_receipts',
        label: 'Penerimaan Barang / Receiving LOG (/warehouse/goods-receipts)',
        subtitle: `Penerimaan fisik dock gudang, no container, dan auto-trigger IQC (${goodsReceipts.length} LOG)`,
        icon: Truck,
        iconColor: 'text-sky-600',
        badge: `${goodsReceipts.length} LOG`,
        badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
        onClick: () => appStore.setActiveSubFeature('warehouse_ppic', 'goods_receipts'),
      },
      {
        id: 'waste_logs',
        label: 'Pencatatan Limbah / Waste (/warehouse/waste-logs)',
        subtitle: `Pencatatan limbah bahan baku & finished goods, scrap allowance (${wasteRecords.length} Catatan)`,
        icon: Trash2,
        iconColor: 'text-rose-600',
        badge: `${wasteRecords.length} Waste`,
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        onClick: () => appStore.setActiveSubFeature('warehouse_ppic', 'waste_logs'),
      },
      {
        id: 'work_orders',
        label: 'SPK Produksi / Work Orders (/production/work-orders)',
        subtitle: `Penjadwalan SPK mesin slitting/coating & target roll (${workOrders.length} SPK)`,
        icon: FileSpreadsheet,
        iconColor: 'text-blue-600',
        badge: `${workOrders.length} SPK`,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        onClick: () => appStore.setActiveSubFeature('warehouse_ppic', 'work_orders'),
      },
      {
        id: 'items',
        label: 'Master Item & Stok (/mdm/items)',
        subtitle: `Katalog SKU produk pita perekat, lokasi rak gudang & label Zebra (${items.length} SKU)`,
        icon: Boxes,
        iconColor: 'text-emerald-600',
        badge: `${items.length} SKU`,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        onClick: () => appStore.setActiveSubFeature('warehouse_ppic', 'items'),
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="WAREHOUSE_PPIC"
        moduleName="DIVISI WAREHOUSE & PPIC"
        moduleDescription="Penerimaan Barang / Receiving LOG (/warehouse/goods-receipts), Pencatatan Limbah / Waste (/warehouse/waste-logs), SPK Produksi / Work Orders (/production/work-orders), dan Master Item & Stok (/mdm/items)."
        headerBgColor="bg-sky-700"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const currentTab = activeSubFeature;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        moduleCode="WAREHOUSE_PPIC"
        title="Divisi Warehouse & PPIC"
        description="Receiving LOG Gudang, Log Limbah (Waste), SPK Work Orders, & Master Item Stok"
        badgeColor="bg-sky-50 text-sky-800 border-sky-200"
        options={options}
        activeOption={currentTab}
        onSelectOption={(opt) => appStore.setActiveSubFeature('warehouse_ppic', opt)}
        onBackToMenu={() => appStore.setActiveSubFeature('warehouse_ppic', null)}
        menuName="Warehouse & PPIC"
      />

      {/* 1. Goods Receipts */}
      {currentTab === 'goods_receipts' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">Penerimaan Barang / Receiving LOG</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/warehouse/goods-receipts</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
              {goodsReceipts.length} Transaksi
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-4">No. LOG</th>
                  <th className="py-3 px-4">No. PO</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Item & Qty</th>
                  <th className="py-3 px-4">Status IQC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {goodsReceipts.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{g.logNumber}</td>
                    <td className="py-3 px-4 font-mono">{g.poNumber}</td>
                    <td className="py-3 px-4">{g.supplierName}</td>
                    <td className="py-3 px-4">{g.itemName} ({g.qtyDelivered} {g.unit})</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        g.iqcStatus === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {g.iqcStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Waste Logs */}
      {currentTab === 'waste_logs' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">Pencatatan Limbah & Scrap (Waste Logs)</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/warehouse/waste-logs</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
              {wasteRecords.length} Catatan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wasteRecords.map((w) => (
              <div key={w.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">{w.ticketNumber}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    {w.severity}
                  </span>
                </div>
                <div className="font-bold text-slate-800 text-sm">{w.itemName} ({w.quantity} {w.unit})</div>
                <div className="text-xs text-slate-600">Penyebab: {w.rootCause}</div>
                <div className="text-xs text-slate-500">Tindakan Korektif: {w.correctiveAction}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Work Orders */}
      {currentTab === 'work_orders' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">SPK Produksi / Work Orders</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/production/work-orders</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
              {workOrders.length} SPK
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-4">No. SPK</th>
                  <th className="py-3 px-4">Item & Spesifikasi</th>
                  <th className="py-3 px-4">Target Qty</th>
                  <th className="py-3 px-4">Line Produksi</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{wo.spkNumber}</td>
                    <td className="py-3 px-4">{wo.itemName} ({wo.targetWidthMm}mm x {wo.targetLengthM}m)</td>
                    <td className="py-3 px-4">{wo.targetQuantity} {wo.unit}</td>
                    <td className="py-3 px-4">{wo.productionLine}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800">
                        {wo.spkStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Items */}
      {currentTab === 'items' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">Master Item & Stok Barang</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/mdm/items</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {items.length} SKU
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.map((it) => (
              <div key={it.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-slate-800 text-xs">{it.code}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                    Rak: {it.locationRack}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{it.name}</div>
                <div className="text-xs text-slate-500">Kategori: {it.category}</div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span>Stok: <strong>{it.stockQty} {it.unit}</strong></span>
                  <span className="font-mono font-bold text-emerald-700">Rp {it.sellingPrice?.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('warehouse_ppic', null)}
        backLabel="KEMBALI KE MENU WAREHOUSE & PPIC"
      />
    </div>
  );
};

