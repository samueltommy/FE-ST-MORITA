import React, { useState } from 'react';
import {
  FileText,
  Boxes,
  Truck,
  ShieldCheck,
  Building2,
  Users,
  Plus,
  ArrowRight,
  ExternalLink,
  Barcode,
  Search,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';

export const DeliveryDivisionModule: React.FC = () => {
  const deliveryOrders = useAppStore((state) => state.deliveryOrders);
  const vehicleBookings = useAppStore((state) => state.vehicleBookings);
  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.delivery);
  const [searchBarcode, setSearchBarcode] = useState('');
  const [selectedBarcodeDo, setSelectedBarcodeDo] = useState<any>(deliveryOrders[0] || null);

  const options: PageOptionItem[] = [
    {
      id: 'delivery_orders',
      label: '1. Delivery Order (Surat Jalan)',
      subtitle: '/logistics/delivery-orders • Pengiriman barang',
      icon: Truck,
      badge: `${deliveryOrders.length} DO`,
    },
    {
      id: 'e_tracking',
      label: '2. E-Tracking Barcode/GPS',
      subtitle: '/tracking/barcode/{id} • Pelacakan status armada',
      icon: Barcode,
    },
    {
      id: 'vehicle_bookings',
      label: '3. Peminjaman Kendaraan Dinas',
      subtitle: '/hrd/vehicle-bookings • Jadwal armada pabrik',
      icon: Building2,
      badge: `${vehicleBookings.length} Armada`,
    },
  ];

  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'delivery_orders',
        label: 'Delivery Order / Surat Jalan (/logistics/delivery-orders)',
        subtitle: `Daftar surat jalan pengiriman produk jadi & armada armada (${deliveryOrders.length} DO)`,
        icon: Truck,
        iconColor: 'text-cyan-600',
        badge: `${deliveryOrders.length} DO`,
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        onClick: () => appStore.setActiveSubFeature('delivery', 'delivery_orders'),
      },
      {
        id: 'e_tracking',
        label: 'E-Tracking Barcode & GPS (/tracking/barcode/{id})',
        subtitle: 'Pindai barcode & pantau pergerakan armada pengiriman real-time',
        icon: Barcode,
        iconColor: 'text-blue-600',
        badge: 'Live GPS',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        onClick: () => appStore.setActiveSubFeature('delivery', 'e_tracking'),
      },
      {
        id: 'vehicle_bookings',
        label: 'Peminjaman Kendaraan Dinas (/hrd/vehicle-bookings)',
        subtitle: `Persetujuan izin pemakaian armada truk/mobil dinas operasional (${vehicleBookings.length} Jadwal)`,
        icon: Building2,
        iconColor: 'text-emerald-600',
        badge: `${vehicleBookings.length} Armada`,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        onClick: () => appStore.setActiveSubFeature('delivery', 'vehicle_bookings'),
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="DELIVERY"
        moduleName="DIVISI DELIVERY & LOGISTIK PENGIRIMAN"
        moduleDescription="Delivery Order / Surat Jalan (/logistics/delivery-orders), E-Tracking Barcode/GPS (/tracking/barcode/{id}), dan Peminjaman Kendaraan Dinas (/hrd/vehicle-bookings)."
        headerBgColor="bg-cyan-700"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const currentTab = activeSubFeature;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        moduleCode="DELIVERY"
        title="Divisi Delivery & Logistik Pengiriman"
        description="Surat Jalan Delivery Order, Pelacakan Barcode/GPS Armada, & Peminjaman Kendaraan Dinas"
        badgeColor="bg-cyan-50 text-cyan-800 border-cyan-200"
        options={options}
        activeOption={currentTab}
        onSelectOption={(opt) => appStore.setActiveSubFeature('delivery', opt)}
        onBackToMenu={() => appStore.setActiveSubFeature('delivery', null)}
        menuName="Delivery"
      />

      {/* 1. Sub-menu Delivery Orders */}
      {currentTab === 'delivery_orders' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">Daftar Delivery Order (Surat Jalan)</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/logistics/delivery-orders</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold">
              {deliveryOrders.length} Dokumen
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-4">No. Surat Jalan (DO)</th>
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">Tanggal Dispatch</th>
                  <th className="py-3 px-4">Armada Truk</th>
                  <th className="py-3 px-4 text-right">Nilai Barang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryOrders.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-700">{d.doNumber}</td>
                    <td className="py-3 px-4">{d.customerName}</td>
                    <td className="py-3 px-4">{d.dispatchDate}</td>
                    <td className="py-3 px-4">{d.truckArmada}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      Rp {d.totalGrossValue?.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Sub-menu E-Tracking Barcode/GPS */}
      {currentTab === 'e_tracking' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">E-Tracking Barcode & GPS Armada</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/tracking/barcode/{'{id}'}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Scan / Masukkan Barcode..."
                value={searchBarcode}
                onChange={(e) => setSearchBarcode(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
              />
              <button
                onClick={() => appStore.setBarcodeModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Barcode className="w-4 h-4" /> Buka Scanner
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deliveryOrders.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedBarcodeDo(d)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedBarcodeDo?.id === d.id
                    ? 'border-cyan-500 bg-cyan-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-cyan-700 text-xs">{d.doNumber}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    IN_TRANSIT
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm mt-1">{d.customerName}</div>
                <div className="text-xs text-slate-500 mt-2">Armada: {d.truckArmada}</div>
                <div className="text-xs text-slate-500">Tujuan: {d.customerAddress}</div>
              </div>
            ))}
          </div>

          {selectedBarcodeDo && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Visual Status Checkpoint Barcode & GPS ({selectedBarcodeDo.doNumber})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <div className="font-bold text-emerald-700">1. Dispatch Pabrik</div>
                  <div className="text-slate-500 text-[11px]">Checkpoint Gerbang Utama</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <div className="font-bold text-emerald-700">2. Tol Cikampek Utama</div>
                  <div className="text-slate-500 text-[11px]">GPS: -6.4025, 107.1294</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-cyan-300 bg-cyan-50/40">
                  <div className="font-bold text-cyan-800">3. Menuju Gudang Klien</div>
                  <div className="text-slate-500 text-[11px]">ETA: ± 45 menit</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-400">
                  <div className="font-bold">4. Diterima Pelanggan</div>
                  <div className="text-[11px]">Menunggu TTD Surat Jalan</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Sub-menu Peminjaman Kendaraan Dinas */}
      {currentTab === 'vehicle_bookings' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">Peminjaman Kendaraan Dinas & Armada Pabrik</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/hrd/vehicle-bookings</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {vehicleBookings.length} Pemesanan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicleBookings.map((v) => (
              <div key={v.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{v.vehicleName}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {v.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-mono">Plat: {v.licensePlate} • Driver: {v.driverName}</div>
                <div className="text-xs text-slate-600">Tujuan: <strong>{v.destination}</strong></div>
                <div className="text-xs text-slate-500">Keperluan: {v.purpose}</div>
                <div className="text-xs text-slate-400">Jadwal: {v.departureTime}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('delivery', null)}
        backLabel="KEMBALI KE MENU DELIVERY"
      />
    </div>
  );
};

