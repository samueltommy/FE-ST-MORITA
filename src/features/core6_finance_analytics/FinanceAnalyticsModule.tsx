import React from 'react';
import {
  Receipt,
  Wallet,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { useRBAC } from '../../hooks/useRBAC';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';
import { ArSummaryStrip } from './ArSummaryStrip';
import { SalesInvoicesTab } from './SalesInvoicesTab';
import { ArPaymentsTab } from './ArPaymentsTab';
import { CustomerPosTab } from './CustomerPosTab';

export const FinanceAnalyticsModule: React.FC = () => {
  const { isSuperAdmin, isExecutive, userDivision, hasPermission } = useRBAC();
  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.finance);

  const isFinanceUser = isSuperAdmin || isExecutive || userDivision === 'FINANCE';
  const isSalesOrCostControl =
    userDivision === 'SALES' || hasPermission('cost_control:margin:approve');

  const canViewFinanceTabs = isFinanceUser;
  const canViewCustomerPos = isFinanceUser || isSalesOrCostControl;
  const canMutateCustomerPos = isFinanceUser;

  if (!canViewFinanceTabs && !canViewCustomerPos) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Lock className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-600">Akses Terbatas</h2>
        <p className="mt-2 text-sm text-center max-w-md">
          Modul Finance hanya dapat diakses oleh divisi FINANCE, Direksi, atau Super Admin.
        </p>
      </div>
    );
  }

  const pageOptions: PageOptionItem[] = [
    ...(canViewFinanceTabs
      ? [
          {
            id: 'invoices',
            label: '6.1.1 Sales Invoice (13 Rumus)',
            subtitle: '/finance/invoices • Kalkulasi & Cetak',
            icon: Receipt,
          },
          {
            id: 'payments',
            label: '6.1.2 Pelunasan & Rekonsiliasi AR',
            subtitle: '/finance/payments • Mutasi Kas/Bank',
            icon: Wallet,
          },
        ]
      : []),
    ...(canViewCustomerPos
      ? [
          {
            id: 'customer_pos',
            label: '5.2.1 Purchase Order Customer',
            subtitle: '/finance/customer-pos • PO dari E-mail',
            icon: FileSpreadsheet,
          },
        ]
      : []),
  ];

  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      ...(canViewFinanceTabs
        ? [
            {
              id: 'invoices',
              label: '6.1.1 Sales Invoice (Mesin 13 Rumus & Cetak)',
              subtitle: 'Input & edit inline Sales Invoice, kalkulasi real-time 13 rumus pajak, riwayat AR & cetak faktur',
              icon: Receipt,
              iconColor: 'text-emerald-600',
              badge: '13 Rumus',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'invoices'),
            },
            {
              id: 'payments',
              label: '6.1.2 Mutasi Pelunasan & Rekonsiliasi AR',
              subtitle: 'Catat pelunasan piutang inline, upload bukti transfer & rekonsiliasi mutasi kas/bank',
              icon: Wallet,
              iconColor: 'text-blue-600',
              badge: 'AR & Bank',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'payments'),
            },
          ]
        : []),
      ...(canViewCustomerPos
        ? [
            {
              id: 'customer_pos',
              label: '5.2.1 Purchase Order dari Customer (E-mail)',
              subtitle: canMutateCustomerPos
                ? 'Catat PO Customer dari e-mail beserta item barang & lampiran file'
                : 'Lihat daftar Purchase Order Customer (Mode Read-Only Sales / Cost Control)',
              icon: FileSpreadsheet,
              iconColor: 'text-amber-600',
              badge: canMutateCustomerPos ? 'Input / Edit' : 'View Only',
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'customer_pos'),
            },
          ]
        : []),
    ];

    return (
      <ModuleFeatureHub
        moduleCode="FINANCE"
        moduleName="KEUANGAN, SALES INVOICE & CUSTOMER PO"
        moduleDescription="Pengelolaan Sales Invoice 13 rumus pajak, mutasi pelunasan & rekonsiliasi piutang AR, serta pencatatan Purchase Order Customer dengan pola inline table."
        headerBgColor="bg-emerald-600"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  // Normalize legacy subfeature ids from sidebar/bookmarks
  const normalizedTab =
    activeSubFeature === 'ar_payments' || activeSubFeature === 'payments'
      ? 'payments'
      : activeSubFeature === 'customer_pos'
      ? 'customer_pos'
      : canViewFinanceTabs
      ? 'invoices'
      : 'customer_pos';

  const currentTab =
    !canViewFinanceTabs && normalizedTab !== 'customer_pos' ? 'customer_pos' : normalizedTab;

  return (
    <div className="space-y-4">
      <ModulePageHeader
        moduleCode="FINANCE"
        title="Modul Finance — Sales Invoice, Pelunasan AR & Customer PO"
        description="Inline table entry tanpa popup untuk Sales Invoice 13 rumus, rekonsiliasi AR, dan Purchase Order Customer"
        badgeColor="bg-emerald-50 text-emerald-800 border-emerald-300"
        options={pageOptions}
        activeOption={currentTab}
        onSelectOption={(optId) => appStore.setActiveSubFeature('finance', optId)}
        onBackToMenu={() => appStore.setActiveSubFeature('finance', null)}
        menuName="Keuangan"
      />

      {canViewFinanceTabs && <ArSummaryStrip />}

      {currentTab === 'invoices' && canViewFinanceTabs && (
        <SalesInvoicesTab canMutate={isFinanceUser} />
      )}

      {currentTab === 'payments' && canViewFinanceTabs && (
        <ArPaymentsTab canMutate={isFinanceUser} />
      )}

      {currentTab === 'customer_pos' && canViewCustomerPos && (
        <CustomerPosTab canMutate={canMutateCustomerPos} />
      )}

      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('finance', null)}
        backLabel="BACK (KEMBALI KE MENU KEUANGAN)"
      />
    </div>
  );
};
