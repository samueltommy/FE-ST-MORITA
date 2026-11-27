import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Printer,
  Eye,
  Loader2,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  approveVisitFinanceApi,
  approveVisitHrdApi,
  deleteOutOfTownVisitApi,
  getHrdVehicleBookingsApi,
  getOutOfTownVisitsApi,
  OutOfTownVisitRecord,
  printHrdReport,
  resolveBackendFileUrl,
} from '../../services/hrdService';
import { useRBAC } from '../../hooks/useRBAC';
import { OutOfTownVisitFormModal } from './OutOfTownVisitFormModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

const formatIdr = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);

export const OutOfTownVisitsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  // Matriks Core 1: Input - Edit - Delete hanya aktif untuk SALES, RND, PRODUKSI_QC, L1_DIREKSI, L0_SUPER_ADMIN
  const canMutateVisit =
    isSuperAdmin ||
    isExecutive ||
    userDivision === 'SALES' ||
    userDivision === 'RND' ||
    userDivision === 'PRODUKSI_QC';
  const canApproveHrd = isSuperAdmin || isExecutive || userDivision === 'HRD';
  const canApproveFinance = isSuperAdmin || isExecutive || userDivision === 'FINANCE';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OutOfTownVisitRecord | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    type: 'hrd_approve' | 'hrd_reject' | 'fin_approve' | 'fin_reject' | 'delete';
    row: OutOfTownVisitRecord;
  } | null>(null);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['hrdOutOfTownVisits', statusFilter, search],
    queryFn: () =>
      getOutOfTownVisitsApi({
        status: statusFilter,
        search: search || undefined,
      }),
  });

  const { data: vehicleBookings = [] } = useQuery({
    queryKey: ['hrdVehicleBookingsForVisit'],
    queryFn: () => getHrdVehicleBookingsApi(),
    enabled: modalOpen,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hrdOutOfTownVisits'] });

  const hrdMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveVisitHrdApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan HRD diproses');
      refresh();
      setConfirmState(null);
    },
  });

  const financeMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveVisitFinanceApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan Finance diproses');
      refresh();
      setConfirmState(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOutOfTownVisitApi(id),
    onSuccess: () => {
      toast.success('Pengajuan visit dibatalkan (Soft Delete)');
      refresh();
      setConfirmState(null);
    },
  });

  const getVisitTotalCost = (row: OutOfTownVisitRecord) =>
    row.totalEstimatedCost ??
    (row.transportCost || 0) +
      (row.lodgingCost || 0) +
      (row.mealCost || 0) +
      (row.otherCost || 0);

  const renderRowActions = (row: OutOfTownVisitRecord) => {
    const hrdPending = !row.hrdStatus || row.hrdStatus === 'PENDING';
    const finPending = !row.financeStatus || row.financeStatus === 'PENDING';
    const isPendingEditable = hrdPending && finPending;
    const hasWorkflow = (canApproveHrd && hrdPending) || (canApproveFinance && finPending);

    return (
      <div
        className="inline-flex items-center justify-end gap-1 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setSelectedRecord(row);
            setEditMode(false);
            setModalOpen(true);
          }}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
          title="Lihat Formulir"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {canMutateVisit && isPendingEditable && (
          <button
            onClick={() => {
              setSelectedRecord(row);
              setEditMode(true);
              setModalOpen(true);
            }}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() =>
            printHrdReport(`/hrd/out-of-town-visits/${row.id}/print`).catch((e) =>
              toast.error(e.message)
            )
          }
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
          title="Cetak Formulir"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        {canMutateVisit && isPendingEditable && (
          <button
            onClick={() => setConfirmState({ type: 'delete', row })}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
            title="Batalkan / Hapus"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {hasWorkflow && <span className="w-px h-4 bg-slate-200 mx-0.5" />}

        {canApproveHrd && hrdPending && (
          <>
            <button
              onClick={() => setConfirmState({ type: 'hrd_approve', row })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Acc HRD
            </button>
            <button
              onClick={() => setConfirmState({ type: 'hrd_reject', row })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Tolak HRD
            </button>
          </>
        )}

        {canApproveFinance && finPending && (
          <>
            <button
              onClick={() => setConfirmState({ type: 'fin_approve', row })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Acc FA
            </button>
            <button
              onClick={() => setConfirmState({ type: 'fin_reject', row })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Tolak FA
            </button>
          </>
        )}
      </div>
    );
  };

  const totalTransport = visits.reduce((s, r) => s + (r.transportCost || 0), 0);
  const totalLodging = visits.reduce((s, r) => s + (r.lodgingCost || 0), 0);
  const totalMeal = visits.reduce((s, r) => s + (r.mealCost || 0), 0);
  const totalOther = visits.reduce((s, r) => s + (r.otherCost || 0), 0);
  const grandTotalCost = visits.reduce((s, r) => s + getVisitTotalCost(r), 0);

  const visitExcelDataColumns: ExcelColumn<OutOfTownVisitRecord>[] = [
    {
      key: 'employeeNik',
      header: 'NIK',
      mono: true,
      getValue: (r) => r.employeeNik || '-',
    },
    {
      key: 'employeeName',
      header: 'Nama Karyawan',
      minWidth: 'min-w-[160px]',
      getValue: (r) => r.employeeName || 'Karyawan',
    },
    {
      key: 'department',
      header: 'Divisi',
      getValue: (r) => r.department || '-',
    },
    {
      key: 'destinationCity',
      header: 'Kota Tujuan',
      minWidth: 'min-w-[140px]',
      getValue: (r) => r.destinationCity || '-',
    },
    {
      key: 'customerName',
      header: 'Customer / Instansi',
      minWidth: 'min-w-[160px]',
      getValue: (r) => r.customerName || '-',
    },
    {
      key: 'departureDate',
      header: 'Tgl Berangkat',
      mono: true,
      getValue: (r) => r.departureDate || '-',
    },
    {
      key: 'returnDate',
      header: 'Tgl Kembali',
      mono: true,
      getValue: (r) => r.returnDate || '-',
    },
    {
      key: 'purpose',
      header: 'Keperluan',
      minWidth: 'min-w-[200px]',
      getValue: (r) => r.purpose || '-',
    },
    {
      key: 'transportCost',
      header: 'Biaya Transport',
      align: 'right',
      mono: true,
      getValue: (r) => r.transportCost || 0,
      render: (r) => formatIdr(r.transportCost || 0),
      footer: formatIdr(totalTransport),
    },
    {
      key: 'lodgingCost',
      header: 'Biaya Hotel',
      align: 'right',
      mono: true,
      getValue: (r) => r.lodgingCost || 0,
      render: (r) => formatIdr(r.lodgingCost || 0),
      footer: formatIdr(totalLodging),
    },
    {
      key: 'mealCost',
      header: 'Biaya Makan',
      align: 'right',
      mono: true,
      getValue: (r) => r.mealCost || 0,
      render: (r) => formatIdr(r.mealCost || 0),
      footer: formatIdr(totalMeal),
    },
    {
      key: 'otherCost',
      header: 'Biaya Lain',
      align: 'right',
      mono: true,
      getValue: (r) => r.otherCost || 0,
      render: (r) => formatIdr(r.otherCost || 0),
      footer: formatIdr(totalOther),
    },
    {
      key: 'totalEstimatedCost',
      header: 'Total Estimasi',
      align: 'right',
      mono: true,
      getValue: (r) => getVisitTotalCost(r),
      render: (r) => <span className="font-bold text-slate-900">{formatIdr(getVisitTotalCost(r))}</span>,
      footer: formatIdr(grandTotalCost),
    },
    {
      key: 'attachmentUrl',
      header: 'Lampiran',
      align: 'center',
      getValue: (r) => (r.attachmentUrl ? 'Ada Lampiran' : '-'),
      render: (r) =>
        r.attachmentUrl ? (
          <a
            href={resolveBackendFileUrl(r.attachmentUrl) || r.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Lampiran
          </a>
        ) : (
          '-'
        ),
    },
    {
      key: 'hrdStatus',
      header: 'Acc HRD',
      align: 'center',
      getValue: (r) => r.hrdStatus || 'PENDING',
    },
    {
      key: 'financeStatus',
      header: 'Acc Finance',
      align: 'center',
      getValue: (r) => r.financeStatus || 'PENDING',
    },
    {
      key: 'status',
      header: 'Status Akhir',
      align: 'center',
      getValue: (r) => r.status || '-',
      render: (r) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
          {r.status}
        </span>
      ),
    },
  ];

  const visitExcelColumns: ExcelColumn<OutOfTownVisitRecord>[] = [
    ...visitExcelDataColumns,
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (r) => renderRowActions(r),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kota tujuan, nama karyawan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Menunggu Approval</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() =>
              exportExcelCsv('visit-luar-kota-hrd', visitExcelDataColumns, visits)
            }
            exportDisabled={visits.length === 0}
          />

          {canMutateVisit && (
            <button
              onClick={() => {
                setSelectedRecord(null);
                setEditMode(false);
                setModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Visit Luar Kota</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Daftar Pengajuan Visit Luar Kota — Tampilan Excel"
          subtitle="Klik baris untuk melihat formulir • Geser horizontal untuk melihat seluruh rincian biaya"
          columns={visitExcelColumns}
          rows={visits}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada pengajuan visit luar kota."
          onRowClick={(row) => {
            setSelectedRecord(row);
            setEditMode(false);
            setModalOpen(true);
          }}
          footerLabel="TOTAL"
        />
      ) : (
      <div className="bg-white rounded-2xl border border-slate-300 overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 uppercase">
              <th className="py-3 px-4 border-r border-slate-200">Karyawan</th>
              <th className="py-3 px-4 border-r border-slate-200">Kota Tujuan & Periode</th>
              <th className="py-3 px-4 border-r border-slate-200">Estimasi Biaya</th>
              <th className="py-3 px-4 text-center border-r border-slate-200">Approval (HRD & FA)</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            ) : visits.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Belum ada pengajuan visit luar kota.
                </td>
              </tr>
            ) : (
              visits.map((row) => {
                const sumCost = getVisitTotalCost(row);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 border-r border-slate-200">
                      <div className="font-bold text-slate-900">
                        {row.employeeName || 'Karyawan'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {row.employeeNik || '-'} • {row.department || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs border-r border-slate-200">
                      <div className="font-bold text-slate-800">
                        {row.destinationCity}
                        {row.customerName ? ` — ${row.customerName}` : ''}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {row.departureDate} s/d {row.returnDate}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{row.purpose}</p>
                      {row.attachmentUrl && (
                        <a
                          href={resolveBackendFileUrl(row.attachmentUrl) || row.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold mt-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Lampiran
                        </a>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs border-r border-slate-200">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatIdr(sumCost)}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Trans: {formatIdr(row.transportCost)} • Hotel: {formatIdr(row.lodgingCost)}
                      </div>
                      <div className="text-slate-500">
                        Makan: {formatIdr(row.mealCost)} • Lain: {formatIdr(row.otherCost)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs space-y-1 border-r border-slate-200">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
                        {row.status}
                      </span>
                      <div className="text-slate-500">
                        HRD: <b>{row.hrdStatus || 'PENDING'}</b> • Finance:{' '}
                        <b>{row.financeStatus || 'PENDING'}</b>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">{renderRowActions(row)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      <OutOfTownVisitFormModal
        open={modalOpen}
        record={selectedRecord}
        editMode={editMode}
        vehicleBookings={vehicleBookings}
        onClose={() => setModalOpen(false)}
        onSuccess={refresh}
      />

      <ConfirmActionModal
        open={!!confirmState}
        variant={
          confirmState?.type === 'delete' || confirmState?.type?.includes('reject')
            ? 'danger'
            : 'success'
        }
        title={
          confirmState?.type === 'delete'
            ? 'Batalkan Pengajuan Visit?'
            : confirmState?.type?.includes('reject')
            ? 'Tolak Pengajuan Visit?'
            : 'Konfirmasi Persetujuan'
        }
        message={
          confirmState?.type === 'delete'
            ? `Batalkan / Nonaktifkan pengajuan visit ke ${confirmState.row.destinationCity}?`
            : `Lanjutkan proses persetujuan untuk visit ke ${confirmState?.row.destinationCity}?`
        }
        loading={hrdMutation.isPending || financeMutation.isPending || deleteMutation.isPending}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          const id = confirmState.row.id;
          if (confirmState.type === 'delete') deleteMutation.mutate(id);
          else if (confirmState.type === 'hrd_approve')
            hrdMutation.mutate({ id, action: 'APPROVE' });
          else if (confirmState.type === 'hrd_reject')
            hrdMutation.mutate({ id, action: 'REJECT' });
          else if (confirmState.type === 'fin_approve')
            financeMutation.mutate({ id, action: 'APPROVE' });
          else if (confirmState.type === 'fin_reject')
            financeMutation.mutate({ id, action: 'REJECT' });
        }}
      />
    </div>
  );
};
