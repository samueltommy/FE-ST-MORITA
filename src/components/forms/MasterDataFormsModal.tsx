import React, { useState } from 'react';
import { X, Building2, Truck, Boxes, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { CustomerMaster, SupplierMaster, MasterItem, WasteRecord, ItemCategory } from '../../types';

const CONTENT = {
  id: {
    formTitle: 'Formulir Master Data & Pengelolaan Item',
    formDesc: 'Registrasi Pelanggan (NPWP & Kode Pajak 01-09), Vendor/Supplier, Item Produk & Pelaporan Limbah',
    tabCust: 'Master Pelanggan (Customer)',
    tabSupp: 'Master Vendor / Supplier',
    tabItem: 'Master Item & Pita Perekat',
    tabWaste: 'Pencatatan Limbah Pabrik',

    // Customer
    cuCode: 'Kode Pelanggan',
    cuName: 'Nama Badan Usaha / PT',
    cuNamePl: 'Contoh: PT Astra Daihatsu Motor (Plant Sunter)',
    cuStatus: 'Status Klien',
    cuStatusNew: 'Pelanggan Baru (New)',
    cuStatusOld: 'Pelanggan Lama (Existing/VIP)',
    cuTax: 'Kode Transaksi Pajak',
    cuTax1: '01 - Penyerahan BKP/JKP Normal',
    cuTax2: '02 - Pemungut Bendaharawan Pemerintah',
    cuTax3: '03 - Pemungut BUMN / Non-Bendahara',
    cuTax4: '04 - DPP Nilai Lain',
    cuTax7: '07 - Kawasan Berikat (PPN Dibebaskan)',
    cuTax8: '08 - PPN Tidak Dipungut',
    cuNpwp: 'Nomor Pokok Wajib Pajak (NPWP)',
    cuBill: 'Alamat Penagihan (Billing Address)',
    cuBillPl: 'Alamat kantor pusat / faktur pajak...',
    cuShip: 'Alamat Pengiriman Pabrik (Shipping)',
    cuShipPl: 'Jika sama, biarkan kosong...',
    cuTerm: 'Termin Pembayaran',
    cuTerm1: 'Cash Before Delivery (CBD)',
    cuTerm2: 'Net 14 Hari',
    cuTerm3: 'Net 30 Hari',
    cuTerm4: 'Net 45 Hari',
    cuTerm5: 'Net 60 Hari',
    cuLimit: 'Plafon Kredit Maksimum (IDR)',
    cuPic: 'PIC Procurement / Kontak',
    cuPicPl: 'Contoh: Pak Bambang (Section Head)',
    btnSaveCust: 'Simpan Master Pelanggan',
    
    // Supplier
    suCode: 'Kode Vendor / Supplier',
    suName: 'Nama Perusahaan Vendor',
    suNamePl: 'Contoh: Nippon Polymer & Chemical Corp Tokyo',
    suNpwp: 'NPWP / Tax ID',
    suTerm: 'Termin Pembayaran',
    suAddr: 'Alamat Kantor / Pabrik Supplier',
    suAddrPl: 'Alamat lengkap lokasi pengiriman atau negara asal impor...',
    suBank: 'Nama Bank Rekening',
    suAcc: 'Nomor Rekening Bank',
    suAccPl: 'Contoh: 295-0019283',
    btnSaveSupp: 'Simpan Master Vendor',

    // Item
    itCode: 'Kode Item',
    itCodePl: 'Contoh: SM-MSK-KFT24',
    itName: 'Nama Produk / Material',
    itNamePl: 'Contoh: Automotive Masking Tape High-Temp 150°C 24mm x 50m',
    itCat: 'Kategori',
    itCat1: 'Raw Material (Bahan Baku)',
    itCat2: 'Jumbo Roll Tape',
    itCat3: 'Slit Tape (Produk Konversi)',
    itCat4: 'Finished Goods',
    itCat5: 'Packaging (Karton & Core)',
    itUnit: 'Satuan Dasar',
    itRack: 'Lokasi Rak Gudang',
    itStock: 'Stok Awal',
    itMin: 'Safety Stock (Min)',
    itCost: 'HPP Unit Cost (IDR)',
    itPrice: 'Harga Jual (IDR)',
    itCalc: 'Kalkulasi Gross Margin Otomatis:',
    btnSaveItem: 'Simpan Item Master',

    // Waste
    wsType: 'Tipe Limbah',
    wsType1: 'Raw Material Waste (Bahan Baku / Film / Lem)',
    wsType2: 'Finished Product Waste (Roll Pita Cacat / NG)',
    wsSev: 'Klasifikasi Severity',
    wsSev1: 'MINOR (< 2% Toleransi Standar)',
    wsSev2: 'MAJOR (2% - 5% Perlu Evaluasi Mesin)',
    wsSev3: 'CRITICAL (> 5% Stop Mesin & Review QC)',
    wsCode: 'Kode Item Material',
    wsLot: 'Nomor Lot Material',
    wsQty: 'Jumlah',
    wsUnit: 'Satuan',
    wsRoot: 'Akar Masalah (Root Cause)',
    wsRootPl: 'Contoh: Ketegangan tension brake tidak stabil menyebabkan kerutan tepi pada film roll...',
    wsCorr: 'Tindakan Korektif (Corrective Action)',
    wsCorrPl: 'Tindakan langsung penanganan limbah saat ini...',
    wsPrev: 'Tindakan Preventif (Preventive Action)',
    wsPrevPl: 'Pencegahan agar masalah tidak terulang di masa depan...',
    btnSaveWaste: 'Catat Laporan Limbah',

    btnCancel: 'Batal',
    succCust: 'Pelanggan {name} ({code}) berhasil didaftarkan ke Master Data.',
    succSupp: 'Vendor/Supplier {name} ({code}) berhasil didaftarkan.',
    succItem: 'Item {name} ({code}) berhasil disimpan dengan kalkulasi Gross Margin {margin}%.',
    succWaste: 'Tiket Limbah {ticket} tingkat [{sev}] berhasil dicatat.',
  },
  en: {
    formTitle: 'Master Data & Item Management Form',
    formDesc: 'Customer Registration (Tax ID 01-09), Vendor/Supplier, Product Item & Waste Reporting',
    tabCust: 'Customer Master',
    tabSupp: 'Vendor / Supplier Master',
    tabItem: 'Item Master & Adhesive Tape',
    tabWaste: 'Factory Waste Recording',

    // Customer
    cuCode: 'Customer Code',
    cuName: 'Company Name / Entity',
    cuNamePl: 'Example: PT Astra Daihatsu Motor (Sunter Plant)',
    cuStatus: 'Client Status',
    cuStatusNew: 'New Customer',
    cuStatusOld: 'Existing/VIP Customer',
    cuTax: 'Tax Transaction Code',
    cuTax1: '01 - Normal Taxable Goods/Services Delivery',
    cuTax2: '02 - Government Treasurer Collector',
    cuTax3: '03 - SOE / Non-Treasurer Collector',
    cuTax4: '04 - Other Value Tax Base',
    cuTax7: '07 - Bonded Zone (VAT Exempt)',
    cuTax8: '08 - VAT Not Collected',
    cuNpwp: 'Taxpayer Registration Number (NPWP)',
    cuBill: 'Billing Address',
    cuBillPl: 'Head office address / tax invoice address...',
    cuShip: 'Factory Shipping Address',
    cuShipPl: 'If same, leave blank...',
    cuTerm: 'Payment Term',
    cuTerm1: 'Cash Before Delivery (CBD)',
    cuTerm2: 'Net 14 Days',
    cuTerm3: 'Net 30 Days',
    cuTerm4: 'Net 45 Days',
    cuTerm5: 'Net 60 Days',
    cuLimit: 'Maximum Credit Limit (IDR)',
    cuPic: 'Procurement PIC / Contact',
    cuPicPl: 'Example: Mr. Bambang (Section Head)',
    btnSaveCust: 'Save Customer Master',
    
    // Supplier
    suCode: 'Vendor / Supplier Code',
    suName: 'Vendor Company Name',
    suNamePl: 'Example: Nippon Polymer & Chemical Corp Tokyo',
    suNpwp: 'NPWP / Tax ID',
    suTerm: 'Payment Term',
    suAddr: 'Supplier Office / Factory Address',
    suAddrPl: 'Complete delivery location address or import country of origin...',
    suBank: 'Bank Name',
    suAcc: 'Bank Account Number',
    suAccPl: 'Example: 295-0019283',
    btnSaveSupp: 'Save Vendor Master',

    // Item
    itCode: 'Item Code',
    itCodePl: 'Example: SM-MSK-KFT24',
    itName: 'Product / Material Name',
    itNamePl: 'Example: Automotive Masking Tape High-Temp 150°C 24mm x 50m',
    itCat: 'Category',
    itCat1: 'Raw Material',
    itCat2: 'Jumbo Roll Tape',
    itCat3: 'Slit Tape (Converted Product)',
    itCat4: 'Finished Goods',
    itCat5: 'Packaging (Carton & Core)',
    itUnit: 'Base Unit',
    itRack: 'Warehouse Rack Location',
    itStock: 'Initial Stock',
    itMin: 'Safety Stock (Min)',
    itCost: 'Unit Cost (IDR)',
    itPrice: 'Selling Price (IDR)',
    itCalc: 'Automatic Gross Margin Calculation:',
    btnSaveItem: 'Save Item Master',

    // Waste
    wsType: 'Waste Type',
    wsType1: 'Raw Material Waste (Film / Glue)',
    wsType2: 'Finished Product Waste (Defective Tape Roll / NG)',
    wsSev: 'Severity Classification',
    wsSev1: 'MINOR (< 2% Standard Tolerance)',
    wsSev2: 'MAJOR (2% - 5% Needs Machine Evaluation)',
    wsSev3: 'CRITICAL (> 5% Stop Machine & QC Review)',
    wsCode: 'Material Item Code',
    wsLot: 'Material Lot Number',
    wsQty: 'Quantity',
    wsUnit: 'Unit',
    wsRoot: 'Root Cause',
    wsRootPl: 'Example: Unstable tension brake causing edge wrinkles on film roll...',
    wsCorr: 'Corrective Action',
    wsCorrPl: 'Immediate waste handling action...',
    wsPrev: 'Preventive Action',
    wsPrevPl: 'Prevention to avoid repeating issue in the future...',
    btnSaveWaste: 'Log Waste Report',

    btnCancel: 'Cancel',
    succCust: 'Customer {name} ({code}) was successfully registered into Master Data.',
    succSupp: 'Vendor/Supplier {name} ({code}) was successfully registered.',
    succItem: 'Item {name} ({code}) was successfully saved with {margin}% Gross Margin calculation.',
    succWaste: 'Waste Ticket {ticket} level [{sev}] was successfully recorded.',
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'customer' | 'supplier' | 'item' | 'waste';
}

export const MasterDataFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'customer' }) => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

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
    setSuccessMessage(t.succCust.replace('{name}', custName).replace('{code}', custCode));
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
    setSuccessMessage(t.succSupp.replace('{name}', suppName).replace('{code}', suppCode));
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
    setSuccessMessage(t.succItem.replace('{name}', itemName).replace('{code}', itemCode).replace('{margin}', margin.toString()));
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
    setSuccessMessage(t.succWaste.replace('{ticket}', newWaste.ticketNumber).replace('{sev}', wasteSeverity));
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
              <span>{t.formTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.formDesc}
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
            <span>{t.tabCust}</span>
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
            <span>{t.tabSupp}</span>
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
            <span>{t.tabItem}</span>
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
            <span>{t.tabWaste}</span>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuCode}</label>
                  <input
                    type="text"
                    required
                    value={custCode}
                    onChange={(e) => setCustCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuName}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.cuNamePl}
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuStatus}</label>
                  <select
                    value={custStatus}
                    onChange={(e) => setCustStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="NEW">{t.cuStatusNew}</option>
                    <option value="OLD">{t.cuStatusOld}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.cuTax}
                  </label>
                  <select
                    value={custTaxCode}
                    onChange={(e) => setCustTaxCode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                  >
                    <option value="01">{t.cuTax1}</option>
                    <option value="02">{t.cuTax2}</option>
                    <option value="03">{t.cuTax3}</option>
                    <option value="04">{t.cuTax4}</option>
                    <option value="07">{t.cuTax7}</option>
                    <option value="08">{t.cuTax8}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuNpwp}</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuBill}</label>
                  <textarea
                    rows={2}
                    required
                    placeholder={t.cuBillPl}
                    value={custBillingAddress}
                    onChange={(e) => setCustBillingAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuShip}</label>
                  <textarea
                    rows={2}
                    placeholder={t.cuShipPl}
                    value={custShippingAddress}
                    onChange={(e) => setCustShippingAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuTerm}</label>
                  <select
                    value={custPaymentTerm}
                    onChange={(e) => setCustPaymentTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Cash Before Delivery (CBD)">{t.cuTerm1}</option>
                    <option value="Net 14 Hari">{t.cuTerm2}</option>
                    <option value="Net 30 Hari">{t.cuTerm3}</option>
                    <option value="Net 45 Hari">{t.cuTerm4}</option>
                    <option value="Net 60 Hari">{t.cuTerm5}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuLimit}</label>
                  <input
                    type="number"
                    value={custCreditLimit}
                    onChange={(e) => setCustCreditLimit(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.cuPic}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.cuPicPl}
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
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {t.btnSaveCust}
                </button>
              </div>
            </form>
          )}

          {/* 2. Master Supplier */}
          {activeTab === 'supplier' && (
            <form onSubmit={handleSupplierSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.suCode}</label>
                  <input
                    type="text"
                    required
                    value={suppCode}
                    onChange={(e) => setSuppCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.suName}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.suNamePl}
                    value={suppName}
                    onChange={(e) => setSuppName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.suNpwp}</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.suTerm}</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.suAddr}</label>
                <textarea
                  rows={2}
                  required
                  placeholder={t.suAddrPl}
                  value={suppAddress}
                  onChange={(e) => setSuppAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.suBank}</label>
                  <input
                    type="text"
                    required
                    value={suppBank}
                    onChange={(e) => setSuppBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.suAcc}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.suAccPl}
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
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {t.btnSaveSupp}
                </button>
              </div>
            </form>
          )}

          {/* 3. Master Item */}
          {activeTab === 'item' && (
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itCode}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.itCodePl}
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itName}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.itNamePl}
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itCat}</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as ItemCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Raw Material">{t.itCat1}</option>
                    <option value="Jumbo Roll Tape">{t.itCat2}</option>
                    <option value="Slit Tape">{t.itCat3}</option>
                    <option value="Finished Goods">{t.itCat4}</option>
                    <option value="Packaging">{t.itCat5}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itUnit}</label>
                  <input
                    type="text"
                    required
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itRack}</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itStock}</label>
                  <input
                    type="number"
                    value={itemStock}
                    onChange={(e) => setItemStock(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itMin}</label>
                  <input
                    type="number"
                    value={itemMinStock}
                    onChange={(e) => setItemMinStock(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itCost}</label>
                  <input
                    type="number"
                    value={itemCost}
                    onChange={(e) => setItemCost(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.itPrice}</label>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <span>{t.itCalc}</span>
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
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {t.btnSaveItem}
                </button>
              </div>
            </form>
          )}

          {/* 4. Pencatatan Limbah */}
          {activeTab === 'waste' && (
            <form onSubmit={handleWasteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsType}</label>
                  <select
                    value={wasteType}
                    onChange={(e) => setWasteType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="RAW_MATERIAL_WASTE">{t.wsType1}</option>
                    <option value="FINISHED_PRODUCT_WASTE">{t.wsType2}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsSev}</label>
                  <select
                    value={wasteSeverity}
                    onChange={(e) => setWasteSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="MINOR">{t.wsSev1}</option>
                    <option value="MAJOR">{t.wsSev2}</option>
                    <option value="CRITICAL">{t.wsSev3}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsCode}</label>
                  <input
                    type="text"
                    required
                    value={wasteItemCode}
                    onChange={(e) => setWasteItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsLot}</label>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsQty}</label>
                    <input
                      type="number"
                      required
                      value={wasteQty}
                      onChange={(e) => setWasteQty(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsUnit}</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsRoot}</label>
                <input
                  type="text"
                  required
                  placeholder={t.wsRootPl}
                  value={wasteRootCause}
                  onChange={(e) => setWasteRootCause(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsCorr}</label>
                  <textarea
                    rows={2}
                    required
                    placeholder={t.wsCorrPl}
                    value={wasteCorrective}
                    onChange={(e) => setWasteCorrective(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.wsPrev}</label>
                  <textarea
                    rows={2}
                    placeholder={t.wsPrevPl}
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
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {t.btnSaveWaste}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
