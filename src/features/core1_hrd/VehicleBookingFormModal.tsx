import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  createHrdVehicleBookingApi,
  FuelLevel,
  getMyEmployeeProfileApi,
  printHrdReport,
  returnVehicleBookingApi,
  updateHrdVehicleBookingApi,
  VehicleBookingRecord,
  VehicleMasterRecord,
  VehiclePurposeType,
} from '../../services/hrdService';
import { useAuthStore } from '../../store/useAuthStore';
import {
  PaperFormFooter,
  PaperFormHeader,
  PaperFormModal,
} from './PaperFormSheet';

const FUEL_STEPS: FuelLevel[] = ['E', '1/4', '1/2', '3/4', 'F'];

const FuelGauge: React.FC<{
  value: FuelLevel | string;
  onChange?: (val: FuelLevel) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <div className="inline-flex items-center gap-1 select-none">
    {FUEL_STEPS.map((step) => {
      const active = value === step;
      return (
        <button
          key={step}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(step)}
          className={`px-1.5 py-0.5 text-[11px] font-bold border border-black transition-colors ${
            active ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'
          } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
        >
          {step}
        </button>
      );
    })}
  </div>
);

interface Props {
  open: boolean;
  vehicles: VehicleMasterRecord[];
  record?: VehicleBookingRecord | null;
  editMode?: boolean;
  returnMode?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VehicleBookingFormModal: React.FC<Props> = ({
  open,
  vehicles,
  record,
  editMode = false,
  returnMode = false,
  onClose,
  onSuccess,
}) => {
  const user = useAuthStore((s) => s.user);
  const isReadOnly = !!record && !returnMode && !editMode;
  const isLockedFields = !!record && !editMode;

  const { data: myProfile } = useQuery({
    queryKey: ['myEmployeeProfile'],
    queryFn: getMyEmployeeProfileApi,
    enabled: open && !record,
  });

  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [vehicleId, setVehicleId] = useState('');
  const [initialKm, setInitialKm] = useState<number>(0);
  const [initialFuel, setInitialFuel] = useState<FuelLevel>('1/2');
  const [departureAt, setDepartureAt] = useState(nowLocal);
  const [purposeType, setPurposeType] = useState<VehiclePurposeType>('DINAS_KANTOR');
  const [destination, setDestination] = useState('');
  const [finalKm, setFinalKm] = useState<number>(0);
  const [returnAt, setReturnAt] = useState(nowLocal);
  const [finalFuel, setFinalFuel] = useState<FuelLevel>('1/2');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setVehicleId(record.vehicleId || '');
      setInitialKm(record.initialKm || 0);
      setInitialFuel((record.initialFuel as FuelLevel) || '1/2');
      setDepartureAt(record.departureAt ? record.departureAt.slice(0, 16) : nowLocal);
      setPurposeType((record.purposeType as VehiclePurposeType) || 'DINAS_KANTOR');
      setDestination(record.destination || '');
      setFinalKm(record.finalKm ?? record.initialKm ?? 0);
      setReturnAt(record.returnAt ? record.returnAt.slice(0, 16) : nowLocal);
      setFinalFuel((record.finalFuel as FuelLevel) || (record.initialFuel as FuelLevel) || '1/2');
    } else {
      const firstVeh = vehicles[0];
      setVehicleId(firstVeh?.id || '');
      setInitialKm(firstVeh?.currentKm || 0);
      setInitialFuel('1/2');
      setDepartureAt(nowLocal);
      setPurposeType('DINAS_KANTOR');
      setDestination('');
      setFinalKm(0);
      setReturnAt(nowLocal);
      setFinalFuel('1/2');
    }
  }, [record, vehicles, open, nowLocal]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const displayName =
    record?.borrowerName || myProfile?.fullName || user?.fullName || user?.username || '-';
  const displayDept =
    record?.borrowerPosition ||
    record?.borrowerDepartment ||
    myProfile?.department ||
    user?.department ||
    '-';
  const displayPlate = record?.plateNumber || selectedVehicle?.plateNumber || '-';
  const displayVehName = record?.vehicleName || selectedVehicle?.name || '-';

  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((item) => item.id === id);
    if (v && v.currentKm !== undefined) {
      setInitialKm(v.currentKm);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnMode && record) {
      if (finalKm < record.initialKm) {
        toast.error('KM Akhir tidak boleh lebih kecil dari KM Awal');
        return;
      }
      setSubmitting(true);
      try {
        await returnVehicleBookingApi(record.id, {
          finalKm,
          returnAt,
          finalFuel,
        });
        toast.success('Pengembalian kendaraan berhasil dicatat');
        onSuccess();
        onClose();
      } catch {
        // apiClient toast
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!vehicleId) {
      toast.error('Pilih kendaraan terlebih dahulu');
      return;
    }
    if (!destination.trim()) {
      toast.error('Tujuan penggunaan kendaraan wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleId,
        purposeType,
        destination: destination.trim(),
        departureAt,
        initialKm,
        initialFuel,
      };
      if (record && editMode) {
        await updateHrdVehicleBookingApi(record.id, payload);
        toast.success('Peminjaman kendaraan berhasil diperbarui');
      } else {
        await createHrdVehicleBookingApi(payload);
        toast.success('Pengajuan penggunaan kendaraan kantor berhasil dikirim');
      }
      onSuccess();
      onClose();
    } catch {
      // apiClient toast
    } finally {
      setSubmitting(false);
    }
  };

  const renderSig = (status?: string, byName?: string, at?: string) => {
    if (!status || status === 'PENDING') {
      return <span className="text-[11px] text-amber-700 font-semibold">Menunggu</span>;
    }
    if (status === 'APPROVED') {
      return (
        <div className="text-center leading-tight">
          <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-700 font-bold">
            <CheckCircle2 className="w-3 h-3" /> Disetujui
          </span>
          {byName && <div className="text-[10px] font-semibold text-slate-800">{byName}</div>}
          {at && <div className="text-[9px] text-slate-500">{at.slice(0, 10)}</div>}
        </div>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-rose-700 font-bold">
        <XCircle className="w-3 h-3" /> Ditolak
      </span>
    );
  };

  return (
    <PaperFormModal
      open={open}
      toolbarTitle={
        returnMode ? 'PENGEMBALIAN KENDARAAN KANTOR' : 'PENGGUNAAN KENDARAAN KANTOR'
      }
      onClose={onClose}
      onPrint={
        record
          ? () =>
              printHrdReport(`/hrd/vehicle-bookings/${record.id}/print`).catch((err) =>
                toast.error(err.message)
              )
          : undefined
      }
    >
      <form onSubmit={handleSubmit}>
        <PaperFormHeader title="PENGGUNAAN KENDARAAN KANTOR" />

        <div className="border border-black text-xs">
          {/* 2-Column Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-black divide-y md:divide-y-0 md:divide-x divide-black">
            {/* Left Column */}
            <div className="p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 font-bold">Nama :</span>
                <span className="font-semibold">{displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 font-bold">Kendaraan :</span>
                {isLockedFields ? (
                  <span className="font-semibold">{displayVehName}</span>
                ) : (
                  <select
                    value={vehicleId}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="flex-1 border-b border-black bg-transparent py-0.5 text-xs focus:outline-none"
                  >
                    <option value="">-- Pilih Kendaraan --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.plateNumber})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 font-bold">KM Awal :</span>
                {isLockedFields ? (
                  <span className="font-semibold">{initialKm.toLocaleString('id-ID')} KM</span>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={initialKm}
                    onChange={(e) => setInitialKm(Number(e.target.value) || 0)}
                    className="w-32 border-b border-black bg-transparent py-0.5 text-xs focus:outline-none"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 shrink-0 font-bold">Parameter Bensin :</span>
                <FuelGauge value={initialFuel} onChange={setInitialFuel} disabled={isLockedFields} />
              </div>
            </div>

            {/* Right Column */}
            <div className="p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-32 shrink-0 font-bold">Jabatan/Bagian :</span>
                <span className="font-semibold">{displayDept}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-32 shrink-0 font-bold">No.Polisi :</span>
                <span className="font-semibold">{displayPlate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-32 shrink-0 font-bold">Tgl./Jam Pergi :</span>
                {isLockedFields ? (
                  <span className="font-semibold">{departureAt.replace('T', ' ')}</span>
                ) : (
                  <input
                    type="datetime-local"
                    value={departureAt}
                    onChange={(e) => setDepartureAt(e.target.value)}
                    className="flex-1 border-b border-black bg-transparent py-0.5 text-xs focus:outline-none"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-32 shrink-0 font-bold">Keperluan :</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purposeType === 'DINAS_KANTOR'}
                    disabled={isLockedFields}
                    onChange={() => setPurposeType('DINAS_KANTOR')}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  <span className="text-xs font-semibold">Dinas Kantor</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purposeType === 'PRIBADI'}
                    disabled={isLockedFields}
                    onChange={() => setPurposeType('PRIBADI')}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  <span className="text-xs font-semibold">Pribadi</span>
                </label>
              </div>
            </div>
          </div>

          {/* Tujuan Full Width */}
          <div className="p-2.5 border-b border-black">
            <div className="font-bold mb-1">Tujuan :</div>
            <textarea
              rows={3}
              value={destination}
              disabled={isLockedFields}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Tuliskan alamat tujuan & keperluan perjalanan..."
              className="w-full border border-slate-300 p-1.5 text-xs focus:outline-none focus:border-black disabled:bg-transparent disabled:border-transparent"
            />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-black divide-y md:divide-y-0 md:divide-x divide-black">
            <div className="p-2.5">
              <div className="font-bold mb-1">KM Akhir :</div>
              {returnMode ? (
                <input
                  type="number"
                  min={record?.initialKm || 0}
                  value={finalKm}
                  onChange={(e) => setFinalKm(Number(e.target.value) || 0)}
                  className="w-full border-b border-blue-600 bg-blue-50 px-1.5 py-0.5 text-xs"
                />
              ) : (
                <div className="font-semibold">
                  {record?.finalKm !== undefined && record?.finalKm !== null
                    ? `${record.finalKm.toLocaleString('id-ID')} KM`
                    : '-'}
                </div>
              )}
            </div>

            <div className="p-2.5">
              <div className="font-bold mb-1">Tgl./Jam Kembali :</div>
              {returnMode ? (
                <input
                  type="datetime-local"
                  value={returnAt}
                  onChange={(e) => setReturnAt(e.target.value)}
                  className="w-full border-b border-blue-600 bg-blue-50 px-1.5 py-0.5 text-xs"
                />
              ) : (
                <div className="font-semibold">
                  {record?.returnAt
                    ? record.returnAt.slice(0, 16).replace('T', ' ')
                    : '__/__/__ - __:__'}
                </div>
              )}
            </div>

            <div className="p-2.5">
              <div className="font-bold mb-1.5">Parameter Bensin :</div>
              <FuelGauge
                value={returnMode ? finalFuel : record?.finalFuel || ''}
                onChange={setFinalFuel}
                disabled={!returnMode}
              />
            </div>
          </div>

          {/* 4-Column Signature Table */}
          <div className="grid grid-cols-4 divide-x divide-black text-center">
            <div className="py-1 border-b border-black font-bold bg-slate-50">FA / ACC</div>
            <div className="py-1 border-b border-black font-bold bg-slate-50">HRD / GA</div>
            <div className="py-1 border-b border-black font-bold bg-slate-50">KABAG</div>
            <div className="py-1 border-b border-black font-bold bg-slate-50">PEMOHON</div>

            <div className="h-20 flex items-center justify-center p-1">
              {record
                ? renderSig(record.financeStatus, record.financeByName, record.financeAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
            <div className="h-20 flex items-center justify-center p-1">
              {record
                ? renderSig(record.hrdStatus, record.hrdByName, record.hrdAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
            <div className="h-20 flex items-center justify-center p-1">
              {record
                ? renderSig(record.kabagStatus, record.kabagByName, record.kabagAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
            <div className="h-20 flex flex-col items-center justify-center p-1">
              <span className="text-[11px] font-bold">{displayName}</span>
              <span className="text-[10px] text-slate-500">Pemohon</span>
            </div>
          </div>
        </div>

        <PaperFormFooter formCode="FM-GA-001" />

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-400 text-xs font-bold text-slate-700 cursor-pointer"
          >
            {isReadOnly ? 'Tutup' : 'Batal'}
          </button>
          {!isReadOnly && (
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? 'Menyimpan...'
                : returnMode
                ? 'Simpan Pengembalian'
                : 'Ajukan Peminjaman'}
            </button>
          )}
        </div>
      </form>
    </PaperFormModal>
  );
};
