import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  confirmExitPermitReturnApi,
  createExitPermitApi,
  ExitPermitRecord,
  ExitPermitType,
  getMyEmployeeProfileApi,
  printHrdReport,
  updateExitPermitApi,
} from '../../services/hrdService';
import { useAuthStore } from '../../store/useAuthStore';
import {
  PaperFormFooter,
  PaperFormHeader,
  PaperFormModal,
  PaperIdentityGrid,
} from './PaperFormSheet';

interface Props {
  open: boolean;
  record?: ExitPermitRecord | null;
  editMode?: boolean;
  confirmReturnMode?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExitPermitFormModal: React.FC<Props> = ({
  open,
  record,
  editMode = false,
  confirmReturnMode = false,
  onClose,
  onSuccess,
}) => {
  const user = useAuthStore((s) => s.user);
  const isReadOnly = !!record && !confirmReturnMode && !editMode;
  const isLockedFields = !!record && !editMode;

  const { data: myProfile } = useQuery({
    queryKey: ['myEmployeeProfile'],
    queryFn: getMyEmployeeProfileApi,
    enabled: open && !record,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const [permitDate, setPermitDate] = useState(todayStr);
  const [permitType, setPermitType] = useState<ExitPermitType>('SAAT_JAM_KERJA');
  const [plannedOutTime, setPlannedOutTime] = useState('09:00');
  const [plannedReturnTime, setPlannedReturnTime] = useState('11:00');
  const [actualOutTime, setActualOutTime] = useState('');
  const [actualReturnTime, setActualReturnTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setPermitDate(record.permitDate?.slice(0, 10) || todayStr);
      setPermitType((record.permitType as ExitPermitType) || 'SAAT_JAM_KERJA');
      setPlannedOutTime(record.plannedOutTime || '');
      setPlannedReturnTime(record.plannedReturnTime || '');
      setActualOutTime(record.actualOutTime || record.plannedOutTime || '');
      setActualReturnTime(
        record.actualReturnTime || new Date().toTimeString().slice(0, 5)
      );
      setReason(record.reason || '');
    } else {
      setPermitDate(todayStr);
      setPermitType('SAAT_JAM_KERJA');
      setPlannedOutTime('09:00');
      setPlannedReturnTime('11:00');
      setActualOutTime('');
      setActualReturnTime('');
      setReason('');
    }
  }, [record, open, todayStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmReturnMode && record) {
      setSubmitting(true);
      try {
        await confirmExitPermitReturnApi(record.id, {
          actualOutTime: actualOutTime || undefined,
          actualReturnTime: actualReturnTime || undefined,
        });
        toast.success('Jam aktual keluar/kembali berhasil dikonfirmasi');
        onSuccess();
        onClose();
      } catch {
        // handled by apiClient
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!reason.trim()) {
      toast.error('Keperluan wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        permitDate,
        permitType,
        plannedOutTime: plannedOutTime || undefined,
        plannedReturnTime: plannedReturnTime || undefined,
        reason: reason.trim(),
      };
      if (record && editMode) {
        await updateExitPermitApi(record.id, payload);
        toast.success('Surat Ijin (RM-HRD-013) diperbarui');
      } else {
        await createExitPermitApi(payload);
        toast.success('Surat Ijin Meninggalkan Tempat Kerja (RM-HRD-013) dikirim');
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
        confirmReturnMode
          ? 'KONFIRMASI KEMBALI KERJA (RM-HRD-013)'
          : 'SURAT IJIN MENINGGALKAN TEMPAT KERJA (RM-HRD-013)'
      }
      onClose={onClose}
      onPrint={
        record
          ? () =>
              printHrdReport(`/hrd/exit-permits/${record.id}/print`).catch((err) =>
                toast.error(err.message)
              )
          : undefined
      }
    >
      <form onSubmit={handleSubmit}>
        <PaperFormHeader title="SURAT IJIN" subtitle="MENINGGALKAN TEMPAT KERJA" />

        <PaperIdentityGrid
          name={displayName}
          nik={displayNik}
          department={displayDept}
          dateNode={
            isLockedFields ? (
              <span>{permitDate}</span>
            ) : (
              <input
                type="date"
                value={permitDate}
                onChange={(e) => setPermitDate(e.target.value)}
                className="w-full border-b border-black bg-transparent text-xs focus:outline-none"
              />
            )
          }
        />

        <div className="space-y-2 text-xs">
          {/* JENIS IJIN */}
          <div className="grid grid-cols-12 border border-black">
            <div className="col-span-3 border-r border-black px-2 py-2 font-bold bg-slate-50 flex items-center">
              JENIS IJIN
            </div>
            <div className="col-span-9 px-3 py-2 flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={permitType === 'TERLAMBAT'}
                  disabled={isLockedFields}
                  onChange={() => setPermitType('TERLAMBAT')}
                  className="w-3.5 h-3.5 accent-black"
                />
                <span>TERLAMBAT</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={permitType === 'SAAT_JAM_KERJA'}
                  disabled={isLockedFields}
                  onChange={() => setPermitType('SAAT_JAM_KERJA')}
                  className="w-3.5 h-3.5 accent-black"
                />
                <span>SAAT JAM KERJA</span>
              </label>
            </div>
          </div>

          {/* RENCANA & AKTUAL */}
          <div className="grid grid-cols-12 border border-black">
            <div className="col-span-3 border-r border-b border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              RENCANA KELUAR
            </div>
            <div className="col-span-3 border-r border-b border-black px-2 py-1.5 flex items-center gap-1.5">
              <span>:</span>
              <input
                type="time"
                value={plannedOutTime}
                disabled={isLockedFields}
                onChange={(e) => setPlannedOutTime(e.target.value)}
                className="border-b border-black bg-transparent text-xs focus:outline-none disabled:border-transparent"
              />
            </div>
            <div className="col-span-3 border-r border-b border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              RENCANA KEMBALI
            </div>
            <div className="col-span-3 border-b border-black px-2 py-1.5 flex items-center gap-1.5">
              <span>:</span>
              <input
                type="time"
                value={plannedReturnTime}
                disabled={isLockedFields}
                onChange={(e) => setPlannedReturnTime(e.target.value)}
                className="border-b border-black bg-transparent text-xs focus:outline-none disabled:border-transparent"
              />
            </div>

            <div className="col-span-3 border-r border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              AKTUAL KELUAR
            </div>
            <div className="col-span-3 border-r border-black px-2 py-1.5 flex items-center gap-1.5">
              <span>:</span>
              {confirmReturnMode ? (
                <input
                  type="time"
                  value={actualOutTime}
                  onChange={(e) => setActualOutTime(e.target.value)}
                  className="border-b border-blue-600 bg-blue-50 px-1 text-xs"
                />
              ) : (
                <span className="font-medium">{record?.actualOutTime || '-'}</span>
              )}
            </div>
            <div className="col-span-3 border-r border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              AKTUAL KEMBALI
            </div>
            <div className="col-span-3 px-2 py-1.5 flex items-center gap-1.5">
              <span>:</span>
              {confirmReturnMode ? (
                <input
                  type="time"
                  value={actualReturnTime}
                  onChange={(e) => setActualReturnTime(e.target.value)}
                  className="border-b border-blue-600 bg-blue-50 px-1 text-xs"
                />
              ) : (
                <span className="font-medium">{record?.actualReturnTime || '-'}</span>
              )}
            </div>
          </div>

          {/* KEPERLUAN */}
          <div className="grid grid-cols-12 border border-black">
            <div className="col-span-3 border-r border-black px-2 py-2 font-bold bg-slate-50">
              KEPERLUAN
            </div>
            <div className="col-span-9 p-2">
              <textarea
                rows={3}
                value={reason}
                disabled={isLockedFields}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan keperluan meninggalkan tempat kerja..."
                className="w-full border border-slate-300 p-1.5 text-xs focus:outline-none focus:border-black disabled:bg-transparent disabled:border-transparent"
              />
            </div>
          </div>

          {/* 6-Column Signature Table */}
          <div className="grid grid-cols-6 border border-black divide-x divide-black text-center">
            <div className="font-bold py-1 border-b border-black bg-slate-50">KARYAWAN</div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">ATASAN</div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">HRD</div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">&nbsp;</div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">KARYAWAN</div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">HRD</div>

            <div className="h-20 flex flex-col items-center justify-center p-1">
              <span className="text-[11px] font-bold">{displayName}</span>
              <span className="text-[10px] text-slate-500">Pemohon</span>
            </div>
            <div className="h-20 flex items-center justify-center p-1">
              {record
                ? renderSig(record.supervisorStatus, record.supervisorByName, record.supervisorAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
            <div className="h-20 flex items-center justify-center p-1">
              {record
                ? renderSig(record.hrdStatus, record.hrdByName, record.hrdAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
            <div className="h-20 flex flex-col items-center justify-center p-1 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-700 leading-tight">
                Kembali Kerja
              </span>
              <ArrowRight className="w-6 h-6 text-slate-700 mt-1" />
            </div>
            <div className="h-20 flex items-center justify-center p-1 text-[11px]">
              {record?.returnConfirmed ? displayName : '-'}
            </div>
            <div className="h-20 flex items-center justify-center p-1 text-[11px]">
              {record?.returnConfirmed ? 'Terkonfirmasi' : '-'}
            </div>
          </div>
        </div>

        <PaperFormFooter formCode="RM-HRD-013" />

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
                : confirmReturnMode
                ? 'Simpan Jam Aktual'
                : 'Kirim Surat Ijin'}
            </button>
          )}
        </div>
      </form>
    </PaperFormModal>
  );
};
