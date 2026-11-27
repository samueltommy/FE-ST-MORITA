import React from 'react';
import {
  ClipboardList,
  Factory,
  ShieldAlert,
  Microscope,
  Activity,
  RotateCcw,
  Award,
  FlaskConical,
  Trash2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore, appStore } from '../../store/useAppStore';
import { getProductionDashboardSummaryApi } from '../../services/productionService';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';
import { ProductionPlansTab } from './ProductionPlansTab';
import { ProductionOutputsTab } from './ProductionOutputsTab';
import { StockHoldControlTab } from './StockHoldControlTab';
import { QcInspectionsTab } from './QcInspectionsTab';
import { ReworkOrdersTab } from './ReworkOrdersTab';
import { ProductDevelopmentsTab } from './ProductDevelopmentsTab';
import { ProductionWastesTab } from './ProductionWastesTab';

export const ProductionQcModule: React.FC = () => {
  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.produksi_qc || state.activeSubFeature?.qc);

  const { data: summary } = useQuery({
    queryKey: ['productionDashboardSummary'],
    queryFn: getProductionDashboardSummaryApi,
  });

  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'plans',
        label: 'Production Planning & Penerbitan SPK',
        subtitle: `Rencana produksi PPIC, alokasi BOM RM (anti-HOLD), terbitkan SPK & cetak SPK (${summary?.spkActive ?? 0} SPK Aktif)`,
        icon: ClipboardList,
        iconColor: 'text-blue-600',
        badge: `${summary?.plansPlanned ?? 0} Planned · ${summary?.spkActive ?? 0} SPK`,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'plans'),
      },
      {
        id: 'outputs',
        label: 'Output Produksi & Pemotongan Stok RM',
        subtitle: 'Catat hasil Good/NG/Rework/Waste operator, potong batch RM otomatis & auto-FG berstatus HOLD',
        icon: Factory,
        iconColor: 'text-emerald-600',
        badge: `${summary?.spkCompleted ?? 0} Selesai`,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'outputs'),
      },
      {
        id: 'stocks',
        label: 'Pengendalian Stok & Status HOLD QC',
        subtitle: `Database batch stok gudang (${summary?.stockAvailableBatches ?? 0} AVAILABLE · ${summary?.stockHoldBatches ?? 0} HOLD) & otorisasi Release HOLD`,
        icon: ShieldAlert,
        iconColor: 'text-amber-600',
        badge: `${summary?.stockHoldBatches ?? 0} HOLD`,
        badgeColor: (summary?.stockHoldBatches ?? 0) > 0 ? 'bg-rose-500 text-white font-bold' : 'bg-emerald-100 text-emerald-800',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'stocks'),
      },
      {
        id: 'iqc',
        label: 'Incoming QC (IQC — Material Masuk)',
        subtitle: 'Uji material masuk terhadap TDS, auto-release HOLD → AVAILABLE & Cetak LKP',
        icon: Microscope,
        iconColor: 'text-cyan-600',
        badge: `${summary?.qcIqcCount ?? 0} IQC`,
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'iqc'),
      },
      {
        id: 'pqc',
        label: 'In-Process QC (PQC — Lini Produksi)',
        subtitle: 'Inspeksi lini per SPK/lot, auto-routing ke Jalur Rework & Cetak LKP',
        icon: Activity,
        iconColor: 'text-indigo-600',
        badge: `${summary?.qcPqcCount ?? 0} PQC`,
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'pqc'),
      },
      {
        id: 'reworks',
        label: 'Jalur Rework / Repair & Re-Inspeksi QC',
        subtitle: `Pengerjaan ulang barang NG/rework (${summary?.reworkOpen ?? 0} Open · ${summary?.reworkPassed ?? 0} Passed · ${summary?.reworkScrapped ?? 0} Scrap)`,
        icon: RotateCcw,
        iconColor: 'text-orange-600',
        badge: `${summary?.reworkOpen ?? 0} Open`,
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'reworks'),
      },
      {
        id: 'oqc',
        label: 'Outgoing QC (OQC / COA)',
        subtitle: `Inspeksi produk akhir sebelum DO, auto-generate nomor COA, release FG & Cetak COA (Pass Rate ${summary?.qcPassRatePct ?? 0}%)`,
        icon: Award,
        iconColor: 'text-teal-600',
        badge: `${summary?.qcOqcCount ?? 0} OQC`,
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'oqc'),
      },
      {
        id: 'product_developments',
        label: 'Pengembangan Produk & Approval Sampel',
        subtitle: 'Input proyek riset oleh Sales/R&D, upload dokumen spesifikasi, Approval Sampel Akhir & Cetak Approval Sheet',
        icon: FlaskConical,
        iconColor: 'text-purple-600',
        badge: `${summary?.rndPendingApproval ?? 0} Pending R&D`,
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'product_developments'),
      },
      {
        id: 'wastes',
        label: 'RM Wastes & Product Wastes (CAPA)',
        subtitle: `Laporan limbah RM (${summary?.rmWasteQty ?? 0}) & Produk Jadi (${summary?.productWasteQty ?? 0} · ${summary?.productWasteCriticalCount ?? 0} Critical) + CAPA`,
        icon: Trash2,
        iconColor: 'text-rose-600',
        badge: `${summary?.productWasteCriticalCount ?? 0} Critical`,
        badgeColor: (summary?.productWasteCriticalCount ?? 0) > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700',
        onClick: () => appStore.setActiveSubFeature('produksi_qc', 'wastes'),
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="PRODUKSI & QC"
        moduleName="DIVISI PRODUKSI & QA/QC"
        moduleDescription="Production Planning, SPK, Output Produksi, Pengendalian HOLD QC, IQC/PQC/OQC (COA), Jalur Rework, Pengembangan Produk R&D, serta RM & Product Wastes (CAPA)."
        headerBgColor="bg-blue-700"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  // Normalize legacy & direct route names
  const currentTab = (() => {
    if (activeSubFeature === 'outputs' || activeSubFeature === 'production_outputs') return 'outputs';
    if (activeSubFeature === 'stocks' || activeSubFeature === 'hold_release') return 'stocks';
    if (activeSubFeature === 'iqc' || activeSubFeature === 'qc_inspections') return 'iqc';
    if (activeSubFeature === 'pqc' || activeSubFeature === 'qc_records') return 'pqc';
    if (activeSubFeature === 'reworks') return 'reworks';
    if (activeSubFeature === 'oqc') return 'oqc';
    if (activeSubFeature === 'product_developments') return 'product_developments';
    if (activeSubFeature === 'wastes') return 'wastes';
    return 'plans';
  })();

  return (
    <div className="space-y-4">
      {currentTab === 'plans' && <ProductionPlansTab />}
      {currentTab === 'outputs' && <ProductionOutputsTab />}
      {currentTab === 'stocks' && <StockHoldControlTab />}
      {currentTab === 'iqc' && <QcInspectionsTab qcType="IQC" />}
      {currentTab === 'pqc' && <QcInspectionsTab qcType="PQC" />}
      {currentTab === 'reworks' && <ReworkOrdersTab />}
      {currentTab === 'oqc' && <QcInspectionsTab qcType="OQC" />}
      {currentTab === 'product_developments' && <ProductDevelopmentsTab />}
      {currentTab === 'wastes' && <ProductionWastesTab />}

      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('produksi_qc', null)}
        backLabel="BACK (KEMBALI KE MENU PRODUKSI & QA/QC)"
      />
    </div>
  );
};
