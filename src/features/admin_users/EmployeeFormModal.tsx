import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Pencil,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Shield,
  IdCard,
  Users,
  GraduationCap,
  Award,
  Wallet,
  Phone,
} from 'lucide-react';
import type { UserRole } from '../../types';
import {
  createEmployeeApi,
  updateEmployeeApi,
} from '../../services/hrdService';
import {
  useSystemChoices,
  SelectOption,
  findOptionDescription,
  DEFAULT_DIVISIONS,
  DEFAULT_USER_LEVELS,
  DEFAULT_EMPLOYMENT_STATUSES,
  DEFAULT_MARITAL_STATUSES,
  DEFAULT_EDUCATIONS,
  DEFAULT_RELIGIONS,
} from '../../hooks/useSystemChoices';
import { CustomAccessMatrix } from '../../components/rbac/CustomAccessMatrix';
import {
  AccessMatrix,
  getDefaultAccessMatrix,
  matrixToPermissions,
  permissionsToMatrix,
} from '../../utils/rbacMatrix';
import {
  EmployeeFormState,
  createEmptyEmployeeForm,
  employeeToFormState,
  formStateToPayload,
  RELATIONSHIP_SUGGESTIONS,
} from './employeeFormUtils';
import { DocumentUploadField } from './EmployeeDocumentUpload';

/** Derive functional role (role_id) from user_level + 8 division code */
export const getDerivedRole = (level: string, department: string): UserRole => {
  if (level === 'L0_SUPER_ADMIN') return 'SUPER_ADMIN';
  if (level === 'L1_DIREKSI') return 'DIREKSI';
  const isManager = level === 'L2_MANAGER';
  switch (department) {
    case 'SALES': return isManager ? 'SALES_MANAGER' : 'SALES_EXEC';
    case 'DELIVERY': return isManager ? 'WAREHOUSE_MANAGER' : 'WAREHOUSE';
    case 'WAREHOUSE_PPIC': return isManager ? 'PPIC_MANAGER' : 'PPIC_PLANNER';
    case 'PRODUKSI_QC': return isManager ? 'QC_MANAGER' : 'QC_INSPECTOR';
    case 'PURCHASING': return isManager ? 'PURCHASING_MANAGER' : 'PURCHASING';
    case 'FINANCE': return isManager ? 'FINANCE_MANAGER' : 'FINANCE_ACCT';
    case 'RND': return isManager ? 'QC_MANAGER' : 'QC_INSPECTOR';
    case 'HRD': return isManager ? 'HRD_MANAGER' : 'HRD_STAFF';
    default: return isManager ? 'HRD_MANAGER' : 'OPERATOR_PROD';
  }
};

const asOptions = (data: any, fallback: SelectOption[]): SelectOption[] =>
  Array.isArray(data) && data.length > 0 ? data : fallback;

const inputCls =
  'w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

const Section: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({
  title,
  icon: Icon,
  children,
}) => (
  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4">
    <p className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
      <Icon className="w-4 h-4" />
      {title}
    </p>
    {children}
  </div>
);

