import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  createOutOfTownVisitApi,
  getMyEmployeeProfileApi,
  OutOfTownVisitRecord,
  printHrdReport,
  resolveBackendFileUrl,
  updateOutOfTownVisitApi,
  uploadEmployeeDocumentApi,
  VehicleBookingRecord,
} from '../../services/hrdService';
import { useAuthStore } from '../../store/useAuthStore';
import {
  PaperFormFooter,
  PaperFormHeader,
  PaperFormModal,
  PaperIdentityGrid,
} from './PaperFormSheet';

const formatIdr = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);

interface Props {
  open: boolean;
  record?: OutOfTownVisitRecord | null;
  editMode?: boolean;
  vehicleBookings: VehicleBookingRecord[];
  onClose: () => void;
  onSuccess: () => void;
}

export const OutOfTownVisitFormModal: React.FC<Props> = ({
  open,
  record,
  editMode = false,
  vehicleBookings,
  onClose,
  onSuccess,
}) => {
  const user = useAuthStore((s) => s.user);
  const isReadOnly = !!record && !editMode;
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: myProfile } = useQuery({
    queryKey: ['myEmployeeProfile'],
    queryFn: getMyEmployeeProfileApi,
    enabled: open && !record,
  });

  const [destinationCity, setDestinationCity] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [departureDate, setDepartureDate] = useState(todayStr);
  const [returnDate, setReturnDate] = useState(todayStr);
  const [transportMode, setTransportMode] = useState('Mobil Kantor');
  const [vehicleBookingId, setVehicleBookingId] = useState('');
  const [transportCost, setTransportCost] = useState(0);
  const [lodgingCost, setLodgingCost] = useState(0);
  const [mealCost, setMealCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setDestinationCity(record.destinationCity || '');
      setCustomerName(record.customerName || '');
      setPurpose(record.purpose || '');
      setDepartureDate(record.departureDate?.slice(0, 10) || todayStr);
      setReturnDate(record.returnDate?.slice(0, 10) || todayStr);
      setTransportMode(record.transportMode || 'Mobil Kantor');
      setVehicleBookingId(record.vehicleBookingId || '');
      setTransportCost(record.transportCost || 0);
      setLodgingCost(record.lodgingCost || 0);
      setMealCost(record.mealCost || 0);
      setOtherCost(record.otherCost || 0);
      setAttachmentUrl(record.attachmentUrl || '');
      setNotes(record.notes || '');
    } else {
      setDestinationCity('');
      setCustomerName('');
      setPurpose('');
      setDepartureDate(todayStr);
      setReturnDate(todayStr);
      setTransportMode('Mobil Kantor');
      setVehicleBookingId('');
      setTransportCost(0);
      setLodgingCost(0);
      setMealCost(0);
      setOtherCost(0);
      setAttachmentUrl('');
      setNotes('');
    }
  }, [record, open, todayStr]);

  const totalCost = useMemo(
    () =>
      !editMode && record?.totalEstimatedCost !== undefined
        ? record.totalEstimatedCost
        : (Number(transportCost) || 0) +
          (Number(lodgingCost) || 0) +
          (Number(mealCost) || 0) +
          (Number(otherCost) || 0),
    [record, editMode, transportCost, lodgingCost, mealCost, otherCost]
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadEmployeeDocumentApi('visit_attachment', file);
      setAttachmentUrl(res.fileUrl);
      toast.success('Lampiran visit berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah lampiran');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationCity.trim() || !purpose.trim()) {
      toast.error('Kota tujuan dan keperluan wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        destinationCity: destinationCity.trim(),
        customerName: customerName.trim() || undefined,
        purpose: purpose.trim(),
        departureDate,
        returnDate,
        transportMode: transportMode || undefined,
        vehicleBookingId: vehicleBookingId || undefined,
        transportCost: Number(transportCost) || 0,
        lodgingCost: Number(lodgingCost) || 0,
        mealCost: Number(mealCost) || 0,
        otherCost: Number(otherCost) || 0,
        attachmentUrl: attachmentUrl || undefined,
        notes: notes || undefined,
      };
      if (record && editMode) {
        await updateOutOfTownVisitApi(record.id, payload);
        toast.success('Pengajuan Visit Luar Kota diperbarui');
      } else {
        await createOutOfTownVisitApi(payload);
        toast.success('Pengajuan Visit Luar Kota berhasil dikirim');
      }
      onSuccess();
      onClose();
    } catch {
      // handled by apiClient
    } finally {
      setSubmitting(false);
    }
  };

  const displayName =
    record?.employeeName || myProfile?.fullName || user?.fullName || user?.username || '-';
  const displayNik = record?.employeeNik || myProfile?.nik || (user as any)?.nik || '-';
  const displayDept =
    record?.department || myProfile?.department || user?.department || '-';
  const displayDate = record?.createdAt?.slice(0, 10) || todayStr;

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
      toolbarTitle="SURAT PENGAJUAN VISIT LUAR KOTA (FM-HRD-015)"
      onClose={onClose}
      onPrint={
        record
          ? () =>
              printHrdReport(`/hrd/out-of-town-visits/${record.id}/print`).catch((err) =>
                toast.error(err.message)
              )
          : undefined
      }
    >
      <form onSubmit={handleSubmit}>
        <PaperFormHeader title="PENGAJUAN VISIT LUAR KOTA / DINAS" />

        <PaperIdentityGrid
          name={displayName}
          nik={displayNik}
          department={displayDept}
          dateNode={<span>{displayDate}</span>}
        />

        <div className="border border-black text-xs">
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              KOTA TUJUAN
            </div>
            <div className="col-span-4 border-r border-black px-2 py-1.5">
              <input
                type="text"
                value={destinationCity}
                disabled={isReadOnly}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder="cth: Surabaya / Bandung"
                className="w-full border-b border-black bg-transparent py-0.5 text-xs focus:outline-none disabled:border-transparent font-semibold"
              />
            </div>
            <div className="col-span-2 border-r border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              CUSTOMER / INSTANSI
            </div>
            <div className="col-span-3 px-2 py-1.5">
              <input
                type="text"
                value={customerName}
                disabled={isReadOnly}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama PT / RS / Klinik"
                className="w-full border-b border-black bg-transparent py-0.5 text-xs focus:outline-none disabled:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              PERIODE DINAS
            </div>
            <div className="col-span-4 border-r border-black px-2 py-1.5 flex flex-wrap items-center gap-1.5">
              <input
                type="date"
                value={departureDate}
                disabled={isReadOnly}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="border-b border-black bg-transparent px-1 py-0.5 text-xs disabled:border-transparent"
              />
              <span className="font-bold">s/d</span>
              <input
                type="date"
                value={returnDate}
                disabled={isReadOnly}
                onChange={(e) => setReturnDate(e.target.value)}
                className="border-b border-black bg-transparent px-1 py-0.5 text-xs disabled:border-transparent"
              />
            </div>
            <div className="col-span-2 border-r border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              TRANSPORTASI
            </div>
            <div className="col-span-3 px-2 py-1.5">
              <select
                value={transportMode}
                disabled={isReadOnly}
                onChange={(e) => setTransportMode(e.target.value)}
                className="w-full border-b border-black bg-transparent py-0.5 text-xs focus:outline-none disabled:border-transparent"
              >
                <option value="Mobil Kantor">Mobil Kantor</option>
                <option value="Kereta Api">Kereta Api</option>
                <option value="Pesawat">Pesawat</option>
                <option value="Bus / Travel">Bus / Travel</option>
                <option value="Kendaraan Pribadi">Kendaraan Pribadi</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              KENDARAAN KANTOR
            </div>
            <div className="col-span-9 px-2 py-1.5">
              <select
                value={vehicleBookingId}
                disabled={isReadOnly}
                onChange={(e) => setVehicleBookingId(e.target.value)}
                className="w-full border-b border-black bg-transparent py-0.5 text-xs focus:outline-none disabled:border-transparent"
              >
                <option value="">-- Tidak Menggunakan Kendaraan Kantor --</option>
                {vehicleBookings.map((vb) => (
                  <option key={vb.id} value={vb.id}>
                    {vb.vehicleName} ({vb.plateNumber}) — {vb.destination}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-2 font-bold bg-slate-50">
              TUJUAN / KEPERLUAN
            </div>
            <div className="col-span-9 p-2 space-y-1.5">
              <textarea
                rows={2}
                value={purpose}
                disabled={isReadOnly}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Tuliskan tujuan dan agenda visit luar kota..."
                className="w-full border border-slate-300 p-1.5 text-xs focus:outline-none focus:border-black disabled:bg-transparent disabled:border-transparent"
              />
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                {!isReadOnly && (
                  <label className="inline-flex items-center gap-1.5 px-2 py-1 border border-black bg-slate-50 hover:bg-slate-100 cursor-pointer font-semibold">
                    {uploading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    <span>Upload Lampiran (Opsional)</span>
                    <input type="file" className="hidden" onChange={handleUpload} />
                  </label>
                )}
                {attachmentUrl && (
                  <a
                    href={resolveBackendFileUrl(attachmentUrl) || attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Lihat Lampiran
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-2 font-bold bg-slate-50">
              ESTIMASI BIAYA (IDR)
            </div>
            <div className="col-span-9 divide-y divide-black">
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                  <span>1. Transportasi :</span>
                  {isReadOnly ? (
                    <span className="font-bold">{formatIdr(transportCost)}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={transportCost}
                      onChange={(e) => setTransportCost(Number(e.target.value) || 0)}
                      className="w-28 border-b border-black text-right text-xs focus:outline-none"
                    />
                  )}
                </div>
                <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                  <span>2. Penginapan / Hotel :</span>
                  {isReadOnly ? (
                    <span className="font-bold">{formatIdr(lodgingCost)}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={lodgingCost}
                      onChange={(e) => setLodgingCost(Number(e.target.value) || 0)}
                      className="w-28 border-b border-black text-right text-xs focus:outline-none"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                  <span>3. Uang Makan :</span>
                  {isReadOnly ? (
                    <span className="font-bold">{formatIdr(mealCost)}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={mealCost}
                      onChange={(e) => setMealCost(Number(e.target.value) || 0)}
                      className="w-28 border-b border-black text-right text-xs focus:outline-none"
                    />
                  )}
                </div>
                <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                  <span>4. Biaya Lain-lain :</span>
                  {isReadOnly ? (
                    <span className="font-bold">{formatIdr(otherCost)}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={otherCost}
                      onChange={(e) => setOtherCost(Number(e.target.value) || 0)}
                      className="w-28 border-b border-black text-right text-xs focus:outline-none"
                    />
                  )}
                </div>
              </div>
              <div className="px-2 py-1.5 bg-slate-100 flex items-center justify-between font-bold">
                <span>TOTAL ESTIMASI BIAYA</span>
                <span className="text-sm">{formatIdr(totalCost)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-black text-center">
            <div className="py-1 border-b border-black font-bold bg-slate-50">PEMOHON</div>
            <div className="py-1 border-b border-black font-bold bg-slate-50">HRD</div>
            <div className="py-1 border-b border-black font-bold bg-slate-50">FA / ACC</div>

            <div className="h-20 flex flex-col items-center justify-center p-1">
              <span className="text-[11px] font-bold">{displayName}</span>
              <span className="text-[10px] text-slate-500">Pemohon</span>
            </div>
            <div className="h-20 flex items-center justify-center p-1">
              {record
                ? renderSig(record.hrdStatus, record.hrdByName, record.hrdAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
            <div className="h-20 flex items-center justify-center p-1">
              {record
                ? renderSig(record.financeStatus, record.financeByName, record.financeAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
          </div>
        </div>

        <PaperFormFooter formCode="FM-HRD-015" />

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
              disabled={submitting || uploading}
              className="px-5 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : editMode ? 'Simpan Perubahan' : 'Kirim Pengajuan'}
            </button>
          )}
        </div>
      </form>
    </PaperFormModal>
  );
};
