import { PermissionClaim, RoleTier, UserProfile, UserRole } from '../types';

export interface RoleMeta {
  label: string;
  tier: RoleTier;
  tierName: string;
  department: string;
  description: string;
  permissions: PermissionClaim[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleMeta> = {
  // Level 0: Super Admin / System Admin
  SUPER_ADMIN: {
    label: 'Super Admin / System Architect',
    tier: 0,
    tierName: 'Level 0: System Admin',
    department: 'Executive IT & Systems',
    description: 'Akses teknis mutlak, manajemen akun pengguna, reset password, konfigurasi server, dan audit trail.',
    permissions: ['*'],
  },

  // Level 1: Direksi / Board of Directors (C-Level / Pemilik)
  DIREKSI: {
    label: 'Direksi / Board of Directors',
    tier: 1,
    tierName: 'Level 1: Direksi & C-Level',
    department: 'Board of Management',
    description: 'Full Read-All seluruh modul (Core 1-6), Executive Dashboard P&L, Cash Flow, otorisasi transaksi nilai tinggi, dan final override QC Hold.',
    permissions: [
      '*', // Full access
    ],
  },

  // Level 2: Admin Bidang / Manager Departemen
  HRD_MANAGER: {
    label: 'HRD & GA Manager',
    tier: 2,
    tierName: 'Level 2: Admin Bidang / Manager',
    department: 'Human Resources & General Affairs',
    description: 'Kontrol penuh SDM, pembuatan akun pegawai, persetujuan cuti/sakit, dan otorisasi armada pabrik.',
    permissions: [
      'hrd:employee:read',
      'hrd:employee:create',
      'hrd:attendance:write',
      'hrd:leave:approve',
      'hrd:vehicle:approve',
      'admin:users:manage',
    ],
  },
  PPIC_MANAGER: {
    label: 'PPIC & Plant Planning Manager',
    tier: 2,
    tierName: 'Level 2: Admin Bidang / Manager',
    department: 'PPIC & Production Control',
    description: 'Persetujuan Purchase Request (PR), penjadwalan & rilis Surat Perintah Kerja (SPK), dan kontrol kapasitas.',
    permissions: [
      'ppic:pr:create',
      'ppic:pr:approve',
      'ppic:spk:release',
      'ppic:spk:schedule',
      'inventory:stock:read',
    ],
  },
  PURCHASING_MANAGER: {
    label: 'Procurement & EXIM Manager',
    tier: 2,
    tierName: 'Level 2: Admin Bidang / Manager',
    department: 'Procurement & Bea Cukai',
    description: 'Persetujuan Purchase Order (PO) supplier, verifikasi dokumen Kawasan Berikat BC 2.3/2.7/4.0 & SPPB.',
    permissions: [
      'procurement:po:create',
      'procurement:po:approve',
      'exim:bc_doc:upload',
      'exim:bc_doc:approve',
      'vendor:read',
    ],
  },
  QC_MANAGER: {
    label: 'Quality Control Manager',
    tier: 2,
    tierName: 'Level 2: Admin Bidang / Manager',
    department: 'Quality Assurance & QC Lab',
    description: 'Otoritas tertinggi QA: Berwenang melakukan Release/Override QC Hold Lockout dan menerbitkan COA resmi.',
    permissions: [
      'qc:inspection:write',
      'qc:hold:lock',
      'qc:hold:override',
      'qc:coa:generate',
      'qc:coa:approve',
      'qc:calibration:approve',
    ],
  },
  SALES_MANAGER: {
    label: 'Commercial Sales Manager',
    tier: 2,
    tierName: 'Level 2: Admin Bidang / Manager',
    department: 'Commercial Sales',
    description: 'Persetujuan penawaran harga (Quotation), verifikasi Internal Order (IO), dan monitoring armada pengiriman.',
    permissions: [
      'sales:quotation:draft',
      'sales:quotation:approve',
      'sales:io:create',
      'sales:sda:write',
    ],
  },
  COST_CONTROL: {
    label: 'Cost Control & Audit Specialist',
    tier: 2,
    tierName: 'Level 2: Admin Bidang / Manager',
    department: 'Finance & Cost Accounting',
    description: 'Pintu gerbang margin: Memvalidasi HPP unit cost, mengotorisasi Quotation di bawah margin floor (18%), dan audit biaya.',
    permissions: [
      'sales:quotation:validate',
      'cost_control:margin:approve',
      'finance:cost:read',
    ],
  },
  WAREHOUSE_MANAGER: {
    label: 'Warehouse & Logistics Manager',
    tier: 2,
    tierName: 'Level 2: Admin Bidang / Manager',
    department: 'Logistics & Inventory',
    description: 'Otorisasi Delivery Order (DO), pengawasan receiving dock (LOG), dan pengaturan rute pengiriman armada operasional.',
    permissions: [
      'warehouse:log:receive',
      'warehouse:log:approve',
      'warehouse:do:dispatch',
      'warehouse:do:approve',
      'barcode:scan',
      'inventory:stock:read',
    ],
  },
  FINANCE_MANAGER: {
    label: 'Finance & Accounting Manager',
    tier: 2,
    tierName: 'Level 2: Admin Bidang / Manager',
    department: 'Finance & Tax',
    description: 'Validasi & posting 13-Rumus Sales Invoice Multi-DO, pengawasan piutang AR aging, persetujuan AP payment voucher, dan HPP.',
    permissions: [
      'finance:invoice:create',
      'finance:invoice:post',
      'finance:ar:reconcile',
      'finance:ap:pay',
      'finance:cost:read',
    ],
  },

  // Level 3: Staff / Operator / User Biasa
  HRD_STAFF: {
    label: 'HRD & GA Officer',
    tier: 3,
    tierName: 'Level 3: Staff Operasional',
    department: 'Human Resources',
    description: 'Input absensi karyawan shift, pengajuan log lembur, dan input reservasi kendaraan operasional.',
    permissions: [
      'hrd:employee:read',
      'hrd:attendance:write',
      'hrd:vehicle:approve',
    ],
  },
  PPIC_PLANNER: {
    label: 'PPIC Planner (Staff)',
    tier: 3,
    tierName: 'Level 3: Staff Operasional',
    department: 'PPIC',
    description: 'Pembuatan draft Purchase Request (PR) bahan baku, cek saldo stok, dan monitoring antrean mesin slitting/coating.',
    permissions: [
      'ppic:pr:create',
      'inventory:stock:read',
    ],
  },
  PURCHASING: {
    label: 'Purchasing Staff',
    tier: 3,
    tierName: 'Level 3: Staff Operasional',
    department: 'Procurement',
    description: 'Input draft Purchase Order (PO) supplier, upload file pabean BC 2.3, dan korespondensi vendor.',
    permissions: [
      'procurement:po:create',
      'exim:bc_doc:upload',
      'vendor:read',
    ],
  },
  QC_INSPECTOR: {
    label: 'QC Inspector (Shift Lab)',
    tier: 3,
    tierName: 'Level 3: Staff Operasional',
    department: 'Quality Assurance',
    description: 'Input hasil tes lab adesif, tandai status HOLD bila out-of-spec. BLOCKED: Tidak dapat override QC Hold.',
    permissions: [
      'qc:inspection:write',
      'qc:hold:lock',
      'qc:coa:generate',
    ],
  },
  SALES_EXEC: {
    label: 'Sales Executive (Staff)',
    tier: 3,
    tierName: 'Level 3: Staff Operasional',
    department: 'Commercial Sales',
    description: 'Input draft Quotation penawaran harga, input order IO, dan rekam log visit GPS outdoor ke pabrik customer.',
    permissions: [
      'sales:quotation:draft',
      'sales:io:create',
      'sales:sda:write',
    ],
  },
  WAREHOUSE: {
    label: 'Warehouse Operator (Staff)',
    tier: 3,
    tierName: 'Level 3: Operator Lapangan',
    department: 'Warehouse & Finished Goods',
    description: 'Scan barcode lot barang masuk (LOG), scan staging, dan cetak barcode label thermal Zebra.',
    permissions: [
      'warehouse:log:receive',
      'warehouse:do:dispatch',
      'barcode:scan',
    ],
  },
  FINANCE_ACCT: {
    label: 'Finance Staff / Billing Clerk',
    tier: 3,
    tierName: 'Level 3: Staff Operasional',
    department: 'Finance',
    description: 'Input draft Sales Invoice Multi-DO, input kuitansi pembayaran pelanggan, dan entri nota debet/kredit.',
    permissions: [
      'finance:invoice:create',
      'finance:ar:reconcile',
    ],
  },
  OPERATOR_PROD: {
    label: 'Operator Mesin Produksi',
    tier: 3,
    tierName: 'Level 3: Operator Lapangan',
    department: 'Produksi Slitting & Coating',
    description: 'Eksekusi SPK pabrik, scan barcode hasil gulungan tape, input kuantitas output. Tidak ada akses data finansial.',
    permissions: [
      'barcode:scan',
      'inventory:stock:read',
    ],
  },
};

export function checkPermission(
  userPermissions: PermissionClaim[],
  requiredPermission: PermissionClaim
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(requiredPermission);
}

export function checkAnyPermission(
  userPermissions: PermissionClaim[],
  requiredPermissions: PermissionClaim[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*')) return true;
  return requiredPermissions.some((perm) => checkPermission(userPermissions, perm));
}

export function checkAllPermissions(
  userPermissions: PermissionClaim[],
  requiredPermissions: PermissionClaim[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*')) return true;
  return requiredPermissions.every((perm) => checkPermission(userPermissions, perm));
}

/**
 * Data Masking Rule:
 * Can view HPP (Unit Cost) & Gross Margin % only if user is Level 0, Level 1,
 * or has the 'finance:cost:read' claim (e.g. Cost Control, Finance Manager).
 * Level 3 staff/operators are strictly masked.
 */
export function canViewHpp(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.tier <= 1) return true; // Level 0 (Super Admin) and Level 1 (Direksi)
  return checkPermission(user.permissions, 'finance:cost:read');
}

/**
 * QC Hold Override Rule:
 * Can override/release a physical QC Hold only if user is Super Admin (L0),
 * Direksi (L1), or QC Manager (L2 with 'qc:hold:override').
 * Level 3 QC Inspector is BLOCKED.
 */
export function canOverrideQcHold(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.tier <= 1) return true;
  return checkPermission(user.permissions, 'qc:hold:override');
}

/**
 * Cost Control Gating Approval Rule:
 * Can approve quotations gated below margin floor only if user is Super Admin (L0),
 * Direksi (L1), or Cost Control (L2 with 'cost_control:margin:approve').
 */
export function canApproveCostGating(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.tier <= 1) return true;
  return checkPermission(user.permissions, 'cost_control:margin:approve');
}

/**
 * User & Employee Account Management:
 * Can create new employee accounts & assign roles if user is Super Admin (L0)
 * or HRD Manager (L2 with 'admin:users:manage' or 'hrd:employee:create').
 */
export function canManageUsers(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.tier === 0) return true; // Super Admin
  if (user.role === 'HRD_MANAGER') return true;
  return checkPermission(user.permissions, 'admin:users:manage') || checkPermission(user.permissions, 'hrd:employee:create');
}

/**
 * Tier Visual Badges
 */
export function getTierBadge(tier: RoleTier): {
  label: string;
  badgeClass: string;
  borderClass: string;
  pillText: string;
} {
  switch (tier) {
    case 0:
      return {
        label: 'Level 0: Super Admin',
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        borderClass: 'border-purple-500',
        pillText: 'L0 Admin',
      };
    case 1:
      return {
        label: 'Level 1: Direksi (Executive)',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        borderClass: 'border-amber-500',
        pillText: 'L1 Direksi',
      };
    case 2:
      return {
        label: 'Level 2: Admin Bidang / Manager',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        borderClass: 'border-blue-500',
        pillText: 'L2 Manager',
      };
    case 3:
      return {
        label: 'Level 3: Staff / Operator',
        badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        borderClass: 'border-slate-400',
        pillText: 'L3 Staff',
      };
  }
}