interface EmployeeFormModalProps {
  mode: 'create' | 'edit';
  employee?: any | null;       // raw API employee for edit
  employeeId?: string | null;
  canViewSensitive: boolean;   // false for L3_STAFF → hide basic_salary & bank_account_number
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  mode,
  employee,
  employeeId,
  canViewSensitive,
  onClose,
  onSaved,
}) => {
  const { data: allChoices } = useSystemChoices();
  const departments = asOptions(allChoices?.departments, DEFAULT_DIVISIONS);
  const userLevels = asOptions(allChoices?.userLevels, DEFAULT_USER_LEVELS);
  const employmentStatuses = asOptions(allChoices?.employmentStatuses, DEFAULT_EMPLOYMENT_STATUSES);
  const maritalStatuses = asOptions(allChoices?.maritalStatuses, DEFAULT_MARITAL_STATUSES);
  const educations = asOptions(allChoices?.educations, DEFAULT_EDUCATIONS);
  const religions = asOptions(allChoices?.religions, DEFAULT_RELIGIONS);

  const isEdit = mode === 'edit';
  const [form, setForm] = useState<EmployeeFormState>(() =>
    isEdit && employee ? employeeToFormState(employee) : createEmptyEmployeeForm(DEFAULT_DIVISIONS[0].value)
  );
  const [matrix, setMatrix] = useState<AccessMatrix>(() =>
    isEdit && employee
      ? permissionsToMatrix(
          employee.permissions || [],
          employee.user_level || employee.userLevel,
          employee.department
        )
      : getDefaultAccessMatrix('L3_STAFF', DEFAULT_DIVISIONS[0].value)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && employee) setForm(employeeToFormState(employee));
  }, [isEdit, employee]);

  const set = <K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNameChange = (val: string) => {
    setForm((prev) => {
      const next = { ...prev, full_name: val };
      if (!isEdit && val.trim()) {
        const parts = val.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/);
        const slug = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
        next.email = `${slug}@stmorita.co.id`;
        next.username = slug.replace(/\./g, '_');
      }
      return next;
    });
  };

  // ── Children helpers ──
  const addChild = () => set('children', [...form.children, { name: '', age: 0 }]);
  const updateChild = (i: number, key: 'name' | 'age', value: string) =>
    set(
      'children',
      form.children.map((c, idx) => (idx === i ? { ...c, [key]: key === 'age' ? Number(value) || 0 : value } : c))
    );
  const removeChild = (i: number) => set('children', form.children.filter((_, idx) => idx !== i));

  // ── Training helpers ──
  const addTraining = () =>
    set('trainings', [...form.trainings, { name: '', organizer: '', year: new Date().getFullYear(), certificate_url: '' }]);
  const updateTraining = (i: number, key: 'name' | 'organizer' | 'year' | 'certificate_url', value: string) =>
    set(
      'trainings',
      form.trainings.map((t, idx) =>
        idx === i ? { ...t, [key]: key === 'year' ? (value === '' ? '' : Number(value)) : value } : t
      )
    );
  const removeTraining = (i: number) => set('trainings', form.trainings.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^EMP-\d{4}-\d{3,4}$/.test(form.nik.trim())) return setError('Format NIK harus EMP-YYYY-NNN (contoh: EMP-2026-001).');
    if (form.full_name.trim().length < 2) return setError('Nama lengkap wajib diisi.');
    if (form.identity_card_number.length !== 16) return setError('Nomor KTP harus tepat 16 digit.');
    if (!form.department) return setError('Divisi wajib dipilih.');
    if (!isEdit) {
      if (form.username.trim().length < 3) return setError('Username minimal 3 karakter.');
      if (form.password.length < 8) return setError('Password minimal 8 karakter.');
    }
    if (form.marital_status === 'MARRIED' && !form.spouse_name.trim()) {
      return setError('Nama pasangan wajib diisi untuk status Nikah.');
    }

    const payload = formStateToPayload(form, {
      includeCredentials: !isEdit,
      includeSensitive: canViewSensitive,
      roleId: getDerivedRole(form.user_level, form.department),
      permissions: matrixToPermissions(matrix),
    });

    setSubmitting(true);
    try {
      if (isEdit && employeeId) {
        const { username: _u, ...updatePayload } = payload as any;
        await updateEmployeeApi(employeeId, updatePayload);
        onSaved(`Data karyawan "${form.full_name}" berhasil diperbarui.`);
      } else {
        await createEmployeeApi(payload);
        onSaved(`Akun karyawan "${form.full_name}" berhasil dibuat (${form.department} • ${form.user_level}).`);
      }
    } catch (err: any) {
      const d = err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message;
      setError(
        Array.isArray(d)
          ? d.map((x: any) => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join('; ')
          : typeof d === 'string'
            ? d
            : JSON.stringify(d)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-slate-50 dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              {isEdit ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                {isEdit ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Master Data Karyawan • Divisi HRD • tersimpan di database PostgreSQL
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* 1–4: Identitas, Divisi & Akun */}
            <Section title="Identitas, Divisi & Akun Login" icon={Shield}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>No Karyawan (NIK) *</label>
                  <input className={`${inputCls} font-mono`} value={form.nik} onChange={(e) => set('nik', e.target.value)}
                    placeholder="EMP-2026-001" disabled={isEdit} required />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Nama Lengkap *</label>
                  <input className={inputCls} value={form.full_name} onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Contoh: Rian Pratama, S.T." required />
                </div>
                <div>
                  <label className={labelCls}>Divisi / Department *</label>
                  <select className={`${inputCls} font-bold`} value={form.department} required
                    onChange={(e) => { set('department', e.target.value); setMatrix(getDefaultAccessMatrix(form.user_level, e.target.value)); }}>
                    {departments.map((d) => <option key={d.value} value={d.value}>{d.label} ({d.value})</option>)}
                  </select>
                  {findOptionDescription(departments, form.department) && (
                    <p className="mt-1 text-[11px] text-slate-500 italic line-clamp-2">{findOptionDescription(departments, form.department)}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Level Akses (user_level) *</label>
                  <select className={`${inputCls} font-bold`} value={form.user_level} required
                    onChange={(e) => { set('user_level', e.target.value); setMatrix(getDefaultAccessMatrix(e.target.value, form.department)); }}>
                    {userLevels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status Kepegawaian *</label>
                  <select className={`${inputCls} font-bold`} value={form.employment_status} required
                    onChange={(e) => set('employment_status', e.target.value)}>
                    {employmentStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Username *</label>
                  <input className={`${inputCls} font-mono`} value={form.username} onChange={(e) => set('username', e.target.value)}
                    disabled={isEdit} required={!isEdit} minLength={3} placeholder="rian_pratama" />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" className={`${inputCls} font-mono`} value={form.email} onChange={(e) => set('email', e.target.value)}
                    required placeholder="nama@stmorita.co.id" />
                </div>
                {!isEdit && (
                  <div>
                    <label className={labelCls}>Password Sementara * <span className="font-normal text-slate-400">(min. 8)</span></label>
                    <input type="text" className={`${inputCls} font-mono`} value={form.password} onChange={(e) => set('password', e.target.value)}
                      required minLength={8} placeholder="Wajib diganti saat login pertama" />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Tanggal Masuk Kerja *</label>
                  <input type="date" className={inputCls} value={form.join_date} onChange={(e) => set('join_date', e.target.value)} required />
                </div>
              </div>
            </Section>

            {/* 5–9: Dokumen Legal */}
            <Section title="Dokumen Identitas, NPWP & BPJS" icon={IdCard}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>No KTP (16 digit) *</label>
                  <input className={`${inputCls} font-mono ${form.identity_card_number.length > 0 && form.identity_card_number.length !== 16 ? 'border-rose-400' : ''}`}
                    value={form.identity_card_number} inputMode="numeric" required placeholder="16 digit NIK KTP"
                    onChange={(e) => set('identity_card_number', e.target.value.replace(/\D/g, '').slice(0, 16))} />
                  {form.identity_card_number.length > 0 && form.identity_card_number.length !== 16 && (
                    <p className="text-[11px] text-rose-500 mt-0.5">{form.identity_card_number.length}/16 digit</p>
                  )}
                </div>
                <DocumentUploadField label="Upload Foto KTP" docType="ktp" value={form.ktp_photo_url} onChange={(v) => set('ktp_photo_url', v)} />
                <DocumentUploadField label="Upload Kartu Keluarga (KK)" docType="kk" value={form.kk_photo_url} onChange={(v) => set('kk_photo_url', v)} />

                <div>
                  <label className={labelCls}>No NPWP</label>
                  <input className={`${inputCls} font-mono`} value={form.npwp_number} onChange={(e) => set('npwp_number', e.target.value)} placeholder="00.000.000.0-000.000" />
                </div>
                <DocumentUploadField label="Upload Kartu NPWP" docType="npwp" value={form.npwp_photo_url} onChange={(v) => set('npwp_photo_url', v)} />
                <div />

                <div>
                  <label className={labelCls}>No BPJS Kesehatan</label>
                  <input className={`${inputCls} font-mono`} value={form.bpjs_kesehatan} onChange={(e) => set('bpjs_kesehatan', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>No BPJS Ketenagakerjaan</label>
                  <input className={`${inputCls} font-mono`} value={form.bpjs_ketenagakerjaan} onChange={(e) => set('bpjs_ketenagakerjaan', e.target.value)} />
                </div>
              </div>
            </Section>

            {/* 10–14: Data Pribadi & Kontak Darurat */}
            <Section title="Data Pribadi & Kontak Darurat" icon={Phone}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Tempat Lahir</label>
                  <input className={inputCls} value={form.place_of_birth} onChange={(e) => set('place_of_birth', e.target.value)} placeholder="Contoh: Bekasi" />
                </div>
                <div>
                  <label className={labelCls}>Tanggal Lahir</label>
                  <input type="date" className={inputCls} value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Agama</label>
                  <select className={inputCls} value={form.religion} onChange={(e) => set('religion', e.target.value)}>
                    <option value="">-- Pilih Agama --</option>
                    {religions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>No. HP (Pribadi) *</label>
                  <input className={`${inputCls} font-mono`} value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} required maxLength={20} placeholder="+62 8xx-xxxx-xxxx" />
                </div>
                <div>
                  <label className={labelCls}>Kontak Darurat (No. HP/Telp)</label>
                  <input className={`${inputCls} font-mono`} value={form.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} maxLength={20} />
                </div>
                <div>
                  <label className={labelCls}>Status Hubungan Kontak Darurat</label>
                  <input className={inputCls} list="emp-relationship-list" value={form.emergency_contact_relationship}
                    onChange={(e) => set('emergency_contact_relationship', e.target.value)} placeholder="Istri / Suami / Orang Tua / Saudara" />
                  <datalist id="emp-relationship-list">
                    {RELATIONSHIP_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
                  </datalist>
                </div>
                <div className="md:col-span-3">
                  <label className={labelCls}>Alamat</label>
                  <textarea className={`${inputCls} min-h-[72px]`} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Alamat domisili lengkap" />
                </div>
              </div>
            </Section>

            {/* 15: Status Nikah & Keluarga */}
            <Section title="Status Pernikahan & Keluarga" icon={Users}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Status (Nikah / Single)</label>
                  <select className={`${inputCls} font-bold`} value={form.marital_status}
                    onChange={(e) => {
                      const v = e.target.value === 'MARRIED' ? 'MARRIED' : 'SINGLE';
                      setForm((prev) => ({ ...prev, marital_status: v, spouse_name: v === 'MARRIED' ? prev.spouse_name : '' }));
                    }}>
                    {maritalStatuses.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Nama Pasangan {form.marital_status === 'MARRIED' && '*'}</label>
                  <input className={inputCls} value={form.spouse_name} onChange={(e) => set('spouse_name', e.target.value)}
                    disabled={form.marital_status !== 'MARRIED'}
                    placeholder={form.marital_status === 'MARRIED' ? 'Nama suami / istri' : 'Aktif jika status Nikah'} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Data Anak ({form.children.length})</span>
                  <button type="button" onClick={addChild}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Tambah Anak
                  </button>
                </div>
                {form.children.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada data anak.</p>}
                {form.children.map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                    <input className={inputCls} value={c.name} onChange={(e) => updateChild(i, 'name', e.target.value)} placeholder={`Nama anak ke-${i + 1}`} />
                    <input type="number" min={0} max={60} className={inputCls} value={c.age} onChange={(e) => updateChild(i, 'age', e.target.value)} placeholder="Usia" />
                    <button type="button" onClick={() => removeChild(i)} className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer" title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            {/* 16: Pendidikan */}
            <Section title="Pendidikan Terakhir" icon={GraduationCap}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Pendidikan Terakhir</label>
                  <select className={inputCls} value={form.last_education} onChange={(e) => set('last_education', e.target.value)}>
                    <option value="">-- Pilih Pendidikan --</option>
                    {educations.map((ed) => <option key={ed.value} value={ed.value}>{ed.label}</option>)}
                  </select>
                </div>
                <DocumentUploadField label="Upload Ijazah Terakhir" docType="ijazah" value={form.ijazah_photo_url} onChange={(v) => set('ijazah_photo_url', v)} />
              </div>
            </Section>

            {/* 17: Training */}
            <Section title="Riwayat Training & Sertifikat" icon={Award}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{form.trainings.length} training tercatat</span>
                <button type="button" onClick={addTraining}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Tambah Training
                </button>
              </div>
              {form.trainings.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada data training.</p>}
              {form.trainings.map((t, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_110px_auto] gap-2 items-end">
                    <div>
                      <label className={labelCls}>Nama Training</label>
                      <input className={inputCls} value={t.name} onChange={(e) => updateTraining(i, 'name', e.target.value)} placeholder="Contoh: K3 Umum" />
                    </div>
                    <div>
                      <label className={labelCls}>Penyelenggara</label>
                      <input className={inputCls} value={t.organizer} onChange={(e) => updateTraining(i, 'organizer', e.target.value)} placeholder="Contoh: Kemnaker RI" />
                    </div>
                    <div>
                      <label className={labelCls}>Tahun</label>
                      <input type="number" min={1970} max={2100} className={inputCls} value={t.year} onChange={(e) => updateTraining(i, 'year', e.target.value)} />
                    </div>
                    <button type="button" onClick={() => removeTraining(i)} className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer h-[38px]" title="Hapus training">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <DocumentUploadField label="Upload Sertifikat Training" docType="training_certificate"
                    value={t.certificate_url} onChange={(v) => updateTraining(i, 'certificate_url', v)} />
                </div>
              ))}
            </Section>

            {/* Payroll — hidden for L3_STAFF */}
            {canViewSensitive && (
              <Section title="Payroll & Rekening Bank (Data Sensitif)" icon={Wallet}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Gaji Pokok (IDR)</label>
                    <input type="number" min={0} step={100000} className={`${inputCls} font-mono`} value={form.basic_salary}
                      onChange={(e) => set('basic_salary', e.target.value === '' ? '' : Number(e.target.value))} placeholder="5000000" />
                  </div>
                  <div>
                    <label className={labelCls}>Nama Bank</label>
                    <input className={inputCls} value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} maxLength={50} placeholder="BCA / Mandiri / BRI" />
                  </div>
                  <div>
                    <label className={labelCls}>No. Rekening</label>
                    <input className={`${inputCls} font-mono`} value={form.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)} maxLength={30} />
                  </div>
                </div>
              </Section>
            )}

            {/* Granular RBAC */}
            <CustomAccessMatrix value={matrix} onChange={setMatrix} userLevel={form.user_level} department={form.department} />

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-start gap-2 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400 hidden sm:block">* wajib diisi. Dokumen diunggah otomatis saat file dipilih.</p>
            <div className="flex items-center gap-2.5 ml-auto">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                Batal
              </button>
              <button type="submit" disabled={submitting}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-sm flex items-center gap-2 cursor-pointer">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isEdit ? 'Simpan Perubahan' : 'Daftarkan Karyawan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

