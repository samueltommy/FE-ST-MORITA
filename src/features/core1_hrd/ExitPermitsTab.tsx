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
} from 'lucide-react';
import { toast } from 'sonner';
import {
  approveExitPermitHrdApi,
  approveExitPermitSupervisorApi,
  ExitPermitRecord,
  getExitPermitsApi,
  printHrdReport,
} from '../../services/hrdService';
import { useRBAC } from '../../hooks/useRBAC';
import { ExitPermitFormModal } from './ExitPermitFormModal';

export const ExitPermitsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision, hasPermission } = useRBAC();

  const canApproveSupervisor =
    isSuperAdmin || isExecutive || isAdminBidang || hasPermission('hrd:leave:approve');
  const canApproveHrd =
    isSuperAdmin || isExecutive || userDivision === 'HRD' || hasPermission('hrd:leave:approve');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<ExitPermitRecord | null>(null);
  const [confirmReturnMode, setConfirmReturnMode] = useState(false);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['hrdExitPermits', typeFilter, statusFilter, search],
    queryFn: () =>
      getExitPermitsApi({
        permitType: typeFilter,
        status: statusFilter,
        search: search || undefined,
      }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hrdExitPermits'] });

  const supMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveExitPermitSupervisorApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan Atasan diproses');
      refresh();
    },
  });

  const hrdMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveExitPermitHrdApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan HRD diproses');
      refresh();
    },
  });

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
              placeholder="Cari nama karyawan / keperluan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Jenis Ijin</option>
            <option value="TERLAMBAT">Terlambat</option>
            <option value="SAAT_JAM_KERJA">Saat Jam Kerja</option>
          </select>
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
            setSelected(null);
            setConfirmReturnMode(false);
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Surat Ijin (RM-HRD-013)</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
              <th className="py-3 px-4">Karyawan</th>
              <th className="py-3 px-4">Tanggal & Jenis</th>
              <th className="py-3 px-4">Jam Rencana / Aktual</th>
              <th className="py-3 px-4">Keperluan</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Belum ada pengajuan surat ijin keluar kantor.
                </td>
              </tr>
            ) : (
              list.map((row) => {
                const supPending = !row.supervisorStatus || row.supervisorStatus === 'PENDING';
                const hrdPending =
                  row.supervisorStatus === 'APPROVED' &&
                  (!row.hrdStatus || row.hrdStatus === 'PENDING');
                const canReturn = row.status === 'APPROVED' && !row.returnConfirmed;

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
                      <div className="font-semibold text-slate-800">{row.permitDate}</div>
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold mt-0.5">
                        {row.permitType === 'TERLAMBAT' ? 'Terlambat' : 'Saat Jam Kerja'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div>
                        Rencana: <b>{row.plannedOutTime || '-'}</b> s/d{' '}
                        <b>{row.plannedReturnTime || '-'}</b>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Aktual: {row.actualOutTime || '-'} s/d {row.actualReturnTime || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-slate-700 line-clamp-2">{row.reason}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelected(row);
                            setConfirmReturnMode(false);
                            setModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Form
                        </button>

                        {canApproveSupervisor && supPending && (
                          <>
                            <button
                              onClick={() => supMutation.mutate({ id: row.id, action: 'APPROVE' })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Acc Atasan
                            </button>
                            <button
                              onClick={() => supMutation.mutate({ id: row.id, action: 'REJECT' })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Tolak
                            </button>
                          </>
                        )}

                        {canApproveHrd && hrdPending && (
                          <>
                            <button
                              onClick={() => hrdMutation.mutate({ id: row.id, action: 'APPROVE' })}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Acc HRD
                            </button>
                            <button
                              onClick={() => hrdMutation.mutate({ id: row.id, action: 'REJECT' })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Tolak
                            </button>
                          </>
                        )}

                        {canApproveHrd && canReturn && (
                          <button
                            onClick={() => {
                              setSelected(row);
                              setConfirmReturnMode(true);
                              setModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Kembali Kerja
                          </button>
                        )}

                        <button
                          onClick={() =>
                            printHrdReport(`/hrd/exit-permits/${row.id}/print`).catch((e) =>
                              toast.error(e.message)
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
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

      <ExitPermitFormModal
        open={modalOpen}
        record={selected}
        confirmReturnMode={confirmReturnMode}
        onClose={() => setModalOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
};

