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

interface Props {
  requestGroup: LeaveRequestGroup;
}

export const LeaveAndSickTab: React.FC<Props> = ({ requestGroup }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canApproveSupervisor = isSuperAdmin || isExecutive || isAdminBidang;
  const canApproveHrd = isSuperAdmin || isExecutive || userDivision === 'HRD';

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

  return (
    <div className="space-y-4">
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
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

        <button
          onClick={() => {
            setSelectedRecord(null);
            setEditMode(false);
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {requestGroup === 'CUTI' ? 'Ajukan Cuti (RM-HRD-303)' : 'Ajukan Sakit / Izin'}
          </span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
              <th className="py-3 px-4">Karyawan</th>
              <th className="py-3 px-4">Kategori & Periode</th>
              <th className="py-3 px-4">Keperluan / Lampiran</th>
              <th className="py-3 px-4 text-center">Status & Tahap</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
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
              list.map((row) => {
                const supPending = !row.supervisorStatus || row.supervisorStatus === 'PENDING';
                const hrdPending =
                  row.supervisorStatus === 'APPROVED' &&
                  (!row.hrdStatus || row.hrdStatus === 'PENDING');
                const canReturn = row.status === 'APPROVED' && !row.returnConfirmed;
                const isPendingEditable = (row.status || '').startsWith('PENDING');

                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {row.employeeName || 'Karyawan'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.employeeNik || '-'} • {row.department || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {(row.leaveCategory || '').replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.startDate} s/d {row.endDate} ({row.totalDays} hari)
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
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
                    <td className="py-3 px-4 text-center space-y-1">
                      <div>{getStatusBadge(row.status)}</div>
                      <div className="text-[11px] text-slate-500">
                        Atasan: <b>{row.supervisorStatus || 'PENDING'}</b> • HRD:{' '}
                        <b>{row.hrdStatus || 'PENDING'}</b>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedRecord(row);
                            setEditMode(false);
                            setModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Lihat Formulir"
                        >
                          <Eye className="w-3.5 h-3.5" /> Form
                        </button>

                        {isPendingEditable && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRecord(row);
                                setEditMode(true);
                                setModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer"
                              title="Edit Pengajuan"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmState({ type: 'delete', row })}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                              title="Batalkan / Hapus Pengajuan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {canApproveSupervisor && supPending && (
                          <>
                            <button
                              onClick={() => setConfirmState({ type: 'sup_approve', row })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Acc Atasan
                            </button>
                            <button
                              onClick={() => setConfirmState({ type: 'sup_reject', row })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Tolak
                            </button>
                          </>
                        )}

                        {canApproveHrd && hrdPending && (
                          <>
                            <button
                              onClick={() => setConfirmState({ type: 'hrd_approve', row })}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Acc HRD
                            </button>
                            <button
                              onClick={() => setConfirmState({ type: 'hrd_reject', row })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Tolak
                            </button>
                          </>
                        )}

                        {canApproveHrd && canReturn && (
                          <button
                            onClick={() => setConfirmState({ type: 'return', row })}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Kembali Kerja
                          </button>
                        )}

                        <button
                          onClick={() =>
                            printHrdReport(`/hrd/leave-requests/${row.id}/print`).catch((e) =>
                              toast.error(e.message)
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Cetak Laporan"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak
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
