import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  MapPin,
  UserCheck,
  Loader2,
  PieChart,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  getMarketAnalysisApi,
  getMarketVisualizationsApi,
  listSalesDropdownCustomersApi,
  MarketDimension,
  MarketPeriodMode,
} from '../../services/salesService';
import { formatIDR } from '../../utils/invoiceCalculator';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const DIMENSIONS: Array<{ id: MarketDimension; label: string; icon: any }> = [
  { id: 'by-sales-person', label: 'Per Sales Person', icon: UserCheck },
  { id: 'by-customer', label: 'Per Customer', icon: Users },
  { id: 'by-product', label: 'Per Produk', icon: Package },
  { id: 'by-zoning', label: 'Per Zonasi', icon: MapPin },
];

export const MarketAnalysisTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<'comparison' | 'visualizations'>('comparison');

  // Comparison state
  const [dimension, setDimension] = useState<MarketDimension>('by-sales-person');
  const [periodMode, setPeriodMode] = useState<MarketPeriodMode>('YEAR_YEAR');
  const [yearA, setYearA] = useState(currentYear - 1);
  const [yearB, setYearB] = useState(currentYear);
  const [monthA, setMonthA] = useState(Math.max(1, currentMonth - 1));
  const [monthB, setMonthB] = useState(currentMonth);
  const [startDateA, setStartDateA] = useState(`${currentYear}-01-01`);
  const [endDateA, setEndDateA] = useState(`${currentYear}-06-30`);
  const [startDateB, setStartDateB] = useState(`${currentYear}-07-01`);
  const [endDateB, setEndDateB] = useState(`${currentYear}-12-31`);

  // Visualizations filter state
  const [vizYear, setVizYear] = useState(currentYear);
  const [vizZoning, setVizZoning] = useState('');
  const [vizCategory, setVizCategory] = useState('');
  const [vizItemCode, setVizItemCode] = useState('');
  const [vizCustomerId, setVizCustomerId] = useState('ALL');

  const { data: compData, isLoading: compLoading } = useQuery({
    queryKey: [
      'salesMarketAnalysis',
      dimension,
      periodMode,
      yearA,
      yearB,
      monthA,
      monthB,
      startDateA,
      endDateA,
      startDateB,
      endDateB,
    ],
    queryFn: () =>
      getMarketAnalysisApi(dimension, {
        periodMode,
        yearA: periodMode !== 'DATE_DATE' ? yearA : undefined,
        yearB: periodMode !== 'DATE_DATE' ? yearB : undefined,
        monthA: periodMode === 'MONTH_MONTH' ? monthA : undefined,
        monthB: periodMode === 'MONTH_MONTH' ? monthB : undefined,
        startDateA: periodMode === 'DATE_DATE' ? startDateA : undefined,
        endDateA: periodMode === 'DATE_DATE' ? endDateA : undefined,
        startDateB: periodMode === 'DATE_DATE' ? startDateB : undefined,
        endDateB: periodMode === 'DATE_DATE' ? endDateB : undefined,
      }),
    enabled: viewMode === 'comparison',
  });

  const { data: vizData, isLoading: vizLoading } = useQuery({
    queryKey: ['salesMarketVisualizations', vizYear, vizZoning, vizCategory, vizItemCode, vizCustomerId],
    queryFn: () =>
      getMarketVisualizationsApi({
        year: vizYear,
        zoning: vizZoning || undefined,
        productCategory: vizCategory || undefined,
        itemCode: vizItemCode || undefined,
        customerId: vizCustomerId !== 'ALL' ? vizCustomerId : undefined,
      }),
    enabled: viewMode === 'visualizations',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['salesDropdownCustomers'],
    queryFn: listSalesDropdownCustomersApi,
  });

  const maxRowVal = Math.max(
    1,
    ...(compData?.rows || []).map((r) => Math.max(r.periodAAmount, r.periodBAmount))
  );
  const maxTrendVal = Math.max(1, ...(vizData?.salesTrend || []).map((t) => t.totalSales));

  return (
    <div className="space-y-4">
      {/* Main Sub-view Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setViewMode('comparison')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            viewMode === 'comparison' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analisa Perbandingan (Year / Month / Date)</span>
        </button>
        <button
          onClick={() => setViewMode('visualizations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            viewMode === 'visualizations' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Visualisasi Tren Penjualan &amp; Sebaran Pelanggan</span>
        </button>
      </div>

      {/* VIEW 1: COMPARISON ANALYSIS */}
      {viewMode === 'comparison' && (
        <div className="space-y-4">
          {/* Dimension + Period Mode Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {DIMENSIONS.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDimension(d.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                        dimension === d.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                {(['YEAR_YEAR', 'MONTH_MONTH', 'DATE_DATE'] as MarketPeriodMode[]).map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setPeriodMode(pm)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                      periodMode === pm ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {pm === 'YEAR_YEAR' ? 'Year vs Year' : pm === 'MONTH_MONTH' ? 'Month vs Month' : 'Date vs Date'}
                  </button>
                ))}
              </div>
            </div>

            {/* Period Inputs */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
              {periodMode === 'YEAR_YEAR' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Tahun A:</span>
                    <input
                      type="number"
                      min={2020}
                      max={2100}
                      value={yearA}
                      onChange={(e) => setYearA(Number(e.target.value) || currentYear - 1)}
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold"
                    />
                  </div>
                  <span className="text-slate-400 font-bold">vs</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Tahun B:</span>
                    <input
                      type="number"
                      min={2020}
                      max={2100}
                      value={yearB}
                      onChange={(e) => setYearB(Number(e.target.value) || currentYear)}
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold"
                    />
                  </div>
                </>
              )}

              {periodMode === 'MONTH_MONTH' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600">Periode A:</span>
                    <select value={monthA} onChange={(e) => setMonthA(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white">
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <input type="number" value={yearA} onChange={(e) => setYearA(Number(e.target.value) || currentYear)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 font-mono" />
                  </div>
                  <span className="text-slate-400 font-bold">vs</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600">Periode B:</span>
                    <select value={monthB} onChange={(e) => setMonthB(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white">
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <input type="number" value={yearB} onChange={(e) => setYearB(Number(e.target.value) || currentYear)} className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 font-mono" />
                  </div>
                </>
              )}

              {periodMode === 'DATE_DATE' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600">Rentang A:</span>
                    <input type="date" value={startDateA} onChange={(e) => setStartDateA(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300" />
                    <span>s/d</span>
                    <input type="date" value={endDateA} onChange={(e) => setEndDateA(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600">Rentang B:</span>
                    <input type="date" value={startDateB} onChange={(e) => setStartDateB(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300" />
                    <span>s/d</span>
                    <input type="date" value={endDateB} onChange={(e) => setEndDateB(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* KPI Strip */}
          {compData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Total {compData.periodALabel}</div>
                <div className="text-base font-black font-mono text-slate-900 mt-1">{formatIDR(compData.totalPeriodAAmount)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Total {compData.periodBLabel}</div>
                <div className="text-base font-black font-mono text-blue-700 mt-1">{formatIDR(compData.totalPeriodBAmount)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Selisih (Delta)</div>
                <div className={`text-base font-black font-mono mt-1 ${compData.totalDeltaAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {compData.totalDeltaAmount >= 0 ? '+' : ''}{formatIDR(compData.totalDeltaAmount)}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Pertumbuhan (Growth)</div>
                <div className={`text-base font-black font-mono mt-1 flex items-center gap-1 ${(compData.totalGrowthPercent ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {(compData.totalGrowthPercent ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{compData.totalGrowthPercent ?? 0}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Entitas ({dimension.replace('by-', '').toUpperCase()})</th>
                    <th className="p-3 text-right">{compData?.periodALabel || 'Periode A'}</th>
                    <th className="p-3 text-right">{compData?.periodBLabel || 'Periode B'}</th>
                    <th className="p-3 w-48">Visual Perbandingan</th>
                    <th className="p-3 text-right">Delta</th>
                    <th className="p-3 text-right">Growth %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Menghitung analisa market...
                      </td>
                    </tr>
                  ) : !compData || compData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Belum ada data transaksi penjualan pada periode yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    compData.rows.map((r, idx) => (
                      <tr key={r.entityId || idx} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.entityName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {r.entityCode || ''} {r.extra?.zoning ? `• ${r.extra.zoning}` : ''} {r.extra?.category ? `• ${r.extra.category}` : ''}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className="font-semibold text-slate-700">{formatIDR(r.periodAAmount)}</div>
                          <div className="text-[10px] text-slate-400">{r.periodACount} trx {r.periodAQty > 0 ? `• qty ${r.periodAQty}` : ''}</div>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className="font-bold text-blue-700">{formatIDR(r.periodBAmount)}</div>
                          <div className="text-[10px] text-slate-400">{r.periodBCount} trx {r.periodBQty > 0 ? `• qty ${r.periodBQty}` : ''}</div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-400 rounded-full" style={{ width: `${Math.min(100, (r.periodAAmount / maxRowVal) * 100)}%` }} />
                            </div>
                            <div className="h-2 bg-blue-50 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, (r.periodBAmount / maxRowVal) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${r.deltaAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.deltaAmount >= 0 ? '+' : ''}{formatIDR(r.deltaAmount)}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                              (r.growthPercent ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {(r.growthPercent ?? 0) >= 0 ? '+' : ''}{r.growthPercent ?? 0}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: VISUALIZATIONS (TREND + SPREAD) */}
      {viewMode === 'visualizations' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tahun</label>
              <input
                type="number"
                value={vizYear}
                onChange={(e) => setVizYear(Number(e.target.value) || currentYear)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter Zonasi</label>
              <input
                type="text"
                value={vizZoning}
                onChange={(e) => setVizZoning(e.target.value)}
                placeholder="cth: JABODETABEK"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Kategori Produk</label>
              <input
                type="text"
                value={vizCategory}
                onChange={(e) => setVizCategory(e.target.value)}
                placeholder="cth: Slit Tape"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor Produk (Item Code)</label>
              <input
                type="text"
                value={vizItemCode}
                onChange={(e) => setVizItemCode(e.target.value)}
                placeholder="cth: SM-MSK"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Customer</label>
              <select
                value={vizCustomerId}
                onChange={(e) => setVizCustomerId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="ALL">Semua Customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {vizLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat visualisasi data market...
            </div>
          ) : vizData ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Total Penjualan ({vizYear})</div>
                  <div className="text-base font-black font-mono text-emerald-700 mt-1">{formatIDR(vizData.kpis.totalSales)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Total Invoice</div>
                  <div className="text-base font-black font-mono text-slate-900 mt-1">{vizData.kpis.totalInvoices}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Total Customer Tercover</div>
                  <div className="text-base font-black font-mono text-blue-700 mt-1">{vizData.kpis.totalCustomers}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Zonasi Aktif</div>
                  <div className="text-base font-black font-mono text-amber-700 mt-1">{vizData.kpis.activeZones} Zona</div>
                </div>
              </div>

              {/* Monthly Trend Bar Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase">Tren Penjualan Bulanan ({vizYear})</h3>
                <div className="grid grid-cols-12 gap-2 items-end h-44 pt-4">
                  {vizData.salesTrend.map((m) => {
                    const pct = Math.max(4, Math.round((m.totalSales / maxTrendVal) * 100));
                    return (
                      <div key={m.period} className="flex flex-col items-center gap-1 h-full justify-end group">
                        <div className="text-[10px] font-mono font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                          {m.totalSales > 0 ? `${Math.round(m.totalSales / 1_000_000)}Jt` : '0'}
                        </div>
                        <div
                          title={`${m.period}: ${formatIDR(m.totalSales)} (${m.invoiceCount} inv)`}
                          className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 transition-all"
                          style={{ height: `${m.totalSales > 0 ? pct : 3}%` }}
                        />
                        <div className="text-[10px] font-bold text-slate-500">{MONTHS[(m.month || 1) - 1] || m.period}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sebaran Zonasi & Kategori Produk */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase">Sebaran Pelanggan &amp; Penjualan per Zonasi</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr>
                          <th className="p-2 text-left">Zonasi</th>
                          <th className="p-2 text-right">Customer (New/Old)</th>
                          <th className="p-2 text-right">Total Penjualan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vizData.byZoning.length === 0 ? (
                          <tr><td colSpan={3} className="p-4 text-center text-slate-400">Belum ada data zonasi.</td></tr>
                        ) : (
                          vizData.byZoning.map((z) => (
                            <tr key={z.zoning}>
                              <td className="p-2 font-bold text-slate-800">{z.zoning}</td>
                              <td className="p-2 text-right font-mono">{z.customerCount} ({z.newCustomers}N / {z.oldCustomers}O)</td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-700">{formatIDR(z.totalSales)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase">Breakdown Kategori Produk &amp; Nomor Produk</h3>
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr>
                          <th className="p-2 text-left">Kategori / Kode Produk</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Total Penjualan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vizData.byProductNumber.length === 0 ? (
                          <tr><td colSpan={3} className="p-4 text-center text-slate-400">Belum ada data produk di periode ini.</td></tr>
                        ) : (
                          vizData.byProductNumber.slice(0, 15).map((p) => (
                            <tr key={p.itemCode}>
                              <td className="p-2">
                                <div className="font-mono font-bold text-blue-700">{p.itemCode}</div>
                                <div className="text-[11px] text-slate-600">{p.itemName} ({p.category})</div>
                              </td>
                              <td className="p-2 text-right font-mono">{p.totalQty} {p.unit}</td>
                              <td className="p-2 text-right font-mono font-bold">{formatIDR(p.totalSales)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

