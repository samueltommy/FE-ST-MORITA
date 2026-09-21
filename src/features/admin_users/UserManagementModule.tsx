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
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { PermissionClaim, RoleTier, UserProfile, UserRole } from '../../types';
import { ROLE_DEFINITIONS, getTierBadge, canManageUsers } from '../../utils/rbac';
import { useAuthStore } from '../../store/useAuthStore';
import { createEmployeeApi, getEmployeesApi, updateEmployeeApi, deleteEmployeeApi, suspendEmployeeApi, resetPasswordApi } from '../../services/hrdService';
import type { CreateEmployeePayload } from '../../services/hrdService';
import { useQuery } from '@tanstack/react-query';

const CONTENT = {
  id: {
    title: 'Manajemen Akun Pegawai & Kontrol Akses (RBAC)',
    desc: 'Pusat pembuatan akun karyawan baru PT ST. Morita Industries, penugasan tingkatan peran (Level 0 - Level 3), dan audit keamanan akses',
    btnFormClose: 'Tutup Formulir Pendaftaran',
    btnFormOpen: 'Buat Akun Pegawai Baru',
    msgSuccess: 'Penerbitan Kredensial Berhasil!',
    msgLimitMode: 'Mode Tinjau Terbatas:',
    msgLimitDesc: 'Anda sedang login sebagai',
    msgLimitRole: 'Hak pembuatan akun dan reset sandi hanya tersedia bagi Super Admin (Level 0) atau HRD Manager (Level 2).',
    kpiTotal: 'Total Pegawai',
    kpiActive: 'Akun Aktif',
    kpiL0: 'L0: Super Admin',
    kpiL0Desc: 'Sistem & Keamanan',
    kpiL1: 'L1: Direksi',
    kpiL1Desc: 'Executive C-Level',
    kpiL2: 'L2: Manager',
    kpiL2Desc: 'Admin 7 Departemen',
    kpiL3: 'L3: Staff & Ops',
    kpiL3Desc: 'Data Entry & Barcode',
    kpiStd: 'Standar Mutu',
    kpiStdVal: 'ISO 9001:2015',
    kpiStdDesc: 'Audit Trail Terverifikasi',
    formTitle: 'Formulir Pembuatan Akun Pegawai Baru ST. Morita Industries',
    formDesc: 'Data akan disimpan ke database dan akun akan dibuat otomatis dengan role & group yang sesuai.',
    formCancel: 'Batal',
    formErr: 'Error:',
    row1Title: '① Identitas Pegawai',
    fNik: 'NIK Karyawan *',
    fNikFmt: '(format: EMP-YYYY-NNN)',
    fName: 'Nama Lengkap *',
    fEmail: 'Email Resmi *',
    fKtp: 'No. KTP (16 digit) *',
    fPhone: 'No. Telepon / WA *',
    fDate: 'Tanggal Bergabung *',
    row2Title: '② Status Kepegawaian & Penempatan',
    fStatus: 'Status Kepegawaian *',
    fDept: 'Departemen Penempatan',
    fSalary: 'Gaji Pokok (IDR) *',
    row3Title: '③ Akun Login & Hak Akses (RBAC)',
    fUsername: 'Username Login *',
    fPass: 'Password Sementara *',
    fPassMin: '(min. 8 karakter)',
    fLvl: 'Level Akses (user_level) *',
    fPreview: 'Preview Peran Fungsional Otomatis —',
    fPreviewDesc: 'Peran fungsional ini ditentukan secara otomatis berdasarkan kombinasi Departemen dan Level Akses yang Anda pilih.',
    row4Title: '④ Informasi Rekening Bank',
    row4Opt: '(opsional)',
    fBank: 'Nama Bank',
    fAcc: 'No. Rekening',
    fReq: '* Field wajib diisi. Akun akan dibuat otomatis.',
    btnSubmitting: 'Mendaftarkan...',
    btnSubmit: 'Daftarkan Pegawai & Terbitkan Hak Akses',
    searchPlc: 'Cari nama, NIK, email, departemen...',
    filterLvl: 'Tingkat:',
    filterAll: 'Semua',
    filterL1: 'L1 Direksi',
    filterL0: 'L0 Admin',
    filterL2: 'L2 Manager',
    filterL3: 'L3 Staff',
    colEmp: 'Pegawai & Identitas',
    colDept: 'Departemen & Penempatan',
    colRole: 'Peran & Tingkatan RBAC',
    colPerm: 'Hak Klaim Izin',
    colStatus: 'Status',
    colAction: 'Tindakan Admin',
    emptyTable: 'Tidak ditemukan akun pegawai yang cocok dengan filter pencarian.',
    activeSession: 'Sesi Aktif',
    allPerms: 'Semua Hak (*)',
    nPerms: 'Izin',
    statusActive: 'AKTIF',
    statusSuspended: 'SUSPENDED',
    actionLoginAs: 'Masuk sebagai',
    actionRbacTest: '(Uji Coba RBAC)',
    actionSuspend: 'Tangguhkan Akun',
    actionActivate: 'Aktifkan Akun',
    actionReset: 'Reset Kata Sandi',
    modalTitle: 'Klaim Izin Granular (Permissions Claim):',
    modalDesc: 'Deskripsi Peran:',
    modalDescDef: 'Hak akses standar sistem.',
    modalClose: 'Tutup',
    errKtp: 'Nomor KTP harus tepat 16 digit.',
    errSalary: 'Gaji pokok harus diisi dan lebih dari 0.',
    errPass: 'Password minimal 8 karakter.',
    msgCreateSuccess: 'Akun pegawai untuk',
    msgCreateSuccessMid: 'berhasil dibuat dengan role',
    msgCreateFail: 'Gagal membuat akun. Cek kembali data yang dimasukkan.',
    alertReset: 'Reset kata sandi untuk',
    alertResetMid: '? Token baru akan dikirimkan ke',
    alertResetSuccess: 'Password untuk',
    alertResetSuccessEnd: 'berhasil direset.',
    statusOptions: {
      perm: 'PERMANENT — Karyawan Tetap',
      cont: 'CONTRACT — Karyawan Kontrak (PKWT)',
      prob: 'PROBATION — Masa Percobaan',
      intern: 'INTERNSHIP — Magang / PKL',
      resign: 'RESIGNED — Sudah Mengundurkan Diri'
    },
    deptOptions: {
      exim: 'Procurement & Bea Cukai (EXIM)',
      fin: 'Finance, Tax & Cost Accounting',
      hrd: 'Human Resources & GA',
      ppic: 'PPIC & Production Control',
      qc: 'Quality Assurance & QC Lab',
      rnd: 'R&D / Executive IT',
      sales: 'Commercial Sales & BD',
      wh: 'Logistics & Warehouse'
    },
    lvlOptions: {
      l0: 'L0 — Super Admin',
      l1: 'L1 — Direksi / Executive',
      l2: 'L2 — Manager / Admin Bidang',
      l3: 'L3 — Staff / Operator',
      l4: 'L4 — External / Mitra'
    }
  },
  en: {
    title: 'Employee Account & Access Control (RBAC) Management',
    desc: 'Central hub for new employee accounts creation, role tier assignments (Level 0 - Level 3), and access security audits',
    btnFormClose: 'Close Registration Form',
    btnFormOpen: 'Create New Employee Account',
    msgSuccess: 'Credential Issuance Successful!',
    msgLimitMode: 'Limited View Mode:',
    msgLimitDesc: 'You are logged in as',
    msgLimitRole: 'Account creation and password reset rights are only available to Super Admin (Level 0) or HRD Manager (Level 2).',
    kpiTotal: 'Total Employees',
    kpiActive: 'Active Accounts',
    kpiL0: 'L0: Super Admin',
    kpiL0Desc: 'System & Security',
    kpiL1: 'L1: Directors',
    kpiL1Desc: 'Executive C-Level',
    kpiL2: 'L2: Manager',
    kpiL2Desc: '7 Departments Admin',
    kpiL3: 'L3: Staff & Ops',
    kpiL3Desc: 'Data Entry & Barcode',
    kpiStd: 'Quality Standard',
    kpiStdVal: 'ISO 9001:2015',
    kpiStdDesc: 'Verified Audit Trail',
    formTitle: 'ST. Morita Industries New Employee Account Form',
    formDesc: 'Data will be saved to the database and an account will be automatically created with the appropriate role & group.',
    formCancel: 'Cancel',
    formErr: 'Error:',
    row1Title: '① Employee Identity',
    fNik: 'Employee ID *',
    fNikFmt: '(format: EMP-YYYY-NNN)',
    fName: 'Full Name *',
    fEmail: 'Official Email *',
    fKtp: 'ID Card No. (16 digits) *',
    fPhone: 'Phone / WA No. *',
    fDate: 'Join Date *',
    row2Title: '② Employment Status & Placement',
    fStatus: 'Employment Status *',
    fDept: 'Placement Department',
    fSalary: 'Basic Salary (IDR) *',
    row3Title: '③ Login Account & Access Rights (RBAC)',
    fUsername: 'Login Username *',
    fPass: 'Temporary Password *',
    fPassMin: '(min. 8 characters)',
    fLvl: 'Access Level (user_level) *',
    fPreview: 'Automatic Functional Role Preview —',
    fPreviewDesc: 'This functional role is automatically determined based on the combination of Department and Access Level you selected.',
    row4Title: '④ Bank Account Information',
    row4Opt: '(optional)',
    fBank: 'Bank Name',
    fAcc: 'Account No.',
    fReq: '* Mandatory fields. Account will be created automatically.',
    btnSubmitting: 'Registering...',
    btnSubmit: 'Register Employee & Issue Access Rights',
    searchPlc: 'Search name, ID, email, department...',
    filterLvl: 'Tier:',
    filterAll: 'All',
    filterL1: 'L1 Directors',
    filterL0: 'L0 Admin',
    filterL2: 'L2 Manager',
    filterL3: 'L3 Staff',
    colEmp: 'Employee & Identity',
    colDept: 'Department & Placement',
    colRole: 'RBAC Role & Tier',
    colPerm: 'Permissions Claim',
    colStatus: 'Status',
    colAction: 'Admin Actions',
    emptyTable: 'No employee accounts match the search filter.',
    activeSession: 'Active Session',
    allPerms: 'All Rights (*)',
    nPerms: 'Permissions',
    statusActive: 'ACTIVE',
    statusSuspended: 'SUSPENDED',
    actionLoginAs: 'Log in as',
    actionRbacTest: '(RBAC Trial)',
    actionSuspend: 'Suspend Account',
    actionActivate: 'Activate Account',
    actionReset: 'Reset Password',
    modalTitle: 'Granular Permissions Claim:',
    modalDesc: 'Role Description:',
    modalDescDef: 'Standard system access rights.',
    modalClose: 'Close',
    errKtp: 'ID Card number must be exactly 16 digits.',
    errSalary: 'Basic salary must be filled and greater than 0.',
    errPass: 'Password minimum 8 characters.',
    msgCreateSuccess: 'Employee account for',
    msgCreateSuccessMid: 'successfully created with role',
    msgCreateFail: 'Failed to create account. Please check the inputted data.',
    alertReset: 'Reset password for',
    alertResetMid: '? A new token will be sent to',
    alertResetSuccess: 'Password for',
    alertResetSuccessEnd: 'successfully reset.',
    statusOptions: {
      perm: 'PERMANENT — Permanent Employee',
      cont: 'CONTRACT — Contract Employee (PKWT)',
      prob: 'PROBATION — Probation Period',
      intern: 'INTERNSHIP — Internship',
      resign: 'RESIGNED — Resigned'
    },
    deptOptions: {
      exim: 'Procurement & Customs (EXIM)',
      fin: 'Finance, Tax & Cost Accounting',
      hrd: 'Human Resources & GA',
      ppic: 'PPIC & Production Control',
      qc: 'Quality Assurance & QC Lab',
      rnd: 'R&D / Executive IT',
      sales: 'Commercial Sales & BD',
      wh: 'Logistics & Warehouse'
    },
    lvlOptions: {
      l0: 'L0 — Super Admin',
      l1: 'L1 — Board of Directors / Executive',
      l2: 'L2 — Manager / Field Admin',
      l3: 'L3 — Staff / Operator',
      l4: 'L4 — External / Partner'
    }
  }
};

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
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const currentUser = useAppStore((state) => state.currentUser);

  // Fetch employees from backend
  const { data: employeeData, isLoading: isLoadingEmployees, refetch } = useQuery({
    queryKey: ['hrd', 'employees'],
    queryFn: () => getEmployeesApi(1, 100),
  });

  // Safely extract array from various possible backend response formats
  const rawData = employeeData as any;
  const apiUsers: any[] = Array.isArray(rawData) 
    ? rawData 
    : Array.isArray(rawData?.data) 
      ? rawData.data 
      : Array.isArray(rawData?.employees) 
        ? rawData.employees 
        : [];

  // Map API Employees to UI UserProfile defensively
  const users: UserProfile[] = apiUsers.map((emp: any) => {
    let tierVal = 3;
    if (emp?.userLevel && typeof emp.userLevel === 'string') {
      const match = emp.userLevel.match(/L(\d)/);
      if (match) tierVal = parseInt(match[1], 10);
    }
    
    return {
      id: String(emp?.id || Math.random()),
      name: String(emp?.fullName || emp?.username || '-'),
      nik: String(emp?.nik || '-'),
      email: String(emp?.email || '-'),
      department: String(emp?.department || '-'),
      role: (emp?.roleId as UserRole) || 'OPERATOR_PROD',
      tier: (isNaN(tierVal) ? 3 : tierVal) as RoleTier,
      status: emp?.isActive === false || emp?.employmentStatus === 'RESIGNED' ? 'SUSPENDED' : 'ACTIVE',
      permissions: [],
      avatar: '',
      plantLocation: 'HO / Main Plant',
    };
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // ─── Form State — matches exact BE EmployeeCreate schema ─────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
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
  const [fDepartment, setFDepartment] = useState('PPIC_PRODUKSI');

  // Derived Role
  const derivedRole = getDerivedRole(fUserLevel, fDepartment);

  const handleSuspend = async (userId: string, currentStatus: string, userName: string) => {
    const isCurrentlyActive = currentStatus === 'ACTIVE';
    const actionText = isCurrentlyActive ? 'Tangguhkan' : 'Aktifkan';
    
    if (!window.confirm(`Yakin ingin ${actionText} akun ${userName}?`)) return;
    
    try {
      await suspendEmployeeApi(userId, !isCurrentlyActive);
      alert(`Akun ${userName} berhasil di${actionText}.`);
      refetch();
    } catch (err: any) {
      alert(`Gagal ${actionText} akun: ` + err.message);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    const newPassword = window.prompt(`Masukkan password sementara untuk ${userName} (minimal 8 karakter):`);
    if (!newPassword) return;
    if (newPassword.length < 8) {
      alert("Password minimal 8 karakter!");
      return;
    }
    
    try {
      await resetPasswordApi(userId, newPassword);
      alert(`Password sementara untuk ${userName} berhasil direset.`);
    } catch (err: any) {
      alert('Gagal reset password: ' + err.message);
    }
  };


  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEdit = (userProfile: any) => {
    // Find original backend employee data to populate form completely
    const origUser = apiUsers.find(u => String(u.id) === String(userProfile.id)) || {};
    
    setEditingUserId(userProfile.id);
    setFNik(origUser.nik || userProfile.nik || '');
    setFFullName(origUser.fullName || userProfile.name || '');
    setFEmail(origUser.email || userProfile.email || '');
    setFDepartment(origUser.department || userProfile.department || 'PPIC_PRODUKSI');
    setFUserLevel(origUser.userLevel || 'L3_STAFF'); 
    setFKtp(origUser.identityCardNumber || '0000000000000000'); 
    setFSalary(origUser.basicSalary || '');
    setFPhone(origUser.phoneNumber || '+62 ');
    setFEmploymentStatus(origUser.employmentStatus || 'PERMANENT');
    setFJoinDate(origUser.joinDate || new Date().toISOString().split('T')[0]);
    
    setIsEditModalOpen(true);
    setFormError('');
    setFormSuccessMessage('');
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`Yakin ingin menghapus ${userName} secara permanen (Soft Delete di DB, Hard Delete di Keycloak)?`)) return;
    try {
      await deleteEmployeeApi(userId);
      alert(`${userName} berhasil dihapus.`);
      refetch();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

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
    setFDepartment('PPIC_PRODUKSI');
    setFormError('');
  };

  // Submit — calls real BE API
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fFullName.trim() || !fEmail.trim()) return;
    if (!editingUserId && (!fUsername.trim() || !fPassword.trim())) return;
    if (fKtp.length !== 16) { setFormError(t.errKtp); return; }
    if (!fSalary || Number(fSalary) <= 0) { setFormError(t.errSalary); return; }
    if (!editingUserId && fPassword.length < 8) { setFormError(t.errPass); return; }

    const payload: any = {
      nik: fNik.trim(),
      full_name: fFullName.trim(),
      email: fEmail.trim(),
      phone_number: fPhone.trim(),
      employment_status: fEmploymentStatus,
      join_date: fJoinDate,
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
      if (editingUserId) {
        await updateEmployeeApi(editingUserId, payload);
        setFormSuccessMessage(`Data ${fFullName} berhasil diperbarui.`);
      } else {
        payload.username = fUsername.trim();
        payload.password = fPassword;
        await createEmployeeApi(payload);
        setFormSuccessMessage(`${t.msgCreateSuccess} "${fFullName}" ${t.msgCreateSuccessMid} ${derivedRole} (${fUserLevel}).`);
      }
      resetForm();
      setIsFormOpen(false); 
      setEditingUserId(null);
      refetch();
      setTimeout(() => setFormSuccessMessage(''), 8000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail
        || err?.response?.data?.message
        || (Array.isArray(err?.response?.data?.detail) ? JSON.stringify(err.response.data.detail) : null)
        || err?.message
        || t.msgCreateFail;
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
              {t.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {t.desc}
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
                <span>{isFormOpen ? t.btnFormClose : t.btnFormOpen}</span>
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
            <div className="font-bold">{t.msgSuccess}</div>
            <div>{formSuccessMessage}</div>
          </div>
        </div>
      )}

      {/* Access Restriction Notice if user cannot manage accounts */}
      {!isAuthorized && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">{t.msgLimitMode}</span> {t.msgLimitDesc}{' '}
            <span className="font-extrabold underline">{currentUser.name}</span> ({ROLE_DEFINITIONS[currentUser.role]?.label || currentUser.role}). {t.msgLimitRole}
          </div>
        </div>
      )}

      {/* Metrics Cards: Tier Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.kpiTotal}</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{activeCount} {t.kpiActive}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 shadow-xs">
          <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">{t.kpiL0}</div>
          <div className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-1">{l0Count}</div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">{t.kpiL0Desc}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">{t.kpiL1}</div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">{l1Count}</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{t.kpiL1Desc}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{t.kpiL2}</div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1">{l2Count}</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">{t.kpiL2Desc}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.kpiL3}</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{l3Count}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t.kpiL3Desc}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.kpiStd}</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">{t.kpiStdVal}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t.kpiStdDesc}</div>
        </div>
      </div>

      {/* FORM: Buat Akun Pegawai Baru — Sinkron dengan BE EmployeeCreate schema */}
      {isFormOpen && isAuthorized && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>{t.formTitle}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.formDesc}
              </p>
            </div>
            <button onClick={() => { setIsFormOpen(false); setEditingUserId(null);; resetForm(); }} className="text-xs font-bold text-slate-400 hover:text-slate-600">
              {t.formCancel}
            </button>
          </div>

          {/* Error alert */}
          {formError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div><span className="font-bold">{t.formErr} </span>{formError}</div>
            </div>
          )}

          <form onSubmit={handleCreateAccount} className="space-y-5 pt-4">

            {/* ── Row 1: Identitas Dasar ── */}
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">{t.row1Title}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fNik} <span className="font-normal text-slate-400">{t.fNikFmt}</span></label>
                  <input type="text" value={fNik} onChange={e => setFNik(e.target.value)} required
                    pattern="^EMP-\d{4}-\d{3,4}$" title="Format: EMP-2026-001"
                    placeholder="EMP-2026-001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fName}</label>
                  <input type="text" value={fFullName} onChange={e => handleNameChange(e.target.value)} required minLength={2} maxLength={200}
                    placeholder="Contoh: Rian Pratama, S.T."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fEmail}</label>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} required
                    placeholder="nama@stmorita.co.id"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fKtp}</label>
                  <input type="text" value={fKtp} onChange={e => setFKtp(e.target.value.replace(/\D/g, '').slice(0, 16))} required
                    minLength={16} maxLength={16} inputMode="numeric"
                    placeholder="16 digit Nomor KTP"
                    className={`w-full px-3 py-2 rounded-xl bg-slate-50 border text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none ${fKtp.length > 0 && fKtp.length !== 16 ? 'border-rose-400' : 'border-slate-300'}`} />
                  {fKtp.length > 0 && fKtp.length !== 16 && <p className="text-[10px] text-rose-500 mt-0.5">{fKtp.length}/16 digit</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fPhone}</label>
                  <input type="text" value={fPhone} onChange={e => setFPhone(e.target.value)} required maxLength={20}
                    placeholder="+62 8xx-xxxx-xxxx"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fDate}</label>
                  <input type="date" value={fJoinDate} onChange={e => setFJoinDate(e.target.value)} required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* ── Row 2: Status & Penempatan ── */}
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">{t.row2Title}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fStatus}</label>
                  <select value={fEmploymentStatus} onChange={e => setFEmploymentStatus(e.target.value as any)} required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold">
                    <option value="PERMANENT">{t.statusOptions.perm}</option>
                    <option value="CONTRACT">{t.statusOptions.cont}</option>
                    <option value="PROBATION">{t.statusOptions.prob}</option>
                    <option value="INTERNSHIP">{t.statusOptions.intern}</option>
                    <option value="RESIGNED">{t.statusOptions.resign}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fDept}</label>
                  <select value={fDepartment} onChange={e => setFDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="HRD_GA">HRD & GA</option>
                    <option value="FINANCE">Finance</option>
                    <option value="PPIC_PRODUKSI">PPIC & Produksi</option>
                    <option value="LOGISTIK_GUDANG">Logistik & Gudang</option>
                    <option value="QUALITY_CONTROL">Quality Control</option>
                    <option value="SALES_MARKETING">Sales & Marketing</option>
                    <option value="PURCHASING_EXIM">Purchasing & Exim</option>
                    <option value="RND">Research & Development</option>
                    <option value="COST_CONTROL">Cost Control</option>
                    <option value="IT">IT</option>
                    <option value="EXTERNAL_PORTAL">External Portal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fSalary}</label>
                  <input type="number" value={fSalary} onChange={e => setFSalary(e.target.value === '' ? '' : Number(e.target.value))} required
                    min={1} step={500000} placeholder="Contoh: 5000000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* ── Row 3: Akun Login & RBAC ── */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{t.row3Title}</p>
              
              {!editingUserId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.fUsername}</label>
                    <input type="text" value={fUsername} onChange={e => setFUsername(e.target.value)} required={!editingUserId} minLength={3} maxLength={100}
                      placeholder="Contoh: rian_pratama"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.fPass} <span className="font-normal text-slate-400">{t.fPassMin}</span></label>
                    <input type="text" value={fPassword} onChange={e => setFPassword(e.target.value)} required={!editingUserId} minLength={8}
                      placeholder="Password awal — pegawai akan diminta ganti saat login pertama"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {/* user_level */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fLvl}</label>
                  <select value={fUserLevel} onChange={e => setFUserLevel(e.target.value as any)} required
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="L0_SUPER_ADMIN">{t.lvlOptions.l0}</option>
                    <option value="L1_DIREKSI">{t.lvlOptions.l1}</option>
                    <option value="L2_MANAGER">{t.lvlOptions.l2}</option>
                    <option value="L3_STAFF">{t.lvlOptions.l3}</option>
                    <option value="L4_EXTERNAL">{t.lvlOptions.l4}</option>
                  </select>
                </div>
              </div>

              {/* Role Preview */}
              {ROLE_DEFINITIONS[derivedRole] && (
                <div className="text-xs p-3 rounded-lg bg-blue-50/50 border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t.fPreview} {ROLE_DEFINITIONS[derivedRole].label}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getTierBadge(ROLE_DEFINITIONS[derivedRole].tier).badgeClass}`}>
                      {fUserLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    {t.fPreviewDesc}
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t.row4Title} <span className="font-normal normal-case">{t.row4Opt}</span></p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fBank}</label>
                  <input type="text" value={fBankName} onChange={e => setFBankName(e.target.value)} maxLength={50}
                    placeholder="Contoh: BCA, BNI, Mandiri, BRI"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fAcc}</label>
                  <input type="text" value={fBankAccount} onChange={e => setFBankAccount(e.target.value)} maxLength={30}
                    placeholder="Nomor rekening"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-200">
              <p className="text-[10px] text-slate-400">{t.fReq}</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setIsFormOpen(false); setEditingUserId(null);; resetForm(); }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  {t.formCancel}
                </button>
                <button id="submit-create-employee-btn" type="submit" disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>{isSubmitting ? t.btnSubmitting : t.btnSubmit}</span>
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
            placeholder={t.searchPlc}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tier & Dept Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>{t.filterLvl}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 text-xs">
            {isLoadingEmployees && <Loader2 className="w-4 h-4 animate-spin text-blue-500 mr-2" />}
            <button
              onClick={() => setSelectedTierFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              {t.filterAll} ({totalCount})
            </button>
            <button
              onClick={() => setSelectedTierFilter('1')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === '1'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              {t.filterL1} ({l1Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('0')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === '0'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              {t.filterL0} ({l0Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('2')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === '2'
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              {t.filterL2} ({l2Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('3')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${selectedTierFilter === '3'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              {t.filterL3} ({l3Count})
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
                <th className="py-3 px-4">{t.colEmp}</th>
                <th className="py-3 px-4">{t.colDept}</th>
                <th className="py-3 px-4">{t.colRole}</th>
                <th className="py-3 px-4">{t.colPerm}</th>
                <th className="py-3 px-4">{t.colStatus}</th>
                <th className="py-3 px-4 text-right">{t.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {t.emptyTable}
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
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                            alt={user.name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-extrabold uppercase">
                                  {t.activeSession}
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
                          <span>{user.permissions.includes('*') ? t.allPerms : `${user.permissions.length} ${t.nPerms}`}</span>
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
                          {user.status === 'ACTIVE' ? t.statusActive : t.statusSuspended}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Login As / Impersonate - REMOVED PER USER REQUEST */}

                          {/* Toggle Active / Suspended */}
                          {isAuthorized && (
                            <button
                              onClick={() => handleSuspend(user.id, user.status, user.name)}
                              className={`p-1.5 rounded-lg transition-colors ${user.status === 'ACTIVE'
                                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                }`}
                              title={user.status === 'ACTIVE' ? t.actionSuspend : t.actionActivate}
                            >
                              {user.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Edit User */}
                          {isAuthorized && (
                            <button 
                               onClick={() => handleEdit(user)} 
                               className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors" 
                               title="Edit Data Pegawai"
                            >
                               <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Delete User */}
                          {isAuthorized && (
                            <button 
                               onClick={() => handleDelete(user.id, user.name)} 
                               className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors" 
                               title="Hapus Pegawai"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reset Password */}
                          {isAuthorized && (
                            <button
                              onClick={() => {
                                const tempPass = prompt(`Masukkan password sementara untuk ${user.name}:`);
                                if (tempPass) {
                                  // Call API to set temporary password (assuming updateEmployeeApi accepts password in this context, or fallback to frontend UI feedback)
                                  updateEmployeeApi(user.id, { password: tempPass } as any)
                                    .then(() => alert(`Password sementara untuk ${user.name} berhasil diatur menjadi: ${tempPass}`))
                                    .catch((err) => alert(`Gagal mengatur password: ${err.message}`));
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title={t.actionReset}
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

      {/* MODAL: Edit User */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Edit Data Pegawai</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUserId(null);
                  resetForm();
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ── TERKUNCI (READ-ONLY) ── */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NIK (Nomor Induk Karyawan)</label>
                  <input type="text" value={fNik} disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nomor KTP</label>
                  <input type="text" value={fKtp} disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email Internal</label>
                  <input type="email" value={fEmail} disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm cursor-not-allowed" />
                </div>

                {/* ── BISA DIUBAH (EDITABLE) ── */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                  <input type="text" value={fFullName} onChange={e => setFFullName(e.target.value)} required 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Departemen</label>
                  <select value={fDepartment} onChange={e => setFDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="HRD_GA">HRD & GA</option>
                    <option value="FINANCE">Finance</option>
                    <option value="PPIC_PRODUKSI">PPIC & Produksi</option>
                    <option value="LOGISTIK_GUDANG">Logistik & Gudang</option>
                    <option value="QUALITY_CONTROL">Quality Control</option>
                    <option value="SALES_MARKETING">Sales & Marketing</option>
                    <option value="PURCHASING_EXIM">Purchasing & Exim</option>
                    <option value="RND">Research & Development</option>
                    <option value="COST_CONTROL">Cost Control</option>
                    <option value="IT">IT</option>
                    <option value="EXTERNAL_PORTAL">External Portal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tingkat Akses (Role)</label>
                  <select value={fUserLevel} onChange={e => setFUserLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="L3_STAFF">L3 — Staff / Operator</option>
                    <option value="L2_MANAGER">L2 — Manager / Admin Bidang</option>
                    <option value="L1_DIREKSI">L1 — Board of Directors</option>
                    <option value="L0_SUPER_ADMIN">L0 — Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Gaji Pokok</label>
                  <input type="number" value={fSalary} onChange={e => setFSalary(Number(e.target.value))} required 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}
              {formSuccessMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p>{formSuccessMessage}</p>
                </div>
              )}
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingUserId(null); resetForm(); }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inspect Permissions Claims */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={inspectUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(inspectUser.name)}&background=random`}
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
                {t.modalTitle}
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
              <span className="font-bold text-slate-700 dark:text-slate-300">{t.modalDesc} </span>
              {ROLE_DEFINITIONS[inspectUser.role]?.description || t.modalDescDef}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white transition-colors"
              >
                {t.modalClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

