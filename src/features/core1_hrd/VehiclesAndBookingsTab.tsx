import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Printer,
  Eye,
  RotateCcw,
  Loader2,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  approveVehicleFinanceApi,
  approveVehicleHrdApi,
  approveVehicleKabagApi,
  createVehicleApi,
  deleteHrdVehicleBookingApi,
  getHrdVehicleBookingsApi,
  getVehiclesApi,
  printHrdReport,
  VehicleBookingRecord,
} from '../../services/hrdService';
import { useRBAC } from '../../hooks/useRBAC';
import { VehicleBookingFormModal } from './VehicleBookingFormModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

export const VehiclesAndBookingsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canApproveKabag = isSuperAdmin || isExecutive || isAdminBidang;
  const canApproveHrd = isSuperAdmin || isExecutive || userDivision === 'HRD';
  const canApproveFinance = isSuperAdmin || isExecutive || userDivision === 'FINANCE';
  const canManageVehicles = isSuperAdmin || isExecutive || isAdminBidang || userDivision === 'HRD';

  const [subTab, setSubTab] = useState<'bookings' | 'vehicles'>('bookings');
  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<VehicleBookingRecord | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [returnMode, setReturnMode] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    type:
      | 'kabag_approve'
      | 'kabag_reject'
      | 'hrd_approve'
      | 'hrd_reject'
      | 'fin_approve'
      | 'fin_reject'
      | 'delete';
    row: VehicleBookingRecord;
  } | null>(null);

  const [vehModalOpen, setVehModalOpen] = useState(false);
  const [vehForm, setVehForm] = useState({
    name: '',
    plateNumber: '',
    vehicleType: 'MPV / Operasional',
    currentKm: 0,
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['hrdVehicles'],
    queryFn: () => getVehiclesApi(),
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['hrdVehicleBookings', statusFilter, search],
    queryFn: () =>
      getHrdVehicleBookingsApi({
        status: statusFilter,
        search: search || undefined,
      }),
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['hrdVehicleBookings'] });
    queryClient.invalidateQueries({ queryKey: ['hrdVehicles'] });
  };

  const kabagMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveVehicleKabagApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan Kabag diproses');
      refreshAll();
      setConfirmState(null);
    },
  });

  const hrdMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveVehicleHrdApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan HRD/GA diproses');
      refreshAll();
      setConfirmState(null);
    },
  });

  const financeMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveVehicleFinanceApi(id, { action }),
    onSuccess: () => {
      toast.success('Persetujuan FA/ACC diproses');
      refreshAll();
      setConfirmState(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHrdVehicleBookingApi(id),
    onSuccess: () => {
      toast.success('Peminjaman kendaraan dibatalkan (Soft Delete)');
      refreshAll();
      setConfirmState(null);
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: createVehicleApi,
    onSuccess: () => {
      toast.success('Kendaraan kantor berhasil ditambahkan');
      refreshAll();
      setVehModalOpen(false);
      setVehForm({ name: '', plateNumber: '', vehicleType: 'MPV / Operasional', currentKm: 0 });
    },
  });

  const renderBookingActions = (row: VehicleBookingRecord) => {
    const kabagPending = !row.kabagStatus || row.kabagStatus === 'PENDING';
    const hrdPending =
      row.kabagStatus === 'APPROVED' && (!row.hrdStatus || row.hrdStatus === 'PENDING');
    const finPending =
      row.hrdStatus === 'APPROVED' && (!row.financeStatus || row.financeStatus === 'PENDING');
    const canReturn = row.status === 'APPROVED' && !row.returnAt;
    const isPendingEditable = (row.status || '').startsWith('PENDING');
    const hasWorkflow =
      (canApproveKabag && kabagPending) ||
      (canApproveHrd && hrdPending) ||
      (canApproveFinance && finPending) ||
      canReturn;

    return (
      <div
        className="inline-flex items-center justify-end gap-1 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setSelectedBooking(row);
            setEditMode(false);
            setReturnMode(false);
            setBookingModalOpen(true);
          }}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
          title="Lihat Formulir"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {isPendingEditable && (
          <button
            onClick={() => {
              setSelectedBooking(row);
              setEditMode(true);
              setReturnMode(false);
              setBookingModalOpen(true);
            }}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() =>
            printHrdReport(`/hrd/vehicle-bookings/${row.id}/print`).catch((e) =>
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

        {canApproveKabag && kabagPending && (
          <>
            <button
              onClick={() => setConfirmState({ type: 'kabag_approve', row })}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Acc Kabag
            </button>
            <button
              onClick={() => setConfirmState({ type: 'kabag_reject', row })}
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
              <XCircle className="w-3.5 h-3.5" /> Tolak
            </button>
          </>
        )}

        {canReturn && (
          <button
            onClick={() => {
              setSelectedBooking(row);
              setEditMode(false);
              setReturnMode(true);
              setBookingModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Kembalikan
          </button>
        )}
      </div>
    );
  };

  const bookingExcelDataColumns: ExcelColumn<VehicleBookingRecord>[] = [
    {
      key: 'plateNumber',
      header: 'No. Polisi',
      mono: true,
      getValue: (r) => r.plateNumber || '-',
    },
    {
      key: 'vehicleName',
      header: 'Kendaraan',
      minWidth: 'min-w-[150px]',
      getValue: (r) => r.vehicleName || '-',
    },
    {
      key: 'borrowerName',
      header: 'Pemohon',
      minWidth: 'min-w-[150px]',
      getValue: (r) => r.borrowerName || 'Karyawan',
    },
    {
      key: 'purposeType',
      header: 'Kategori',
      getValue: (r) => (r.purposeType === 'DINAS_KANTOR' ? 'Dinas Kantor' : 'Pribadi'),
    },
    {
      key: 'destination',
      header: 'Tujuan / Keperluan',
      minWidth: 'min-w-[180px]',
      getValue: (r) => r.destination || '-',
    },
    {
      key: 'departureAt',
      header: 'Waktu Pergi',
      mono: true,
      getValue: (r) => (r.departureAt ? r.departureAt.slice(0, 16).replace('T', ' ') : '-'),
    },
    {
      key: 'returnAt',
      header: 'Waktu Kembali',
      mono: true,
      getValue: (r) => (r.returnAt ? r.returnAt.slice(0, 16).replace('T', ' ') : '-'),
    },
    {
      key: 'initialKm',
      header: 'KM Awal',
      align: 'right',
      mono: true,
      getValue: (r) => r.initialKm ?? '',
      render: (r) =>
        r.initialKm !== undefined && r.initialKm !== null
          ? r.initialKm.toLocaleString('id-ID')
          : '-',
    },
    {
      key: 'initialFuel',
      header: 'Bensin Awal',
      align: 'center',
      getValue: (r) => r.initialFuel || '-',
    },
    {
      key: 'finalKm',
      header: 'KM Akhir',
      align: 'right',
      mono: true,
      getValue: (r) => r.finalKm ?? '',
      render: (r) =>
        r.finalKm !== undefined && r.finalKm !== null
          ? r.finalKm.toLocaleString('id-ID')
          : '-',
    },
    {
      key: 'finalFuel',
      header: 'Bensin Akhir',
      align: 'center',
      getValue: (r) => r.finalFuel || '-',
    },
    {
      key: 'kabagStatus',
      header: 'Acc Kabag',
      align: 'center',
      getValue: (r) => r.kabagStatus || 'PENDING',
    },
    {
      key: 'hrdStatus',
      header: 'Acc HRD',
      align: 'center',
      getValue: (r) => r.hrdStatus || 'PENDING',
    },
    {
      key: 'financeStatus',
      header: 'Acc FA',
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

  const bookingExcelColumns: ExcelColumn<VehicleBookingRecord>[] = [
    ...bookingExcelDataColumns,
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      getValue: () => '',
      render: (r) => renderBookingActions(r),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSubTab('bookings')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${
              subTab === 'bookings'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Peminjaman Kendaraan ({bookings.length})</span>
          </button>
          <button
            onClick={() => setSubTab('vehicles')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer ${
              subTab === 'vehicles'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Master Kendaraan ({vehicles.length})</span>
          </button>
        </div>

        {subTab === 'bookings' ? (
          <button
            onClick={() => {
              setSelectedBooking(null);
              setEditMode(false);
              setReturnMode(false);
              setBookingModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Peminjaman Mobil</span>
          </button>
        ) : (
          canManageVehicles && (
            <button
              onClick={() => setVehModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kendaraan</span>
            </button>
          )
        )}
      </div>

      {subTab === 'bookings' && (
        <>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari pemohon, nopol, tujuan..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING_KABAG">Menunggu Kabag</option>
                <option value="PENDING_HRD">Menunggu HRD</option>
                <option value="PENDING_FINANCE">Menunggu Finance</option>
                <option value="APPROVED">Disetujui</option>
                <option value="RETURNED">Sudah Dikembalikan</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </div>

            <ExcelViewToggle
              value={tableStyle}
              onChange={setTableStyle}
              onExport={() =>
                exportExcelCsv('peminjaman-kendaraan-hrd', bookingExcelDataColumns, bookings)
              }
              exportDisabled={bookings.length === 0}
            />
          </div>

          {tableStyle === 'excel' ? (
            <ExcelSpreadsheetTable
              title="Daftar Peminjaman Kendaraan Kantor — Tampilan Excel"
              subtitle="Klik baris untuk melihat formulir • Geser horizontal untuk melihat seluruh kolom"
              columns={bookingExcelColumns}
              rows={bookings}
              rowKey={(r) => r.id}
              isLoading={loadingBookings}
              emptyText="Belum ada pengajuan peminjaman kendaraan."
              onRowClick={(row) => {
                setSelectedBooking(row);
                setEditMode(false);
                setReturnMode(false);
                setBookingModalOpen(true);
              }}
            />
          ) : (
          <div className="bg-white rounded-2xl border border-slate-300 overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 uppercase">
                  <th className="py-3 px-4 border-r border-slate-200">Pemohon & Kendaraan</th>
                  <th className="py-3 px-4 border-r border-slate-200">Tujuan & Keperluan</th>
                  <th className="py-3 px-4 border-r border-slate-200">KM & Bensin</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200">Approval 3 Tahap</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {loadingBookings ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat data...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Belum ada pengajuan peminjaman kendaraan.
                    </td>
                  </tr>
                ) : (
                  bookings.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 border-r border-slate-200">
                        <div className="font-bold text-slate-900">
                          {row.borrowerName || 'Karyawan'}
                        </div>
                        <div className="text-xs text-slate-600 font-semibold mt-0.5">
                          {row.vehicleName} • {row.plateNumber}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Pergi: {row.departureAt?.slice(0, 16).replace('T', ' ')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs border-r border-slate-200">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
                          {row.purposeType === 'DINAS_KANTOR' ? 'Dinas Kantor' : 'Pribadi'}
                        </span>
                        <p className="text-slate-700 mt-1 line-clamp-2">{row.destination}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs border-r border-slate-200">
                        <div>
                          Awal: <b>{row.initialKm?.toLocaleString('id-ID')}</b> KM ({row.initialFuel})
                        </div>
                        {row.finalKm !== undefined && row.finalKm !== null && (
                          <div className="text-emerald-700 mt-0.5">
                            Akhir: <b>{row.finalKm.toLocaleString('id-ID')}</b> KM ({row.finalFuel})
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs space-y-1 border-r border-slate-200">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
                          {row.status}
                        </span>
                        <div className="text-slate-500">
                          Kabag: <b>{row.kabagStatus || 'PENDING'}</b> • HRD:{' '}
                          <b>{row.hrdStatus || 'PENDING'}</b> • FA:{' '}
                          <b>{row.financeStatus || 'PENDING'}</b>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">{renderBookingActions(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}

      {subTab === 'vehicles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingVehicles ? (
            <div className="col-span-full py-8 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat kendaraan...
            </div>
          ) : vehicles.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Belum ada kendaraan terdaftar.
            </div>
          ) : (
            vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{v.name}</h4>
                    <div className="text-xs font-mono font-bold text-blue-700 mt-0.5">
                      {v.plateNumber}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    {v.status || 'AVAILABLE'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                  <span>{v.vehicleType || 'Operasional'}</span>
                  <span className="font-bold text-slate-800">
                    {(v.currentKm || 0).toLocaleString('id-ID')} KM
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <VehicleBookingFormModal
        open={bookingModalOpen}
        vehicles={vehicles}
        record={selectedBooking}
        editMode={editMode}
        returnMode={returnMode}
        onClose={() => setBookingModalOpen(false)}
        onSuccess={refreshAll}
      />

      {vehModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Kendaraan Kantor</h3>
              <button onClick={() => setVehModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kendaraan *</label>
                <input
                  type="text"
                  value={vehForm.name}
                  onChange={(e) => setVehForm({ ...vehForm, name: e.target.value })}
                  placeholder="cth: Toyota Avanza Veloz"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. Polisi *</label>
                <input
                  type="text"
                  value={vehForm.plateNumber}
                  onChange={(e) => setVehForm({ ...vehForm, plateNumber: e.target.value })}
                  placeholder="cth: B 1234 XYZ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipe Kendaraan</label>
                <input
                  type="text"
                  value={vehForm.vehicleType}
                  onChange={(e) => setVehForm({ ...vehForm, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">KM Saat Ini</label>
                <input
                  type="number"
                  min={0}
                  value={vehForm.currentKm}
                  onChange={(e) =>
                    setVehForm({ ...vehForm, currentKm: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => setVehModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                disabled={createVehicleMutation.isPending || !vehForm.name || !vehForm.plateNumber}
                onClick={() => createVehicleMutation.mutate(vehForm)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {createVehicleMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={!!confirmState}
        variant={
          confirmState?.type === 'delete' || confirmState?.type?.includes('reject')
            ? 'danger'
            : 'success'
        }
        title={
          confirmState?.type === 'delete'
            ? 'Batalkan Peminjaman Kendaraan?'
            : confirmState?.type?.includes('reject')
            ? 'Tolak Peminjaman Kendaraan?'
            : 'Konfirmasi Persetujuan'
        }
        message={
          confirmState?.type === 'delete'
            ? `Batalkan / Nonaktifkan peminjaman kendaraan oleh ${confirmState.row.borrowerName || 'karyawan'}?`
            : `Lanjutkan proses persetujuan untuk peminjaman kendaraan oleh ${confirmState?.row.borrowerName || 'karyawan'}?`
        }
        loading={
          kabagMutation.isPending ||
          hrdMutation.isPending ||
          financeMutation.isPending ||
          deleteMutation.isPending
        }
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          const id = confirmState.row.id;
          if (confirmState.type === 'delete') deleteMutation.mutate(id);
          else if (confirmState.type === 'kabag_approve')
            kabagMutation.mutate({ id, action: 'APPROVE' });
          else if (confirmState.type === 'kabag_reject')
            kabagMutation.mutate({ id, action: 'REJECT' });
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
