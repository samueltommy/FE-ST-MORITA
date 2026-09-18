import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Lock,
  Key,
  Building2,
  Mail,
  Phone,
  Calendar,
  Eye,
  RefreshCw,
  Sparkles,
  Award,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
  LogIn,
  Loader2,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { PermissionClaim, RoleTier, UserProfile, UserRole } from '../../types';
import { ROLE_DEFINITIONS, getTierBadge, canManageUsers } from '../../utils/rbac';
import { useAuthStore } from '../../store/useAuthStore';
import { createEmployeeApi } from '../../services/hrdService';
import type { CreateEmployeePayload } from '../../services/hrdService';

// Mapping dari UserRole (FE) → user_level enum (BE)
const ROLE_TO_USER_LEVEL: Record<UserRole, CreateEmployeePayload['user_level']> = {
  SUPER_ADMIN: 'L0_SUPER_ADMIN',
  DIREKSI: 'L1_DIREKSI',
  HRD_MANAGER: 'L2_MANAGER',
  PPIC_MANAGER: 'L2_MANAGER',
  PURCHASING_MANAGER: 'L2_MANAGER',
  QC_MANAGER: 'L2_MANAGER',
  SALES_MANAGER: 'L2_MANAGER',
  COST_CONTROL: 'L2_MANAGER',
  WAREHOUSE_MANAGER: 'L2_MANAGER',
  FINANCE_MANAGER: 'L2_MANAGER',
  OPERATOR_PROD: 'L3_STAFF',
  QC_INSPECTOR: 'L3_STAFF',
  SALES_EXEC: 'L3_STAFF',
  WAREHOUSE: 'L3_STAFF',
  PURCHASING: 'L3_STAFF',
  FINANCE_ACCT: 'L3_STAFF',
  HRD_STAFF: 'L3_STAFF',
  PPIC_PLANNER: 'L3_STAFF',
};

const getDerivedRole = (level: string, department: string): UserRole => {
  if (level === 'L0_SUPER_ADMIN') return 'SUPER_ADMIN';
  if (level === 'L1_DIREKSI') return 'DIREKSI';

  if (level === 'L2_MANAGER') {
    switch (department) {
      case 'FINANCE': return 'FINANCE_MANAGER';
      case 'HRD': return 'HRD_MANAGER';
      case 'PPIC': return 'PPIC_MANAGER';
      case 'QC': return 'QC_MANAGER';
      case 'SALES': return 'SALES_MANAGER';
      case 'WAREHOUSE': return 'WAREHOUSE_MANAGER';
      case 'EXTERNAL_PORTAL': return 'PURCHASING_MANAGER';
      case 'RND': return 'QC_MANAGER';
      default: return 'HRD_MANAGER';
    }
  }

  if (level === 'L4_EXTERNAL') return 'PURCHASING';

  switch (department) {
    case 'FINANCE': return 'FINANCE_ACCT';
    case 'HRD': return 'HRD_STAFF';
    case 'PPIC': return 'OPERATOR_PROD';
    case 'QC': return 'QC_INSPECTOR';
    case 'SALES': return 'SALES_EXEC';
    case 'WAREHOUSE': return 'WAREHOUSE';
    case 'EXTERNAL_PORTAL': return 'PURCHASING';
    case 'RND': return 'QC_INSPECTOR';
    default: return 'OPERATOR_PROD';
  }
};

