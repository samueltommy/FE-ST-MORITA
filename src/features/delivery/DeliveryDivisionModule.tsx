import React, { useState } from 'react';
import {
  Calendar,
  ClipboardCheck,
  Truck,
  Barcode,
  Boxes,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore, appStore } from '../../store/useAppStore';
import { getLogisticsDashboardSummaryApi } from '../../services/logisticsService';
import type { DeliveryPlan } from '../../types/logisticsRmStock';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';
import { DeliveryPlansTab } from './DeliveryPlansTab';
import { DeliveryRequestsTab } from './DeliveryRequestsTab';
import { DeliveryOrdersTab } from './DeliveryOrdersTab';
import { ETrackingTab } from './ETrackingTab';
import { RmStockTab } from './RmStockTab';

export const DeliveryDivisionModule: React.FC = () => {
  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.delivery);
  const [prefillPlanForDo, setPrefillPlanForDo] = useState<DeliveryPlan | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['logisticsDashboardSummary'],
    queryFn: getLogisticsDashboardSummaryApi,
  });

  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'delivery_plans',
        label: '5.3.1 Pengelolaan Delivery Plan',
        subtitle: `Jadwal armada, zonasi, prioritas, convert ke DO & cetak Delivery Plan (${summary?.deliveryPlansActive ?? 0} Aktif / ${summary?.deliveryPlansTotal ?? 0} Total)`,
        icon: Calendar,
        iconColor: 'text-cyan-600',
        badge: `${summary?.deliveryPlansActive ?? 0} Aktif`,
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        onClick: () => appStore.setActiveSubFeature('delivery', 'delivery_plans'),
      },
      {
        id: 'delivery_requests',
        label: '5.3.2 Request Delivery Order (RDO)',
        subtitle: 'Pengajuan pengiriman oleh Sales/Marketing dari PO/IO & review ketersediaan stok oleh Delivery',
        icon: ClipboardCheck,
        iconColor: 'text-amber-600',
        badge: `${summary?.rdoPendingCount ?? 0} Pending`,
        badgeColor: (summary?.rdoPendingCount ?? 0) > 0 ? 'bg-amber-500 text-white font-bold' : 'bg-slate-100 text-slate-700',
        onClick: () => appStore.setActiveSubFeature('delivery', 'delivery_requests'),
      },
      {
        id: 'delivery_orders',
        label: '5.3.3 Delivery Order / Surat Jalan (DO)',
        subtitle: `Terbitkan DO anti-HOLD, potong stok FG, Dok. BC, COA, update POD & cetak (${summary?.doPreparing ?? 0} Muat · ${summary?.doOnTheWay ?? 0} Jalan · ${summary?.doDelivered ?? 0} Terkirim)`,
        icon: Truck,
        iconColor: 'text-blue-600',
        badge: `${summary?.doOnTheWay ?? 0} Di Jalan`,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        onClick: () => appStore.setActiveSubFeature('delivery', 'delivery_orders'),
      },
      {
        id: 'e_tracking',
        label: '5.4.1 & 5.4.2 Sistem E-Tracking Terpadu',
        subtitle: 'Portal pelacakan timeline pesanan untuk semua divisi & input checkpoint GPS oleh PPIC/Delivery',
        icon: Barcode,
        iconColor: 'text-indigo-600',
        badge: `${summary?.trackingEventsTotal ?? 0} Log`,
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        onClick: () => appStore.setActiveSubFeature('delivery', 'e_tracking'),
      },
      {
        id: 'rm_stocks',
        label: '3.2.1 RM Stock (Low Stock, Adjustment & RM Transfer)',
        subtitle: `Monitoring batas min_stock (${summary?.rmLowStockCount ?? 0} Low Stock · ${summary?.rmOutOfStockCount ?? 0} Habis), Adjustment & Transfer RM anti-HOLD`,
        icon: Boxes,
        iconColor: 'text-emerald-600',
        badge: (summary?.rmLowStockCount ?? 0) > 0 ? `${summary?.rmLowStockCount} Low Stock` : 'Aman',
        badgeColor: (summary?.rmLowStockCount ?? 0) > 0 ? 'bg-rose-600 text-white font-bold' : 'bg-emerald-100 text-emerald-800',
        onClick: () => appStore.setActiveSubFeature('delivery', 'rm_stocks'),
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="DELIVERY & RM"
        moduleName="DEPARTMENT DELIVERY / LOGISTIK & RM STOCK"
        moduleDescription="Pengelolaan Delivery Plan (5.3.1), Request DO (5.3.2), Surat Jalan DO anti-HOLD (5.3.3), E-Tracking Terpadu (5.4), serta RM Stock Monitoring, Adjustment & Transfer (3.2.1)."
        headerBgColor="bg-cyan-700"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const currentTab = (() => {
    if (activeSubFeature === 'delivery_plans') return 'delivery_plans';
    if (activeSubFeature === 'delivery_requests') return 'delivery_requests';
    if (activeSubFeature === 'e_tracking') return 'e_tracking';
    if (activeSubFeature === 'rm_stocks') return 'rm_stocks';
    return 'delivery_orders';
  })();

  return (
    <div className="space-y-4">
      {currentTab === 'delivery_plans' && (
        <DeliveryPlansTab
          onConvertToDo={(plan) => {
            setPrefillPlanForDo(plan);
            appStore.setActiveSubFeature('delivery', 'delivery_orders');
          }}
        />
      )}
      {currentTab === 'delivery_requests' && <DeliveryRequestsTab />}
      {currentTab === 'delivery_orders' && (
        <DeliveryOrdersTab
          prefillPlan={prefillPlanForDo}
          onClearPrefill={() => setPrefillPlanForDo(null)}
        />
      )}
      {currentTab === 'e_tracking' && <ETrackingTab />}
      {currentTab === 'rm_stocks' && <RmStockTab />}

      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('delivery', null)}
        backLabel="BACK (KEMBALI KE MENU DELIVERY & RM STOCK)"
      />
    </div>
  );
};
