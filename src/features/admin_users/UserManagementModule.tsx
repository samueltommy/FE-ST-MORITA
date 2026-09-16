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
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { PermissionClaim, RoleTier, UserProfile, UserRole } from '../../types';
import { ROLE_DEFINITIONS, getTierBadge, canManageUsers } from '../../utils/rbac';

export const UserManagementModule: React.FC = () => {
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // Form State for Creating New Employee Account
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newNik, setNewNik] = useState(`NIK-2026-${String(users.length + 1).padStart(3, '0')}`);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Produksi Slitting & Coating Line 2');
  const [newPlantLocation, setNewPlantLocation] = useState('Plant 1 - Production Floor');
  const [newPhone, setNewPhone] = useState('+62 812-');
  const [newRole, setNewRole] = useState<UserRole>('OPERATOR_PROD');
  const [newPassword, setNewPassword] = useState('MoritaPass2026!');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');

  // Inspect Permissions Modal State
  const [inspectUser, setInspectUser] = useState<UserProfile | null>(null);

  const isAuthorized = canManageUsers(currentUser);

  // Auto-fill suggested email when name changes
  const handleNameChange = (val: string) => {
    setNewName(val);
    if (val.trim()) {
      const clean = val.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(' ');
      const suggested = clean.length > 1 ? `${clean[0]}.${clean[clean.length - 1]}` : clean[0];
      setNewEmail(`${suggested}@stmorita.co.id`);
    }
  };

  // Submit New Employee Form
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const roleMeta = ROLE_DEFINITIONS[newRole];
    const defaultAvatar = `https://images.unsplash.com/photo-${
      1500000000000 + Math.floor(Math.random() * 100000000)
    }?w=150&auto=format&fit=crop&q=80`;

    const created = appStore.createUser({
      nik: newNik.trim() || `NIK-2026-${String(users.length + 1).padStart(3, '0')}`,
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      tier: roleMeta.tier,
      department: newDepartment,
      plantLocation: newPlantLocation,
      phoneNumber: newPhone,
      avatar: defaultAvatar,
      permissions: roleMeta.permissions,
      status: newStatus,
      joinedDate: new Date().toISOString().split('T')[0],
    });

    setFormSuccessMessage(`Akun pegawai untuk "${created.name}" berhasil dibuat dan terdaftar dalam sistem RBAC.`);
    // Reset Form
    setNewName('');
    setNewEmail('');
    setNewPhone('+62 812-');
    setNewNik(`NIK-2026-${String(users.length + 2).padStart(3, '0')}`);
    setIsFormOpen(false);

    setTimeout(() => {
      setFormSuccessMessage('');
    }, 6000);
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

      {/* FORM: Create New Employee Account (Collapsible) */}
      {isFormOpen && isAuthorized && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Formulir Pembuatan Akun Pegawai Baru ST. Morita Industries</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kredensial login akan diterbitkan dengan otorisasi hak akses sesuai tingkatan RBAC
              </p>
            </div>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Batal
            </button>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* NIK */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Induk Karyawan (NIK / NIP) *
                </label>
                <input
                  type="text"
                  value={newNik}
                  onChange={(e) => setNewNik(e.target.value)}
                  required
                  placeholder="NIK-2026-..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Pegawai (Beserta Gelar) *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="Contoh: Rian Pratama, S.T."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Email Resmi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Resmi Perusahaan (@stmorita.co.id) *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="nama.pegawai@stmorita.co.id"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Departemen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Departemen Penempatan
                </label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Produksi Slitting & Coating Line 2">Produksi Slitting & Coating (Plant Utama)</option>
                  <option value="Quality Assurance & QC Lab">Quality Assurance & QC Testing Lab</option>
                  <option value="Procurement & Bea Cukai (EXIM)">Procurement & Bea Cukai (Kawasan Berikat)</option>
                  <option value="PPIC & Production Control">PPIC & Production Control</option>
                  <option value="Logistics & Raw Material Warehouse">Logistics & Raw Material Warehouse</option>
                  <option value="Commercial Sales & Business Development">Commercial Sales & Business Development</option>
                  <option value="Finance, Tax & Cost Accounting">Finance, Tax & Cost Accounting</option>
                  <option value="Human Resources & General Affairs">Human Resources & General Affairs (HRD)</option>
                  <option value="Executive IT & Systems">Executive IT & Systems</option>
                  <option value="Board of Directors">Board of Directors & Executive Suite</option>
                </select>
              </div>

              {/* Lokasi Fasilitas Kerja */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lokasi Kerja Spesifik Pabrik
                </label>
                <input
                  type="text"
                  value={newPlantLocation}
                  onChange={(e) => setNewPlantLocation(e.target.value)}
                  placeholder="Plant 1 / Plant 2 / Gate 2 / Kantor Direksi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* No Telepon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Kontak / WhatsApp
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+62 8..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Role & RBAC Tier Selection */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white">
                    Pilih Peran Fungsional & Tingkatan RBAC (Role Assignment)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sistem akan secara otomatis menetapkan hak klaim izin, data masking, dan otoritas approval
                  </p>
                </div>
                {ROLE_DEFINITIONS[newRole] && (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      getTierBadge(ROLE_DEFINITIONS[newRole].tier).badgeClass
                    }`}
                  >
                    {ROLE_DEFINITIONS[newRole].tierName}
                  </span>
                )}
              </div>

              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <optgroup label="Level 0: Super Admin">
                  <option value="SUPER_ADMIN">Level 0: Super Admin / System Architect (Full IT & Account Access)</option>
                </optgroup>
                <optgroup label="Level 1: Direksi & C-Level (Executive)">
                  <option value="DIREKSI">Level 1: Direksi / Board of Directors (Full Read-All, P&L, Override)</option>
                </optgroup>
                <optgroup label="Level 2: Admin Bidang / Manager Departemen">
                  <option value="HRD_MANAGER">Level 2: HRD & GA Manager (Kelola Akun, Cuti, Armada Pabrik)</option>
                  <option value="PPIC_MANAGER">Level 2: PPIC & Plant Planning Manager (Persetujuan PR & SPK)</option>
                  <option value="PURCHASING_MANAGER">Level 2: Procurement & EXIM Manager (Approval PO & Bea Cukai)</option>
                  <option value="QC_MANAGER">Level 2: QC Manager (Override & Release QC Hold, Terbitkan COA)</option>
                  <option value="COST_CONTROL">Level 2: Cost Control Specialist (Gating Margin & Audit Biaya HPP)</option>
                  <option value="SALES_MANAGER">Level 2: Commercial Sales Manager (Approval Quotation & Order)</option>
                  <option value="WAREHOUSE_MANAGER">Level 2: Warehouse & Logistics Manager (Otorisasi DO & Stock)</option>
                  <option value="FINANCE_MANAGER">Level 2: Finance & Accounting Manager (Post 13-Rumus Invoice & AR/AP)</option>
                </optgroup>
                <optgroup label="Level 3: Staff & Operator Lapangan (Data Masked)">
                  <option value="OPERATOR_PROD">Level 3: Operator Mesin Slitting/Coating (Eksekusi SPK, Scan Output)</option>
                  <option value="QC_INSPECTOR">Level 3: QC Inspector Shift A (Input Uji Lab, Lock QC Hold, No Override)</option>
                  <option value="SALES_EXEC">Level 3: Sales Executive (Draft Quotation, Log GPS Visit)</option>
                  <option value="WAREHOUSE">Level 3: Warehouse Staff (Scan Barcode LOG, Staging & Cetak Label)</option>
                  <option value="PURCHASING">Level 3: Purchasing Staff (Input Draft PR & PO Supplier)</option>
                  <option value="FINANCE_ACCT">Level 3: Finance Staff / Billing Clerk (Draft Multi-DO Invoice)</option>
                  <option value="HRD_STAFF">Level 3: HRD & GA Staff (Input Absensi & Jadwal Kendaraan)</option>
                  <option value="PPIC_PLANNER">Level 3: PPIC Planner Staff (Cek Stok & Draft SPK)</option>
                </optgroup>
              </select>

              {/* Role description & permission claims preview */}
              <div className="text-xs p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Deskripsi Otoritas:</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {ROLE_DEFINITIONS[newRole]?.description}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Hak Akses ({ROLE_DEFINITIONS[newRole]?.permissions.length} Klaim):
                  </span>
                  {ROLE_DEFINITIONS[newRole]?.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Password & Initial Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Sementara (Initial Password) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    Pegawai akan diminta mengganti sandi pada saat sesi login pertama kali.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Akun
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                >
                  <option value="ACTIVE">AKTIF (Dapat Langsung Mengakses Portal)</option>
                  <option value="SUSPENDED">DITANGGUHKAN (Akses Sementara Ditutup)</option>
                </select>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                id="submit-create-employee-btn"
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Daftarkan Pegawai & Terbitkan Hak Akses</span>
              </button>
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
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedTierFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setSelectedTierFilter('1')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedTierFilter === '1'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              L1 Direksi ({l1Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('0')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedTierFilter === '0'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              L0 Admin ({l0Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('2')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedTierFilter === '2'
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              L2 Manager ({l2Count})
            </button>
            <button
              onClick={() => setSelectedTierFilter('3')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedTierFilter === '3'
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
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
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
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            user.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
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
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.status === 'ACTIVE'
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
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  getTierBadge(inspectUser.tier).badgeClass
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