export const UserManagementModule: React.FC = () => {
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // ─── Form State — matches exact BE EmployeeCreate schema ─────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');

  // Required fields
  const [fNik, setFNik] = useState(`EMP-${new Date().getFullYear()}-001`);
  const [fFullName, setFFullName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPhone, setFPhone] = useState('+62 ');
  const [fEmploymentStatus, setFEmploymentStatus] = useState<CreateEmployeePayload['employment_status']>('PERMANENT');
  const [fJoinDate, setFJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [fUsername, setFUsername] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fUserLevel, setFUserLevel] = useState<CreateEmployeePayload['user_level']>('L3_STAFF');
  const [fKtp, setFKtp] = useState(''); // 16-digit KTP number
  const [fSalary, setFSalary] = useState<number | ''>('');

  // Optional fields
  const [fDepartment, setFDepartment] = useState('PPIC');

  // Derived Role
  const derivedRole = getDerivedRole(fUserLevel, fDepartment);
  const [fBankName, setFBankName] = useState('');
  const [fBankAccount, setFBankAccount] = useState('');

  // Inspect Permissions Modal State
  const [inspectUser, setInspectUser] = useState<UserProfile | null>(null);

  const authToken = useAuthStore((state) => state.token);
  const isAuthorized = canManageUsers(currentUser);

  // Auto-fill email & username when full_name changes
  const handleNameChange = (val: string) => {
    setFFullName(val);
    if (val.trim()) {
      const parts = val.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(' ');
      const slug = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
      setFEmail(`${slug}@stmorita.co.id`);
      setFUsername(slug.replace(/\./g, '_'));
    }
  };



  const resetForm = () => {
    setFNik(`EMP-${new Date().getFullYear()}-001`);
    setFFullName(''); setFEmail(''); setFPhone('+62'); setFUsername(''); setFPassword('');
    setFKtp(''); setFSalary(''); setFBankName(''); setFBankAccount('');
    setFUserLevel('L3_STAFF');
    setFEmploymentStatus('PERMANENT');
    setFJoinDate(new Date().toISOString().split('T')[0]);
    setFDepartment('PPIC');
    setFormError('');
  };

  // Submit — calls real BE API
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fFullName.trim() || !fEmail.trim() || !fUsername.trim() || !fPassword.trim()) return;
    if (fKtp.length !== 16) { setFormError('Nomor KTP harus tepat 16 digit.'); return; }
    if (!fSalary || Number(fSalary) <= 0) { setFormError('Gaji pokok harus diisi dan lebih dari 0.'); return; }
    if (fPassword.length < 8) { setFormError('Password minimal 8 karakter.'); return; }

    const payload: CreateEmployeePayload = {
      nik: fNik.trim(),
      full_name: fFullName.trim(),
      email: fEmail.trim(),
      phone_number: fPhone.trim(),
      employment_status: fEmploymentStatus,
      join_date: fJoinDate,
      username: fUsername.trim(),
      password: fPassword,
      role_id: derivedRole,     // Derived automatically
      user_level: fUserLevel,
      identity_card_number: fKtp.trim(),
      basic_salary: Number(fSalary),
      department: fDepartment || null,
      bank_name: fBankName || null,
      bank_account_number: fBankAccount || null,
    };

    setIsSubmitting(true);
    setFormError('');
    try {
      await createEmployeeApi(payload);
      setFormSuccessMessage(`Akun pegawai untuk "${fFullName}" berhasil dibuat dengan role ${derivedRole} (${fUserLevel}).`);
      resetForm();
      setIsFormOpen(false);
      setTimeout(() => setFormSuccessMessage(''), 8000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail
        || err?.response?.data?.message
        || (Array.isArray(err?.response?.data?.detail) ? JSON.stringify(err.response.data.detail) : null)
        || err?.message
        || 'Gagal membuat akun. Cek kembali data yang dimasukkan.';
      setFormError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier =
      selectedTierFilter === 'ALL' || u.tier.toString() === selectedTierFilter;

    const matchesDept =
      selectedDeptFilter === 'ALL' || u.department.toLowerCase().includes(selectedDeptFilter.toLowerCase());

    return matchesSearch && matchesTier && matchesDept;
  });

  // Calculate Metrics
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const l0Count = users.filter((u) => u.tier === 0).length;
  const l1Count = users.filter((u) => u.tier === 1).length;
  const l2Count = users.filter((u) => u.tier === 2).length;
  const l3Count = users.filter((u) => u.tier === 3).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Manajemen Akun Pegawai & Kontrol Akses (RBAC)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Pusat pembuatan akun karyawan baru PT ST. Morita Industries, penugasan tingkatan peran (Level 0 - Level 3), dan audit keamanan akses
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthorized && (
              <button
                id="open-create-user-btn"
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                {isFormOpen ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{isFormOpen ? 'Tutup Formulir Pendaftaran' : 'Buat Akun Pegawai Baru'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {formSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold">Penerbitan Kredensial Berhasil!</div>
            <div>{formSuccessMessage}</div>
          </div>
        </div>
      )}

      {/* Access Restriction Notice if user cannot manage accounts */}
      {!isAuthorized && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Mode Tinjau Terbatas:</span> Anda sedang login sebagai{' '}
            <span className="font-extrabold underline">{currentUser.name}</span> ({ROLE_DEFINITIONS[currentUser.role]?.label || currentUser.role}). Hak pembuatan akun dan reset sandi hanya tersedia bagi Super Admin (Level 0) atau HRD Manager (Level 2).
          </div>
        </div>
      )}

      {/* Metrics Cards: Tier Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pegawai</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{activeCount} Akun Aktif</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 shadow-xs">
          <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">L0: Super Admin</div>
          <div className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-1">{l0Count}</div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">Sistem & Keamanan</div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">L1: Direksi</div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">{l1Count}</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Executive C-Level</div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">L2: Manager</div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1">{l2Count}</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Admin 7 Departemen</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">L3: Staff & Ops</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{l3Count}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Data Entry & Barcode</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Standar Mutu</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">ISO 9001:2015</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Audit Trail Terverifikasi</div>
        </div>
      </div>

      {/* FORM: Buat Akun Pegawai Baru — Sinkron dengan BE EmployeeCreate schema */}
      {isFormOpen && isAuthorized && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Formulir Pembuatan Akun Pegawai Baru ST. Morita Industries</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Data akan disimpan ke database <strong>dan</strong> akun akan dibuat otomatis dengan role & group yang sesuai.
              </p>
            </div>
            <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="text-xs font-bold text-slate-400 hover:text-slate-600">
              Batal
            </button>
          </div>

          {/* Error alert */}
          {formError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div><span className="font-bold">Error: </span>{formError}</div>
            </div>
          )}

          <form onSubmit={handleCreateAccount} className="space-y-5 pt-4">

            {/* ── Row 1: Identitas Dasar ── */}
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">① Identitas Pegawai</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIK Karyawan * <span className="font-normal text-slate-400">(format: EMP-YYYY-NNN)</span></label>
                  <input type="text" value={fNik} onChange={e => setFNik(e.target.value)} required
                    pattern="^EMP-\d{4}-\d{3,4}$" title="Format: EMP-2026-001"
                    placeholder="EMP-2026-001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input type="text" value={fFullName} onChange={e => handleNameChange(e.target.value)} required minLength={2} maxLength={200}
                    placeholder="Contoh: Rian Pratama, S.T."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi *</label>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} required
                    placeholder="nama@stmorita.co.id"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. KTP (16 digit) *</label>
                  <input type="text" value={fKtp} onChange={e => setFKtp(e.target.value.replace(/\D/g, '').slice(0, 16))} required
                    minLength={16} maxLength={16} inputMode="numeric"
                    placeholder="16 digit Nomor KTP"
                    className={`w-full px-3 py-2 rounded-xl bg-slate-50 border text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none ${fKtp.length > 0 && fKtp.length !== 16 ? 'border-rose-400' : 'border-slate-300'}`} />
                  {fKtp.length > 0 && fKtp.length !== 16 && <p className="text-[10px] text-rose-500 mt-0.5">{fKtp.length}/16 digit</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Telepon / WA *</label>
                  <input type="text" value={fPhone} onChange={e => setFPhone(e.target.value)} required maxLength={20}
                    placeholder="+62 8xx-xxxx-xxxx"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Bergabung *</label>
                  <input type="date" value={fJoinDate} onChange={e => setFJoinDate(e.target.value)} required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* ── Row 2: Status & Penempatan ── */}
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">② Status Kepegawaian & Penempatan</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Kepegawaian *</label>
                  <select value={fEmploymentStatus} onChange={e => setFEmploymentStatus(e.target.value as any)} required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold">
                    <option value="PERMANENT">PERMANENT — Karyawan Tetap</option>
                    <option value="CONTRACT">CONTRACT — Karyawan Kontrak (PKWT)</option>
                    <option value="PROBATION">PROBATION — Masa Percobaan</option>
                    <option value="INTERNSHIP">INTERNSHIP — Magang / PKL</option>
                    <option value="RESIGNED">RESIGNED — Sudah Mengundurkan Diri</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Departemen Penempatan</label>
                  <select value={fDepartment} onChange={e => setFDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="EXTERNAL_PORTAL">Procurement & Bea Cukai (EXIM)</option>
                    <option value="FINANCE">Finance, Tax & Cost Accounting</option>
                    <option value="HRD">Human Resources & GA</option>
                    <option value="PPIC">PPIC & Production Control</option>
                    <option value="QC">Quality Assurance & QC Lab</option>
                    <option value="RND">R&D / Executive IT</option>
                    <option value="SALES">Commercial Sales & BD</option>
                    <option value="WAREHOUSE">Logistics & Warehouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gaji Pokok (IDR) *</label>
                  <input type="number" value={fSalary} onChange={e => setFSalary(e.target.value === '' ? '' : Number(e.target.value))} required
                    min={1} step={500000} placeholder="Contoh: 5000000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* ── Row 3: Akun Login & RBAC ── */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">③ Akun Login & Hak Akses (RBAC)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username Login *</label>
                  <input type="text" value={fUsername} onChange={e => setFUsername(e.target.value)} required minLength={3} maxLength={100}
                    placeholder="Contoh: rian_pratama"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password Sementara * <span className="font-normal text-slate-400">(min. 8 karakter)</span></label>
                  <input type="text" value={fPassword} onChange={e => setFPassword(e.target.value)} required minLength={8}
                    placeholder="Password awal — pegawai akan diminta ganti saat login pertama"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* user_level */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Level Akses (user_level) *
                  </label>
                  <select value={fUserLevel} onChange={e => setFUserLevel(e.target.value as any)} required
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="L0_SUPER_ADMIN">L0 — Super Admin</option>
                    <option value="L1_DIREKSI">L1 — Direksi / Executive</option>
                    <option value="L2_MANAGER">L2 — Manager / Admin Bidang</option>
                    <option value="L3_STAFF">L3 — Staff / Operator</option>
                    <option value="L4_EXTERNAL">L4 — External / Mitra</option>
                  </select>
                </div>
              </div>

              {/* Role Preview */}
              {ROLE_DEFINITIONS[derivedRole] && (
                <div className="text-xs p-3 rounded-lg bg-blue-50/50 border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span>Preview Peran Fungsional Otomatis — {ROLE_DEFINITIONS[derivedRole].label}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getTierBadge(ROLE_DEFINITIONS[derivedRole].tier).badgeClass}`}>
                      {fUserLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Peran fungsional ini ditentukan secara otomatis berdasarkan kombinasi Departemen dan Level Akses yang Anda pilih.
                    <br /><br />
                    {ROLE_DEFINITIONS[derivedRole].description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {ROLE_DEFINITIONS[derivedRole].permissions.map(p => (
                      <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Row 4: Informasi Bank (Opsional) ── */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">④ Informasi Rekening Bank <span className="font-normal normal-case">(opsional)</span></p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank</label>
                  <input type="text" value={fBankName} onChange={e => setFBankName(e.target.value)} maxLength={50}
                    placeholder="Contoh: BCA, BNI, Mandiri, BRI"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Rekening</label>
                  <input type="text" value={fBankAccount} onChange={e => setFBankAccount(e.target.value)} maxLength={30}
                    placeholder="Nomor rekening"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-200">
              <p className="text-[10px] text-slate-400">* Field wajib diisi. Akun akan dibuat otomatis.</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  Batal
                </button>
                <button id="submit-create-employee-btn" type="submit" disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Pegawai & Terbitkan Hak Akses'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIK, email, departemen..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tier & Dept Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Tingkat:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 text-xs">
            <button
              onClick={() => setSelectedTierFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setSelectedTierFilter('1')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === '1'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              L1 Direksi ({l1Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('0')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === '0'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              L0 Admin ({l0Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('2')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === '2'
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              L2 Manager ({l2Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('3')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === '3'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              L3 Staff ({l3Count})
            </button>
          </div>
        </div>
      </div>

      {/* REGISTERED EMPLOYEES TABLE */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Pegawai & Identitas</th>
                <th className="py-3 px-4">Departemen & Penempatan</th>
                <th className="py-3 px-4">Peran & Tingkatan RBAC</th>
                <th className="py-3 px-4">Hak Klaim Izin</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ditemukan akun pegawai yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const tierMeta = getTierBadge(user.tier);
                  const isCurrent = currentUser.id === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${isCurrent ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                    >
                      {/* Name, NIK, Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-extrabold uppercase">
                                  Sesi Aktif
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <span>{user.nik}</span>
                              <span>&bull;</span>
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Location */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {user.department}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{user.plantLocation}</span>
                        </div>
                      </td>

                      {/* Role & Tier Badge */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${tierMeta.badgeClass}`}
                          >
                            {tierMeta.pillText} &bull; Level {user.tier}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {ROLE_DEFINITIONS[user.role]?.label || user.role}
                          </span>
                        </div>
                      </td>

                      {/* Permissions Claim button */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setInspectUser(user)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <Shield className="w-3 h-3 text-blue-500" />
                          <span>{user.permissions.includes('*') ? 'Semua Hak (*)' : `${user.permissions.length} Izin`}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${user.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                          />
                          {user.status === 'ACTIVE' ? 'AKTIF' : 'SUSPENDED'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Login As / Impersonate */}
                          <button
                            onClick={() => appStore.login(user)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title={`Masuk sebagai ${user.name} (Uji Coba RBAC)`}
                          >
                            <LogIn className="w-4 h-4" />
                          </button>

                          {/* Toggle Active / Suspended */}
                          {isAuthorized && (
                            <button
                              onClick={() => appStore.toggleUserStatus(user.id)}
                              className={`p-1.5 rounded-lg transition-colors ${user.status === 'ACTIVE'
                                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                }`}
                              title={user.status === 'ACTIVE' ? 'Tangguhkan Akun' : 'Aktifkan Akun'}
                            >
                              {user.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Reset Password */}
                          {isAuthorized && (
                            <button
                              onClick={() => {
                                if (confirm(`Reset kata sandi untuk ${user.name}? Token baru akan dikirimkan ke ${user.email}.`)) {
                                  appStore.resetUserPassword(user.id);
                                  alert(`Password untuk ${user.name} berhasil direset.`);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Reset Kata Sandi"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Inspect Permissions Claims */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={inspectUser.avatar}
                  alt={inspectUser.name}
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {inspectUser.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {inspectUser.nik} &bull; {inspectUser.department}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierBadge(inspectUser.tier).badgeClass
                  }`}
              >
                Level {inspectUser.tier}
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Klaim Izin Granular (Permissions Claim):
              </div>
              <div className="max-h-60 overflow-y-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5">
                {inspectUser.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="text-[11px] font-mono px-2 py-1 rounded bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl">
              <span className="font-bold text-slate-700 dark:text-slate-300">Deskripsi Peran: </span>
              {ROLE_DEFINITIONS[inspectUser.role]?.description || 'Hak akses standar sistem.'}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
