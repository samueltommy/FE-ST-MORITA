import React from 'react';
import {
  Users,
  FileSpreadsheet,
  FileCheck2,
  BookOpen,
  BarChart3,
  ClipboardList,
  Award,
  Utensils,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';
import { CustomersTab } from './CustomersTab';
import { QuotationsTab } from './QuotationsTab';
import { SalesPoAndIoTab } from './SalesPoAndIoTab';
import { ECatalogTab } from './ECatalogTab';
import { MarketAnalysisTab } from './MarketAnalysisTab';
import { DailyActivityAndSamplesTab } from './DailyActivityAndSamplesTab';
import { SalesCommissionsAutoSyncTab } from './SalesCommissionsAutoSyncTab';
import { SalesEntertainmentsV2Tab } from './SalesEntertainmentsV2Tab';
import { SalesForecastsTab } from './SalesForecastsTab';
import { SalesComplaintsTab } from './SalesComplaintsTab';

type SalesTabId =
  | 'customers'
  | 'quotations'
  | 'customer_pos'
  | 'e_catalog'
  | 'market_analysis'
  | 'daily_activities'
  | 'commissions'
  | 'entertainments'
  | 'forecasts'
  | 'complaints';

const TAB_META: Record<SalesTabId, { title: string; description: string }> = {
  customers: {
    title: 'Master Customer, Pajak & Multi-Alamat',
    description: 'Database customer baru/lama, NPWP/NIK/PKP, termin pembayaran, zonasi wilayah, dan multi-alamat pengiriman.',
  },
  quotations: {
    title: 'Penawaran Harga (Quotation) & Approval 2-Tahap',
    description: 'Input Quotation, konfirmasi Manager Marketing, konfirmasi Cost Control + Cetak HTML/PDF.',
  },
  customer_pos: {
    title: 'Customer PO & Incoming Order (IO)',
    description: 'Input PO Customer, konversi PO/Quotation ke IO, konfirmasi Manager Marketing & Cost Control + Cetak.',
  },
  e_catalog: {
    title: 'E-Katalog & Materi Pemasaran Digital',
    description: 'Repositori Brosur, Company Profile, Surat Perkenalan, Product Knowledge, dan Surat Kenaikan Harga / Info Stok.',
  },
  market_analysis: {
    title: 'Analisa Market & Visualisasi Tren Penjualan',
    description: 'Perbandingan performa per Sales Person, Customer, Produk & Zonasi (Year/Month/Date) beserta visualisasi sebaran.',
  },
  daily_activities: {
    title: 'Sales Daily Activity (SDA) & Sampel (Win/Lose)',
    description: 'Laporan harian kehadiran, target vs actual, visiting/calling/new company, cetak laporan, form sampel, approval & Win/Lose.',
  },
  commissions: {
    title: 'Komisi Sales (Auto-Sync SDA & Penjualan)',
    description: 'Sinkronisasi otomatis komisi existing sales, new customer & bonus dari SDA/Invoice + input manual & cetak slip.',
  },
  entertainments: {
    title: 'Entertain Sales & Approval 2-Tahap',
    description: 'Pengajuan entertain customer, upload nota, approval Manager Marketing & Finance + cetak dokumen.',
  },
  forecasts: {
    title: 'Forecasting Sales Customer',
    description: 'Input Forecasting bulanan per customer/produk dan approval Manager Marketing / Direksi.',
  },
  complaints: {
    title: 'E-Complaint, Disposisi Internal & Corrective Action',
    description: 'Formulir klaim ketidaksesuaian + bukti foto & disposisi divisi, Root Cause & Corrective Action.',
  },
};

function normalizeSalesTab(subFeature: string | null | undefined): SalesTabId {
  switch (subFeature) {
    case 'customers':
    case 'customer':
      return 'customers';
    case 'quotations':
    case 'quotation_gating':
      return 'quotations';
    case 'customer_pos':
    case 'incoming_orders':
    case 'e_tracking':
      return 'customer_pos';
    case 'e_catalog':
      return 'e_catalog';
    case 'market_analysis':
    case 'sales_report':
      return 'market_analysis';
    case 'daily_activities':
    case 'sales_activities':
    case 'sample_requests':
      return 'daily_activities';
    case 'commissions':
      return 'commissions';
    case 'entertainments':
      return 'entertainments';
    case 'forecasts':
      return 'forecasts';
    case 'complaints':
    case 'complaints_rma':
      return 'complaints';
    default:
      return 'quotations';
  }
}

export const SalesTrackingModule: React.FC = () => {
  // All hooks strictly at top of component (Rules of Hooks)
  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.sales);

  const pageOptions: PageOptionItem[] = [
    { id: 'customers', label: 'Customer Master', subtitle: 'Pajak, Zonasi & Multi-Alamat', icon: Users },
    { id: 'quotations', label: 'Quotation', subtitle: 'Input, Mgr & Cost Control', icon: FileSpreadsheet },
    { id: 'customer_pos', label: 'PO & IO', subtitle: 'PO → IO & Konfirmasi', icon: FileCheck2 },
    { id: 'e_catalog', label: 'E-Katalog', subtitle: 'Brosur, PK & Notice', icon: BookOpen },
    { id: 'market_analysis', label: 'Analisa Market', subtitle: 'Komparasi & Visualisasi', icon: BarChart3 },
    { id: 'daily_activities', label: 'SDA & Sampel', subtitle: 'Kinerja Harian & Win/Lose', icon: ClipboardList },
    { id: 'commissions', label: 'Komisi Sales', subtitle: 'Auto-Sync SDA & Slip', icon: Award },
    { id: 'entertainments', label: 'Entertain Sales', subtitle: 'Approval Mkt & Finance', icon: Utensils },
    { id: 'forecasts', label: 'Forecasting', subtitle: 'Input & Approval Forecast', icon: TrendingUp },
    { id: 'complaints', label: 'E-Complaint', subtitle: 'Disposisi & Corrective Action', icon: AlertTriangle },
  ];

  // Hub Menu when no sub-feature selected
  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'customers',
        label: 'Master Customer, Pajak & Multi-Alamat',
        subtitle: 'Kelola Customer Baru/Lama, NPWP/NIK/PKP, Payment Term, Zonasi & Multi-Alamat pengiriman',
        icon: Users,
        iconColor: 'text-purple-600',
        badge: 'Customer',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'customers'),
      },
      {
        id: 'quotations',
        label: 'Quotation & Approval 2-Tahap (Mgr & Cost Control)',
        subtitle: 'Input penawaran harga, konfirmasi Manager Marketing, validasi Cost Control + Cetak',
        icon: FileSpreadsheet,
        iconColor: 'text-amber-600',
        badge: 'Quote',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'quotations'),
      },
      {
        id: 'customer_pos',
        label: 'Customer PO & Incoming Order (IO)',
        subtitle: 'Catat PO Customer, konversi PO/Quotation → IO, konfirmasi Mgr Mkt & Cost Control + Cetak',
        icon: FileCheck2,
        iconColor: 'text-emerald-600',
        badge: 'PO → IO',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'customer_pos'),
      },
      {
        id: 'e_catalog',
        label: 'E-Katalog & Materi Pemasaran Digital',
        subtitle: 'Upload & kelola Brosur, Company Profile, Surat Perkenalan, Product Knowledge & Surat Komersial',
        icon: BookOpen,
        iconColor: 'text-sky-600',
        badge: 'Katalog',
        badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'e_catalog'),
      },
      {
        id: 'market_analysis',
        label: 'Analisa Market & Visualisasi Tren Penjualan',
        subtitle: 'Perbandingan Sales Person, Customer, Produk & Zonasi (Year/Month/Date) + grafik tren & sebaran',
        icon: BarChart3,
        iconColor: 'text-blue-600',
        badge: 'Analisa',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'market_analysis'),
      },
      {
        id: 'daily_activities',
        label: 'Sales Daily Activity (SDA) & Form Sampel (Win/Lose)',
        subtitle: 'Laporan harian kehadiran, target vs actual, visiting/calling/new company, cetak rekap + approval sampel & Win/Lose',
        icon: ClipboardList,
        iconColor: 'text-indigo-600',
        badge: 'SDA',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'daily_activities'),
      },
      {
        id: 'commissions',
        label: 'Komisi Sales (Auto-Sync dari SDA & Penjualan)',
        subtitle: 'Preview & sinkronisasi otomatis komisi existing sales, new customer & bonus dari SDA/Invoice + cetak slip',
        icon: Award,
        iconColor: 'text-violet-600',
        badge: 'Komisi',
        badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'commissions'),
      },
      {
        id: 'entertainments',
        label: 'Entertain Sales (Pengajuan & Approval 2-Tahap)',
        subtitle: 'Pengajuan entertain customer, upload nota, approval Manager Marketing & Finance + cetak form',
        icon: Utensils,
        iconColor: 'text-rose-600',
        badge: 'Entertain',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'entertainments'),
      },
      {
        id: 'forecasts',
        label: 'Forecasting Sales Customer (Input & Approval)',
        subtitle: 'Input target/proyeksi penjualan bulanan per customer & produk + approval Manager',
        icon: TrendingUp,
        iconColor: 'text-teal-600',
        badge: 'Forecast',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'forecasts'),
      },
      {
        id: 'complaints',
        label: 'E-Complaint, Disposisi Internal & Corrective Action',
        subtitle: 'Klaim ketidaksesuaian + bukti foto, disposisi tiket antar divisi & pencatatan Corrective Action',
        icon: AlertTriangle,
        iconColor: 'text-orange-600',
        badge: 'Komplain',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
        onClick: () => appStore.setActiveSubFeature('sales', 'complaints'),
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="SALES"
        moduleName="DIVISI SALES & MARKETING"
        moduleDescription="Pusat operasional lengkap tim Sales: Master Customer, Quotation 2-Tahap, PO & Incoming Order, E-Katalog, Analisa Market, SDA & Sampel, Komisi Auto-Sync, Entertain, Forecasting, dan E-Complaint."
        headerBgColor="bg-amber-600"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const currentTab = normalizeSalesTab(activeSubFeature);
  const meta = TAB_META[currentTab];

  return (
    <div className="space-y-5">
      <ModulePageHeader
        moduleCode="SALES"
        title={meta.title}
        description={meta.description}
        badgeColor="bg-amber-50 text-amber-800 border-amber-300"
        options={pageOptions}
        activeOption={currentTab}
        onSelectOption={(optId) => appStore.setActiveSubFeature('sales', optId)}
        onBackToMenu={() => appStore.setActiveSubFeature('sales', null)}
        menuName="Penjualan (Sales)"
      />

      {currentTab === 'customers' && <CustomersTab />}
      {currentTab === 'quotations' && <QuotationsTab />}
      {currentTab === 'customer_pos' && (
        <SalesPoAndIoTab
          key={activeSubFeature === 'incoming_orders' ? 'io' : 'po'}
          initialSection={activeSubFeature === 'incoming_orders' ? 'io' : 'po'}
        />
      )}
      {currentTab === 'e_catalog' && <ECatalogTab />}
      {currentTab === 'market_analysis' && <MarketAnalysisTab />}
      {currentTab === 'daily_activities' && (
        <DailyActivityAndSamplesTab
          key={activeSubFeature === 'sample_requests' ? 'samples' : 'sda'}
          initialSection={activeSubFeature === 'sample_requests' ? 'samples' : 'sda'}
        />
      )}
      {currentTab === 'commissions' && <SalesCommissionsAutoSyncTab />}
      {currentTab === 'entertainments' && <SalesEntertainmentsV2Tab />}
      {currentTab === 'forecasts' && <SalesForecastsTab />}
      {currentTab === 'complaints' && <SalesComplaintsTab />}

      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('sales', null)}
        backLabel="BACK (KEMBALI KE MENU PENJUALAN)"
      />
    </div>
  );
};
