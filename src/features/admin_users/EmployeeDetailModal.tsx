import React, { useState } from 'react';
import { Users, X, Loader2, Upload, FileText, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  getEmployeeByIdApi,
  uploadAndAttachEmployeeDocumentsApi,
  resolveBackendFileUrl,
} from '../../services/hrdService';
import {
  useSystemChoices,
  findOptionLabel,
  DEFAULT_DIVISIONS,
  DEFAULT_USER_LEVELS,
  DEFAULT_EMPLOYMENT_STATUSES,
  DEFAULT_MARITAL_STATUSES,
} from '../../hooks/useSystemChoices';
import { pick, normalizeChildren, normalizeTrainings } from './employeeFormUtils';
import { DocumentPreview } from './EmployeeDocumentUpload';

interface EmployeeDetailModalProps {
  employee: any;
  canViewSensitive: boolean;
  canManage: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const Row: React.FC<{ label: string; value?: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <>
    <div className="text-slate-500 dark:text-slate-400">{label}</div>
    <div className={`font-bold text-slate-800 dark:text-slate-200 break-words ${mono ? 'font-mono' : ''}`}>
      {value === undefined || value === null || value === '' ? '-' : value}
    </div>
  </>
);

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">
    {children}
  </h3>
);

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  canViewSensitive,
  canManage,
  onClose,
  onUpdated,
}) => {
  const employeeId = employee?.id ? String(employee.id) : '';
  const { data: allChoices } = useSystemChoices();

  // Fetch fresh detail from GET /hrd/employees/{id}
  const { data: detail, isLoading, refetch } = useQuery({
    queryKey: ['hrd', 'employee', employeeId],
    queryFn: () => getEmployeeByIdApi(employeeId),
    enabled: !!employeeId,
  });
  const emp: any = { ...(employee || {}), ...((detail as any) || {}) };

  // ── Cara B: upload & attach directly ──
  const [ktp, setKtp] = useState<File | null>(null);
  const [kk, setKk] = useState<File | null>(null);
  const [npwp, setNpwp] = useState<File | null>(null);
  const [ijazah, setIjazah] = useState<File | null>(null);
  const [cert, setCert] = useState<File | null>(null);
  const [trName, setTrName] = useState('');
  const [trOrg, setTrOrg] = useState('');
  const [trYear, setTrYear] = useState<number | ''>(new Date().getFullYear());
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleDirectUpload = async () => {
    if (!ktp && !kk && !npwp && !ijazah && !cert) {
      setUploadMsg({ ok: false, text: 'Pilih minimal satu file dokumen.' });
      return;
    }
    if (cert && !trName.trim()) {
      setUploadMsg({ ok: false, text: 'Nama training wajib diisi untuk sertifikat.' });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      await uploadAndAttachEmployeeDocumentsApi(employeeId, {
        ktpPhoto: ktp,
        kkPhoto: kk,
        npwpPhoto: npwp,
        ijazahPhoto: ijazah,
        trainingCertificate: cert,
        trainingName: trName,
        trainingOrganizer: trOrg,
        trainingYear: trYear,
      });
      setKtp(null); setKk(null); setNpwp(null); setIjazah(null); setCert(null);
      setTrName(''); setTrOrg('');
      setUploadMsg({ ok: true, text: 'Dokumen berhasil diunggah & dilampirkan ke data karyawan.' });
      await refetch();
      onUpdated?.();
    } catch (err: any) {
      const d = err?.response?.data?.detail || err?.response?.data?.message || err?.message;
      setUploadMsg({ ok: false, text: typeof d === 'string' ? d : 'Gagal mengunggah dokumen.' });
    } finally {
      setUploading(false);
    }
  };

  const departments = allChoices?.departments?.length ? allChoices.departments : DEFAULT_DIVISIONS;
  const levels = allChoices?.userLevels?.length ? allChoices.userLevels : DEFAULT_USER_LEVELS;
  const statuses = allChoices?.employmentStatuses?.length ? allChoices.employmentStatuses : DEFAULT_EMPLOYMENT_STATUSES;
  const maritals = allChoices?.maritalStatuses?.length ? allChoices.maritalStatuses : DEFAULT_MARITAL_STATUSES;

  const children = normalizeChildren(emp.children);
  const trainings = normalizeTrainings(emp.trainings);
  const salary = pick<number>(emp, 'basic_salary');
  const marital = pick<string>(emp, 'marital_status');

  const fileInput = (label: string, file: File | null, setFile: (f: File | null) => void) => (
    <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 cursor-pointer">
      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
      <span className="truncate">{file ? file.name : label}</span>
      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span>Detail Lengkap Karyawan</span>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <Heading>Identitas, Divisi & Akun</Heading>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Row label="No Karyawan (NIK)" value={emp.nik} mono />
                  <Row label="Nama Lengkap" value={pick(emp, 'full_name') || emp.name} />
                  <Row label="Divisi" value={pick(emp, 'department') && `${findOptionLabel(departments, pick(emp, 'department'))} (${pick(emp, 'department')})`} />
                  <Row label="Level Akses" value={findOptionLabel(levels, pick(emp, 'user_level'))} />
                  <Row label="Username" value={pick(emp, 'username')} mono />
                  <Row label="Email" value={emp.email} mono />
                  <Row label="Status Kepegawaian" value={findOptionLabel(statuses, pick(emp, 'employment_status'))} />
                  <Row label="Tanggal Masuk Kerja" value={pick(emp, 'join_date')} />
                </div>
              </div>
              <div>
                <Heading>Dokumen Legal & BPJS</Heading>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Row label="No KTP" value={pick(emp, 'identity_card_number')} mono />
                  <Row label="No NPWP" value={pick(emp, 'npwp_number')} mono />
                  <Row label="BPJS Kesehatan" value={pick(emp, 'bpjs_kesehatan')} mono />
                  <Row label="BPJS Ketenagakerjaan" value={pick(emp, 'bpjs_ketenagakerjaan')} mono />
                </div>
              </div>
              <div>
                <Heading>Payroll & Rekening</Heading>
                {canViewSensitive ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Row label="Gaji Pokok" value={salary != null ? `Rp ${Number(salary).toLocaleString('id-ID')}` : undefined} />
                    <Row label="Bank" value={pick(emp, 'bank_name')} />
                    <Row label="No. Rekening" value={pick(emp, 'bank_account_number')} mono />
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <Lock className="w-3.5 h-3.5" /> Gaji pokok & nomor rekening disembunyikan untuk level Staff (L3).
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <Heading>Data Pribadi</Heading>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Row label="Tempat / Tgl Lahir" value={[pick(emp, 'place_of_birth'), pick(emp, 'date_of_birth')].filter(Boolean).join(', ')} />
                  <Row label="Agama" value={emp.religion} />
                  <Row label="No. HP (Pribadi)" value={pick(emp, 'phone_number')} mono />
                  <Row label="Pendidikan Terakhir" value={pick(emp, 'last_education')} />
                  <div className="col-span-2 text-slate-500 dark:text-slate-400">Alamat</div>
                  <div className="col-span-2 font-medium text-slate-800 dark:text-slate-200 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg whitespace-pre-line">
                    {emp.address || '-'}
                  </div>
                </div>
              </div>
              <div>
                <Heading>Keluarga & Kontak Darurat</Heading>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Row label="Kontak Darurat" value={pick(emp, 'emergency_contact_phone')} mono />
                  <Row label="Status Hubungan" value={pick(emp, 'emergency_contact_relationship')} />
                  <Row label="Status Pernikahan" value={marital ? findOptionLabel(maritals, marital) : undefined} />
                  {marital === 'MARRIED' && <Row label="Nama Pasangan" value={pick(emp, 'spouse_name')} />}
                </div>
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-1">Data Anak ({children.length}):</div>
                  {children.length > 0 ? (
                    <div className="space-y-1">
                      {children.map((c, i) => (
                        <div key={i} className="flex justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                          <span className="text-slate-500">{c.age} tahun</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">Tidak ada data anak.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Riwayat Training */}
          <div>
            <Heading>Riwayat Training ({trainings.length})</Heading>
            {trainings.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="text-left px-3 py-2">Nama Training</th>
                      <th className="text-left px-3 py-2">Penyelenggara</th>
                      <th className="text-left px-3 py-2">Tahun</th>
                      <th className="text-left px-3 py-2">Sertifikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {trainings.map((t, i) => {
                      const url = resolveBackendFileUrl(t.certificate_url);
                      return (
                        <tr key={i}>
                          <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{t.name}</td>
                          <td className="px-3 py-2">{t.organizer || '-'}</td>
                          <td className="px-3 py-2">{t.year || '-'}</td>
                          <td className="px-3 py-2">
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">
                                Lihat / Unduh Dokumen
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">Belum ada riwayat training.</div>
            )}
          </div>

          {/* Dokumen Karyawan */}
          <div>
            <Heading>Dokumen Karyawan</Heading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <DocumentPreview label="Foto KTP" url={pick(emp, 'ktp_photo_url')} />
              <DocumentPreview label="Kartu Keluarga (KK)" url={pick(emp, 'kk_photo_url')} />
              <DocumentPreview label="Kartu NPWP" url={pick(emp, 'npwp_photo_url')} />
              <DocumentPreview label="Ijazah Terakhir" url={pick(emp, 'ijazah_photo_url')} />
            </div>
          </div>

          {/* Cara B — Upload & lampirkan langsung */}
          {canManage && employeeId && (
            <div className="p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <div className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                <Upload className="w-4 h-4" /> Unggah & Lampirkan Dokumen Langsung
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {fileInput('Foto KTP', ktp, setKtp)}
                {fileInput('Kartu Keluarga', kk, setKk)}
                {fileInput('Kartu NPWP', npwp, setNpwp)}
                {fileInput('Ijazah Terakhir', ijazah, setIjazah)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1.4fr_1fr_100px] gap-2">
                {fileInput('Sertifikat Training', cert, setCert)}
                <input className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" placeholder="Nama training"
                  value={trName} onChange={(e) => setTrName(e.target.value)} disabled={!cert} />
                <input className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" placeholder="Penyelenggara"
                  value={trOrg} onChange={(e) => setTrOrg(e.target.value)} disabled={!cert} />
                <input type="number" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" placeholder="Tahun"
                  value={trYear} onChange={(e) => setTrYear(e.target.value === '' ? '' : Number(e.target.value))} disabled={!cert} />
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {uploadMsg ? (
                  <span className={`text-xs font-bold flex items-center gap-1 ${uploadMsg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {uploadMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {uploadMsg.text}
                  </span>
                ) : <span />}
                <button type="button" onClick={handleDirectUpload} disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Unggah ke Data Karyawan
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white cursor-pointer">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

