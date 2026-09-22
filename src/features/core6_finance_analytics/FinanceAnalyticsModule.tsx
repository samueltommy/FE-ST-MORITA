import React, { useState, useMemo } from 'react';
import {
  Calculator,
  CheckSquare,
  Square,
  ArrowRight,
  TrendingUp,
  Percent,
  Coins,
  Receipt,
  Truck,
  ShieldAlert,
  Printer,
  FileCheck2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { FinancialMask } from "../../components/ui/FinancialMask";
import { useAppStore } from '../../store/useAppStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getDeliveryOrdersApi, calculateInvoiceApi, createInvoiceApi } from '../../services/financeService';
import {
  INVOICE_FORMULAS,
  calculateSalesInvoice,
  formatIDR,
  formatUSD,
  FormulaCustomParameters,
} from '../../utils/invoiceCalculator';
import { InvoiceFormulaId, DeliveryOrder } from '../../types';
import { checkPermission } from '../../utils/rbac';
import { Can } from '../../components/rbac/Can';
import { FinanceFormsModal } from '../../components/forms/FinanceFormsModal';

const CONTENT = {
  id: {
    title: 'Finance & Sales Invoice Multi-DO',
    desc: 'Konsolidasi multi-surat jalan (DO), 13 formula perpajakan (PPN 11%, PPh 23), biaya freight & audit profitabilitas',
    btnForm: 'Formulir Finance & Klaim',
    btnPrint: 'Cetak Faktur',
    kpiSubtotal: 'Subtotal Nilai Barang',
    doSelected: 'Surat Jalan (DO) terpilih',
    kpiDpp: 'Dasar Pengenaan Pajak (DPP)',
    ppn11: 'PPN 11%:',
    kpiTotal: 'Total Tagihan Bersih',
    kpiMargin: 'Safeguard Gross Margin',
    rbacProtected: 'Terproteksi RBAC (Finance Level)',
    marginMin: 'Min:',
    marginOk: '✓ Lolos Standar Profitabilitas',
    marginLow: '⚠ Di Bawah Floor Margin!',
    tableTitle: 'Pilih Surat Jalan (Delivery Order Multi-DO)',
    tableSelected: 'Dipilih',
    tableDesc: 'Centang DO untuk dikonsolidasi menjadi satu faktur komersial',
    btnSelectAll: 'Pilih Semua DO',
    btnUnselectAll: 'Batal Pilih Semua',
    colDo: 'No. Surat Jalan (DO)',
    colCustItem: 'Customer & Item',
    colQty: 'Kuantitas',
    colPrice: 'Harga Satuan',
    colTotal: 'Total Bruto',
    colFleet: 'Armada',
    multiItem: 'Multi-Item Order',
    logisticConsolidation: 'Logistik:',
    doConsolidated: 'DO dikonsolidasi dalam satu penagihan.',
    subtotal: 'Subtotal:',
    calcTitle: 'Kalkulator Faktur Multi-Formula',
    calcDesc: 'Pilih skema kalkulasi penagihan resmi ST. Morita Industries',
    formulas: '13 Formula',
    selectFormula: 'Pilih Rumus Faktur Penjualan',
    activeParams: 'Parameter Variabel Rumus Aktif',
    paramFreight: 'Biaya Ongkos Angkut Truk (Freight):',
    paramDp: 'Nilai Uang Muka (Down Payment):',
    paramRetention: 'Persentase Retensi Mutu:',
    paramMargin: 'Batas Bawah Margin Minimum:',
    paramReturn: 'Potongan Nota Retur Cacat:',
    paramForex: 'Kurs KMK / JISDOR:',
    usdValue: 'Nilai USD:',
    breakdownSubtotal: 'Subtotal Nilai Barang:',
    breakdownDiscount: 'Potongan Diskon / Rebat:',
    breakdownFreight: 'Ongkos Angkut Ekspedisi:',
    breakdownDp: 'Potongan Uang Muka (DP):',
    breakdownReturn: 'Kredit Nota Retur Cacat:',
    breakdownDpp: 'Dasar Pengenaan Pajak (DPP):',
    breakdownPpn: 'PPN 11% (Faktur Pajak):',
    breakdownPph23: 'Potongan PPh 23 (2% Jasa Slit):',
    breakdownRetention: 'Retensi Mutu Ditahan (5%):',
    totalNetInvoice: 'TOTAL FAKTUR BERSIH:',
    btnGenerate: 'Generate Faktur & Faktur Pajak Resmi',
    modalInvoiceTitle: 'FAKTUR PENJUALAN KOMERSIAL',
    modalInvoiceDesc: 'Divisi Manufaktur Adhesive Tapes & Industrial Converting',
    modalStatus: 'STATUS: RESMI DISETUJUI',
    modalFormula: 'Skema Formula Terpilih:',
    modalMethod: 'Metode:',
    modalColDo: 'No. DO',
    modalColDesc: 'Deskripsi Produk',
    modalTotalPayable: 'TOTAL HARUS DIBAYAR:',
    modalBtnClose: 'Tutup',
    modalBtnPrint: 'Cetak Faktur (Print / PDF)',
  },
  en: {
    title: 'Finance & Sales Invoice Multi-DO',
    desc: 'Multi-Delivery Order (DO) consolidation, 13 tax formulas (VAT 11%, WHT 23), freight costs & profitability audit',
    btnForm: 'Finance & Claim Forms',
    btnPrint: 'Print Invoice',
    kpiSubtotal: 'Goods Subtotal',
    doSelected: 'Delivery Orders (DO) selected',
    kpiDpp: 'Taxable Base (DPP)',
    ppn11: 'VAT 11%:',
    kpiTotal: 'Total Net Payable',
    kpiMargin: 'Gross Margin Safeguard',
    rbacProtected: 'RBAC Protected (Finance Level)',
    marginMin: 'Min:',
    marginOk: '✓ Passed Profitability Standard',
    marginLow: '⚠ Below Floor Margin!',
    tableTitle: 'Select Delivery Order (Multi-DO)',
    tableSelected: 'Selected',
    tableDesc: 'Check DOs to consolidate into a single commercial invoice',
    btnSelectAll: 'Select All DOs',
    btnUnselectAll: 'Deselect All',
    colDo: 'DO Number',
    colCustItem: 'Customer & Item',
    colQty: 'Quantity',
    colPrice: 'Unit Price',
    colTotal: 'Gross Total',
    colFleet: 'Fleet',
    multiItem: 'Multi-Item Order',
    logisticConsolidation: 'Logistics:',
    doConsolidated: 'DOs consolidated in one billing.',
    subtotal: 'Subtotal:',
    calcTitle: 'Multi-Formula Invoice Calculator',
    calcDesc: 'Select ST. Morita Industries official billing calculation scheme',
    formulas: '13 Formulas',
    selectFormula: 'Select Sales Invoice Formula',
    activeParams: 'Active Formula Variable Parameters',
    paramFreight: 'Truck Freight Cost:',
    paramDp: 'Down Payment Amount:',
    paramRetention: 'Quality Retention Percentage:',
    paramMargin: 'Minimum Margin Floor:',
    paramReturn: 'Defective Return Note Deduction:',
    paramForex: 'KMK / JISDOR Exchange Rate:',
    usdValue: 'USD Value:',
    breakdownSubtotal: 'Goods Subtotal Value:',
    breakdownDiscount: 'Discount / Rebate Deduction:',
    breakdownFreight: 'Expedition Freight Cost:',
    breakdownDp: 'Down Payment (DP) Deduction:',
    breakdownReturn: 'Defective Return Note Credit:',
    breakdownDpp: 'Taxable Base (DPP):',
    breakdownPpn: 'VAT 11% (Tax Invoice):',
    breakdownPph23: 'WHT 23 Deduction (2% Slit Service):',
    breakdownRetention: 'Withheld Quality Retention (5%):',
    totalNetInvoice: 'TOTAL NET INVOICE:',
    btnGenerate: 'Generate Official Commercial & Tax Invoice',
    modalInvoiceTitle: 'COMMERCIAL SALES INVOICE',
    modalInvoiceDesc: 'Adhesive Tapes & Industrial Converting Manufacturing Division',
    modalStatus: 'STATUS: OFFICIALLY APPROVED',
    modalFormula: 'Selected Formula Scheme:',
    modalMethod: 'Method:',
    modalColDo: 'DO No.',
    modalColDesc: 'Product Description',
    modalTotalPayable: 'TOTAL PAYABLE AMOUNT:',
    modalBtnClose: 'Close',
    modalBtnPrint: 'Print Invoice (Print / PDF)',
  }
};

export const FinanceAnalyticsModule: React.FC = () => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const { data: deliveryOrders = [], refetch: refetchDos, isLoading: isDosLoading } = useQuery({
    queryKey: ['deliveryOrders'],
    queryFn: getDeliveryOrdersApi,
  });

  const [selectedDoIds, setSelectedDoIds] = useState<Set<string>>(new Set());

  const currentUser = useAppStore((state) => state.currentUser);
  const isHighDensity = useAppStore((state) => state.isHighDensity);

  const [selectedFormulaId, setSelectedFormulaId] = useState<InvoiceFormulaId>(
    'FORMULA_1_STANDARD_NET'
  );
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeModalTab, setFinanceModalTab] = useState<'complaint' | 'ap' | 'ar' | 'rma'>('complaint');

  // Custom adjustable parameters for real-time recalculation
  const [customParams, setCustomParams] = useState<FormulaCustomParameters>({
    freightCost: 2200000,
    discountRatePercent: 2.5,
    downPaymentAmount: 35000000,
    retentionPercent: 5.0,
    returnNoteAmount: 4850000,
    minimumMarginPercent: 18.0,
    estimatedCostOfGoods: 118000000,
    currency: 'IDR',
    exchangeRate: 16250,
  });

  const [showPrintInvoiceModal, setShowPrintInvoiceModal] = useState(false);

  // Selected DOs
  const selectedDos = useMemo(
    () => deliveryOrders.filter((d) => selectedDoIds.has(d.id)),
    [deliveryOrders, selectedDoIds]
  );

  // Real-time calculation result
  const calculationResult = useMemo(
    () => calculateSalesInvoice(selectedFormulaId, selectedDos, customParams),
    [selectedFormulaId, selectedDos, customParams]
  );

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const formulaNumber = parseInt(selectedFormulaId.replace('FORMULA_', '').split('_')[0], 10) || 1;
      const custId = selectedDos.length > 0 ? (selectedDos[0].customerId || 'CUST-000') : 'CUST-000';
      return await createInvoiceApi({
        customer_id: custId,
        delivery_order_ids: Array.from(selectedDoIds),
        formula_id: formulaNumber,
        freight_cost: customParams.freightCost,
        discount_amount: (customParams.discountRatePercent / 100) * calculationResult.subtotalGoods,
        down_payment_deduction: customParams.downPaymentAmount,
        retention_deduction: (customParams.retentionPercent / 100) * calculationResult.subtotalGoods,
        ppn_rate: 11,
        pph_rate: 2,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
      });
    },
    onSuccess: (data) => {
      setShowPrintInvoiceModal(true);
      refetchDos(); // Refresh DO table to exclude generated DOs
      setSelectedDoIds(new Set()); // Clear selection
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message;
      alert("Gagal menerbitkan invoice: " + (typeof msg === 'string' ? msg : JSON.stringify(msg)));
    }
  });

  const handleGenerateInvoice = () => {
    createInvoiceMutation.mutate();
  };

  const canViewCostAndMargin = checkPermission(currentUser.permissions, 'finance:cost:read');

  const allSelected = deliveryOrders.length > 0 && selectedDoIds.size === deliveryOrders.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedDoIds(new Set());
    } else {
      setSelectedDoIds(new Set(deliveryOrders.map(d => d.id)));
    }
  };

  const toggleDoSelection = (id: string) => {
    const newSet = new Set(selectedDoIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDoIds(newSet);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {t.desc}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setFinanceModalTab('complaint');
              setFinanceModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.btnForm}</span>
          </button>
          <button
            onClick={() => handleGenerateInvoice()}
            disabled={selectedDos.length === 0 || createInvoiceMutation.isPending}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
              selectedDos.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{t.btnPrint}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Row - Clean, Spacious Light Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.kpiSubtotal}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {<FinancialMask value={calculationResult.subtotalGoods} />}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {selectedDos.length} {t.doSelected}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.kpiDpp}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {<FinancialMask value={calculationResult.taxableBaseDpp} />}
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-semibold">
            {t.ppn11} {<FinancialMask value={calculationResult.ppnAmount} />}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.kpiTotal}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-600 mt-2">
            {<FinancialMask value={calculationResult.finalPayableAmount} />}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {calculationResult.formulaName}
          </div>
        </div>

        {/* Gross Margin Safeguard Metric - Protected by RBAC */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.kpiMargin}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>

          <Can
            perform="finance:cost:read"
            fallback={
              <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5 italic">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.rbacProtected}</span>
              </div>
            }
          >
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className={`text-xl font-black ${
                  calculationResult.marginCheckPassed ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {calculationResult.estimatedMarginPercent}%
              </span>
              <span className="text-xs text-slate-400">
                ({t.marginMin} {customParams.minimumMarginPercent}%)
              </span>
            </div>
            <div className="text-xs mt-1">
              {calculationResult.marginCheckPassed ? (
                <span className="text-emerald-600 font-bold">{t.marginOk}</span>
              ) : (
                <span className="text-rose-600 font-bold">{t.marginLow}</span>
              )}
            </div>
          </Can>
        </div>
      </div>

      {/* Main Content: Multi-DO Table & Formula Calculator */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Multi-DO Selection Table (7 Cols) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>{t.tableTitle}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                    {selectedDos.length} / {deliveryOrders.length} {t.tableSelected}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.tableDesc}
                </p>
              </div>

              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer self-start sm:self-auto"
              >
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>{allSelected ? t.btnUnselectAll : t.btnSelectAll}</span>
              </button>
            </div>

            {/* Clean Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-3 w-10 text-center">
                      <button onClick={toggleAll} className="cursor-pointer">
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 font-bold">{t.colDo}</th>
                    <th className="py-3 px-3 font-bold">{t.colCustItem}</th>
                    <th className="py-3 px-3 font-bold text-right">{t.colQty}</th>
                    <th className="py-3 px-3 font-bold text-right">{t.colPrice}</th>
                    <th className="py-3 px-3 font-bold text-right">{t.colTotal}</th>
                    <th className="py-3 px-3 font-bold text-center">{t.colFleet}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryOrders.map((d) => {
                    const isSelected = selectedDoIds.has(d.id);
                    return (
                      <tr
                        key={d.id}
                        onClick={() => toggleDoSelection(d.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {d.doNumber}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Tgl: {d.deliveryDate || d.dispatchDate}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {d.customerName}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[180px]">
                            {d.itemName || (d.items && d.items[0]?.itemName) || t.multiItem}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold font-mono">
                          {d.qtyDelivered || (d.items && d.items.reduce((s, it) => s + it.quantity, 0)) || 0}{' '}
                          {d.unit || (d.items && d.items[0]?.unit) || 'Carton'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          <FinancialMask value={d.unitPrice || (d.items && d.items[0]?.unitPrice) || 0} />
                        </td>
                        <td className="py-3 px-3 text-right font-bold font-mono text-slate-900">
                          {<FinancialMask value={d.totalBeforeTax || d.totalGrossValue || 0} />}
                        </td>
                        <td className="py-3 px-3 text-center text-[11px] text-slate-500 font-mono">
                          {d.truckPlate || d.truckArmada}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Multi-DO Selection Summary Bar */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>
                  {t.logisticConsolidation} <strong>{selectedDos.length} DO</strong> {t.doConsolidated}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {t.subtotal} {<FinancialMask value={calculationResult.subtotalGoods} />}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 13-Formula Calculator Widget (5 Cols) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>{t.calcTitle}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.calcDesc}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {t.formulas}
              </span>
            </div>

            {/* Formula Selector Dropdown */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                {t.selectFormula}
              </label>
              <select
                id="invoice-formula-selector"
                value={selectedFormulaId}
                onChange={(e) => setSelectedFormulaId(e.target.value as InvoiceFormulaId)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {INVOICE_FORMULAS.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.code}] {f.name} &bull; {f.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Formula Explanation Card */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs space-y-1">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{calculationResult.formulaName}</span>
              </div>
              <p className="text-xs text-blue-800/80 leading-relaxed">
                {calculationResult.formulaDescription}
              </p>
            </div>

            {/* Dynamic Formula Parameter Adjuster */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {t.activeParams}
              </div>

              {/* Conditional Controls based on formula */}
              {selectedFormulaId === 'FORMULA_2_FREIGHT_ADDED' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{t.paramFreight}</span>
                    <span className="font-mono font-bold">{<FinancialMask value={customParams.freightCost || 0} />}</span>
                  </div>
                  <input
                    type="range"
                    min="500000"
                    max="10000000"
                    step="250000"
                    value={customParams.freightCost || 2200000}
                    onChange={(e) =>
                      setCustomParams({ ...customParams, freightCost: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600"
                  />
                </div>
              )}

              {selectedFormulaId === 'FORMULA_5_DP_DEDUCTION' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{t.paramDp}</span>
                    <span className="font-mono font-bold">{<FinancialMask value={customParams.downPaymentAmount || 0} />}</span>
                  </div>
                  <input
                    type="range"
                    min="5000000"
                    max="80000000"
                    step="1000000"
                    value={customParams.downPaymentAmount || 35000000}
                    onChange={(e) =>
                      setCustomParams({ ...customParams, downPaymentAmount: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>
              )}

              {selectedFormulaId === 'FORMULA_6_RETENTION_GUARANTEE' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{t.paramRetention}</span>
                    <span className="font-mono font-bold">{customParams.retentionPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={customParams.retentionPercent || 5.0}
                    onChange={(e) =>
                      setCustomParams({ ...customParams, retentionPercent: Number(e.target.value) })
                    }
                    className="w-full accent-amber-600"
                  />
                </div>
              )}

              {selectedFormulaId === 'FORMULA_11_COST_CONTROL_SAFEGUARD' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">{t.paramMargin}</span>
                    <span className="font-mono font-bold">{customParams.minimumMarginPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="30"
                    step="0.5"
                    value={customParams.minimumMarginPercent || 18.0}
                    onChange={(e) =>
                      setCustomParams({ ...customParams, minimumMarginPercent: Number(e.target.value) })
                    }
                    className="w-full accent-rose-600"
                  />
                </div>
              )}

              {selectedFormulaId === 'FORMULA_13_RETURN_NOTE_OFFSET' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{t.paramReturn}</span>
                    <span className="font-mono font-bold">{<FinancialMask value={customParams.returnNoteAmount || 0} />}</span>
                  </div>
                  <input
                    type="range"
                    min="1000000"
                    max="20000000"
                    step="500000"
                    value={customParams.returnNoteAmount || 4850000}
                    onChange={(e) =>
                      setCustomParams({ ...customParams, returnNoteAmount: Number(e.target.value) })
                    }
                    className="w-full accent-violet-600"
                  />
                </div>
              )}

              {selectedFormulaId === 'FORMULA_12_FOREX_CURRENCY' && (
                <div className="text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>{t.paramForex}</span>
                    <span className="font-bold">1 USD = Rp {customParams.exchangeRate?.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.usdValue} {formatUSD(calculationResult.finalPayableAmount / (customParams.exchangeRate || 16250))}
                  </div>
                </div>
              )}
            </div>

            {/* Calculated Breakdown Line-Items */}
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-600">{t.breakdownSubtotal}</span>
                <span className="font-mono font-bold text-slate-900">
                  {<FinancialMask value={calculationResult.subtotalGoods} />}
                </span>
              </div>

              {calculationResult.discountOrRebate > 0 && (
                <div className="py-2 flex justify-between text-emerald-600">
                  <span>{t.breakdownDiscount}</span>
                  <span className="font-mono font-bold">
                    - {<FinancialMask value={calculationResult.discountOrRebate} />}
                  </span>
                </div>
              )}

              {calculationResult.freightAmount > 0 && (
                <div className="py-2 flex justify-between text-blue-600">
                  <span>{t.breakdownFreight}</span>
                  <span className="font-mono font-bold">
                    + {<FinancialMask value={calculationResult.freightAmount} />}
                  </span>
                </div>
              )}

              {calculationResult.downPaymentDeduction > 0 && (
                <div className="py-2 flex justify-between text-amber-600">
                  <span>{t.breakdownDp}</span>
                  <span className="font-mono font-bold">
                    - {<FinancialMask value={calculationResult.downPaymentDeduction} />}
                  </span>
                </div>
              )}

              {calculationResult.returnCreditOffset > 0 && (
                <div className="py-2 flex justify-between text-rose-600">
                  <span>{t.breakdownReturn}</span>
                  <span className="font-mono font-bold">
                    - {<FinancialMask value={calculationResult.returnCreditOffset} />}
                  </span>
                </div>
              )}

              <div className="py-2.5 flex justify-between bg-slate-50 px-2.5 rounded-lg font-semibold text-slate-800">
                <span>{t.breakdownDpp}</span>
                <span className="font-mono">{<FinancialMask value={calculationResult.taxableBaseDpp} />}</span>
              </div>

              <div className="py-2 flex justify-between text-slate-700">
                <span>{t.breakdownPpn}</span>
                <span className="font-mono font-bold text-blue-600">
                  + {<FinancialMask value={calculationResult.ppnAmount} />}
                </span>
              </div>

              {calculationResult.pph23Amount > 0 && (
                <div className="py-2 flex justify-between text-amber-600">
                  <span>{t.breakdownPph23}</span>
                  <span className="font-mono font-bold">
                    - {<FinancialMask value={calculationResult.pph23Amount} />}
                  </span>
                </div>
              )}

              {calculationResult.retentionWithheld > 0 && (
                <div className="py-2 flex justify-between text-amber-600">
                  <span>{t.breakdownRetention}</span>
                  <span className="font-mono font-bold">
                    - {<FinancialMask value={calculationResult.retentionWithheld} />}
                  </span>
                </div>
              )}

              {/* Total Payable */}
              <div className="py-3.5 flex justify-between items-center text-sm font-black pt-3 border-t-2 border-slate-200">
                <span className="text-slate-900">{t.totalNetInvoice}</span>
                <span className="text-lg font-mono text-emerald-600">
                  {<FinancialMask value={calculationResult.finalPayableAmount} />}
                </span>
              </div>
            </div>

            {/* Quick Action */}
              <button
                onClick={() => handleGenerateInvoice()}
                disabled={selectedDos.length === 0 || createInvoiceMutation.isPending}
                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                  selectedDos.length === 0 || createInvoiceMutation.isPending ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>{createInvoiceMutation.isPending ? 'Memproses...' : t.btnGenerate}</span>
              </button>
          </div>
        </div>
      </div>

      {/* Invoice Print Modal */}
      {showPrintInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t.modalInvoiceTitle}
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  ST. Morita Industries
                </h3>
                <div className="text-xs text-slate-500">
                  {t.modalInvoiceDesc}
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-slate-900">
                  INV/SM/{new Date().getFullYear()}/09/0819
                </div>
                <div className="text-slate-500">Tgl: {new Date().toLocaleDateString('id-ID')}</div>
                <div className="text-emerald-600 font-bold">{t.modalStatus}</div>
              </div>
            </div>

            {/* Formula Meta */}
            <div className="p-3.5 rounded-xl bg-slate-50 text-xs flex justify-between items-center border border-slate-200">
              <div>
                <span className="text-slate-500">{t.modalFormula} </span>
                <strong className="text-slate-900">{calculationResult.formulaName}</strong>
              </div>
              <div className="font-mono text-slate-600 font-semibold">
                {t.modalMethod} {calculationResult.formulaId}
              </div>
            </div>

            {/* Selected Items summary */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 font-bold">{t.modalColDo}</th>
                    <th className="p-2.5 font-bold">{t.modalColDesc}</th>
                    <th className="p-2.5 text-right font-bold">{t.colQty}</th>
                    <th className="p-2.5 text-right font-bold">{t.colPrice}</th>
                    <th className="p-2.5 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDos.map((d) => (
                    <tr key={d.id}>
                      <td className="p-2.5 font-mono text-slate-800">{d.doNumber}</td>
                      <td className="p-2.5 text-slate-800">{d.itemName}</td>
                      <td className="p-2.5 text-right font-mono">{d.qtyDelivered} {d.unit}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">{<FinancialMask value={d.unitPrice} />}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{<FinancialMask value={d.totalBeforeTax} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t.breakdownDpp}</span>
                <span className="font-mono font-bold text-slate-800">{<FinancialMask value={calculationResult.taxableBaseDpp} />}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t.ppn11}</span>
                <span className="font-mono font-bold text-blue-600">{<FinancialMask value={calculationResult.ppnAmount} />}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>{t.modalTotalPayable}</span>
                <span className="font-mono text-emerald-600">
                  {<FinancialMask value={calculationResult.finalPayableAmount} />}
                </span>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPrintInvoiceModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {t.modalBtnClose}
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>{t.modalBtnPrint}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finance & Complaints Forms Modal */}
      <FinanceFormsModal
        isOpen={financeModalOpen}
        onClose={() => setFinanceModalOpen(false)}
        defaultTab={financeModalTab}
      />
    </div>
  );
};
