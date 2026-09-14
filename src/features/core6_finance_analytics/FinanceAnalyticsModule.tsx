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
import { useAppStore, appStore } from '../../store/useAppStore';
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

export const FinanceAnalyticsModule: React.FC = () => {
  const deliveryOrders = useAppStore((state) => state.deliveryOrders);
  const currentUser = useAppStore((state) => state.currentUser);
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
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
    () => deliveryOrders.filter((d) => d.selectedForInvoice),
    [deliveryOrders]
  );

  // Real-time calculation result
  const calculationResult = useMemo(
    () => calculateSalesInvoice(selectedFormulaId, selectedDos, customParams),
    [selectedFormulaId, selectedDos, customParams]
  );

  const canViewCostAndMargin = checkPermission(currentUser.permissions, 'finance:cost:read');

  const allSelected = deliveryOrders.length > 0 && deliveryOrders.every((d) => d.selectedForInvoice);

  const toggleAll = () => {
    appStore.selectAllDos(!allSelected);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Finance & Sales Invoice Multi-DO
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Konsolidasi multi-surat jalan (DO), 13 formula perpajakan (PPN 11%, PPh 23), biaya freight & audit profitabilitas
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
            <span>Formulir Finance & Klaim</span>
          </button>
          <button
            onClick={() => setShowPrintInvoiceModal(true)}
            disabled={selectedDos.length === 0}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
              selectedDos.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Faktur</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Row - Clean, Spacious Light Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Subtotal Nilai Barang</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {formatIDR(calculationResult.subtotalGoods)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {selectedDos.length} Surat Jalan (DO) terpilih
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dasar Pengenaan Pajak (DPP)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {formatIDR(calculationResult.taxableBaseDpp)}
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-semibold">
            PPN 11%: {formatIDR(calculationResult.ppnAmount)}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tagihan Bersih</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-600 mt-2">
            {formatIDR(calculationResult.finalPayableAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {calculationResult.formulaName}
          </div>
        </div>

        {/* Gross Margin Safeguard Metric - Protected by RBAC */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Safeguard Gross Margin</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>

          <Can
            perform="finance:cost:read"
            fallback={
              <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5 italic">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Terproteksi RBAC (Finance Level)</span>
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
                (Min: {customParams.minimumMarginPercent}%)
              </span>
            </div>
            <div className="text-xs mt-1">
              {calculationResult.marginCheckPassed ? (
                <span className="text-emerald-600 font-bold">✓ Lolos Standar Profitabilitas</span>
              ) : (
                <span className="text-rose-600 font-bold">⚠ Di Bawah Floor Margin!</span>
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
                  <span>Pilih Surat Jalan (Delivery Order Multi-DO)</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                    {selectedDos.length} / {deliveryOrders.length} Dipilih
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Centang DO untuk dikonsolidasi menjadi satu faktur komersial
                </p>
              </div>

              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer self-start sm:self-auto"
              >
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>{allSelected ? 'Batal Pilih Semua' : 'Pilih Semua DO'}</span>
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
                    <th className="py-3 px-3 font-bold">No. Surat Jalan (DO)</th>
                    <th className="py-3 px-3 font-bold">Customer & Item</th>
                    <th className="py-3 px-3 font-bold text-right">Kuantitas</th>
                    <th className="py-3 px-3 font-bold text-right">Harga Satuan</th>
                    <th className="py-3 px-3 font-bold text-right">Total Bruto</th>
                    <th className="py-3 px-3 font-bold text-center">Armada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryOrders.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => appStore.toggleDoSelection(d.id)}
                      className={`cursor-pointer transition-colors ${
                        d.selectedForInvoice
                          ? 'bg-blue-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        {d.selectedForInvoice ? (
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
                          {d.itemName || (d.items && d.items[0]?.itemName) || 'Multi-Item Order'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold font-mono">
                        {d.qtyDelivered || (d.items && d.items.reduce((s, it) => s + it.quantity, 0)) || 0}{' '}
                        {d.unit || (d.items && d.items[0]?.unit) || 'Carton'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatIDR(d.unitPrice || (d.items && d.items[0]?.unitPrice) || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold font-mono text-slate-900">
                        {formatIDR(d.totalBeforeTax || d.totalGrossValue || 0)}
                      </td>
                      <td className="py-3 px-3 text-center text-[11px] text-slate-500 font-mono">
                        {d.truckPlate || d.truckArmada}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Multi-DO Selection Summary Bar */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>
                  Logistik: <strong>{selectedDos.length} DO</strong> dikonsolidasi dalam satu penagihan.
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-sm">
                Subtotal: {formatIDR(calculationResult.subtotalGoods)}
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
                  <span>Kalkulator Faktur Multi-Formula</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih skema kalkulasi penagihan resmi ST. Morita Industries
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                13 Formula
              </span>
            </div>

            {/* Formula Selector Dropdown */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Pilih Rumus Faktur Penjualan
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
                Parameter Variabel Rumus Aktif
              </div>

              {/* Conditional Controls based on formula */}
              {selectedFormulaId === 'FORMULA_2_FREIGHT_ADDED' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Biaya Ongkos Angkut Truk (Freight):</span>
                    <span className="font-mono font-bold">{formatIDR(customParams.freightCost || 0)}</span>
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
                    <span className="text-slate-600">Nilai Uang Muka (Down Payment):</span>
                    <span className="font-mono font-bold">{formatIDR(customParams.downPaymentAmount || 0)}</span>
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
                    <span className="text-slate-600">Persentase Retensi Mutu:</span>
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
                    <span className="text-slate-600">Batas Bawah Margin Minimum:</span>
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
                    <span className="text-slate-600">Potongan Nota Retur Cacat:</span>
                    <span className="font-mono font-bold">{formatIDR(customParams.returnNoteAmount || 0)}</span>
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
                    <span>Kurs KMK / JISDOR:</span>
                    <span className="font-bold">1 USD = Rp {customParams.exchangeRate?.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Nilai USD: {formatUSD(calculationResult.finalPayableAmount / (customParams.exchangeRate || 16250))}
                  </div>
                </div>
              )}
            </div>

            {/* Calculated Breakdown Line-Items */}
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-600">Subtotal Nilai Barang:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatIDR(calculationResult.subtotalGoods)}
                </span>
              </div>

              {calculationResult.discountOrRebate > 0 && (
                <div className="py-2 flex justify-between text-emerald-600">
                  <span>Potongan Diskon / Rebat:</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.discountOrRebate)}
                  </span>
                </div>
              )}

              {calculationResult.freightAmount > 0 && (
                <div className="py-2 flex justify-between text-blue-600">
                  <span>Ongkos Angkut Ekspedisi:</span>
                  <span className="font-mono font-bold">
                    + {formatIDR(calculationResult.freightAmount)}
                  </span>
                </div>
              )}

              {calculationResult.downPaymentDeduction > 0 && (
                <div className="py-2 flex justify-between text-amber-600">
                  <span>Potongan Uang Muka (DP):</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.downPaymentDeduction)}
                  </span>
                </div>
              )}

              {calculationResult.returnCreditOffset > 0 && (
                <div className="py-2 flex justify-between text-rose-600">
                  <span>Kredit Nota Retur Cacat:</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.returnCreditOffset)}
                  </span>
                </div>
              )}

              <div className="py-2.5 flex justify-between bg-slate-50 px-2.5 rounded-lg font-semibold text-slate-800">
                <span>Dasar Pengenaan Pajak (DPP):</span>
                <span className="font-mono">{formatIDR(calculationResult.taxableBaseDpp)}</span>
              </div>

              <div className="py-2 flex justify-between text-slate-700">
                <span>PPN 11% (Faktur Pajak):</span>
                <span className="font-mono font-bold text-blue-600">
                  + {formatIDR(calculationResult.ppnAmount)}
                </span>
              </div>

              {calculationResult.pph23Amount > 0 && (
                <div className="py-2 flex justify-between text-amber-600">
                  <span>Potongan PPh 23 (2% Jasa Slit):</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.pph23Amount)}
                  </span>
                </div>
              )}

              {calculationResult.retentionWithheld > 0 && (
                <div className="py-2 flex justify-between text-amber-600">
                  <span>Retensi Mutu Ditahan (5%):</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.retentionWithheld)}
                  </span>
                </div>
              )}

              {/* Total Payable */}
              <div className="py-3.5 flex justify-between items-center text-sm font-black pt-3 border-t-2 border-slate-200">
                <span className="text-slate-900">TOTAL FAKTUR BERSIH:</span>
                <span className="text-lg font-mono text-emerald-600">
                  {formatIDR(calculationResult.finalPayableAmount)}
                </span>
              </div>
            </div>

            {/* Quick Action */}
            <button
              onClick={() => setShowPrintInvoiceModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Generate Faktur & Faktur Pajak Resmi</span>
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
                  FAKTUR PENJUALAN KOMERSIAL
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  ST. Morita Industries
                </h3>
                <div className="text-xs text-slate-500">
                  Divisi Manufaktur Adhesive Tapes & Industrial Converting
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-slate-900">
                  INV/SM/{new Date().getFullYear()}/09/0819
                </div>
                <div className="text-slate-500">Tgl: {new Date().toLocaleDateString('id-ID')}</div>
                <div className="text-emerald-600 font-bold">STATUS: RESMI DISETUJUI</div>
              </div>
            </div>

            {/* Formula Meta */}
            <div className="p-3.5 rounded-xl bg-slate-50 text-xs flex justify-between items-center border border-slate-200">
              <div>
                <span className="text-slate-500">Skema Formula Terpilih: </span>
                <strong className="text-slate-900">{calculationResult.formulaName}</strong>
              </div>
              <div className="font-mono text-slate-600 font-semibold">
                Metode: {calculationResult.formulaId}
              </div>
            </div>

            {/* Selected Items summary */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 font-bold">No. DO</th>
                    <th className="p-2.5 font-bold">Deskripsi Produk</th>
                    <th className="p-2.5 text-right font-bold">Qty</th>
                    <th className="p-2.5 text-right font-bold">Harga Satuan</th>
                    <th className="p-2.5 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDos.map((d) => (
                    <tr key={d.id}>
                      <td className="p-2.5 font-mono text-slate-800">{d.doNumber}</td>
                      <td className="p-2.5 text-slate-800">{d.itemName}</td>
                      <td className="p-2.5 text-right font-mono">{d.qtyDelivered} {d.unit}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">{formatIDR(d.unitPrice)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatIDR(d.totalBeforeTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Dasar Pengenaan Pajak (DPP):</span>
                <span className="font-mono font-bold text-slate-800">{formatIDR(calculationResult.taxableBaseDpp)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>PPN 11%:</span>
                <span className="font-mono font-bold text-blue-600">{formatIDR(calculationResult.ppnAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>TOTAL HARUS DIBAYAR:</span>
                <span className="font-mono text-emerald-600">
                  {formatIDR(calculationResult.finalPayableAmount)}
                </span>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPrintInvoiceModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Faktur (Print / PDF)</span>
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
