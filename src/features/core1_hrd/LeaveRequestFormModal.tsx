import React, { useEffect, useMemo, useState } from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  createHrdLeaveRequestApi,
  HrdLeaveRequestRecord,
  LeaveCategory,
  LeaveRequestGroup,
  printHrdReport,
  resolveBackendFileUrl,
  uploadEmployeeDocumentApi,
} from '../../services/hrdService';
import { useAuthStore } from '../../store/useAuthStore';
import {
  PaperFormFooter,
  PaperFormHeader,
  PaperFormModal,
  PaperIdentityGrid,
} from './PaperFormSheet';

const CUTI_CATEGORIES: {
  code: LeaveCategory;
  num: number;
  label: string;
  fixedDays?: number;
}[] = [
  { code: 'CUTI_TAHUNAN_PRIBADI', num: 1, label: 'Cuti Tahunan / Pribadi' },
  { code: 'CUTI_NIKAH_KARYAWAN', num: 2, label: 'Cuti Menikah Karyawan', fixedDays: 3 },
  { code: 'CUTI_NIKAH_ANAK', num: 3, label: 'Cuti Menikahkan Anak', fixedDays: 2 },
  { code: 'CUTI_KHITAN_BAPTIS_ANAK', num: 4, label: 'Cuti Mengkhitankan / Membaptis Anak', fixedDays: 2 },
  { code: 'CUTI_ISTRI_MELAHIRKAN_KEGUGURAN', num: 5, label: 'Cuti Istri Melahirkan / Keguguran', fixedDays: 2 },
  { code: 'CUTI_KELUARGA_INTI_MENINGGAL', num: 6, label: 'Cuti Suami / Istri, Orang Tua / Mertua, Anak / Menantu Meninggal', fixedDays: 2 },
  { code: 'CUTI_KELUARGA_SERUMAH_MENINGGAL', num: 7, label: 'Cuti Keluarga Meninggal dalam 1 rumah', fixedDays: 1 },
  { code: 'CUTI_MELAHIRKAN_KEGUGURAN', num: 8, label: 'Cuti Melahirkan / Keguguran', fixedDays: 90 },
  { code: 'CUTI_KHUSUS_LAINNYA', num: 9, label: 'Cuti Khusus Lainnya' },
];

const SAKIT_CATEGORIES: { code: LeaveCategory; num: number; label: string }[] = [
  { code: 'SAKIT', num: 1, label: 'Sakit (Dengan / Tanpa Surat Keterangan Dokter)' },
  { code: 'IZIN_LAINNYA', num: 2, label: 'Izin Lainnya (Keperluan Khusus / Mendesak)' },
];

