import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Printer,
  Barcode,
  Lock,
  Download,
  Filter,
  Layers,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { ItemCategory, MasterItem } from '../../types';
import { FinancialMask } from '../../components/ui/FinancialMask';
import { checkPermission } from '../../utils/rbac';
import { Can } from '../../components/rbac/Can';
import { MasterDataFormsModal } from '../../components/forms/MasterDataFormsModal';

export const MasterDataModule: React.FC = () => {
  const items = useAppStore((state) => state.items);
  const currentUser = useAppStore((state) => state.currentUser);
  const isHighDensity = useAppStore((state) => state.isHighDensity);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [zebraModalItem, setZebraModalItem] = useState<MasterItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [masterFormsOpen, setMasterFormsOpen] = useState(false);
  const [masterFormsTab, setMasterFormsTab] = useState<'customer' | 'supplier' | 'item' | 'waste'>('item');

  // New item form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('Roll');
  const [newCategory, setNewCategory] = useState<ItemCategory>('Slit Tape');
  const [newStock, setNewStock] = useState(100);
  const [newCost, setNewCost] = useState(500000);
  const [newPrice, setNewPrice] = useState(700000);
  const [newRack, setNewRack] = useState('GUDANG-B-SLIT-05');

  const canViewCost = checkPermission(currentUser.permissions, 'finance:cost:read');

  const categories: ItemCategory[] = [
    'Raw Material',
    'Jumbo Roll Tape',
    'Slit Tape',
    'Cosmetics Chemical',
    'Packaging',
    'Finished Goods',
  ];

  const filteredItems = items.filter((item) => {
    
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery);
    return matchesCat && matchesQuery;
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const margin = newPrice > 0 ? Number((((newPrice - newCost) / newPrice) * 100).toFixed(1)) : 25;
    const lotNo = `LOT-${"IND"}-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}-${Math.floor(Math.random() * 90 + 10)}`;

    const newItem: MasterItem = {
      id: `ITM-${Date.now()}`,
      code: newCode.trim(),
      name: newName.trim(),
      unit: newUnit,
      category: newCategory,
      stockQty: newStock,
      minStock: 25,
      unitCost: newCost,
      sellingPrice: newPrice,
      grossMarginPercent: margin,
      lotNumber: lotNo,
      barcode: `899${Math.floor(Math.random() * 900000000 + 100000000)}`,
      locationRack: newRack,
      status: 'ACTIVE',
    };

    appStore.addMasterItem(newItem);
    setCreateModalOpen(false);
    setNewCode('');
    setNewName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Master Data Management & Zebra LOT Label Generator
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Katalog SKU bahan baku & produk jadi, rak penyimpanan gudang, dan cetak label thermal printer Zebra
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setMasterFormsTab('item');
                setMasterFormsOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Formulir Master Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode SKU, nama produk, nomor lot, atau barcode..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Menampilkan <strong>{filteredItems.length} SKU</strong></span>
        </div>
      </div>

      {/* High-Density Item Table */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 font-bold">Kode SKU</th>
                <th className="py-2.5 px-3 font-bold">Deskripsi Barang Master</th>
                <th className="py-2.5 px-3 font-bold">Kategori</th>
                <th className="py-2.5 px-3 font-bold text-center">No. LOT Batch</th>
                <th className="py-2.5 px-3 font-bold text-right">Stok Fisik</th>
                <th className="py-2.5 px-3 font-bold text-center">Lokasi Rak</th>

                {/* Role-filtered Columns for Finance/Cost Control */}
                {canViewCost && (
                  <>
                    <th className="py-2.5 px-3 font-bold text-right text-emerald-600">
                      HPP Unit (Rp)
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right text-emerald-600">
                      Margin (%)
                    </th>
                  </>
                )}

                <th className="py-2.5 px-3 font-bold text-right">Harga Jual</th>
                <th className="py-2.5 px-3 font-bold text-center">Label Zebra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    isHighDensity ? 'py-1' : 'py-2.5'
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.code}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Barcode: {item.barcode}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                    {item.lotNumber}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {item.stockQty} {item.unit}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      {item.locationRack}
                    </span>
                  </td>

                  {/* RBAC Protected HPP & Margin Columns */}
                  {canViewCost && (
                    <>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                        <FinancialMask value={item.unitCost} className="font-semibold" />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.grossMarginPercent}%
                      </td>
                    </>
                  )}

                  <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                    <FinancialMask value={item.sellingPrice} className="font-bold" />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setZebraModalItem(item)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      title="Generate & Cetak Label Zebra Thermal"
                    >
                      <Barcode className="w-4 h-4 text-blue-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zebra Thermal Label Print Preview Modal */}
      {zebraModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Zebra Industrial Label Preview (100mm x 50mm)
                </h3>
                <p className="text-xs text-slate-500">
                  Thermal Printer Zebra ZD420 / ZT410 Ready
                </p>
              </div>
              <Barcode className="w-6 h-6 text-slate-400" />
            </div>

            {/* Thermal Label Template Area */}
            <div
              id="zebra-printable-area"
              className="p-4 border-2 border-black bg-white text-black font-sans rounded-lg space-y-2 shadow-inner"
            >
              <div className="flex justify-between items-start border-b border-black pb-1">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider">
                    ST. MORITA INDUSTRIES
                  </div>
                  <div className="text-[8px] uppercase">PLANT MANUFAKTUR - INDONESIA</div>
                </div>
                <span className="text-[9px] font-black border border-black px-1">QC APPROVED</span>
              </div>

              <div className="text-xs font-black leading-tight">
                {zebraModalItem.name}
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono border-t border-b border-black py-1">
                <div>
                  CODE: <strong>{zebraModalItem.code}</strong>
                </div>
                <div>
                  RACK: <strong>{zebraModalItem.locationRack}</strong>
                </div>
                <div>
                  LOT: <strong>{zebraModalItem.lotNumber}</strong>
                </div>
                <div>
                  QTY: <strong>{zebraModalItem.stockQty} {zebraModalItem.unit}</strong>
                </div>
              </div>

              {/* Simulated 1D Barcode Graphic */}
              <div className="pt-1 text-center">
                <div className="h-10 flex items-center justify-center gap-0.5 overflow-hidden">
                  {zebraModalItem.barcode.split('').map((ch, idx) => (
                    <div
                      key={idx}
                      className="bg-black h-full"
                      style={{ width: `${(Number(ch) % 4) + 1.5}px` }}
                    />
                  ))}
                  {/* Repeated pattern to fill width */}
                  {zebraModalItem.barcode.split('').map((ch, idx) => (
                    <div
                      key={`rep-${idx}`}
                      className="bg-black h-full"
                      style={{ width: `${(Number(ch) % 3) + 1}px` }}
                    />
                  ))}
                </div>
                <div className="font-mono text-xs tracking-widest mt-0.5 font-bold">
                  *{zebraModalItem.barcode}*
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setZebraModalItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Kirim ke Zebra Printer (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleCreateItem}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Pendaftaran Item SKU Master Baru
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Kode SKU:</label>
                <input
                  type="text"
                  required
                  placeholder="SM-MSK-..."
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Kategori:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Nama / Deskripsi Produk:</label>
              <input
                type="text"
                required
                placeholder="Nama resmi material..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Satuan Unit:</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Lokasi Rak Penyimpanan:</label>
                <input
                  type="text"
                  value={newRack}
                  onChange={(e) => setNewRack(e.target.value)}
                  className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">HPP Unit Cost (Rp):</label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Harga Jual Komersial (Rp):</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Daftarkan SKU & Generate Barcode
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Master Data Forms Modal */}
      <MasterDataFormsModal
        isOpen={masterFormsOpen}
        onClose={() => setMasterFormsOpen(false)}
        defaultTab={masterFormsTab}
      />
    </div>
  );
};
