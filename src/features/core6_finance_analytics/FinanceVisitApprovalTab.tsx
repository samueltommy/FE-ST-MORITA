import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Printer,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getOutOfTownVisitsApi,
  approveVisitFinanceApi,
  printHrdReport,
  OutOfTownVisitRecord,
} from '../../services/hrdService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

export const FinanceVisitApprovalTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canApproveFinance = isSuperAdmin || isExecutive || userDivision === 'FINANCE';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [confirmState, setConfirmState] = useState<{
    action: 'APPROVE' | 'REJECT';
    row: OutOfTownVisitRecord;
  } | null>(null);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['financeOutOfTownVisits', search, statusFilter],
    queryFn: () =>
      getOutOfTownVisitsApi({
        search: search || undefined,
        status: statusFilter,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveVisitFinanceApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan Finance untuk Visit Luar Kota berhasil diproses');
      setConfirmState(null);
      queryClient.invalidateQueries({ queryKey: ['financeOutOfTownVisits'] });
      queryClient.invalidateQueries({ queryKey: ['hrdOutOfTownVisits'] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memproses persetujuan Finance'),
  });

  const renderBadge = (status?: string) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'APPROVED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">APPROVED</span>;
    if (s === 'REJECTED') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">REJECTED</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">PENDING</span>;
  };

  const totals = useMemo(() => {
    return visits.reduce(
      (acc, v) => {
        const tiket = Number(v.transportCost ?? 0);
        const hotel = Number(v.lodgingCost ?? 0);
        const makan = Number(v.mealCost ?? 0);
        const lokal = Number(v.otherCost ?? 0);
        const total = Number(v.totalEstimatedCost ?? tiket + hotel + makan + lokal);
        acc.tiket += tiket;
        acc.hotel += hotel;
        acc.makan += makan;
        acc.lokal += lokal;
        acc.total += total;
        return acc;
      },
      { tiket: 0, hotel: 0, makan: 0, lokal: 0, total: 0 }
    );
  }, [visits]);

  const excelColumns: ExcelColumn<OutOfTownVisitRecord>[] = [
    {
      key: 'employeeName',
      header: 'Karyawan',
      minWidth: 'min-w-[160px]',
      getValue: (v) => v.employeeName || '-',
    },
    {
      key: 'destinationCity',
      header: 'Kota Tujuan',
      minWidth: 'min-w-[130px]',
      getValue: (v) => v.destinationCity || '-',
    },
    {
      key: 'customerName',
      header: 'Customer',
      minWidth: 'min-w-[150px]',
      getValue: (v) => v.customerName || '-',
    },
    {
      key: 'departureDate',
      header: 'Tgl Berangkat',
      getValue: (v) => v.departureDate || '-',
    },
    {
      key: 'returnDate',
      header: 'Tgl Kembali',
      getValue: (v) => v.returnDate || '-',
    },
    {
      key: 'transportCost',
      header: 'Tiket / Transport',
      align: 'right',
      mono: true,
      getValue: (v) => Number(v.transportCost ?? 0),
      render: (v) => formatIDR(Number(v.transportCost ?? 0)),
      footer: formatIDR(totals.tiket),
    },
    {
      key: 'lodgingCost',
      header: 'Hotel / Akomodasi',
      align: 'right',
      mono: true,
      getValue: (v) => Number(v.lodgingCost ?? 0),
      render: (v) => formatIDR(Number(v.lodgingCost ?? 0)),
      footer: formatIDR(totals.hotel),
    },
    {
      key: 'mealCost',
      header: 'Uang Makan',
      align: 'right',
      mono: true,
      getValue: (v) => Number(v.mealCost ?? 0),
      render: (v) => formatIDR(Number(v.mealCost ?? 0)),
      footer: formatIDR(totals.makan),
    },
    {
      key: 'otherCost',
      header: 'Transport Lokal / Lain',
      align: 'right',
      mono: true,
      getValue: (v) => Number(v.otherCost ?? 0),
      render: (v) => formatIDR(Number(v.otherCost ?? 0)),
      footer: formatIDR(totals.lokal),
    },
    {
      key: 'totalEstimatedCost',
      header: 'Total Anggaran',
      align: 'right',
      mono: true,
      getValue: (v) =>
        Number(
          v.totalEstimatedCost ??
            Number(v.transportCost ?? 0) +
              Number(v.lodgingCost ?? 0) +
              Number(v.mealCost ?? 0) +
              Number(v.otherCost ?? 0)
        ),
      render: (v) => {
        const total = Number(
          v.totalEstimatedCost ??
            Number(v.transportCost ?? 0) +
              Number(v.lodgingCost ?? 0) +
              Number(v.mealCost ?? 0) +
              Number(v.otherCost ?? 0)
        );
        return <span className="font-extrabold text-emerald-700">{formatIDR(total)}</span>;
      },
      footer: <span className="text-emerald-700">{formatIDR(totals.total)}</span>,
    },
    {
      key: 'hrdStatus',
      header: 'Status HRD',
      align: 'center',
      getValue: (v) => String(v.hrdStatus || 'PENDING').toUpperCase(),
      render: (v) => renderBadge(v.hrdStatus),
    },
    {
      key: 'financeStatus',
      header: 'Status Finance',
      align: 'center',
      getValue: (v) => String(v.financeStatus || 'PENDING').toUpperCase(),
      render: (v) => renderBadge(v.financeStatus),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (v) => {
        const finStatus = String(v.financeStatus || 'PENDING').toUpperCase();
        return (
          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {canApproveFinance && finStatus === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmState({ action: 'APPROVE', row: v })}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmState({ action: 'REJECT', row: v })}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() =>
                printHrdReport(`/hrd/out-of-town-visits/${v.id}/print`).catch((e) =>
                  toast.error(e?.message || 'Gagal mencetak surat tugas')
                )
              }
              title="Cetak Surat Tugas"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  const handleExportCsv = () => {
    exportExcelCsv(
      'visit-luar-kota-finance',
      excelColumns.filter((c) => c.key !== 'actions'),
      visits
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Karyawan / Kota Tujuan / Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <ExcelViewToggle
          value={tableStyle}
          onChange={setTableStyle}
          onExport={handleExportCsv}
          exportDisabled={visits.length === 0}
        />
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Approval Anggaran Visit Luar Kota (Tabel Excel)"
          subtitle="Seluruh komponen anggaran terpisah per kolom • Geser horizontal untuk melihat semua kolom"
          columns={excelColumns}
          rows={visits}
          rowKey={(v) => v.id}
          isLoading={isLoading}
          emptyText="Tidak ada data Visit Luar Kota."
          footerLabel="TOTAL"
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 uppercase">
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Karyawan &amp; Tujuan</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200">Jadwal</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Tiket / Transport</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Hotel / Akomodasi</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Uang Makan &amp; Lokal</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-right">Total Anggaran</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">HRD</th>
                  <th className="px-3.5 py-2.5 border-r border-slate-200 text-center">Finance</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat pengajuan Visit Luar Kota...
                    </td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Tidak ada data Visit Luar Kota.
                    </td>
                  </tr>
                ) : (
                  visits.map((v) => {
                    const tiket = Number(v.transportCost ?? 0);
                    const hotel = Number(v.lodgingCost ?? 0);
                    const makan = Number(v.mealCost ?? 0);
                    const lokal = Number(v.otherCost ?? 0);
                    const total = Number(v.totalEstimatedCost ?? tiket + hotel + makan + lokal);
                    const finStatus = String(v.financeStatus || 'PENDING').toUpperCase();
                    const hrdStatus = String(v.hrdStatus || 'PENDING').toUpperCase();

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 border-r border-slate-200">
                          <div className="font-semibold text-slate-800">{v.employeeName || '-'}</div>
                          <div className="text-xs text-slate-500">
                            {v.destinationCity} {v.customerName ? `• ${v.customerName}` : ''}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap">
                          <div>{v.departureDate}</div>
                          <div className="text-xs text-slate-400">s/d {v.returnDate}</div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono">{formatIDR(tiket)}</td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono">{formatIDR(hotel)}</td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono">
                          <div>{formatIDR(makan)}</div>
                          <div className="text-xs text-slate-400">Lokal: {formatIDR(lokal)}</div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                          {formatIDR(total)}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-center">{renderBadge(hrdStatus)}</td>
                        <td className="px-3.5 py-2.5 border-r border-slate-200 text-center">{renderBadge(finStatus)}</td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {canApproveFinance && finStatus === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmState({ action: 'APPROVE', row: v })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmState({ action: 'REJECT', row: v })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                printHrdReport(`/hrd/out-of-town-visits/${v.id}/print`).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak surat tugas')
                                )
                              }
                              title="Cetak Surat Tugas"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(confirmState)}
        title={confirmState?.action === 'APPROVE' ? 'Approve Anggaran Visit Luar Kota?' : 'Reject Anggaran Visit Luar Kota?'}
        message={`Konfirmasi ${confirmState?.action === 'APPROVE' ? 'persetujuan' : 'penolakan'} Finance untuk visit ${confirmState?.row.employeeName || ''} ke ${confirmState?.row.destinationCity || ''}.`}
        confirmLabel={confirmState?.action === 'APPROVE' ? 'Ya, Approve Finance' : 'Ya, Reject'}
        variant={confirmState?.action === 'APPROVE' ? 'success' : 'danger'}
        loading={approveMutation.isPending}
        onConfirm={() =>
          confirmState && approveMutation.mutate({ id: confirmState.row.id, action: confirmState.action })
        }
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
};
