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
  FileText,
  Users,
  Truck,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { ItemCategory, MasterItem } from '../../types';
import { FinancialMask } from '../../components/ui/FinancialMask';
import { checkPermission } from '../../utils/rbac';
import { Can } from '../../components/rbac/Can';
import { MasterDataFormsModal } from '../../components/forms/MasterDataFormsModal';
import { DataDetailModal } from '../../components/ui/DataDetailModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMasterItemsApi, createMasterItemApi } from '../../services/masterDataService';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';

const CONTENT = {
  id: {
    title: 'Master Data Management & Zebra LOT Label Generator',
    desc: 'Katalog SKU bahan baku & produk jadi, rak penyimpanan gudang, dan cetak label thermal printer Zebra',
    btnForm: 'Formulir Master Data',
    searchPl: 'Cari kode SKU, nama produk, nomor lot, atau barcode...',
    optAll: 'Semua Kategori',
    showing: 'Menampilkan',
    sku: 'SKU',
    thCode: 'Kode SKU',
    thDesc: 'Deskripsi Barang Master',
    thCat: 'Kategori',
    thLot: 'No. LOT Batch',
    thStock: 'Stok Fisik',
    thRack: 'Lokasi Rak',
    thCost: 'HPP Unit (Rp)',
    thMargin: 'Margin (%)',
    thPrice: 'Harga Jual',
    thZebra: 'Label Zebra',
    lblTitle: 'Zebra Industrial Label Preview (100mm x 50mm)',
    lblDesc: 'Thermal Printer Zebra ZD420 / ZT410 Ready',
    lblPlant: 'PLANT MANUFAKTUR - INDONESIA',
    btnClose: 'Tutup',
    btnPrint: 'Kirim ke Zebra Printer (Print)',
    // New SKU form
    newTitle: 'Pendaftaran Item SKU Master Baru',
    newCode: 'Kode SKU:',
    newCat: 'Kategori:',
    newName: 'Nama / Deskripsi Produk:',
    newNamePl: 'Nama resmi material...',
    newUnit: 'Satuan Unit:',
    newRack: 'Lokasi Rak Penyimpanan:',
    newCost: 'HPP Unit Cost (Rp):',
    newPrice: 'Harga Jual Komersial (Rp):',
    btnCancel: 'Batal',
    btnSave: 'Daftarkan SKU & Generate Barcode',
  },
  en: {
    title: 'Master Data Management & Zebra LOT Label Generator',
    desc: 'Raw material & finished goods SKU catalog, warehouse storage racks, and Zebra thermal printer label generation',
    btnForm: 'Master Data Form',
    searchPl: 'Search SKU code, product name, lot number, or barcode...',
    optAll: 'All Categories',
    showing: 'Showing',
    sku: 'SKUs',
    thCode: 'SKU Code',
    thDesc: 'Master Item Description',
    thCat: 'Category',
    thLot: 'Batch LOT No.',
    thStock: 'Physical Stock',
    thRack: 'Rack Location',
    thCost: 'Unit Cost (Rp)',
    thMargin: 'Margin (%)',
    thPrice: 'Selling Price',
    thZebra: 'Zebra Label',
    lblTitle: 'Zebra Industrial Label Preview (100mm x 50mm)',
    lblDesc: 'Zebra ZD420 / ZT410 Thermal Printer Ready',
    lblPlant: 'MANUFACTURING PLANT - INDONESIA',
    btnClose: 'Close',
    btnPrint: 'Send to Zebra Printer (Print)',
    // New SKU form
    newTitle: 'New Master SKU Item Registration',
    newCode: 'SKU Code:',
    newCat: 'Category:',
    newName: 'Product Name / Description:',
    newNamePl: 'Official material name...',
    newUnit: 'Unit:',
    newRack: 'Storage Rack Location:',
    newCost: 'Unit Cost (Rp):',
    newPrice: 'Commercial Selling Price (Rp):',
    btnCancel: 'Cancel',
    btnSave: 'Register SKU & Generate Barcode',
  }
};