function diffDaysInclusive(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

interface Props {
  open: boolean;
  requestGroup: LeaveRequestGroup;
  record?: HrdLeaveRequestRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const LeaveRequestFormModal: React.FC<Props> = ({
  open,
  requestGroup,
  record,
  onClose,
  onSuccess,
}) => {
  const user = useAuthStore((s) => s.user);
  const isReadOnly = !!record;

  const todayStr = new Date().toISOString().split('T')[0];
  const [leaveCategory, setLeaveCategory] = useState<LeaveCategory>(
    requestGroup === 'CUTI' ? 'CUTI_TAHUNAN_PRIBADI' : 'SAKIT'
  );
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [customDays, setCustomDays] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setLeaveCategory(record.leaveCategory as LeaveCategory);
      setStartDate(record.startDate || todayStr);
      setEndDate(record.endDate || todayStr);
      setCustomDays(record.customDays || record.totalDays || 1);
      setReason(record.reason || '');
      setAttachmentUrl(record.attachmentUrl || '');
    } else {
      setLeaveCategory(requestGroup === 'CUTI' ? 'CUTI_TAHUNAN_PRIBADI' : 'SAKIT');
      setStartDate(todayStr);
      setEndDate(todayStr);
      setCustomDays(1);
      setReason('');
      setAttachmentUrl('');
    }
  }, [record, requestGroup, open, todayStr]);

  const selectedCatMeta = CUTI_CATEGORIES.find((c) => c.code === leaveCategory);

  const computedDays = useMemo(() => {
    if (record) return record.totalDays || 0;
    if (requestGroup === 'CUTI') {
      if (selectedCatMeta?.fixedDays) return selectedCatMeta.fixedDays;
      if (leaveCategory === 'CUTI_KHUSUS_LAINNYA') return Math.max(1, customDays || 1);
    }
    return Math.max(1, diffDaysInclusive(startDate, endDate));
  }, [record, requestGroup, selectedCatMeta, leaveCategory, customDays, startDate, endDate]);

  const annualBefore = record?.annualLeaveBalanceBefore ?? (user as any)?.annualLeaveBalance ?? 12;
  const isAnnual = leaveCategory === 'CUTI_TAHUNAN_PRIBADI';
  const annualAfter =
    record?.annualLeaveBalanceAfter ??
    (isAnnual ? Math.max(0, annualBefore - computedDays) : annualBefore);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const docType =
        requestGroup === 'SAKIT_IZIN' && leaveCategory === 'SAKIT'
          ? 'medical_note'
          : 'leave_attachment';
      const res = await uploadEmployeeDocumentApi(docType, file);
      setAttachmentUrl(res.fileUrl);
      toast.success('Lampiran berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah lampiran');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Keperluan / alasan wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      await createHrdLeaveRequestApi({
        requestGroup,
        leaveCategory,
        startDate,
        endDate,
        totalDays: computedDays,
        customDays: leaveCategory === 'CUTI_KHUSUS_LAINNYA' ? customDays : undefined,
        reason: reason.trim(),
        attachmentUrl: attachmentUrl || undefined,
      });
      toast.success(
        requestGroup === 'CUTI'
          ? 'Permohonan cuti (RM-HRD-303) berhasil dikirim'
          : 'Pengajuan sakit / izin berhasil dikirim'
      );
      onSuccess();
      onClose();
    } catch {
      // handled by apiClient
    } finally {
      setSubmitting(false);
    }
  };

  const renderSigBadge = (status?: string, byName?: string, at?: string) => {
    if (!status || status === 'PENDING') {
      return <span className="text-[11px] text-amber-700 font-semibold">Menunggu</span>;
    }
    if (status === 'APPROVED') {
      return (
        <div className="text-center leading-tight">
          <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-700 font-bold">
            <CheckCircle2 className="w-3 h-3" /> Disetujui
          </span>
          {byName && <div className="text-[10px] text-slate-800 font-semibold mt-0.5">{byName}</div>}
          {at && <div className="text-[9px] text-slate-500">{at.slice(0, 10)}</div>}
        </div>
      );
    }
    return (
      <div className="text-center leading-tight">
        <span className="inline-flex items-center gap-0.5 text-[11px] text-rose-700 font-bold">
          <XCircle className="w-3 h-3" /> Ditolak
        </span>
        {byName && <div className="text-[10px] text-slate-800 font-semibold mt-0.5">{byName}</div>}
      </div>
    );
  };

  const displayName = record?.employeeName || user?.fullName || user?.username || '-';
  const displayNik = record?.employeeNik || (user as any)?.nik || '-';
  const displayDept = record?.department || user?.department || '-';
  const displayReqDate = record?.requestDate?.slice(0, 10) || todayStr;

  return (
    <PaperFormModal
      open={open}
      toolbarTitle={
        requestGroup === 'CUTI'
          ? 'PERMOHONAN CUTI KARYAWAN (RM-HRD-303)'
          : 'PERMOHONAN SAKIT / IZIN KARYAWAN (RM-HRD-304)'
      }
      onClose={onClose}
      onPrint={
        record
          ? () =>
              printHrdReport(`/hrd/leave-requests/${record.id}/print`).catch((err) =>
                toast.error(err.message)
              )
          : undefined
      }
    >
      <form onSubmit={handleSubmit}>
        <PaperFormHeader
          title={
            requestGroup === 'CUTI'
              ? 'PERMOHONAN CUTI KARYAWAN'
              : 'PERMOHONAN SAKIT / IZIN KARYAWAN'
          }
        />

        <PaperIdentityGrid
          name={displayName}
          nik={displayNik}
          department={displayDept}
          dateNode={<span>{displayReqDate}</span>}
        />

        <div className="mb-2 px-1 text-xs">
          {requestGroup === 'CUTI'
            ? 'Bersama ini saya mengajukan permohonan cuti sebagai berikut :'
            : 'Bersama ini saya mengajukan permohonan sakit / izin sebagai berikut :'}
        </div>

        {/* Main Boxed Table */}
        <div className="border border-black text-xs">
          {/* JENIS CUTI / JENIS IZIN */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-2 font-bold bg-slate-50">
              {requestGroup === 'CUTI' ? 'JENIS CUTI' : 'JENIS PENGAJUAN'}
            </div>
            <div className="col-span-9 divide-y divide-slate-300">
              {requestGroup === 'CUTI'
                ? CUTI_CATEGORIES.map((cat) => {
                    const checked = leaveCategory === cat.code;
                    return (
                      <label
                        key={cat.code}
                        className={`flex items-center justify-between gap-2 px-2 py-1 ${
                          isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-right font-semibold">{cat.num}.</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isReadOnly}
                            onChange={() => setLeaveCategory(cat.code)}
                            className="w-3.5 h-3.5 accent-black"
                          />
                          <span className={checked ? 'font-bold' : ''}>{cat.label}</span>
                        </div>
                        <div className="shrink-0 font-semibold text-right min-w-[74px]">
                          {cat.fixedDays ? (
                            <span>{cat.fixedDays} Hari</span>
                          ) : cat.code === 'CUTI_KHUSUS_LAINNYA' ? (
                            <span className="inline-flex items-center gap-1">
                              {isReadOnly ? (
                                <span>{checked ? computedDays : '____'}</span>
                              ) : (
                                <input
                                  type="number"
                                  min={1}
                                  disabled={!checked}
                                  value={checked ? customDays : ''}
                                  onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                                  className="w-11 border-b border-black text-center px-1 py-0 text-xs focus:outline-none disabled:bg-transparent"
                                />
                              )}
                              <span>Hari</span>
                            </span>
                          ) : (
                            <span>&nbsp;</span>
                          )}
                        </div>
                      </label>
                    );
                  })
                : SAKIT_CATEGORIES.map((cat) => {
                    const checked = leaveCategory === cat.code;
                    return (
                      <label
                        key={cat.code}
                        className={`flex items-center gap-2 px-2 py-1.5 ${
                          isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
                        }`}
                      >
                        <span className="w-4 text-right font-semibold">{cat.num}.</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isReadOnly}
                          onChange={() => setLeaveCategory(cat.code)}
                          className="w-3.5 h-3.5 accent-black"
                        />
                        <span className={checked ? 'font-bold' : ''}>{cat.label}</span>
                      </label>
                    );
                  })}
            </div>
          </div>

          {/* RENCANA CUTI / PERIODE */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-1.5 font-bold bg-slate-50 flex items-center">
              {requestGroup === 'CUTI' ? 'RENCANA CUTI' : 'PERIODE TANGGAL'}
            </div>
            <div className="col-span-9 px-2 py-1.5 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                disabled={isReadOnly}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-b border-black px-1 py-0.5 text-xs bg-transparent focus:outline-none disabled:border-transparent"
              />
              <span className="font-bold">s/d</span>
              <input
                type="date"
                value={endDate}
                disabled={isReadOnly}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-b border-black px-1 py-0.5 text-xs bg-transparent focus:outline-none disabled:border-transparent"
              />
            </div>
          </div>

          {/* JUMLAH HARI */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-1.5 font-bold bg-slate-50">
              JUMLAH HARI
            </div>
            {requestGroup === 'CUTI' ? (
              <div className="col-span-9 grid grid-cols-2 divide-x divide-black">
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span>Cuti Tahunan/Pribadi :</span>
                  <span className="font-bold">{isAnnual ? `${computedDays} hari` : '- hari'}</span>
                </div>
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span>Cuti Khusus :</span>
                  <span className="font-bold">{!isAnnual ? `${computedDays} hari` : '- hari'}</span>
                </div>
              </div>
            ) : (
              <div className="col-span-9 px-2 py-1.5 font-bold">{computedDays} Hari</div>
            )}
          </div>

          {/* SISA CUTI (Khusus Cuti) */}
          {requestGroup === 'CUTI' && (
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-3 border-r border-black px-2 py-1.5 font-bold bg-slate-50">
                SISA CUTI TAHUNAN/PRIBADI
              </div>
              <div className="col-span-9 grid grid-cols-2 divide-x divide-black">
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span>SEBELUM PENGAJUAN :</span>
                  <span className="font-bold">{annualBefore} hari</span>
                </div>
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span>SETELAH PENGAJUAN :</span>
                  <span className="font-bold text-blue-800">{annualAfter} hari</span>
                </div>
              </div>
            </div>
          )}

          {/* KEPERLUAN / ALASAN & LAMPIRAN */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-3 border-r border-black px-2 py-2 font-bold bg-slate-50">
              {requestGroup === 'CUTI'
                ? 'KEPERLUAN CUTI TAHUNAN/PRIBADI'
                : 'KETERANGAN / ALASAN & SURAT DOKTER'}
            </div>
            <div className="col-span-9 p-2 space-y-1.5">
              <textarea
                rows={3}
                value={reason}
                disabled={isReadOnly}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan keterangan/keperluan secara jelas..."
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
                    <span>
                      {requestGroup === 'SAKIT_IZIN'
                        ? 'Upload Surat Dokter / Lampiran'
                        : 'Upload Lampiran (Opsional)'}
                    </span>
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
                    <ExternalLink className="w-3 h-3" /> Lihat Dokumen Lampiran
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 6-Column Signature Box */}
          <div className="grid grid-cols-6 divide-x divide-black text-center">
            <div className="font-bold py-1 border-b border-black bg-slate-50">KARYAWAN</div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">ATASAN</div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">HRD</div>
            <div className="py-1 border-b border-black bg-slate-100 text-[10px] font-bold flex items-center justify-center">
              KEMBALI BEKERJA
            </div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">KARYAWAN</div>
            <div className="font-bold py-1 border-b border-black bg-slate-50">HRD</div>

            <div className="h-16 flex flex-col items-center justify-center p-1">
              <span className="text-[11px] font-bold">{displayName}</span>
              <span className="text-[10px] text-slate-500">Pemohon</span>
            </div>
            <div className="h-16 flex items-center justify-center p-1">
              {record
                ? renderSigBadge(record.supervisorStatus, record.supervisorByName, record.supervisorAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
            <div className="h-16 flex items-center justify-center p-1">
              {record
                ? renderSigBadge(record.hrdStatus, record.hrdByName, record.hrdAt)
                : <span className="text-[11px] text-slate-400">Menunggu</span>}
            </div>
            <div className="h-16 flex items-center justify-center p-1 bg-slate-50 text-[10px] text-slate-600 font-semibold">
              {record?.returnConfirmed ? 'Sudah Kembali' : '→'}
            </div>
            <div className="h-16 flex items-center justify-center p-1 text-[11px]">
              {record?.returnConfirmed ? displayName : '-'}
            </div>
            <div className="h-16 flex items-center justify-center p-1 text-[11px]">
              {record?.returnConfirmed
                ? record.returnConfirmedByName || 'Terkonfirmasi'
                : '-'}
            </div>
          </div>
        </div>

        <PaperFormFooter formCode={requestGroup === 'CUTI' ? 'RM-HRD-303' : 'RM-HRD-304'} />

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
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          )}
        </div>
      </form>
    </PaperFormModal>
  );
};
