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
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  approveExitPermitHrdApi,
  approveExitPermitSupervisorApi,
  deleteExitPermitApi,
  ExitPermitRecord,
  getExitPermitsApi,
  printHrdReport,
} from '../../services/hrdService';
import { useRBAC } from '../../hooks/useRBAC';
import { ExitPermitFormModal } from './ExitPermitFormModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

export const ExitPermitsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canApproveSupervisor = isSuperAdmin || isExecutive || isAdminBidang;
  const canApproveHrd = isSuperAdmin || isExecutive || userDivision === 'HRD';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<ExitPermitRecord | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmReturnMode, setConfirmReturnMode] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    type: 'sup_approve' | 'sup_reject' | 'hrd_approve' | 'hrd_reject' | 'delete';
    row: ExitPermitRecord;
  } | null>(null);

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
      setConfirmState(null);
    },
  });

  const hrdMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveExitPermitHrdApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan HRD diproses');
      refresh();
      setConfirmState(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExitPermitApi(id),
    onSuccess: () => {
      toast.success('Surat ijin berhasil dibatalkan (Soft Delete)');
      refresh();
      setConfirmState(null);
    },
  });

  const renderRowActions = (row: ExitPermitRecord) => {
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
            setSelected(row);
            setEditMode(false);
            setConfirmReturnMode(false);
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
              setSelected(row);
              setEditMode(true);
              setConfirmReturnMode(false);
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
            printHrdReport(`/hrd/exit-permits/${row.id}/print`).catch((e) =>
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
            onClick={() => {
              setSelected(row);
              setEditMode(false);
              setConfirmReturnMode(true);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Kembali Kerja
          </button>
        )}
      </div>
    );
  };

  const permitExcelDataColumns: ExcelColumn<ExitPermitRecord>[] = [
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
      key: 'permitDate',
      header: 'Tanggal Ijin',
      mono: true,
      getValue: (r) => r.permitDate || '-',
    },
    {
      key: 'permitType',
      header: 'Jenis Ijin',
      getValue: (r) => (r.permitType === 'TERLAMBAT' ? 'Terlambat' : 'Saat Jam Kerja'),
    },
    {
      key: 'plannedOutTime',
      header: 'Jam Keluar (Rencana)',
      mono: true,
      align: 'center',
      getValue: (r) => r.plannedOutTime || '-',
    },
    {
      key: 'plannedReturnTime',
      header: 'Jam Kembali (Rencana)',
      mono: true,
      align: 'center',
      getValue: (r) => r.plannedReturnTime || '-',
    },
    {
      key: 'actualOutTime',
      header: 'Jam Keluar (Aktual)',
      mono: true,
      align: 'center',
      getValue: (r) => r.actualOutTime || '-',
    },
    {
      key: 'actualReturnTime',
      header: 'Jam Kembali (Aktual)',
      mono: true,
      align: 'center',
      getValue: (r) => r.actualReturnTime || '-',
    },
    {
      key: 'reason',
      header: 'Keperluan',
      minWidth: 'min-w-[200px]',
      getValue: (r) => r.reason || '-',
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
      key: 'status',
      header: 'Status',
      align: 'center',
      getValue: (r) => r.status || '-',
      render: (r) => (
        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
          {r.status}
        </span>
      ),
    },
  ];

  const permitExcelColumns: ExcelColumn<ExitPermitRecord>[] = [
    ...permitExcelDataColumns,
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

        <div className="flex flex-wrap items-center gap-2.5">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() =>
              exportExcelCsv('surat-ijin-keluar-kantor', permitExcelDataColumns, list)
            }
            exportDisabled={list.length === 0}
          />

          <button
            onClick={() => {
              setSelected(null);
              setEditMode(false);
              setConfirmReturnMode(false);
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Izin Keluar Kantor</span>
          </button>
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Daftar Surat Ijin Keluar Kantor (RM-HRD-013) — Tampilan Excel"
          subtitle="Klik baris untuk melihat formulir • Geser horizontal untuk melihat seluruh kolom"
          columns={permitExcelColumns}
          rows={list}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada pengajuan surat ijin keluar kantor."
          onRowClick={(row) => {
            setSelected(row);
            setEditMode(false);
            setConfirmReturnMode(false);
            setModalOpen(true);
          }}
        />
      ) : (
      <div className="bg-white rounded-2xl border border-slate-300 overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 uppercase">
              <th className="py-3 px-4 border-r border-slate-200">Karyawan</th>
              <th className="py-3 px-4 border-r border-slate-200">Tanggal & Jenis</th>
              <th className="py-3 px-4 border-r border-slate-200">Jam Rencana / Aktual</th>
              <th className="py-3 px-4 border-r border-slate-200">Keperluan</th>
              <th className="py-3 px-4 text-center border-r border-slate-200">Status</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
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
                    <div className="font-semibold text-slate-800">{row.permitDate}</div>
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold mt-0.5">
                      {row.permitType === 'TERLAMBAT' ? 'Terlambat' : 'Saat Jam Kerja'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs border-r border-slate-200">
                    <div>
                      Rencana: <b>{row.plannedOutTime || '-'}</b> s/d{' '}
                      <b>{row.plannedReturnTime || '-'}</b>
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Aktual: {row.actualOutTime || '-'} s/d {row.actualReturnTime || '-'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs border-r border-slate-200">
                    <p className="text-slate-700 line-clamp-2">{row.reason}</p>
                  </td>
                  <td className="py-3.5 px-4 text-center border-r border-slate-200">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">{renderRowActions(row)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      <ExitPermitFormModal
        open={modalOpen}
        record={selected}
        editMode={editMode}
        confirmReturnMode={confirmReturnMode}
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
            ? 'Batalkan Surat Ijin?'
            : confirmState?.type?.includes('reject')
            ? 'Tolak Surat Ijin?'
            : 'Konfirmasi Persetujuan'
        }
        message={
          confirmState?.type === 'delete'
            ? `Batalkan / Nonaktifkan surat ijin milik ${confirmState.row.employeeName || 'karyawan'} ini?`
            : `Lanjutkan proses aksi pada surat ijin milik ${confirmState?.row.employeeName || 'karyawan'}?`
        }
        loading={supMutation.isPending || hrdMutation.isPending || deleteMutation.isPending}
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
        }}
      />
    </div>
  );
};
