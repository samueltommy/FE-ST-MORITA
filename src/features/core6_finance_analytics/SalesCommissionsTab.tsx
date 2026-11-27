import React, { useState, useMemo } from 'react';
import {
  Plus,
  CheckCircle2,
  Wallet,
  Printer,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesCommissionsApi,
  createSalesCommissionApi,
  updateSalesCommissionApi,
  deleteSalesCommissionApi,
  approveSalesCommissionApi,
  markPaidSalesCommissionApi,
  listSalesEmployeesApi,
  printFinanceHtmlReport,
  extractFinanceErrorMessage,
  SalesCommissionRecord,
  SalesCommissionPayload,
} from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';
import {
  EXCEL_CELL,
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

const now = new Date();

const emptyDraft = (): SalesCommissionPayload => ({
  employeeId: '',
  periodMonth: now.getMonth() + 1,
  periodYear: now.getFullYear(),
  existingSalesAmount: 0,
  existingSalesRate: 1,
  newCustomerSalesAmount: 0,
  newCustomerRate: 2,
  newCustomerCount: 0,
  bonusAmount: 0,
  deductionAmount: 0,
  notes: '',
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const SalesCommissionsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canInputEditDelete = isSuperAdmin || isExecutive || userDivision === 'FINANCE' || userDivision === 'SALES';
  const canApproveOrPay = isSuperAdmin || isExecutive || userDivision === 'FINANCE';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesCommissionRecord | null>(null);
  const [draft, setDraft] = useState<SalesCommissionPayload>(emptyDraft);
  const [voidTarget, setVoidTarget] = useState<SalesCommissionRecord | null>(null);

  const editingId = editingRecord?.id ?? null;

  const { data: res, isLoading } = useQuery({
    queryKey: ['financeCommissions', page, statusFilter, employeeFilter],
    queryFn: () =>
      listSalesCommissionsApi({
        page,
        limit: 20,
        status: statusFilter,
        employeeId: employeeFilter,
      }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;
  const totalItems = res?.meta?.total ?? res?.meta?.totalItems;

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['salesEmployeesDropdown'],
    queryFn: listSalesEmployeesApi,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['financeCommissions'] });

  const createMutation = useMutation({
    mutationFn: (payload: SalesCommissionPayload) => createSalesCommissionApi(payload),
    onSuccess: () => {
      toast.success('Komisi Sales berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyimpan komisi sales')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SalesCommissionPayload> }) =>
      updateSalesCommissionApi(id, payload),
    onSuccess: () => {
      toast.success('Komisi Sales berhasil diperbarui');
      setEditingRecord(null);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui komisi sales')),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveSalesCommissionApi(id),
    onSuccess: () => {
      toast.success('Komisi Sales disetujui Finance');
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyetujui komisi')),
  });

  const paidMutation = useMutation({
    mutationFn: (id: string) => markPaidSalesCommissionApi(id),
    onSuccess: () => {
      toast.success('Komisi Sales ditandai LUNAS (Paid)');
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menandai lunas')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSalesCommissionApi(id),
    onSuccess: () => {
      toast.success('Komisi Sales berhasil dibatalkan');
      setVoidTarget(null);
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan komisi')),
  });

  const calcTotalCommission = (d: SalesCommissionPayload) =>
    Math.round(
      (Number(d.existingSalesAmount || 0) * Number(d.existingSalesRate || 0)) / 100 +
        (Number(d.newCustomerSalesAmount || 0) * Number(d.newCustomerRate || 0)) / 100 +
        Number(d.bonusAmount || 0) -
        Number(d.deductionAmount || 0)
    );

  const startAdd = () => {
    setEditingRecord(null);
    setDraft(emptyDraft());
    setIsAdding(true);
  };

  const startEdit = (c: SalesCommissionRecord) => {
    setIsAdding(false);
    setEditingRecord(c);
    setDraft({
      employeeId: c.employeeId,
      periodMonth: c.periodMonth,
      periodYear: c.periodYear,
      existingSalesAmount: c.existingSalesAmount,
      existingSalesRate: c.existingSalesRate,
      newCustomerSalesAmount: c.newCustomerSalesAmount,
      newCustomerRate: c.newCustomerRate,
      newCustomerCount: c.newCustomerCount,
      bonusAmount: c.bonusAmount,
      deductionAmount: c.deductionAmount,
      notes: c.notes || '',
    });
  };

  const cancelEditor = () => {
    setIsAdding(false);
    setEditingRecord(null);
    setDraft(emptyDraft());
  };

  const handleSave = () => {
    if (!draft.employeeId) return toast.error('Pilih Sales Person terlebih dahulu');
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: draft });
    } else {
      createMutation.mutate(draft);
    }
  };

  const totals = useMemo(
    () =>
      list.reduce(
        (acc, c) => {
          acc.existing += Number(c.existingSalesAmount || 0);
          acc.newCust += Number(c.newCustomerSalesAmount || 0);
          acc.bonus += Number(c.bonusAmount || 0);
          acc.deduction += Number(c.deductionAmount || 0);
          acc.total += Number(c.totalCommission || 0);
          return acc;
        },
        { existing: 0, newCust: 0, bonus: 0, deduction: 0, total: 0 }
      ),
    [list]
  );

  const excelColumns: ExcelColumn<SalesCommissionRecord>[] = [
    {
      key: 'employeeName',
      header: 'Sales Person',
      minWidth: 'min-w-[160px]',
      getValue: (c) => c.employeeName || '-',
    },
    {
      key: 'employeeNik',
      header: 'NIK / No. Komisi',
      mono: true,
      getValue: (c) => c.employeeNik || c.commissionNumber || '-',
    },
    {
      key: 'period',
      header: 'Periode',
      getValue: (c) => `${MONTHS[(c.periodMonth || 1) - 1] || c.periodMonth} ${c.periodYear}`,
    },
    {
      key: 'existingSalesAmount',
      header: 'Existing Sales',
      align: 'right',
      mono: true,
      getValue: (c) => Number(c.existingSalesAmount || 0),
      render: (c) => formatIDR(c.existingSalesAmount),
      footer: formatIDR(totals.existing),
    },
    {
      key: 'existingSalesRate',
      header: 'Rate Existing (%)',
      align: 'right',
      mono: true,
      getValue: (c) => `${c.existingSalesRate}%`,
    },
    {
      key: 'newCustomerSalesAmount',
      header: 'New Customer Sales',
      align: 'right',
      mono: true,
      getValue: (c) => Number(c.newCustomerSalesAmount || 0),
      render: (c) => formatIDR(c.newCustomerSalesAmount),
      footer: formatIDR(totals.newCust),
    },
    {
      key: 'newCustomerRate',
      header: 'Rate New (%)',
      align: 'right',
      mono: true,
      getValue: (c) => `${c.newCustomerRate}%`,
    },
    {
      key: 'newCustomerCount',
      header: 'Qty New Cust',
      align: 'right',
      mono: true,
      getValue: (c) => c.newCustomerCount ?? 0,
    },
    {
      key: 'bonusAmount',
      header: 'Bonus',
      align: 'right',
      mono: true,
      getValue: (c) => Number(c.bonusAmount || 0),
      render: (c) => <span className="text-emerald-700">{formatIDR(c.bonusAmount)}</span>,
      footer: formatIDR(totals.bonus),
    },
    {
      key: 'deductionAmount',
      header: 'Potongan',
      align: 'right',
      mono: true,
      getValue: (c) => Number(c.deductionAmount || 0),
      render: (c) => <span className="text-rose-600">{formatIDR(c.deductionAmount)}</span>,
      footer: formatIDR(totals.deduction),
    },
    {
      key: 'totalCommission',
      header: 'Total Komisi',
      align: 'right',
      mono: true,
      getValue: (c) => Number(c.totalCommission || 0),
      render: (c) => <span className="font-extrabold text-emerald-700">{formatIDR(c.totalCommission)}</span>,
      footer: <span className="text-emerald-700">{formatIDR(totals.total)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      getValue: (c) => c.status,
      render: (c) => {
        const isPaid = c.status === 'PAID';
        const isApproved = c.status === 'APPROVED';
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              isPaid
                ? 'bg-emerald-100 text-emerald-700'
                : isApproved
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {c.status}
          </span>
        );
      },
    },
    {
      key: 'notes',
      header: 'Catatan',
      minWidth: 'min-w-[160px]',
      getValue: (c) => c.notes || '-',
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (c) => {
        const isPaid = c.status === 'PAID';
        const isApproved = c.status === 'APPROVED';
        const isVoid = c.status === 'CANCELLED' || c.status === 'VOID';
        return (
          <div className="inline-flex items-center gap-1">
            {canApproveOrPay && !isApproved && !isPaid && !isVoid && (
              <button
                type="button"
                onClick={() => approveMutation.mutate(c.id)}
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" /> Approve
              </button>
            )}
            {canApproveOrPay && isApproved && !isPaid && (
              <button
                type="button"
                onClick={() => paidMutation.mutate(c.id)}
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <Wallet className="w-3 h-3" /> Paid
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                printFinanceHtmlReport(`/finance/commissions/${c.id}/print`).catch((e) =>
                  toast.error(e?.message || 'Gagal mencetak slip komisi')
                )
              }
              title="Cetak Slip Komisi"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            {canInputEditDelete && !isPaid && !isVoid && (
              <button
                type="button"
                onClick={() => startEdit(c)}
                title="Edit"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canInputEditDelete && !isPaid && !isVoid && (
              <button
                type="button"
                onClick={() => setVoidTarget(c)}
                title="Batal / Void"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const handleExportCsv = () => {
    exportExcelCsv(
      'komisi-sales',
      excelColumns.filter((c) => c.key !== 'actions'),
      list
    );
  };

  if (canInputEditDelete && (isAdding || editingRecord)) {
    const isNew = isAdding && !editingRecord;
    return (
      <ExcelWorksheetShell
        onBack={cancelEditor}
        docTitle={isNew ? 'AUTO-KOMISI' : editingRecord?.commissionNumber || editingRecord?.employeeName || 'EDIT-KOMISI'}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {isNew ? 'BARU' : 'EDIT'}
          </span>
        }
        formCode="FORM PERHITUNGAN KOMISI SALES"
        sheetTitle={isNew ? 'Input Komisi Sales Baru' : `Edit Komisi Sales — ${editingRecord?.employeeName}`}
        modeHint="Worksheet Perhitungan Komisi"
        actions={
          <>
            <button
              type="button"
              onClick={cancelEditor}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer"
            >
              <X className="w-4 h-4" /> Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Komisi</span>
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${EXCEL_CELL.label} w-52`}>Sales Person *</td>
                <td className={EXCEL_CELL.value}>
                  <select
                    value={draft.employeeId}
                    onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}
                    className={EXCEL_CELL.input}
                  >
                    <option value="">-- Pilih Sales Person --</option>
                    {salesEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} {emp.nik ? `(${emp.nik})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`${EXCEL_CELL.label} w-52`}>Periode (Bulan / Tahun)</td>
                <td className={EXCEL_CELL.value}>
                  <div className="flex">
                    <select
                      value={draft.periodMonth}
                      onChange={(e) => setDraft({ ...draft, periodMonth: Number(e.target.value) })}
                      className={`${EXCEL_CELL.input} border-r border-slate-300`}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={draft.periodYear}
                      onChange={(e) => setDraft({ ...draft, periodYear: Number(e.target.value) })}
                      className={`${EXCEL_CELL.input} w-28 font-mono text-right`}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Existing Sales (IDR)</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={draft.existingSalesAmount}
                    onChange={(e) => setDraft({ ...draft, existingSalesAmount: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right`}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Rate Existing (%)</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    step="0.1"
                    value={draft.existingSalesRate}
                    onChange={(e) => setDraft({ ...draft, existingSalesRate: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right`}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>New Customer Sales (IDR)</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={draft.newCustomerSalesAmount}
                    onChange={(e) => setDraft({ ...draft, newCustomerSalesAmount: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right`}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Rate New Cust (%) &amp; Qty</td>
                <td className={EXCEL_CELL.value}>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Rate %"
                      value={draft.newCustomerRate}
                      onChange={(e) => setDraft({ ...draft, newCustomerRate: Number(e.target.value) })}
                      className={`${EXCEL_CELL.input} font-mono text-right border-r border-slate-300`}
                    />
                    <input
                      type="number"
                      placeholder="Qty Cust"
                      value={draft.newCustomerCount}
                      onChange={(e) => setDraft({ ...draft, newCustomerCount: Number(e.target.value) })}
                      className={`${EXCEL_CELL.input} font-mono text-right w-32`}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Bonus (IDR)</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={draft.bonusAmount}
                    onChange={(e) => setDraft({ ...draft, bonusAmount: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right text-emerald-700`}
                  />
                </td>
                <td className={EXCEL_CELL.label}>Potongan (IDR)</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="number"
                    value={draft.deductionAmount}
                    onChange={(e) => setDraft({ ...draft, deductionAmount: Number(e.target.value) })}
                    className={`${EXCEL_CELL.input} font-mono text-right text-rose-600`}
                  />
                </td>
              </tr>
              <tr>
                <td className={EXCEL_CELL.label}>Catatan</td>
                <td className={EXCEL_CELL.value}>
                  <input
                    type="text"
                    placeholder="Catatan komisi sales (opsional)..."
                    value={draft.notes || ''}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    className={EXCEL_CELL.input}
                  />
                </td>
                <td className={`${EXCEL_CELL.label} bg-emerald-50 text-emerald-900`}>Estimasi Total Komisi</td>
                <td className="px-3.5 py-2.5 bg-emerald-50/70 border border-slate-300 font-mono text-base font-black text-emerald-700 text-right">
                  {formatIDR(calcTotalCommission(draft))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ExcelWorksheetShell>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={employeeFilter}
            onChange={(e) => {
              setEmployeeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Sales Person</option>
            {salesEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PAID">PAID</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={handleExportCsv}
            exportDisabled={list.length === 0}
          />
          {canInputEditDelete && (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Komisi</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Komisi Sales (Sales Commissions) — Tabel Excel"
          subtitle="Seluruh komponen omset, rate %, bonus, potongan & total komisi terpisah per kolom"
          columns={excelColumns}
          rows={list}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          emptyText="Belum ada data Komisi Sales."
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'komisi',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => p + 1),
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 uppercase">
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Sales Person</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Periode</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Existing Sales</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">New Customer</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Bonus / Potongan</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Total Komisi</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Komisi Sales...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Belum ada data Komisi Sales.
                    </td>
                  </tr>
                ) : (
                  list.map((c) => {
                    const isPaid = c.status === 'PAID';
                    const isApproved = c.status === 'APPROVED';
                    const isVoid = c.status === 'CANCELLED' || c.status === 'VOID';

                    return (
                      <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${isVoid ? 'opacity-60' : ''}`}>
                        <td className="px-3.5 py-2.5 border-r border-slate-200">
                          <div className="font-semibold text-slate-800">{c.employeeName}</div>
                          <div className="text-xs text-slate-500">{c.employeeNik || c.commissionNumber || '-'}</div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap font-medium">
                          {MONTHS[(c.periodMonth || 1) - 1] || c.periodMonth} {c.periodYear}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono">
                          <div>{formatIDR(c.existingSalesAmount)}</div>
                          <div className="text-xs text-slate-400">Rate {c.existingSalesRate}%</div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono">
                          <div>{formatIDR(c.newCustomerSalesAmount)}</div>
                          <div className="text-xs text-slate-400">
                            {c.newCustomerRate}% ({c.newCustomerCount} Cust)
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono">
                          <div className="text-emerald-700">+{formatIDR(c.bonusAmount)}</div>
                          {c.deductionAmount > 0 && (
                            <div className="text-rose-600 text-xs">-{formatIDR(c.deductionAmount)}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                          {formatIDR(c.totalCommission)}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-700'
                                : isApproved
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {canApproveOrPay && !isApproved && !isPaid && !isVoid && (
                              <button
                                type="button"
                                onClick={() => approveMutation.mutate(c.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                            )}
                            {canApproveOrPay && isApproved && !isPaid && (
                              <button
                                type="button"
                                onClick={() => paidMutation.mutate(c.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <Wallet className="w-3.5 h-3.5" /> Tandai Paid
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                printFinanceHtmlReport(`/finance/commissions/${c.id}/print`).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak slip komisi')
                                )
                              }
                              title="Cetak Slip Komisi"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canInputEditDelete && !isPaid && !isVoid && (
                              <button
                                type="button"
                                onClick={() => startEdit(c)}
                                title="Edit"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canInputEditDelete && !isPaid && !isVoid && (
                              <button
                                type="button"
                                onClick={() => setVoidTarget(c)}
                                title="Batal / Void"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(voidTarget)}
        title="Batalkan Komisi Sales?"
        message={`Anda yakin ingin membatalkan komisi untuk ${voidTarget?.employeeName || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
