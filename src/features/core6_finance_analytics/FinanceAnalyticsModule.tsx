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

export const FinanceAnalyticsModule: React.FC = () => {
  const deliveryOrders = useAppStore((state) => state.deliveryOrders);
  const currentUser = useAppStore((state) => state.currentUser);
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
  const isHighDensity = useAppStore((state) => state.isHighDensity);

  const [selectedFormulaId, setSelectedFormulaId] = useState<InvoiceFormulaId>(
    'FORMULA_1_STANDARD_NET'
  );

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
      {/* Top Banner & KPI Summary Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Finance & Sales Invoice Multi-DO Calculator
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Core 6 Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Konsolidasi multi-surat jalan (DO), 13 formula perpajakan (PPN 11%, PPh 23), biaya freight & audit batas margin
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintInvoiceModal(true)}
            disabled={selectedDos.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              selectedDos.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Pratinjau Faktur Penjualan</span>
          </button>
        </div>
      </div>

      {/* KPI High-Density Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Subtotal Nilai Barang</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatIDR(calculationResult.subtotalGoods)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {selectedDos.length} Surat Jalan (DO) terpilih
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dasar Pengenaan Pajak (DPP)</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatIDR(calculationResult.taxableBaseDpp)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
            PPN 11%: {formatIDR(calculationResult.ppnAmount)}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Tagihan Bersih (Payable)</span>
            <TrendingUp className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-lg font-black text-violet-600 dark:text-violet-400 mt-1">
            {formatIDR(calculationResult.finalPayableAmount)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
            Rumus: {calculationResult.formulaName.slice(0, 24)}...
          </div>
        </div>

        {/* Gross Margin Safeguard Metric - Protected by RBAC! */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Safeguard Gross Margin</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>

          <Can
            perform="finance:cost:read"
            fallback={
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 italic">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Terproteksi RBAC (Khusus Finance & Cost Control)</span>
              </div>
            }
          >
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-lg font-black ${
                  calculationResult.marginCheckPassed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {calculationResult.estimatedMarginPercent}%
              </span>
              <span className="text-[10px] text-slate-400">
                (Target Min: {customParams.minimumMarginPercent}%)
              </span>
            </div>
            <div className="text-[10px] mt-0.5">
              {calculationResult.marginCheckPassed ? (
                <span className="text-emerald-600 font-bold">✓ Lolos Standar Profitabilitas</span>
              ) : (
                <span className="text-rose-600 font-bold">⚠ Di Bawah Floor Margin!</span>
              )}
            </div>
          </Can>
        </div>
      </div>

      {/* Main Split Screen: Multi-DO Table on Left, 13-Formula Calculator Widget on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Multi-DO Selection Table (7 Cols) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Pilih Surat Jalan (Delivery Order Multi-DO)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedDos.length} / {deliveryOrders.length} Dipilih
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Centang DO untuk dikonsolidasi menjadi satu faktur komersial terpadu
                </p>
              </div>

              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>{allSelected ? 'Batal Pilih Semua' : 'Pilih Semua DO'}</span>
              </button>
            </div>

            {/* High Density Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <button onClick={toggleAll}>
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-bold">No. Surat Jalan (DO)</th>
                    <th className="py-2.5 px-3 font-bold">Customer & Item</th>
                    <th className="py-2.5 px-3 font-bold text-right">Kuantitas</th>
                    <th className="py-2.5 px-3 font-bold text-right">Harga Satuan</th>
                    <th className="py-2.5 px-3 font-bold text-right">Total Bruto</th>
                    <th className="py-2.5 px-3 font-bold text-center">Armada Truk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deliveryOrders.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => appStore.toggleDoSelection(d.id)}
                      className={`cursor-pointer transition-colors ${
                        d.selectedForInvoice
                          ? 'bg-blue-50/50 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      } ${isHighDensity ? 'py-1' : 'py-2.5'}`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        {d.selectedForInvoice ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {d.doNumber}
                        <div className="text-[10px] text-slate-400 font-normal">
                          Tgl: {d.deliveryDate || d.dispatchDate}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {d.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          {d.itemName || (d.items && d.items[0]?.itemName) || 'Multi-Item Order'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono">
                        {d.qtyDelivered || (d.items && d.items.reduce((s, it) => s + it.quantity, 0)) || 0}{' '}
                        {d.unit || (d.items && d.items[0]?.unit) || 'Carton'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatIDR(d.unitPrice || (d.items && d.items[0]?.unitPrice) || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900 dark:text-white">
                        {formatIDR(d.totalBeforeTax || d.totalGrossValue || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-slate-500 font-mono">
                        {d.truckPlate || d.truckArmada}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Multi-DO Selection Insight */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>
                  Logistik Cikarang: <strong>{selectedDos.length} DO</strong> dikonsolidasikan dalam 1 pengiriman faktur.
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                Subtotal: {formatIDR(calculationResult.subtotalGoods)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 13-Formula Calculator Widget (5 Cols) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Interactive 13-Formula Calculator</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Pilih skema kalkulasi penagihan resmi ST. Morita Industries
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                13 Formulas
              </span>
            </div>

            {/* Formula Selector Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                Pilih Rumus Faktur Penjualan (13 Pilihan)
              </label>
              <select
                id="invoice-formula-selector"
                value={selectedFormulaId}
                onChange={(e) => setSelectedFormulaId(e.target.value as InvoiceFormulaId)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {INVOICE_FORMULAS.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.code}] {f.name} — {f.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Formula Explanation Card */}
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-1">
              <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{calculationResult.formulaName}</span>
              </div>
              <p className="text-[11px] text-blue-900/80 dark:text-blue-300 leading-relaxed">
                {calculationResult.formulaDescription}
              </p>
            </div>

            {/* Dynamic Formula Parameter Adjuster */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Parameter Variabel Rumus Aktif
              </div>

              {/* Conditional Controls based on formula */}
              {selectedFormulaId === 'FORMULA_2_FREIGHT_ADDED' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300">Biaya Ongkos Angkut Truk (Freight):</span>
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
                    <span className="text-slate-600 dark:text-slate-300">Nilai Uang Muka (Down Payment):</span>
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
                    <span className="text-slate-600 dark:text-slate-300">Persentase Retensi Mutu:</span>
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
                    <span className="text-slate-600 dark:text-slate-300">Batas Bawah Margin Minimum:</span>
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
                    <span className="text-slate-600 dark:text-slate-300">Potongan Nota Retur Cacat:</span>
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
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Kurs KMK / JISDOR:</span>
                    <span className="font-bold">1 USD = Rp {customParams.exchangeRate?.toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Nilai USD: {formatUSD(calculationResult.finalPayableAmount / (customParams.exchangeRate || 16250))}
                  </div>
                </div>
              )}
            </div>

            {/* Calculated Breakdown Line-Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Subtotal Nilai Barang:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatIDR(calculationResult.subtotalGoods)}
                </span>
              </div>

              {calculationResult.discountOrRebate > 0 && (
                <div className="py-2 flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Potongan Diskon / Rebat:</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.discountOrRebate)}
                  </span>
                </div>
              )}

              {calculationResult.freightAmount > 0 && (
                <div className="py-2 flex justify-between text-blue-600 dark:text-blue-400">
                  <span>Ongkos Angkut Ekspedisi:</span>
                  <span className="font-mono font-bold">
                    + {formatIDR(calculationResult.freightAmount)}
                  </span>
                </div>
              )}

              {calculationResult.downPaymentDeduction > 0 && (
                <div className="py-2 flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Potongan Uang Muka (DP):</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.downPaymentDeduction)}
                  </span>
                </div>
              )}

              {calculationResult.returnCreditOffset > 0 && (
                <div className="py-2 flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Kredit Nota Retur Cacat:</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.returnCreditOffset)}
                  </span>
                </div>
              )}

              <div className="py-2 flex justify-between bg-slate-50 dark:bg-slate-800/50 px-2 rounded-lg font-semibold">
                <span>Dasar Pengenaan Pajak (DPP):</span>
                <span className="font-mono">{formatIDR(calculationResult.taxableBaseDpp)}</span>
              </div>

              <div className="py-2 flex justify-between text-slate-700 dark:text-slate-300">
                <span>PPN 11% (Faktur Pajak):</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  + {formatIDR(calculationResult.ppnAmount)}
                </span>
              </div>

              {calculationResult.pph23Amount > 0 && (
                <div className="py-2 flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Potongan PPh 23 (2% Jasa Slit):</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.pph23Amount)}
                  </span>
                </div>
              )}

              {calculationResult.retentionWithheld > 0 && (
                <div className="py-2 flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Retensi Mutu Ditahan (5%):</span>
                  <span className="font-mono font-bold">
                    - {formatIDR(calculationResult.retentionWithheld)}
                  </span>
                </div>
              )}

              {/* Total Payable */}
              <div className="py-3 flex justify-between items-center text-sm font-black pt-3 border-t-2 border-slate-300 dark:border-slate-700">
                <span className="text-slate-900 dark:text-white">TOTAL FAKTUR BERSIH:</span>
                <span className="text-base font-mono text-emerald-600 dark:text-emerald-400">
                  {formatIDR(calculationResult.finalPayableAmount)}
                </span>
              </div>
            </div>

            {/* Quick Action */}
            <button
              onClick={() => setShowPrintInvoiceModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Generate Faktur & Faktur Pajak Resmi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Print Modal */}
      {showPrintInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  FAKTUR PENJUALAN KOMERSIAL
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  ST. Morita Industries
                </h3>
                <div className="text-xs text-slate-500">
                  Kawasan Industri Jababeka / Hyundai Cikarang, Jawa Barat 17530
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  INV/SM/{new Date().getFullYear()}/09/0819
                </div>
                <div className="text-slate-500">Tgl: {new Date().toLocaleDateString('id-ID')}</div>
                <div className="text-emerald-600 font-bold">STATUS: OFFICIAL APPROVED</div>
              </div>
            </div>

            {/* Formula Meta */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs flex justify-between items-center">
              <div>
                <span className="text-slate-400">Skema Formula Terpilih: </span>
                <strong className="text-slate-800 dark:text-slate-200">{calculationResult.formulaName}</strong>
              </div>
              <div className="font-mono text-slate-500">
                Metode: {calculationResult.formulaId}
              </div>
            </div>

            {/* Selected Items summary */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">No. DO</th>
                    <th className="p-2.5">Deskripsi Produk</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Harga Satuan</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedDos.map((d) => (
                    <tr key={d.id}>
                      <td className="p-2.5 font-mono">{d.doNumber}</td>
                      <td className="p-2.5">{d.itemName}</td>
                      <td className="p-2.5 text-right font-mono">{d.qtyDelivered} {d.unit}</td>
                      <td className="p-2.5 text-right font-mono">{formatIDR(d.unitPrice)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{formatIDR(d.totalBeforeTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Dasar Pengenaan Pajak (DPP):</span>
                <span className="font-mono font-bold">{formatIDR(calculationResult.taxableBaseDpp)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>PPN 11%:</span>
                <span className="font-mono font-bold">{formatIDR(calculationResult.ppnAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>TOTAL HARUS DIBAYAR:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatIDR(calculationResult.finalPayableAmount)}
                </span>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPrintInvoiceModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Faktur (Print / PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
