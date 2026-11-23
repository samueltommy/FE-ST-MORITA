import React, { useState } from 'react';
import {
  Receipt,
  Wallet,
  Building2,
  FileSpreadsheet,
  Award,
  Utensils,
  Plane,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { useRBAC } from '../../hooks/useRBAC';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';
import { SalesInvoicesTab } from './SalesInvoicesTab';
import { ArPaymentsTab } from './ArPaymentsTab';
import { AccountPayableTab } from './AccountPayableTab';
import { CustomerPosTab } from './CustomerPosTab';
import { IncomingOrdersTab } from './IncomingOrdersTab';
import { SalesCommissionsTab } from './SalesCommissionsTab';
import { SalesEntertainmentsTab } from './SalesEntertainmentsTab';
import { FinanceVisitApprovalTab } from './FinanceVisitApprovalTab';
import { ComplaintsAndRmaTab } from './ComplaintsAndRmaTab';

export const FinanceAnalyticsModule: React.FC = () => {
  const { isSuperAdmin, isExecutive, userDivision, hasPermission } = useRBAC();
  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.finance);
  const [poIoSubTab, setPoIoSubTab] = useState<'po' | 'io'>('po');

  const isFinanceUser = isSuperAdmin || isExecutive || userDivision === 'FINANCE';
  const isSalesOrCostControl =
    userDivision === 'SALES' || hasPermission('cost_control:margin:approve');
  const isQcUser = userDivision === 'PRODUKSI_QC';

  const canViewFinanceCore = isFinanceUser;
  const canViewSharedSalesFinance = isFinanceUser || isSalesOrCostControl;
  const canViewComplaintsRma = isFinanceUser || isSalesOrCostControl || isQcUser;

  if (!canViewFinanceCore && !canViewSharedSalesFinance && !canViewComplaintsRma) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Lock className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-600">Akses Terbatas</h2>
        <p className="mt-2 text-sm text-center max-w-md">
          Modul Finance hanya dapat diakses oleh divisi FINANCE, SALES (menu terkait), Direksi, atau Super Admin.
        </p>
      </div>
    );
  }

  const pageOptions: PageOptionItem[] = [
    ...(canViewFinanceCore
      ? [
          {
            id: 'invoices',
            label: '6.1.1 Sales Invoice',
            subtitle: '13 Rumus & Cetak',
            icon: Receipt,
          },
          {
            id: 'payments',
            label: '6.1.2 Pelunasan AR',
            subtitle: 'Mutasi & Rekonsiliasi',
            icon: Wallet,
          },
          {
            id: 'ap',
            label: 'Account Payable (AP)',
            subtitle: 'Invoice & Hutang Vendor',
            icon: Building2,
          },
        ]
      : []),
    ...(canViewSharedSalesFinance
      ? [
          {
            id: 'customer_pos',
            label: '5.2 PO & Incoming Order',
            subtitle: '5.2.1 PO & 5.2.2/3 IO',
            icon: FileSpreadsheet,
          },
          {
            id: 'commissions',
            label: '6.3 Komisi Sales',
            subtitle: 'Hitung, Approve & Slip',
            icon: Award,
          },
          {
            id: 'entertainments',
            label: '6.4 Entertain Sales',
            subtitle: 'Approval Mkt & Finance',
            icon: Utensils,
          },
        ]
      : []),
    ...(canViewFinanceCore
      ? [
          {
            id: 'visit_approvals',
            label: 'Approval Visit Luar Kota',
            subtitle: 'Anggaran Dinas Luar',
            icon: Plane,
          },
        ]
      : []),
    ...(canViewComplaintsRma
      ? [
          {
            id: 'complaints_rma',
            label: '6.6 E-Complaint & RMA',
            subtitle: 'CHR, Credit/Debit Note',
            icon: AlertTriangle,
          },
        ]
      : []),
  ];

  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      ...(canViewFinanceCore
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
            {
              id: 'ap',
              label: 'Account Payable — Invoice Supplier & Hutang',
              subtitle: 'Tagihan vendor, deteksi jatuh tempo Overdue, mutasi pembayaran hutang & rekonsiliasi',
              icon: Building2,
              iconColor: 'text-indigo-600',
              badge: 'AP / Hutang',
              badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'ap'),
            },
          ]
        : []),
      ...(canViewSharedSalesFinance
        ? [
            {
              id: 'customer_pos',
              label: '5.2.1 Customer PO & 5.2.2/5.2.3 Incoming Order (IO)',
              subtitle: 'Catat PO Customer dari e-mail, konversi ke IO, serta konfirmasi Manager Marketing & Cost Control',
              icon: FileSpreadsheet,
              iconColor: 'text-amber-600',
              badge: isFinanceUser ? 'PO → IO' : 'View / Konfirmasi',
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'customer_pos'),
            },
            {
              id: 'commissions',
              label: '6.3 Komisi Sales',
              subtitle: 'Perhitungan komisi existing/new customer, bonus, approval Finance, Mark Paid & cetak slip',
              icon: Award,
              iconColor: 'text-purple-600',
              badge: '6.3 Komisi',
              badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'commissions'),
            },
            {
              id: 'entertainments',
              label: '6.4 Entertain Sales',
              subtitle: 'Pengajuan entertain sales, upload nota, approval Manager Marketing & Finance + cetak form',
              icon: Utensils,
              iconColor: 'text-rose-600',
              badge: '6.4 Entertain',
              badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'entertainments'),
            },
          ]
        : []),
      ...(canViewFinanceCore
        ? [
            {
              id: 'visit_approvals',
              label: 'Approval Finance — Visit Luar Kota',
              subtitle: 'Tinjau estimasi 4 pos biaya dinas luar kota, setujui/tolak anggaran Finance & cetak surat tugas',
              icon: Plane,
              iconColor: 'text-sky-600',
              badge: 'Approval',
              badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'visit_approvals'),
            },
          ]
        : []),
      ...(canViewComplaintsRma
        ? [
            {
              id: 'complaints_rma',
              label: '6.6 E-Complaint (CHR) & RMA / Credit-Debit Note',
              subtitle: 'Pencatatan komplain, QC Corrective Action, RMA Credit Note (AR) & Debit Note (AP) 2-tahap + cetak',
              icon: AlertTriangle,
              iconColor: 'text-orange-600',
              badge: 'CHR & RMA',
              badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
              onClick: () => appStore.setActiveSubFeature('finance', 'complaints_rma'),
            },
          ]
        : []),
    ];

    return (
      <ModuleFeatureHub
        moduleCode="FINANCE"
        moduleName="MODUL FINANCE LENGKAP (AR, AP, PO/IO, KOMISI & ENTERTAIN)"
        moduleDescription="Pengelolaan Sales Invoice 13 rumus, AR, Account Payable, Customer PO & Incoming Order, Komisi Sales, Entertain Sales, dan Approval Visit Luar Kota dengan pola inline table."
        headerBgColor="bg-emerald-600"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const normalizedTab = (() => {
    if (activeSubFeature === 'ar_payments' || activeSubFeature === 'payments') return 'payments';
    if (activeSubFeature === 'ap') return 'ap';
    if (activeSubFeature === 'customer_pos' || activeSubFeature === 'incoming_orders') return 'customer_pos';
    if (activeSubFeature === 'commissions') return 'commissions';
    if (activeSubFeature === 'entertainments') return 'entertainments';
    if (activeSubFeature === 'visit_approvals') return 'visit_approvals';
    if (activeSubFeature === 'complaints_rma' || activeSubFeature === 'complaints') return 'complaints_rma';
    return canViewFinanceCore ? 'invoices' : canViewSharedSalesFinance ? 'customer_pos' : 'complaints_rma';
  })();

  const currentTab =
    !canViewFinanceCore && !['customer_pos', 'commissions', 'entertainments', 'complaints_rma'].includes(normalizedTab)
      ? canViewSharedSalesFinance
        ? 'customer_pos'
        : 'complaints_rma'
      : normalizedTab;

  return (
    <div className="space-y-4">
      <ModulePageHeader
        moduleCode="FINANCE"
        title="Modul Finance — AR, AP, PO/IO, Komisi & Entertain Sales"
        description="Inline table entry tanpa popup untuk seluruh transaksi Finance"
        badgeColor="bg-emerald-50 text-emerald-800 border-emerald-300"
        options={pageOptions}
        activeOption={currentTab}
        onSelectOption={(optId) => appStore.setActiveSubFeature('finance', optId)}
        onBackToMenu={() => appStore.setActiveSubFeature('finance', null)}
        menuName="Keuangan"
      />

      {currentTab === 'invoices' && canViewFinanceCore && <SalesInvoicesTab canMutate={isFinanceUser} />}
      {currentTab === 'payments' && canViewFinanceCore && <ArPaymentsTab canMutate={isFinanceUser} />}
      {currentTab === 'ap' && canViewFinanceCore && <AccountPayableTab canMutate={isFinanceUser} />}

      {currentTab === 'customer_pos' && canViewSharedSalesFinance && (
        <div className="space-y-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setPoIoSubTab('po')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                poIoSubTab === 'po' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5.2.1 Purchase Order Customer
            </button>
            <button
              type="button"
              onClick={() => setPoIoSubTab('io')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                poIoSubTab === 'io' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5.2.2 &amp; 5.2.3 Incoming Order (IO)
            </button>
          </div>

          {poIoSubTab === 'po' ? (
            <CustomerPosTab canMutate={isFinanceUser} />
          ) : (
            <IncomingOrdersTab />
          )}
        </div>
      )}

      {currentTab === 'commissions' && canViewSharedSalesFinance && <SalesCommissionsTab />}
      {currentTab === 'entertainments' && canViewSharedSalesFinance && <SalesEntertainmentsTab />}
      {currentTab === 'visit_approvals' && canViewFinanceCore && <FinanceVisitApprovalTab />}
      {currentTab === 'complaints_rma' && canViewComplaintsRma && <ComplaintsAndRmaTab />}

      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('finance', null)}
        backLabel="BACK (KEMBALI KE MENU KEUANGAN)"
      />
    </div>
  );
};