export const MasterDataModule: React.FC = () => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const queryClient = useQueryClient();
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ['masterItems', currentPage, pageSize, searchQuery],
    queryFn: () => getMasterItemsApi(currentPage, pageSize, searchQuery),
  });
  
  const items = queryResult?.data || [];
  const totalPages = queryResult?.meta?.totalPages || queryResult?.meta?.total_pages || 1;

  const currentUser = useAppStore((state) => state.currentUser);
  const isHighDensity = useAppStore((state) => state.isHighDensity);
  const [activeOption, setActiveOption] = useState<string>('catalog');
  const [zebraModalItem, setZebraModalItem] = useState<MasterItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [masterFormsOpen, setMasterFormsOpen] = useState(false);
  const [masterFormsTab, setMasterFormsTab] = useState<'customer' | 'supplier' | 'item' | 'waste'>('item');
  const [selectedDetailItem, setSelectedDetailItem] = useState<MasterItem | null>(null);
  const [selectedZebraItemId, setSelectedZebraItemId] = useState<string>('');

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
  }) || [];

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

    createItemMutation.mutate(newItem as MasterItem);
    setCreateModalOpen(false);
    setNewCode('');
    setNewName('');
  };

  const createItemMutation = useMutation({
    mutationFn: createMasterItemApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterItems'] });
    }
  });

  const options: PageOptionItem[] = [
    {
      id: 'catalog',
      label: '1. Katalog SKU & Stok Gudang',
      subtitle: 'Daftar stok material, pencarian rak & harga',
      icon: Boxes,
      badge: items.length > 0 ? `${items.length} SKU` : undefined,
    },
    {
      id: 'zebra',
      label: '2. Cetak Label Zebra Thermal',
      subtitle: 'Generator barcode thermal ZD420 / ZT410',
      icon: Barcode,
    },
    {
      id: 'forms',
      label: '3. Pendaftaran & Formulir Master',
      subtitle: 'Input SKU baru, Customer, Supplier & Waste',
      icon: Plus,
    },
    {
      id: 'all',
      label: 'Semua Tampilan',
      subtitle: 'Tampilkan seluruh panel katalog lengkap',
      icon: Layers,
    },
  ];

  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.master_data);

  // When no feature is selected yet, render simple selection menu hub (matches client reference screenshot 1)
  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'catalog',
        label: 'Katalog SKU & Stok Rak Gudang',
        subtitle: `Daftar SKU material, pencarian rak simpan, HPP & harga jual (${items.length} SKU)`,
        icon: Boxes,
        iconColor: 'text-sky-600',
        badge: items.length > 0 ? `${items.length} SKU` : undefined,
        badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
        onClick: () => appStore.setActiveSubFeature('master_data', 'catalog'),
      },
      {
        id: 'zebra',
        label: 'Cetak Label Zebra Thermal (ZD420 / ZT410)',
        subtitle: 'Generator barcode thermal industrial ukuran 100mm x 50mm untuk lot batch',
        icon: Barcode,
        iconColor: 'text-indigo-600',
        onClick: () => appStore.setActiveSubFeature('master_data', 'zebra'),
      },
      {
        id: 'forms',
        label: 'Pendaftaran SKU & Formulir Master Baru',
        subtitle: 'Input item SKU baru, pelanggan (customer), supplier rekanan, dan limbah',
        icon: Plus,
        iconColor: 'text-amber-600',
        badge: 'Input Baru',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        onClick: () => {
          setMasterFormsTab('item');
          setMasterFormsOpen(true);
        },
      },
      {
        id: 'all',
        label: 'Semua Tampilan (Lengkap)',
        subtitle: 'Tampilkan seluruh panel katalog dan preview label sekaligus',
        icon: Layers,
        iconColor: 'text-slate-600',
        onClick: () => appStore.setActiveSubFeature('master_data', 'all'),
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="Core 2"
        moduleName="MASTER DATA MANAGEMENT & GUDANG"
        moduleDescription="Katalog SKU bahan baku & pita perekat, lokasi rak gudang, cetak thermal barcode printer Zebra, dan pendaftaran master."
        headerBgColor="bg-sky-600"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const zebraTarget = items.find((it) => it.id === selectedZebraItemId) || items[0] || null;
  const currentTab = (activeSubFeature as any) || 'catalog';

  return (
    <div className="space-y-6">
      {/* Senior-Friendly Header with Option Buttons */}
      <ModulePageHeader
        moduleCode="Core 2"
        title={t.title}
        description={t.desc}
        badgeColor="bg-amber-50 text-amber-800 border-amber-200"
        options={options}
        activeOption={currentTab}
        onSelectOption={(optId) => appStore.setActiveSubFeature('master_data', optId)}
        onBackToMenu={() => appStore.setActiveSubFeature('master_data', null)}
        menuName="Master Data"
        actionButtons={
          <button
            onClick={() => {
              setMasterFormsTab('item');
              setMasterFormsOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-extrabold shadow-sm flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>{t.btnForm}</span>
          </button>
        }
      />

      {/* ─── OPTION 3: FORMULIR & PENDAFTARAN MASTER ─── */}
      {(activeOption === 'forms' || activeOption === 'all') && (
        <div className="p-6 sm:p-8 rounded-3xl border-2 border-blue-200 bg-linear-to-br from-blue-50/50 via-white to-slate-50 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-blue-700">
                Pusat Pendaftaran Data Induk
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Pilih Jenis Data Master yang Ingin Ditambahkan
              </h2>
            </div>
            <div className="text-sm font-semibold text-slate-600">
              Formulir terstandarisasi ERP ST-Morita
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => {
                setMasterFormsTab('item');
                setMasterFormsOpen(true);
              }}
              className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-600 hover:shadow-md text-left transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors mb-3">
                <Boxes className="w-6 h-6" />
              </div>
              <div className="text-base font-black text-slate-900">
                Barang & SKU Master
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Material baku, jumbo roll, slit tape & finished goods
              </div>
              <div className="mt-3 text-xs font-extrabold text-blue-600 flex items-center gap-1">
                Buka Formulir <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            <button
              onClick={() => {
                setMasterFormsTab('customer');
                setMasterFormsOpen(true);
              }}
              className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 hover:shadow-md text-left transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors mb-3">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-base font-black text-slate-900">
                Mitra Customer / Klien
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Data perusahaan pembeli, NPWP, alamat & TOP kredit
              </div>
              <div className="mt-3 text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                Buka Formulir <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            <button
              onClick={() => {
                setMasterFormsTab('supplier');
                setMasterFormsOpen(true);
              }}
              className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-purple-600 hover:shadow-md text-left transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors mb-3">
                <Truck className="w-6 h-6" />
              </div>
              <div className="text-base font-black text-slate-900">
                Pemasok / Supplier
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Vendor material lokal dan importir luar negeri
              </div>
              <div className="mt-3 text-xs font-extrabold text-purple-600 flex items-center gap-1">
                Buka Formulir <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            <button
              onClick={() => {
                setMasterFormsTab('waste');
                setMasterFormsOpen(true);
              }}
              className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-600 hover:shadow-md text-left transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-base font-black text-slate-900">
                Master Scrap / Waste
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Kategori sisa produksi slitting, trimming & limbah
              </div>
              <div className="mt-3 text-xs font-extrabold text-amber-700 flex items-center gap-1">
                Buka Formulir <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-blue-100">
            <span className="text-xs sm:text-sm text-slate-600 font-medium">
              Ingin mendaftarkan SKU cepat tanpa formulir panjang?
            </span>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-extrabold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Registrasi SKU Cepat (Modal)</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── OPTION 2: CETAK LABEL ZEBRA THERMAL DEDICATED PANEL ─── */}
      {(activeOption === 'zebra' || activeOption === 'all') && (
        <div className="p-6 sm:p-8 rounded-3xl border-2 border-purple-200 bg-white shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-purple-700">
                Generator Barcode Industri
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <Barcode className="w-6 h-6 text-purple-600" />
                Cetak Label Zebra Thermal (100mm x 50mm)
              </h2>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500">
              Kompatibel Printer Zebra ZD420 / ZT410
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Item Selector */}
            <div className="space-y-4">
              <label className="block text-sm sm:text-base font-extrabold text-slate-900">
                Pilih SKU Barang yang Ingin Dicetak:
              </label>
              <select
                value={selectedZebraItemId || (items[0]?.id || '')}
                onChange={(e) => setSelectedZebraItemId(e.target.value)}
                className="w-full p-3.5 text-base font-bold rounded-2xl border-2 border-slate-300 bg-slate-50 text-slate-900 focus:border-purple-600 focus:bg-white transition-all outline-hidden cursor-pointer"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    [{it.code}] {it.name} — Rak: {it.locationRack} (LOT: {it.lotNumber})
                  </option>
                ))}
              </select>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-purple-900 space-y-2 text-sm sm:text-base">
                <div className="font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  Informasi Cetak:
                </div>
                <div className="text-xs sm:text-sm text-purple-800 leading-relaxed">
                  Label akan dicetak dengan barcode 1D standar Code 128 dan nomor LOT batch pabrik. Pastikan ukuran kertas thermal di printer Zebra disetel ke 100mm x 50mm.
                </div>
              </div>

              {zebraTarget && (
                <button
                  type="button"
                  onClick={() => setZebraModalItem(zebraTarget)}
                  className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-base sm:text-lg font-black shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer"
                >
                  <Printer className="w-5 h-5" />
                  <span>Buka & Cetak Label Zebra Item Ini</span>
                </button>
              )}
            </div>

            {/* Live Visual Preview of Zebra Label */}
            {zebraTarget && (
              <div className="p-5 border-2 border-black bg-white text-black font-sans rounded-2xl shadow-md space-y-3 max-w-md mx-auto w-full">
                <div className="flex justify-between items-start border-b-2 border-black pb-2">
                  <div>
                    <div className="text-xs sm:text-sm font-black uppercase tracking-wider">
                      ST. MORITA INDUSTRIES
                    </div>
                    <div className="text-[10px] uppercase font-semibold text-slate-600">
                      PLANT MANUFAKTUR - INDONESIA
                    </div>
                  </div>
                  <span className="text-[10px] font-black border-2 border-black px-2 py-0.5 rounded">
                    QC APPROVED
                  </span>
                </div>

                <div className="text-base sm:text-lg font-black leading-tight text-slate-900">
                  {zebraTarget.name}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm font-mono border-t-2 border-b-2 border-black py-2">
                  <div>CODE: <strong>{zebraTarget.code}</strong></div>
                  <div>RAK: <strong>{zebraTarget.locationRack}</strong></div>
                  <div>LOT: <strong>{zebraTarget.lotNumber}</strong></div>
                  <div>QTY: <strong>{zebraTarget.stockQty} {zebraTarget.unit}</strong></div>
                </div>

                <div className="pt-2 text-center">
                  <div className="h-12 flex items-center justify-center gap-0.5 overflow-hidden">
                    {zebraTarget.barcode.split('').map((ch, idx) => (
                      <div
                        key={idx}
                        className="bg-black h-full"
                        style={{ width: `${(Number(ch) % 4) + 2}px` }}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-sm tracking-widest mt-1 font-black">
                    *{zebraTarget.barcode}*
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── OPTION 1 / CATALOG TABLE: KATALOG SKU & STOK GUDANG ─── */}
      {(activeOption === 'catalog' || activeOption === 'all') && (
        <div className="space-y-4">
          {/* Filter and Search Bar with Big Inputs */}
          <div className="p-4 sm:p-5 rounded-3xl border-2 border-slate-200 bg-white shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder={t.searchPl}
                  className="w-full pl-12 pr-4 py-3 text-sm sm:text-base font-semibold rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-hidden transition-all"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="text-sm sm:text-base font-bold py-3 px-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden transition-all cursor-pointer"
              >
                <option value="ALL">{t.optAll}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm sm:text-base text-slate-600 font-extrabold flex items-center gap-2">
              <span>{t.showing} <strong>{filteredItems.length} {t.sku}</strong></span>
            </div>
          </div>

          {/* High-Contrast Large Item Table */}
          <div className="rounded-3xl border-2 border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-auto max-h-[60vh] 2xl:max-h-[70vh]">
              <table className="w-full text-left text-sm sm:text-base border-collapse relative">
                <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm border-b-2 border-slate-200">
                  <tr className="text-slate-700">
                    <th className="py-4 px-4 font-black">{t.thCode}</th>
                    <th className="py-4 px-4 font-black">{t.thDesc}</th>
                    <th className="py-4 px-4 font-black">{t.thCat}</th>
                    <th className="py-4 px-4 font-black text-center">{t.thLot}</th>
                    <th className="py-4 px-4 font-black text-right">{t.thStock}</th>
                    <th className="py-4 px-4 font-black text-center">{t.thRack}</th>

                    {/* Role-filtered Columns for Finance/Cost Control */}
                    {canViewCost && (
                      <>
                        <th className="py-4 px-4 font-black text-right text-emerald-700">
                          {t.thCost}
                        </th>
                        <th className="py-4 px-4 font-black text-right text-emerald-700">
                          {t.thMargin}
                        </th>
                      </>
                    )}

                    <th className="py-4 px-4 font-black text-right">{t.thPrice}</th>
                    <th className="py-4 px-4 font-black text-center">{t.thZebra}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDetailItem(item)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4 font-mono font-black text-blue-700 text-sm sm:text-base">
                        {item.code}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                          {item.name}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">
                          Barcode: {item.barcode}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-extrabold text-slate-800 text-sm sm:text-base">
                        {item.lotNumber}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-black text-slate-900 text-sm sm:text-base">
                        {item.stockQty} {item.unit}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-xs sm:text-sm text-slate-700">
                        <span className="inline-flex items-center justify-center gap-1.5 font-bold">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          {item.locationRack}
                        </span>
                      </td>

                      {/* RBAC Protected HPP & Margin Columns */}
                      {canViewCost && (
                        <>
                          <td className="py-4 px-4 text-right text-emerald-700 text-sm sm:text-base">
                            <FinancialMask value={item.unitCost} className="font-bold" />
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-black text-emerald-700 text-sm sm:text-base">
                            {item.grossMarginPercent}%
                          </td>
                        </>
                      )}

                      <td className="py-4 px-4 text-right text-slate-900 font-black text-sm sm:text-base">
                        <FinancialMask value={item.sellingPrice} className="font-extrabold" />
                      </td>

                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setZebraModalItem(item);
                          }}
                          className="p-2.5 rounded-xl border-2 border-blue-200 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white text-blue-700 transition-all cursor-pointer shadow-2xs"
                          title="Generate & Cetak Label Zebra Thermal"
                        >
                          <Barcode className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* KONTROL PAGINATION MASTER DATA (Besar & Jelas) */}
            <div className="flex flex-wrap justify-between items-center p-4 sm:p-5 bg-slate-50 border-t-2 border-slate-200 gap-3">
              <div className="flex items-center gap-4">
                <span className="text-sm sm:text-base text-slate-600 font-extrabold">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl bg-white px-3 py-2 text-slate-800 outline-none focus:border-blue-600 transition-colors cursor-pointer"
                >
                  <option value={10}>10 Baris per Halaman</option>
                  <option value={20}>20 Baris per Halaman</option>
                  <option value={50}>50 Baris per Halaman</option>
                  <option value={100}>100 Baris per Halaman</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-4 py-2 text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  &larr; Sebelumnya
                </button>
                <button 
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-4 py-2 text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Selanjutnya &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zebra Thermal Label Print Preview Modal */}
      {zebraModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {t.lblTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {t.lblDesc}
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
                  <div className="text-[8px] uppercase">{t.lblPlant}</div>
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
                {t.btnClose}
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{t.btnPrint}</span>
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
              {t.newTitle}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">{t.newCode}</label>
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
                <label className="text-xs font-bold block mb-1">{t.newCat}</label>
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
              <label className="text-xs font-bold block mb-1">{t.newName}</label>
              <input
                type="text"
                required
                placeholder={t.newNamePl}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">{t.newUnit}</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{t.newRack}</label>
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
                <label className="text-xs font-bold block mb-1">{t.newCost}</label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">{t.newPrice}</label>
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
                {t.btnCancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                {t.btnSave}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Client Standard Bottom Action Toolbar with prominent BACK Button ─── */}
      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('master_data', null)}
        backLabel="BACK (KEMBALI KE MENU MASTER DATA)"
        actions={
          <button
            onClick={() => {
              setMasterFormsTab('item');
              setMasterFormsOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Pendaftaran Master Baru</span>
          </button>
        }
      />

      {/* Master Data Forms Modal */}
      <MasterDataFormsModal
        isOpen={masterFormsOpen}
        onClose={() => setMasterFormsOpen(false)}
        defaultTab={masterFormsTab}
      />
      {/* Data Detail Modal */}
      <DataDetailModal
        isOpen={selectedDetailItem !== null}
        onClose={() => setSelectedDetailItem(null)}
        title="Master Data Item Detail"
        data={selectedDetailItem}
      />
    </div>
  );
};
