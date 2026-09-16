import React, { useState } from 'react';
import { X, Building2, Truck, Boxes, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { CustomerMaster, SupplierMaster, MasterItem, WasteRecord, ItemCategory } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'customer' | 'supplier' | 'item' | 'waste';
}

export const MasterDataFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'customer' }) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier' | 'item' | 'waste'>(defaultTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultTab]);

  // Form 1: Customer state
  const [custCode, setCustCode] = useState(`CUST-${Math.floor(Math.random() * 900 + 100)}`);
  const [custName, setCustName] = useState('');
  const [custStatus, setCustStatus] = useState<'NEW' | 'OLD'>('NEW');
  const [custBusinessType, setCustBusinessType] = useState('Otomotif & Manufaktur');
  const [custTaxCode, setCustTaxCode] = useState<CustomerMaster['taxTransactionCode']>('01');
  const [custNpwp, setCustNpwp] = useState('');
  const [custNik, setCustNik] = useState('');
  const [custBillingAddress, setCustBillingAddress] = useState('');
  const [custShippingAddress, setCustShippingAddress] = useState('');
  const [custPaymentTerm, setCustPaymentTerm] = useState('Net 30 Hari');
  const [custCreditLimit, setCustCreditLimit] = useState(250000000);
  const [custContactPerson, setCustContactPerson] = useState('');
  const [custPhone, setCustPhone] = useState('+62 21 ');
  const [custEmail, setCustEmail] = useState('');

  // Form 2: Supplier state
  const [suppCode, setSuppCode] = useState(`SUPP-${Math.floor(Math.random() * 900 + 100)}`);
  const [suppName, setSuppName] = useState('');
  const [suppNpwp, setSuppNpwp] = useState('');
  const [suppAddress, setSuppAddress] = useState('');
  const [suppPhone, setSuppPhone] = useState('+62 ');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppContact, setSuppContact] = useState('');
  const [suppTerm, setSuppTerm] = useState('Net 30 Hari');
  const [suppBank, setSuppBank] = useState('BCA KCU Cikarang');
  const [suppAccount, setSuppAccount] = useState('');

  // Form 3: Item state
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<ItemCategory>('Slit Tape');
  const [itemUnit, setItemUnit] = useState('Roll');
  const [itemStock, setItemStock] = useState(100);
  const [itemMinStock, setItemMinStock] = useState(25);
  const [itemCost, setItemCost] = useState(150000);
  const [itemPrice, setItemPrice] = useState(210000);
  const [itemRack, setItemRack] = useState('GUDANG-B-SLIT-08');

  // Form 4: Waste state
  const [wasteType, setWasteType] = useState<WasteRecord['wasteType']>('RAW_MATERIAL_WASTE');
  const [wasteItemCode, setWasteItemCode] = useState('RM-BOPP-JMB');
  const [wasteItemName, setWasteItemName] = useState('BOPP Film Roll');
  const [wasteLotNumber, setWasteLotNumber] = useState('LOT-IND-202609-08');
  const [wasteQty, setWasteQty] = useState(25);
  const [wasteUnit, setWasteUnit] = useState('Kg');
  const [wasteSeverity, setWasteSeverity] = useState<WasteRecord['severity']>('MINOR');
  const [wasteRootCause, setWasteRootCause] = useState('');
  const [wasteCorrective, setWasteCorrective] = useState('');
  const [wastePreventive, setWastePreventive] = useState('');

  if (!isOpen) return null;

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custNpwp.trim()) return;

    const newCust: CustomerMaster = {
      id: `CUST-${Date.now()}`,
      customerCode: custCode.trim(),
      companyName: custName.trim(),
      customerStatus: custStatus,
      businessType: custBusinessType.trim(),
      taxTransactionCode: custTaxCode,
      npwp: custNpwp.trim(),
      nik: custNik.trim() || undefined,
      billingAddress: custBillingAddress.trim(),
      shippingAddress: custShippingAddress.trim() || custBillingAddress.trim(),
      paymentTerm: custPaymentTerm,
      creditLimit: Number(custCreditLimit) || 0,
      contactPerson: custContactPerson.trim(),
      phone: custPhone.trim(),
      email: custEmail.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    appStore.addCustomer(newCust);
    setSuccessMessage(`Pelanggan ${custName} (${custCode}) berhasil didaftarkan ke Master Data.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim()) return;

    const newSupp: SupplierMaster = {
      id: `SUPP-${Date.now()}`,
      supplierCode: suppCode.trim(),
      supplierName: suppName.trim(),
      npwp: suppNpwp.trim(),
      address: suppAddress.trim(),
      phone: suppPhone.trim(),
      email: suppEmail.trim(),
      contactPerson: suppContact.trim(),
      paymentTerm: suppTerm,
      bankName: suppBank.trim(),
      bankAccountNumber: suppAccount.trim(),
      status: 'ACTIVE',
    };

    appStore.addSupplier(newSupp);
    setSuccessMessage(`Vendor/Supplier ${suppName} (${suppCode}) berhasil didaftarkan.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !itemName.trim()) return;

    const margin = itemPrice > 0 ? Number((((itemPrice - itemCost) / itemPrice) * 100).toFixed(1)) : 20;
    const lotNo = `LOT-${"IND"}-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}-${Math.floor(Math.random() * 90 + 10)}`;

    const newItem: MasterItem = {
      id: `ITM-${Date.now()}`,
      code: itemCode.trim(),
      name: itemName.trim(),
      unit: itemUnit,
      category: itemCategory,
      stockQty: Number(itemStock) || 0,
      minStock: Number(itemMinStock) || 10,
      unitCost: Number(itemCost) || 0,
      sellingPrice: Number(itemPrice) || 0,
      grossMarginPercent: margin,
      lotNumber: lotNo,
      barcode: `899${Math.floor(Math.random() * 900000000 + 100000000)}`,
      locationRack: itemRack.trim(),
      status: 'ACTIVE',
    };

    appStore.addMasterItem(newItem);
    setSuccessMessage(`Item ${itemName} (${itemCode}) berhasil disimpan dengan kalkulasi Gross Margin ${margin}%.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteRootCause.trim() || !wasteCorrective.trim()) return;

    const newWaste: WasteRecord = {
      id: `WST-${Date.now()}`,
      ticketNumber: `WST/${wasteType === 'RAW_MATERIAL_WASTE' ? 'RM' : 'FG'}/${new Date().toISOString().slice(0, 7).replace('-', '/')}/${Math.floor(Math.random() * 9000 + 1000)}`,
      wasteType,
      itemCode: wasteItemCode.trim(),
      itemName: wasteItemName.trim(),
      lotNumber: wasteLotNumber.trim(),
      quantity: Number(wasteQty) || 0,
      unit: wasteUnit,
      severity: wasteSeverity,
      rootCause: wasteRootCause.trim(),
      correctiveAction: wasteCorrective.trim(),
      preventiveAction: wastePreventive.trim(),
      reportedBy: currentUser.name,
      dateReported: new Date().toISOString().slice(0, 10),
    };

    appStore.addWasteRecord(newWaste);
    setSuccessMessage(`Tiket Limbah ${newWaste.ticketNumber} tingkat [${wasteSeverity}] berhasil dicatat.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-600" />
              <span>Formulir Master Data & Pengelolaan Item</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registrasi Pelanggan (NPWP & Kode Pajak 01-09), Vendor/Supplier, Item Produk & Pelaporan Limbah
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'customer'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Master Pelanggan (Customer)</span>
          </button>
          <button
            onClick={() => setActiveTab('supplier')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'supplier'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Master Vendor / Supplier</span>
          </button>
          <button
            onClick={() => setActiveTab('item')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'item'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Master Item & Pita Perekat</span>
          </button>
          <button
            onClick={() => setActiveTab('waste')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'waste'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Pencatatan Limbah Pabrik</span>
          </button>
        </div>

        {/* Form Body with Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Master Pelanggan */}
          {activeTab === 'customer' && (
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Pelanggan</label>
                  <input
                    type="text"
                    required
                    value={custCode}
                    onChange={(e) => setCustCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Badan Usaha / PT</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Astra Daihatsu Motor (Plant Sunter)"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Klien</label>
                  <select
                    value={custStatus}
                    onChange={(e) => setCustStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="NEW">Pelanggan Baru (New)</option>
                    <option value="OLD">Pelanggan Lama (Existing/VIP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Transaksi Pajak
                  </label>
                  <select
                    value={custTaxCode}
                    onChange={(e) => setCustTaxCode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                  >
                    <option value="01">01 - Penyerahan BKP/JKP Normal</option>
                    <option value="02">02 - Pemungut Bendaharawan Pemerintah</option>
                    <option value="03">03 - Pemungut BUMN / Non-Bendahara</option>
                    <option value="04">04 - DPP Nilai Lain</option>
                    <option value="07">07 - Kawasan Berikat (PPN Dibebaskan)</option>
                    <option value="08">08 - PPN Tidak Dipungut</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Pokok Wajib Pajak (NPWP)</label>
                  <input
                    type="text"
                    required
                    placeholder="01.234.567.8-012.000"
                    value={custNpwp}
                    onChange={(e) => setCustNpwp(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Penagihan (Billing Address)</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Alamat kantor pusat / faktur pajak..."
                    value={custBillingAddress}
                    onChange={(e) => setCustBillingAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Pengiriman Pabrik (Shipping)</label>
                  <textarea
                    rows={2}
                    placeholder="Jika sama, biarkan kosong..."
                    value={custShippingAddress}
                    onChange={(e) => setCustShippingAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Termin Pembayaran</label>
                  <select
                    value={custPaymentTerm}
                    onChange={(e) => setCustPaymentTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Cash Before Delivery (CBD)">Cash Before Delivery (CBD)</option>
                    <option value="Net 14 Hari">Net 14 Hari</option>
                    <option value="Net 30 Hari">Net 30 Hari</option>
                    <option value="Net 45 Hari">Net 45 Hari</option>
                    <option value="Net 60 Hari">Net 60 Hari</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plafon Kredit Maksimum (IDR)</label>
                  <input
                    type="number"
                    value={custCreditLimit}
                    onChange={(e) => setCustCreditLimit(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIC Procurement / Kontak</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pak Bambang (Section Head)"
                    value={custContactPerson}
                    onChange={(e) => setCustContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Simpan Master Pelanggan
                </button>
              </div>
            </form>
          )}

          {/* 2. Master Supplier */}
          {activeTab === 'supplier' && (
            <form onSubmit={handleSupplierSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Vendor / Supplier</label>
                  <input
                    type="text"
                    required
                    value={suppCode}
                    onChange={(e) => setSuppCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Perusahaan Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Nippon Polymer & Chemical Corp Tokyo"
                    value={suppName}
                    onChange={(e) => setSuppName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NPWP / Tax ID</label>
                  <input
                    type="text"
                    required
                    placeholder="99.888.777.6-091.000"
                    value={suppNpwp}
                    onChange={(e) => setSuppNpwp(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Termin Pembayaran</label>
                  <input
                    type="text"
                    required
                    value={suppTerm}
                    onChange={(e) => setSuppTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Kantor / Pabrik Supplier</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Alamat lengkap lokasi pengiriman atau negara asal impor..."
                  value={suppAddress}
                  onChange={(e) => setSuppAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank Rekening</label>
                  <input
                    type="text"
                    required
                    value={suppBank}
                    onChange={(e) => setSuppBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening Bank</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 295-0019283"
                    value={suppAccount}
                    onChange={(e) => setSuppAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Simpan Master Vendor
                </button>
              </div>
            </form>
          )}

          {/* 3. Master Item */}
          {activeTab === 'item' && (
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Item</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SM-MSK-KFT24"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk / Material</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Automotive Masking Tape High-Temp 150°C 24mm x 50m"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as ItemCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Raw Material">Raw Material (Bahan Baku)</option>
                    <option value="Jumbo Roll Tape">Jumbo Roll Tape</option>
                    <option value="Slit Tape">Slit Tape (Produk Konversi)</option>
                    <option value="Finished Goods">Finished Goods</option>
                    <option value="Packaging">Packaging (Karton & Core)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan Dasar</label>
                  <input
                    type="text"
                    required
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Rak Gudang</label>
                  <input
                    type="text"
                    required
                    value={itemRack}
                    onChange={(e) => setItemRack(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={itemStock}
                    onChange={(e) => setItemStock(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Safety Stock (Min)</label>
                  <input
                    type="number"
                    value={itemMinStock}
                    onChange={(e) => setItemMinStock(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HPP Unit Cost (IDR)</label>
                  <input
                    type="number"
                    value={itemCost}
                    onChange={(e) => setItemCost(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Harga Jual (IDR)</label>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <span>Kalkulasi Gross Margin Otomatis:</span>
                <strong className="font-mono text-sm font-black">
                  {itemPrice > 0 ? (((itemPrice - itemCost) / itemPrice) * 100).toFixed(1) : 0}%
                </strong>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Simpan Item Master
                </button>
              </div>
            </form>
          )}

          {/* 4. Pencatatan Limbah */}
          {activeTab === 'waste' && (
            <form onSubmit={handleWasteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Limbah</label>
                  <select
                    value={wasteType}
                    onChange={(e) => setWasteType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="RAW_MATERIAL_WASTE">Raw Material Waste (Bahan Baku / Film / Lem)</option>
                    <option value="FINISHED_PRODUCT_WASTE">Finished Product Waste (Roll Pita Cacat / NG)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Klasifikasi Severity</label>
                  <select
                    value={wasteSeverity}
                    onChange={(e) => setWasteSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="MINOR">MINOR (&lt; 2% Toleransi Standar)</option>
                    <option value="MAJOR">MAJOR (2% - 5% Perlu Evaluasi Mesin)</option>
                    <option value="CRITICAL">CRITICAL (&gt; 5% Stop Mesin & Review QC)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Item Material</label>
                  <input
                    type="text"
                    required
                    value={wasteItemCode}
                    onChange={(e) => setWasteItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Lot Material</label>
                  <input
                    type="text"
                    required
                    value={wasteLotNumber}
                    onChange={(e) => setWasteLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah</label>
                    <input
                      type="number"
                      required
                      value={wasteQty}
                      onChange={(e) => setWasteQty(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
                    <input
                      type="text"
                      required
                      value={wasteUnit}
                      onChange={(e) => setWasteUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Akar Masalah (Root Cause)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ketegangan tension brake tidak stabil menyebabkan kerutan tepi pada film roll..."
                  value={wasteRootCause}
                  onChange={(e) => setWasteRootCause(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tindakan Korektif (Corrective Action)</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Tindakan langsung penanganan limbah saat ini..."
                    value={wasteCorrective}
                    onChange={(e) => setWasteCorrective(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tindakan Preventif (Preventive Action)</label>
                  <textarea
                    rows={2}
                    placeholder="Pencegahan agar masalah tidak terulang di masa depan..."
                    value={wastePreventive}
                    onChange={(e) => setWastePreventive(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Catat Laporan Limbah
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
