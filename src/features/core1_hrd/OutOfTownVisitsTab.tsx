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

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
              <th className="py-3 px-4">Karyawan</th>
              <th className="py-3 px-4">Kota Tujuan & Periode</th>
              <th className="py-3 px-4">Estimasi Biaya</th>
              <th className="py-3 px-4 text-center">Approval (HRD & FA)</th>
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
            ) : visits.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Belum ada pengajuan visit luar kota.
                </td>
              </tr>
            ) : (
              visits.map((row) => {
                const sumCost =
                  row.totalEstimatedCost ??
                  (row.transportCost || 0) +
                    (row.lodgingCost || 0) +
                    (row.mealCost || 0) +
                    (row.otherCost || 0);
                const hrdPending = !row.hrdStatus || row.hrdStatus === 'PENDING';
                const finPending = !row.financeStatus || row.financeStatus === 'PENDING';
                const isPendingEditable = hrdPending && finPending;

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
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-800">
                        {row.destinationCity}
                        {row.customerName ? ` — ${row.customerName}` : ''}
                      </div>
                      <div className="text-xs text-slate-500">
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
                    <td className="py-3 px-4 text-xs">
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
                    <td className="py-3 px-4 text-center text-[11px] space-y-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
                        {row.status}
                      </span>
                      <div className="text-slate-500">
                        HRD: <b>{row.hrdStatus || 'PENDING'}</b> • Finance:{' '}
                        <b>{row.financeStatus || 'PENDING'}</b>
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
                        >
                          <Eye className="w-3.5 h-3.5" /> Form
                        </button>

                        {canMutateVisit && isPendingEditable && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRecord(row);
                                setEditMode(true);
                                setModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer"
                              title="Edit Visit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmState({ type: 'delete', row })}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                              title="Batalkan / Hapus Visit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                              <XCircle className="w-3.5 h-3.5" /> Tolak HRD
                            </button>
                          </>
                        )}

                        {canApproveFinance && finPending && (
                          <>
                            <button
                              onClick={() => setConfirmState({ type: 'fin_approve', row })}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Acc FA
                            </button>
                            <button
                              onClick={() => setConfirmState({ type: 'fin_reject', row })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Tolak FA
                            </button>
                          </>
                        )}

                        <button
                          onClick={() =>
                            printHrdReport(`/hrd/out-of-town-visits/${row.id}/print`).catch((e) =>
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
