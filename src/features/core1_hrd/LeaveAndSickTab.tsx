import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Printer,
  Eye,
  RotateCcw,
  Loader2,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getHrdLeaveRequestsApi,
  approveHrdLeaveSupervisorApi,
  approveHrdLeaveHrdApi,
  confirmHrdLeaveReturnApi,
  deleteHrdLeaveRequestApi,
  printHrdReport,
  resolveBackendFileUrl,
  HrdLeaveRequestRecord,
  LeaveRequestGroup,
} from '../../services/hrdService';
import { useRBAC } from '../../hooks/useRBAC';
import { LeaveRequestFormModal } from './LeaveRequestFormModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

interface Props {
  requestGroup: LeaveRequestGroup;
}

export const LeaveAndSickTab: React.FC<Props> = ({ requestGroup }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canApproveSupervisor = isSuperAdmin || isExecutive || isAdminBidang;
  const canApproveHrd = isSuperAdmin || isExecutive || userDivision === 'HRD';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HrdLeaveRequestRecord | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    type: 'sup_approve' | 'sup_reject' | 'hrd_approve' | 'hrd_reject' | 'return' | 'delete';
    row: HrdLeaveRequestRecord;
  } | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['hrdLeaveRequests', requestGroup, statusFilter, search],
    queryFn: () =>
      getHrdLeaveRequestsApi({
        requestGroup,
        status: statusFilter,
        search: search || undefined,
      }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['hrdLeaveRequests'] });
    queryClient.invalidateQueries({ queryKey: ['myEmployeeProfile'] });
  };

  const supMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveHrdLeaveSupervisorApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan Atasan berhasil diproses');
      refresh();
      setConfirmState(null);
    },
  });

  const hrdMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveHrdLeaveHrdApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan HRD berhasil diproses');
      refresh();
      setConfirmState(null);
    },
  });

  const returnMutation = useMutation({
    mutationFn: (id: string) => confirmHrdLeaveReturnApi(id),
    onSuccess: () => {
      toast.success('Konfirmasi kembali bekerja berhasil');
      refresh();
      setConfirmState(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHrdLeaveRequestApi(id),
    onSuccess: () => {
      toast.success('Pengajuan berhasil dibatalkan (Soft Delete)');
      refresh();
      setConfirmState(null);
    },
  });

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('REJECT')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
          Ditolak
        </span>
      );
    }
    if (s === 'RETURN_CONFIRMED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
          Kembali Kerja
        </span>
      );
    }
    if (s === 'APPROVED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
          Disetujui
        </span>
      );
    }
    if (s === 'PENDING_HRD') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
          Menunggu HRD
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
        Menunggu Atasan
      </span>
    );
  };

  const renderRowActions = (row: HrdLeaveRequestRecord) => {
    const supPending = !row.supervisorStatus || row.supervisorStatus === 'PENDING';
    const hrdPending =
      row.supervisorStatus === 'APPROVED' &&
      (!row.hrdStatus || row.hrdStatus === 'PENDING');
    const canReturn = row.status === 'APPROVED' && !row.returnConfirmed;
    const isPendingEditable = (row.status || '').startsWith('PENDING');
    const hasWorkflow =
      (canApproveSupervisor && supPending) ||
      (canApproveHrd && hrdPending) ||
      (canApproveHrd && canReturn);

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

        {isPendingEditable && (
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
            printHrdReport(`/hrd/leave-requests/${row.id}/print`).catch((e) =>
              toast.error(e.message)
            )
          }
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
          title="Cetak Formulir"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        {isPendingEditable && (
          <button
            onClick={() => setConfirmState({ type: 'delete', row })}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
            title="Batalkan / Hapus"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {hasWorkflow && <span className="w-px h-4 bg-slate-200 mx-0.5" />}

        {canApproveSupervisor && supPending && (
          <>
            <button
              onClick={() => setConfirmState({ type: 'sup_approve', row })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Acc Atasan
            </button>
            <button
              onClick={() => setConfirmState({ type: 'sup_reject', row })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Tolak
            </button>
          </>
        )}

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
              <XCircle className="w-3.5 h-3.5" /> Tolak
            </button>
          </>
        )}

        {canApproveHrd && canReturn && (
          <button
            onClick={() => setConfirmState({ type: 'return', row })}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Kembali Kerja
          </button>
        )}
      </div>
    );
  };

  const totalDaysSum = list.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);

  const leaveExcelDataColumns: ExcelColumn<HrdLeaveRequestRecord>[] = [
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
      key: 'leaveCategory',
      header: 'Kategori',
      getValue: (r) => (r.leaveCategory || '').replace(/_/g, ' ') || '-',
    },
    {
      key: 'startDate',
      header: 'Tgl Mulai',
      mono: true,
      getValue: (r) => r.startDate || '-',
    },
    {
      key: 'endDate',
      header: 'Tgl Selesai',
      mono: true,
      getValue: (r) => r.endDate || '-',
    },
    {
      key: 'totalDays',
      header: 'Durasi (Hari)',
      align: 'right',
      mono: true,
      getValue: (r) => r.totalDays ?? 0,
      footer: `${totalDaysSum} hari`,
    },
    {
      key: 'reason',
      header: 'Keperluan / Alasan',
      minWidth: 'min-w-[200px]',
      getValue: (r) => r.reason || '-',
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
      key: 'supervisorStatus',
      header: 'Acc Atasan',
      align: 'center',
      getValue: (r) => r.supervisorStatus || 'PENDING',
    },
    {
      key: 'hrdStatus',
      header: 'Acc HRD',
      align: 'center',
      getValue: (r) => r.hrdStatus || 'PENDING',
    },
    {
      key: 'returnConfirmed',
      header: 'Kembali Kerja',
      align: 'center',
      getValue: (r) => (r.returnConfirmed ? 'Sudah' : 'Belum'),
    },
    {
      key: 'status',
      header: 'Status Akhir',
      align: 'center',
      getValue: (r) => r.status || '-',
      render: (r) => getStatusBadge(r.status),
    },
  ];

  const leaveExcelColumns: ExcelColumn<HrdLeaveRequestRecord>[] = [
    ...leaveExcelDataColumns,
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
              placeholder="Cari nama karyawan / alasan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING_SUPERVISOR">Menunggu Atasan</option>
            <option value="PENDING_HRD">Menunggu HRD</option>
            <option value="APPROVED">Disetujui</option>
            <option value="RETURN_CONFIRMED">Sudah Kembali</option>
            <option value="REJECTED">Ditolak</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() =>
              exportExcelCsv(
                requestGroup === 'CUTI' ? 'pengajuan-cuti-hrd' : 'pengajuan-sakit-izin-hrd',
                leaveExcelDataColumns,
                list
              )
            }
            exportDisabled={list.length === 0}
          />

          <button
            onClick={() => {
              setSelectedRecord(null);
              setEditMode(false);
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {requestGroup === 'CUTI' ? 'Ajukan Cuti' : 'Ajukan Sakit / Izin'}
            </span>
          </button>
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title={
            requestGroup === 'CUTI'
              ? 'Daftar Pengajuan Cuti (RM-HRD-303) — Tampilan Excel'
              : 'Daftar Pengajuan Sakit / Izin — Tampilan Excel'
          }
          subtitle="Klik baris untuk melihat formulir • Geser horizontal untuk melihat seluruh kolom"
          columns={leaveExcelColumns}
          rows={list}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText={`Belum ada pengajuan ${requestGroup === 'CUTI' ? 'cuti' : 'sakit / izin'}.`}
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
              <th className="py-3 px-4 border-r border-slate-200">Kategori & Periode</th>
              <th className="py-3 px-4 border-r border-slate-200">Keperluan / Lampiran</th>
              <th className="py-3 px-4 text-center border-r border-slate-200">Status & Tahap</th>
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
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Belum ada pengajuan {requestGroup === 'CUTI' ? 'cuti' : 'sakit / izin'}.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 border-r border-slate-200">
                    <div className="font-bold text-slate-900">
                      {row.employeeName || 'Karyawan'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {row.employeeNik || '-'} • {row.department || '-'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 border-r border-slate-200">
                    <div className="font-semibold text-slate-800">
                      {(row.leaveCategory || '').replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {row.startDate} s/d {row.endDate} ({row.totalDays} hari)
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs border-r border-slate-200">
                    <p className="text-slate-700 line-clamp-2">{row.reason}</p>
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
                  <td className="py-3.5 px-4 text-center space-y-1 border-r border-slate-200">
                    <div>{getStatusBadge(row.status)}</div>
                    <div className="text-xs text-slate-500">
                      Atasan: <b>{row.supervisorStatus || 'PENDING'}</b> • HRD:{' '}
                      <b>{row.hrdStatus || 'PENDING'}</b>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">{renderRowActions(row)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      <LeaveRequestFormModal
        open={modalOpen}
        requestGroup={requestGroup}
        record={selectedRecord}
        editMode={editMode}
        onClose={() => setModalOpen(false)}
        onSuccess={refresh}
      />

      <ConfirmActionModal
        open={!!confirmState}
        variant={
          confirmState?.type === 'delete' ||
          confirmState?.type === 'sup_reject' ||
          confirmState?.type === 'hrd_reject'
            ? 'danger'
            : 'success'
        }
        title={
          confirmState?.type === 'delete'
            ? 'Batalkan Pengajuan?'
            : confirmState?.type?.includes('reject')
            ? 'Tolak Pengajuan?'
            : 'Konfirmasi Persetujuan'
        }
        message={
          confirmState?.type === 'delete'
            ? `Batalkan / Nonaktifkan pengajuan milik ${confirmState.row.employeeName || 'karyawan'} ini?`
            : `Lanjutkan proses aksi pada pengajuan milik ${confirmState?.row.employeeName || 'karyawan'}?`
        }
        loading={
          supMutation.isPending ||
          hrdMutation.isPending ||
          returnMutation.isPending ||
          deleteMutation.isPending
        }
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          const id = confirmState.row.id;
          if (confirmState.type === 'delete') deleteMutation.mutate(id);
          else if (confirmState.type === 'sup_approve')
            supMutation.mutate({ id, action: 'APPROVE' });
          else if (confirmState.type === 'sup_reject')
            supMutation.mutate({ id, action: 'REJECT' });
          else if (confirmState.type === 'hrd_approve')
            hrdMutation.mutate({ id, action: 'APPROVE' });
          else if (confirmState.type === 'hrd_reject')
            hrdMutation.mutate({ id, action: 'REJECT' });
          else if (confirmState.type === 'return') returnMutation.mutate(id);
        }}
      />
    </div>
  );
};
