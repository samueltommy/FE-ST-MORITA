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
import {
  useSystemChoices,
  SelectOption,
  getBadgeClass,
  findOptionLabel,
  findOptionBadge,
  findOptionDescription,
} from '../../hooks/useSystemChoices';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';

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
  const { data: deptOptions, loading: loadingDepts } = useSystemChoices('departments');
  const { data: userLevelOptions, loading: loadingLevels } = useSystemChoices('user-levels');
  const { data: statusOptions, loading: loadingStatuses } = useSystemChoices('employment-statuses');

  const departments: SelectOption[] = Array.isArray(deptOptions) ? deptOptions : [];
  const userLevels: SelectOption[] = Array.isArray(userLevelOptions) ? userLevelOptions : [];
  const employmentStatuses: SelectOption[] = Array.isArray(statusOptions) ? statusOptions : [];

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [sortOption, setSortOption] = useState<string>('name_asc');

  // Fetch employees from backend (paginated for table)
  const { data: employeeData, isLoading: isLoadingEmployees, refetch } = useQuery({
    queryKey: ['hrd', 'employees', currentPage, pageSize, searchQuery],
    queryFn: () => getEmployeesApi(currentPage, pageSize, searchQuery),
  });

  // The global KPI calculations now use the 'summary' object returned by the API
  // No need for a separate 'all-metrics' fetch with limit=1000

  // Safely extract array from various possible backend response formats
  const rawData = employeeData as any;
  const apiUsers: any[] = Array.isArray(rawData) 
    ? rawData 
    : Array.isArray(rawData?.data) 
      ? rawData.data 
      : Array.isArray(rawData?.employees) 
        ? rawData.employees 
        : [];
        
  const totalPages = rawData?.meta?.totalPages || rawData?.meta?.total_pages || 1;

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
      userLevel: emp?.userLevel,
      rawUserLevel: emp?.userLevel,
      employmentStatus: emp?.employmentStatus,
    };
  });

  // ─── Form State — matches exact BE EmployeeCreate schema ─────
  const [activeOption, setActiveOption] = useState<string>('list');
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
  const [fDepartment, setFDepartment] = useState('');

  React.useEffect(() => {
    if (departments.length > 0 && !fDepartment) {
      setFDepartment(departments[0].value);
    }
    if (employmentStatuses.length > 0 && !fEmploymentStatus) {
      setFEmploymentStatus(employmentStatuses[0].value as any);
    }
    if (userLevels.length > 0 && !fUserLevel) {
      setFUserLevel(userLevels[0].value as any);
    }
  }, [departments, employmentStatuses, userLevels, fDepartment, fEmploymentStatus, fUserLevel]);

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
    setFDepartment(origUser.department || userProfile.department || departments[0]?.value || '');
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

  // View Details Modal State
  const [viewUserDetail, setViewUserDetail] = useState<any>(null);

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
    setFUserLevel((userLevels[0]?.value as any) || 'L3_STAFF');
    setFEmploymentStatus((employmentStatuses[0]?.value as any) || 'PERMANENT');
    setFJoinDate(new Date().toISOString().split('T')[0]);
    setFDepartment(departments[0]?.value || '');
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

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = u.status === 'ACTIVE' && u.employmentStatus !== 'RESIGNED';
    } else if (statusFilter === 'INACTIVE') {
      matchesStatus = u.status === 'SUSPENDED' || u.employmentStatus === 'RESIGNED';
    }

    return matchesSearch && matchesTier && matchesDept && matchesStatus;
  }).sort((a, b) => {
    if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
    if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
    
    // Sort by join_date if available in original API data, fallback to ID
    const aApi = apiUsers.find(u => String(u.id) === a.id);
    const bApi = apiUsers.find(u => String(u.id) === b.id);
    const aDate = aApi?.join_date || aApi?.joinDate || a.id;
    const bDate = bApi?.join_date || bApi?.joinDate || b.id;
    
    if (sortOption === 'date_desc') return String(bDate).localeCompare(String(aDate));
    if (sortOption === 'date_asc') return String(aDate).localeCompare(String(bDate));
    
    return 0;
  });

  // Calculate Global Metrics using the new 'summary' field from the backend
  const summary = rawData?.summary || {};
  const totalCount = summary.total || rawData?.meta?.totalItems || rawData?.meta?.total_items || users.length;
  
  // Active accounts = Total minus resigned/suspended
  const resignedCount = summary.by_employment_status?.['RESIGNED'] || 0;
  const activeCount = totalCount - resignedCount;

  // L-Counts based on user_level
  const byLevel = summary.by_user_level || {};
  const l0Count = byLevel['L0_SUPER_ADMIN'] || 0;
  const l1Count = byLevel['L1_DIREKSI'] || 0;
  const l2Count = byLevel['L2_MANAGER'] || 0;
  const l3Count = byLevel['L3_STAFF'] || 0;

  const options: PageOptionItem[] = [
    {
      id: 'list',
      label: '1. Daftar Akun Pegawai',
      subtitle: 'Katalog pegawai, pencarian NIK & peran',
      icon: Users,
      badge: totalCount > 0 ? `${totalCount} Pegawai` : undefined,
    },
    {
      id: 'create',
      label: '2. Pendaftaran Akun Baru',
      subtitle: 'Buat akun pegawai baru & level akses',
      icon: UserPlus,
    },
    {
      id: 'rbac',
      label: '3. Struktur Level Akses (L0 - L3)',
      subtitle: 'Direksi (L1), Admin (L0), Manager (L2), Staff (L3)',
      icon: Shield,
    },
    {
      id: 'all',
      label: 'Semua Tampilan',
      subtitle: 'Tampilkan seluruh panel administrasi',
      icon: Filter,
    },
  ];

  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.users);

  // When no feature is selected yet, render simple selection menu hub (matches client reference screenshot 1)
  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'list',
        label: 'Daftar Akun Pegawai & Audit Akses RBAC',
        subtitle: `Tabel seluruh akun staf & manager, level hak akses (L0 - L3) dan status sesi (${users.length} Pegawai)`,
        icon: Users,
        iconColor: 'text-purple-600',
        badge: `${users.length} Akun`,
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        onClick: () => appStore.setActiveSubFeature('users', 'list'),
      },
      {
        id: 'new_user',
        label: 'Pendaftaran Akun Pegawai Baru (Registrasi)',
        subtitle: 'Penerbitan NIK, username login, password sementara & penetapan peran departemen',
        icon: UserPlus,
        iconColor: 'text-blue-600',
        badge: 'Input Baru',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        onClick: () => {
          setIsFormOpen(true);
          appStore.setActiveSubFeature('users', 'new_user');
        },
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="Admin & RBAC"
        moduleName="MANAJEMEN PENGGUNA & RBAC"
        moduleDescription="Pusat administrasi akun pegawai PT ST. Morita Industries, penugasan tingkatan peran (Level 0 - Level 3), dan audit keamanan akses."
        headerBgColor="bg-purple-700"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const currentTab = activeSubFeature === 'new_user' ? 'create' : 'list';

  return (
    <div className="space-y-6">
      {/* Senior-Friendly Header with Option Buttons */}
      <ModulePageHeader
        moduleCode="Admin & RBAC"
        title={t.title}
        description={t.desc}
        badgeColor="bg-blue-50 text-blue-800 border-blue-200"
        options={options}
        activeOption={currentTab}
        onSelectOption={(opt) => {
          if (opt === 'create') {
            setIsFormOpen(true);
            appStore.setActiveSubFeature('users', 'new_user');
          } else {
            appStore.setActiveSubFeature('users', 'list');
          }
        }}
        onBackToMenu={() => appStore.setActiveSubFeature('users', null)}
        menuName="Pengguna"
        actionButtons={
          isAuthorized && (
            <button
              id="open-create-user-btn"
              onClick={() => {
                const nextState = !isFormOpen;
                setIsFormOpen(nextState);
                if (nextState) setActiveOption('create');
              }}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-extrabold shadow-sm flex items-center gap-2.5 transition-all cursor-pointer"
            >
              {isFormOpen ? <X className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              <span>{isFormOpen ? t.btnFormClose : t.btnFormOpen}</span>
            </button>
          )
        }
      />

      {/* Success Notification Alert */}
      {formSuccessMessage && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-start gap-3.5 shadow-xs">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm sm:text-base">
            <div className="font-black">{t.msgSuccess}</div>
            <div className="font-semibold text-emerald-800 mt-0.5">{formSuccessMessage}</div>
          </div>
        </div>
      )}

      {/* Access Restriction Notice if user cannot manage accounts */}
      {!isAuthorized && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-sm sm:text-base flex items-center gap-3.5">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <span className="font-black">{t.msgLimitMode}</span> {t.msgLimitDesc}{' '}
            <span className="font-black underline">{currentUser.name}</span> ({ROLE_DEFINITIONS[currentUser.role]?.label || currentUser.role}). {t.msgLimitRole}
          </div>
        </div>
      )}

      {/* ─── OPTION 3: STRUKTUR TINGKATAN RBAC (L0 - L3) ─── */}
      {(activeOption === 'rbac' || activeOption === 'all') && (
        <div className="p-6 sm:p-8 rounded-3xl border-2 border-indigo-200 bg-white shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 pb-4">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-indigo-700">
                Arsitektur Keamanan ERP ST-Morita
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
                <Shield className="w-7 h-7 text-indigo-600" />
                <span>Struktur Tingkatan Peran & Hak Akses (Level 0 - Level 3)</span>
              </h2>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500">
              Standar ISO 9001:2015 & Audit Trail Terproteksi
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-purple-600 text-white text-xs font-black">
                  LEVEL 0
                </span>
                <span className="text-sm font-black text-purple-900">
                  {l0Count} Akun
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900">
                Super Admin IT
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Akses penuh semua database, pembuatan akun karyawan, audit log, konfigurasi sistem ERP & bypass darurat.
              </p>
            </div>

            <div className="p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-amber-600 text-white text-xs font-black">
                  LEVEL 1
                </span>
                <span className="text-sm font-black text-amber-900">
                  {l1Count} Akun
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900">
                Direksi & C-Level
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Melihat seluruh laporan keuangan laba/rugi, HPP unit, analitik performa eksekutif dan persetujuan pengadaan strategis.
              </p>
            </div>

            <div className="p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-black">
                  LEVEL 2
                </span>
                <span className="text-sm font-black text-blue-900">
                  {l2Count} Akun
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900">
                Manager Departemen
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Persetujuan DO Finance, release QC batch hold, approval pengadaan EXIM, otorisasi armada & cuti staf HRD.
              </p>
            </div>

            <div className="p-5 rounded-2xl border-2 border-slate-300 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-slate-700 text-white text-xs font-black">
                  LEVEL 3
                </span>
                <span className="text-sm font-black text-slate-900">
                  {l3Count} Akun
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900">
                Staff & Operator Lapangan
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Input data pesanan, cetak label barcode Zebra, scan QR barcode gudang, check-in GPS sales outdoor & presensi shift.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FORM: Buat Akun Pegawai Baru — Sinkron dengan BE EmployeeCreate schema */}
      {(isFormOpen || activeOption === 'create') && isAuthorized && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-blue-300 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
                <UserPlus className="w-6 h-6 text-blue-600" />
                <span>{t.formTitle}</span>
              </h2>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {t.formDesc}
              </p>
            </div>
            <button onClick={() => { setIsFormOpen(false); setEditingUserId(null); resetForm(); setActiveOption('list'); }} className="text-sm font-black text-slate-400 hover:text-slate-700 cursor-pointer">
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
              <p className="text-xs md:text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">{t.row1Title}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fNik} <span className="font-normal text-slate-400">{t.fNikFmt}</span></label>
                  <input type="text" value={fNik} onChange={e => setFNik(e.target.value)} required
                    pattern="^EMP-\d{4}-\d{3,4}$" title="Format: EMP-2026-001"
                    placeholder="EMP-2026-001"
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fName}</label>
                  <input type="text" value={fFullName} onChange={e => handleNameChange(e.target.value)} required minLength={2} maxLength={200}
                    placeholder="Contoh: Rian Pratama, S.T."
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fEmail}</label>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} required
                    placeholder="nama@stmorita.co.id"
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fKtp}</label>
                  <input type="text" value={fKtp} onChange={e => setFKtp(e.target.value.replace(/\D/g, '').slice(0, 16))} required
                    minLength={16} maxLength={16} inputMode="numeric"
                    placeholder="16 digit Nomor KTP"
                    className={`w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border text-xs md:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none ${fKtp.length > 0 && fKtp.length !== 16 ? 'border-rose-400' : 'border-slate-300'}`} />
                  {fKtp.length > 0 && fKtp.length !== 16 && <p className="text-xs md:text-xs text-rose-500 mt-0.5">{fKtp.length}/16 digit</p>}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fPhone}</label>
                  <input type="text" value={fPhone} onChange={e => setFPhone(e.target.value)} required maxLength={20}
                    placeholder="+62 8xx-xxxx-xxxx"
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fDate}</label>
                  <input type="date" value={fJoinDate} onChange={e => setFJoinDate(e.target.value)} required
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* ── Row 2: Status & Penempatan ── */}
            <div>
              <p className="text-xs md:text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">{t.row2Title}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fStatus}</label>
                  <select
                    value={fEmploymentStatus}
                    onChange={e => setFEmploymentStatus(e.target.value as any)}
                    required
                    disabled={loadingStatuses}
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  >
                    {employmentStatuses.map((st) => (
                      <option key={st.value} value={st.value} title={st.description}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  {findOptionDescription(employmentStatuses, fEmploymentStatus) && (
                    <p className="mt-1 text-xs md:text-xs text-slate-500 italic">
                      {findOptionDescription(employmentStatuses, fEmploymentStatus)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fDept}</label>
                  <select
                    value={fDepartment}
                    onChange={e => setFDepartment(e.target.value)}
                    disabled={loadingDepts}
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      {loadingDepts ? 'Memuat data...' : '-- Pilih Department --'}
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.value} value={dept.value} title={dept.description}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                  {findOptionDescription(departments, fDepartment) && (
                    <p className="mt-1 text-xs md:text-xs text-slate-500 italic truncate" title={findOptionDescription(departments, fDepartment)}>
                      {findOptionDescription(departments, fDepartment)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fSalary}</label>
                  <input type="number" value={fSalary} onChange={e => setFSalary(e.target.value === '' ? '' : Number(e.target.value))} required
                    min={1} step={500000} placeholder="Contoh: 5000000"
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* ── Row 3: Akun Login & RBAC ── */}
            <div className="p-4 md:p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4 md:space-y-5">
              <p className="text-xs md:text-xs font-bold text-blue-600 uppercase tracking-widest">{t.row3Title}</p>
              
              {!editingUserId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fUsername}</label>
                    <input type="text" value={fUsername} onChange={e => setFUsername(e.target.value)} required={!editingUserId} minLength={3} maxLength={100}
                      placeholder="Contoh: rian_pratama"
                      className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-white border border-slate-300 text-xs md:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fPass} <span className="font-normal text-slate-400">{t.fPassMin}</span></label>
                    <input type="text" value={fPassword} onChange={e => setFPassword(e.target.value)} required={!editingUserId} minLength={8}
                      placeholder="Password awal — pegawai akan diminta ganti saat login pertama"
                      className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-white border border-slate-300 text-xs md:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:gap-5">
                {/* user_level */}
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fLvl}</label>
                  <select
                    value={fUserLevel}
                    onChange={e => setFUserLevel(e.target.value as any)}
                    required
                    disabled={loadingLevels}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-white border border-slate-300 text-xs md:text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {userLevels.map((lvl) => (
                      <option key={lvl.value} value={lvl.value} title={lvl.description}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                  {findOptionDescription(userLevels, fUserLevel) && (
                    <p className="mt-1.5 text-xs md:text-xs text-slate-600 bg-blue-50/70 p-2 md:p-3 rounded-lg border border-blue-100 flex items-start gap-1.5">
                      <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{findOptionDescription(userLevels, fUserLevel)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Role Preview */}
              {ROLE_DEFINITIONS[derivedRole] && (
                <div className="text-xs md:text-sm p-3 md:p-4 rounded-lg bg-blue-50/50 border border-blue-200">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 md:gap-2">
                      <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                      <span>{t.fPreview} {ROLE_DEFINITIONS[derivedRole].label}</span>
                    </div>
                    <span className={`text-xs md:text-xs font-bold px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border ${getBadgeClass(findOptionBadge(userLevels, fUserLevel))}`}>
                      {findOptionLabel(userLevels, fUserLevel) || fUserLevel}
                    </span>
                  </div>
                  <p className="text-xs md:text-xs text-slate-500 mb-2 md:mb-3">
                    {t.fPreviewDesc}
                    <br /><br />
                    {ROLE_DEFINITIONS[derivedRole].description}
                  </p>
                  <div className="flex flex-wrap gap-1 md:gap-1.5">
                    {ROLE_DEFINITIONS[derivedRole].permissions.map(p => (
                      <span key={p} className="text-xs md:text-xs font-mono px-1.5 py-0.5 md:px-2 md:py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Row 4: Informasi Bank (Opsional) ── */}
            <div>
              <p className="text-xs md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.row4Title} <span className="font-normal normal-case">{t.row4Opt}</span></p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fBank}</label>
                  <input type="text" value={fBankName} onChange={e => setFBankName(e.target.value)} maxLength={50}
                    placeholder="Contoh: BCA, BNI, Mandiri, BRI"
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1 md:mb-1.5">{t.fAcc}</label>
                  <input type="text" value={fBankAccount} onChange={e => setFBankAccount(e.target.value)} maxLength={30}
                    placeholder="Nomor rekening"
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs md:text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-3 md:pt-4 flex items-center justify-between border-t border-slate-200">
              <p className="text-xs md:text-xs text-slate-400">{t.fReq}</p>
              <div className="flex items-center gap-3 md:gap-4">
                <button type="button" onClick={() => { setIsFormOpen(false); setEditingUserId(null); resetForm(); }}
                  className="px-4 py-2 md:px-5 md:py-2.5 rounded-xl border border-slate-300 text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  {t.formCancel}
                </button>
                <button id="submit-create-employee-btn" type="submit" disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 md:px-6 md:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs md:text-sm font-bold shadow-md shadow-blue-600/20 transition-all">
                  {isSubmitting ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <UserCheck className="w-4 h-4 md:w-5 md:h-5" />}
                  <span>{isSubmitting ? t.btnSubmitting : t.btnSubmit}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ─── OPTION 1 / LIST: DAFTAR AKUN PEGAWAI ─── */}
      {(activeOption === 'list' || activeOption === 'all') && (
        <div className="space-y-4">
          {/* Filter Status Tabs (Large & Clear) */}
          <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-5 py-2.5 text-sm sm:text-base font-extrabold rounded-xl transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white shadow-xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Karyawan Aktif ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-5 py-2.5 text-sm sm:text-base font-extrabold rounded-xl transition-all cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white shadow-xs text-rose-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Non-Aktif / Resigned ({resignedCount})
            </button>
          </div>

      {/* SEARCH & FILTERS BAR (Enlarged) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-xs flex flex-col gap-4">
        {/* Row 1: Search, Dept, and Sort */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 w-full">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:flex-1">
            <div className="relative w-full flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlc}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 text-sm sm:text-base font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 outline-none transition-all"
              />
            </div>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 text-slate-800 text-sm sm:text-base font-bold rounded-2xl px-4 py-3 focus:border-blue-600 focus:bg-white outline-none w-full sm:w-auto min-w-[220px] transition-all cursor-pointer"
            >
              <option value="ALL">Semua Divisi / Departemen</option>
              {departments.map((d: any) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto shrink-0 flex items-center">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 text-slate-800 text-sm sm:text-base font-bold rounded-2xl px-4 py-3 focus:border-blue-600 focus:bg-white outline-none w-full md:w-auto transition-all cursor-pointer"
            >
              <option value="name_asc">Urutkan: Nama (A-Z)</option>
              <option value="name_desc">Urutkan: Nama (Z-A)</option>
              <option value="date_desc">Urutkan: Bergabung Terbaru</option>
              <option value="date_asc">Urutkan: Bergabung Terlama</option>
            </select>
          </div>
        </div>

        {/* Row 2: Tier Filters (Large Buttons) */}
        <div className="flex flex-wrap items-center gap-3 w-full pt-3 border-t-2 border-slate-100">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500 shrink-0">
            <Filter className="w-4 h-4" />
            <span>Filter Tingkat:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-sm font-extrabold">
            {isLoadingEmployees && <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />}
            <button
              onClick={() => setSelectedTierFilter('ALL')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                selectedTierFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              onClick={() => setSelectedTierFilter('1')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                selectedTierFilter === '1'
                  ? 'bg-amber-100 text-amber-900 shadow-xs border border-amber-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              L1 Direksi ({l1Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('0')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                selectedTierFilter === '0'
                  ? 'bg-purple-100 text-purple-900 shadow-xs border border-purple-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              L0 Admin ({l0Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('2')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                selectedTierFilter === '2'
                  ? 'bg-blue-100 text-blue-900 shadow-xs border border-blue-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              L2 Manager ({l2Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('3')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                selectedTierFilter === '3'
                  ? 'bg-slate-200 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              L3 Staff ({l3Count})
            </button>
          </div>
        </div>
      </div>

      {/* REGISTERED EMPLOYEES TABLE */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto max-h-[60vh] 2xl:max-h-[70vh]">
          <table className="w-full text-left text-sm sm:text-base relative border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm border-b-2 border-slate-200">
              <tr className="text-slate-700 font-black">
                <th className="py-4 px-5">{t.colEmp}</th>
                <th className="py-4 px-5">{t.colDept}</th>
                <th className="py-4 px-5">{t.colRole}</th>
                <th className="py-4 px-5">{t.colPerm}</th>
                <th className="py-4 px-5">{t.colStatus}</th>
                <th className="py-4 px-5 text-right">{t.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
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
                      <td className="py-4 px-5">
                        <div 
                          className="flex items-center gap-3.5 cursor-pointer hover:opacity-80 transition-opacity group"
                          onClick={() => {
                            const fullData = apiUsers.find(u => String(u.id) === String(user.id)) || user;
                            setViewUserDetail(fullData);
                          }}
                          title="Klik untuk melihat detail lengkap"
                        >
                          <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                            alt={user.name}
                            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-black uppercase">
                                  {t.activeSession}
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-bold text-slate-700">{user.nik}</span>
                              <span>•</span>
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Location */}
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {findOptionLabel(departments, user.department) || user.department}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{user.plantLocation}</span>
                        </div>
                      </td>

                      {/* Role & Tier Badge */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          {user.userLevel ? (
                            <span
                              className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full border ${getBadgeClass(findOptionBadge(userLevels, user.userLevel))}`}
                              title={findOptionDescription(userLevels, user.userLevel)}
                            >
                              {findOptionLabel(userLevels, user.userLevel)}
                            </span>
                          ) : (
                            <span
                              className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full border ${tierMeta.badgeClass}`}
                            >
                              {tierMeta.pillText} &bull; Level {user.tier}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-bold text-slate-700">
                            {ROLE_DEFINITIONS[user.role]?.label || user.role}
                          </span>
                        </div>
                      </td>

                      {/* Permissions Claim button */}
                      <td className="py-4 px-5">
                        <button
                          onClick={() => setInspectUser(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/70 hover:bg-blue-600 hover:text-white border border-blue-200 text-xs sm:text-sm font-extrabold text-blue-700 transition-all cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-blue-600" />
                          <span>{user.permissions.includes('*') ? t.allPerms : `${user.permissions.length} ${t.nPerms}`}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-black px-3 py-1 rounded-full ${user.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                            />
                            {user.status === 'ACTIVE' ? t.statusActive : t.statusSuspended}
                          </span>
                          {user.employmentStatus && (
                            <span
                              className={`text-xs sm:text-xs font-bold px-2 py-0.5 rounded-md border ${getBadgeClass(findOptionBadge(employmentStatuses, user.employmentStatus))}`}
                              title={findOptionDescription(employmentStatuses, user.employmentStatus)}
                            >
                              {findOptionLabel(employmentStatuses, user.employmentStatus)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Active / Suspended */}
                          {isAuthorized && (
                            <button
                              onClick={() => handleSuspend(user.id, user.status, user.name)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${user.status === 'ACTIVE'
                                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
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
                               className="p-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition-all cursor-pointer" 
                               title="Edit Data Pegawai"
                            >
                               <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Delete User */}
                          {isAuthorized && (
                            <button 
                               onClick={() => handleDelete(user.id, user.name)} 
                               className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition-all cursor-pointer" 
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
                                  updateEmployeeApi(user.id, { password: tempPass } as any)
                                    .then(() => alert(`Password sementara untuk ${user.name} berhasil diatur menjadi: ${tempPass}`))
                                    .catch((err) => alert(`Gagal mengatur password: ${err.message}`));
                                }
                              }}
                              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
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
        {/* KONTROL PAGINATION USER MANAGEMENT (Large & Clear) */}
        <div className="flex flex-wrap justify-between items-center p-5 bg-slate-50 border-t-2 border-slate-200 gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm sm:text-base text-slate-600 font-extrabold">
              Halaman {currentPage} dari {totalPages}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl bg-white px-3 py-2 text-slate-800 outline-none focus:border-blue-600 transition-colors cursor-pointer"
            >
              <option value={10}>10 Baris per Halaman</option>
              <option value={20}>20 Baris per Halaman</option>
              <option value={50}>50 Baris per Halaman</option>
              <option value={100}>100 Baris per Halaman</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
            >
              &larr; Sebelumnya
            </button>
            <button 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* MODAL: View Employee Detail */}
      {viewUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Detail Lengkap Karyawan
              </h2>
              <button
                onClick={() => setViewUserDetail(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Identitas & Pekerjaan</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">Nama Lengkap</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.full_name || viewUserDetail.fullName || viewUserDetail.name || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">NIK</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.nik || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Email</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.email || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">No HP</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.phone_number || viewUserDetail.phoneNumber || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Departemen</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.department || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Status Pegawai</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.employment_status || viewUserDetail.employmentStatus || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Level Akses</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.user_level || viewUserDetail.userLevel || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Tgl Bergabung</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.join_date || viewUserDetail.joinDate || '-'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Dokumen Resmi & Finansial</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">No. KTP</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{viewUserDetail.identity_card_number || viewUserDetail.identityCardNumber || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">No. NPWP</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{viewUserDetail.npwp_number || viewUserDetail.npwpNumber || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">BPJS Kesehatan</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{viewUserDetail.bpjs_kesehatan || viewUserDetail.bpjsKesehatan || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">BPJS Ketenagakerjaan</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{viewUserDetail.bpjs_ketenagakerjaan || viewUserDetail.bpjsKetenagakerjaan || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Gaji Pokok</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">Rp {(viewUserDetail.basic_salary || viewUserDetail.basicSalary)?.toLocaleString() || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Bank & Rekening</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {viewUserDetail.bank_name || viewUserDetail.bankName || '-'} - {viewUserDetail.bank_account_number || viewUserDetail.bankAccountNumber || '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Data Pribadi</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">Tempat Lahir</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.place_of_birth || viewUserDetail.placeOfBirth || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Tanggal Lahir</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.date_of_birth || viewUserDetail.dateOfBirth || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Agama</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.religion || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Status Pernikahan</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.marital_status || viewUserDetail.maritalStatus || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Alamat</div>
                    <div className="col-span-2 font-medium text-slate-800 dark:text-slate-200 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{viewUserDetail.address || '-'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Keluarga & Darurat</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">Kontak Darurat (No)</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.emergency_contact_phone || viewUserDetail.emergencyContactPhone || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Relasi Darurat</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.emergency_contact_relationship || viewUserDetail.emergencyContactRelationship || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Nama Pasangan</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.spouse_name || viewUserDetail.spouseName || '-'}</div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data Anak:</div>
                    {(viewUserDetail.children && viewUserDetail.children.length > 0) ? (
                      <div className="space-y-1">
                        {viewUserDetail.children.map((child: any, idx: number) => (
                          <div key={idx} className="flex justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{child.name}</span>
                            <span className="text-slate-500 dark:text-slate-400">{child.age} tahun</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic">Tidak ada data anak.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Kuota & Sisa Cuti</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Hak Cuti Tahunan</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.hak_cuti_tahunan ?? '-'} hari</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Cuti Terpakai</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.cuti_terpakai ?? '-'} hari</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="text-blue-600 dark:text-blue-400 mb-1">Sisa Cuti Aktif</div>
                    <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">{viewUserDetail.sisa_cuti_aktif ?? '-'} hari</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Periode Berlaku</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.periode_berlaku_cuti || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <select value={fDepartment} onChange={e => setFDepartment(e.target.value)} disabled={loadingDepts}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="" disabled>
                      {loadingDepts ? 'Memuat data...' : '-- Pilih Department --'}
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.value} value={dept.value} title={dept.description}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                  {findOptionDescription(departments, fDepartment) && (
                    <p className="mt-1 text-xs text-slate-500 italic truncate" title={findOptionDescription(departments, fDepartment)}>
                      {findOptionDescription(departments, fDepartment)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tingkat Akses (Role)</label>
                  <select value={fUserLevel} onChange={e => setFUserLevel(e.target.value as any)} disabled={loadingLevels}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500">
                    {userLevels.map((lvl) => (
                      <option key={lvl.value} value={lvl.value} title={lvl.description}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                  {findOptionDescription(userLevels, fUserLevel) && (
                    <p className="mt-1 text-xs text-slate-500 italic">
                      {findOptionDescription(userLevels, fUserLevel)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Kepegawaian</label>
                  <select value={fEmploymentStatus} onChange={e => setFEmploymentStatus(e.target.value as any)} disabled={loadingStatuses}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 font-bold">
                    {employmentStatuses.map((st) => (
                      <option key={st.value} value={st.value} title={st.description}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  {findOptionDescription(employmentStatuses, fEmploymentStatus) && (
                    <p className="mt-1 text-xs text-slate-500 italic">
                      {findOptionDescription(employmentStatuses, fEmploymentStatus)}
                    </p>
                  )}
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {inspectUser.nik} &bull; {inspectUser.department}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getTierBadge(inspectUser.tier).badgeClass
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
                    className="text-xs font-mono px-2 py-1 rounded bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl">
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

      {/* ─── Client Standard Bottom Action Toolbar with prominent BACK Button ─── */}
      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('users', null)}
        backLabel="BACK (KEMBALI KE MENU PENGGUNA)"
        actions={
          isAuthorized && (
            <button
              onClick={() => {
                const nextState = !isFormOpen;
                setIsFormOpen(nextState);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isFormOpen ? 'Tutup Formulir' : 'Buat Akun Pegawai Baru'}</span>
            </button>
          )
        }
      />
    </div>
  );
};

