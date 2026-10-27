import { PermissionClaim } from '../types';

export type AccessLevel = 'RESTRICTED' | 'READ' | 'WRITE';

export type ErpModuleKey = 
  | 'sales'
  | 'procurement'
  | 'qc'
  | 'finance'
  | 'warehouse'
  | 'hrd'
  | 'admin';

export interface ModuleAccessMeta {
  key: ErpModuleKey;
  label: string;
  code: string;
  badgeColor: string;
  description: string;
  readPermissions: PermissionClaim[];
  writePermissions: PermissionClaim[];
}

export type AccessMatrix = Record<ErpModuleKey, AccessLevel>;

export const ERP_MODULES_LIST: ModuleAccessMeta[] = [
  {
    key: 'sales',
    label: 'Commercial Sales & Customer Tracking',
    code: 'Core 5',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Quotation gating, Sales Order (IO), Master Customer & E-Tracking delivery.',
    readPermissions: ['sales:quotation:draft', 'sales:sda:write'],
    writePermissions: [
      'sales:quotation:draft',
      'sales:quotation:approve',
      'sales:io:create',
      'sales:sda:write',
      'sales:quotation:validate',
    ],
  },
  {
    key: 'procurement',
    label: 'Procurement & EXIM Bea Cukai',
    code: 'Core 3',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'PO Supplier, alur 5-tahap PR→PO, dokumen Kawasan Berikat BC 2.3/2.7/4.0 & SPPB.',
    readPermissions: ['vendor:read'],
    writePermissions: [
      'procurement:pr:create',
      'procurement:po:create',
      'procurement:po:approve',
      'exim:bc_doc:upload',
      'exim:bc_doc:approve',
      'vendor:read',
    ],
  },
  {
    key: 'qc',
    label: 'Production & QC Hold Lockout',
    code: 'Core 4',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Inspeksi mutu adesif/tape, status QC Hold, Override rilis, dan sertifikat COA.',
    readPermissions: ['qc:coa:generate', 'ppic:spk:schedule', 'inventory:stock:read'],
    writePermissions: [
      'qc:inspection:write',
      'qc:hold:lock',
      'qc:hold:override',
      'qc:coa:generate',
      'qc:coa:approve',
      'qc:calibration:approve',
      'ppic:pr:create',
      'ppic:spk:release',
    ],
  },
  {
    key: 'finance',
    label: 'Finance, 13-Rumus Invoicing & AR/AP',
    code: 'Core 6',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Sales Invoice Multi-DO, rekonsiliasi piutang AR/AP, dan analisis margin unit cost HPP.',
    readPermissions: ['finance:cost:read'],
    writePermissions: [
      'finance:invoice:create',
      'finance:invoice:post',
      'finance:ar:reconcile',
      'finance:ap:pay',
      'finance:cost:read',
      'cost_control:margin:approve',
    ],
  },
  {
    key: 'warehouse',
    label: 'Warehouse Logistics & Master Data (MDM)',
    code: 'Core 2',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    description: 'Katalog stok SKU, cetak barcode Zebra thermal, receiving dock LOG, dan dispatch DO.',
    readPermissions: ['inventory:stock:read'],
    writePermissions: [
      'warehouse:log:receive',
      'warehouse:log:approve',
      'warehouse:do:dispatch',
      'warehouse:do:approve',
      'barcode:scan',
      'inventory:stock:read',
    ],
  },
  {
    key: 'hrd',
    label: 'HRD, Presensi & Armada Pabrik',
    code: 'Core 1',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Data karyawan, presensi shift, persetujuan cuti/sakit, dan armada kendaraan.',
    readPermissions: ['hrd:employee:read'],
    writePermissions: [
      'hrd:employee:read',
      'hrd:employee:create',
      'hrd:attendance:write',
      'hrd:leave:approve',
      'hrd:vehicle:approve',
    ],
  },
  {
    key: 'admin',
    label: 'User Management & Keamanan RBAC',
    code: 'Level 0',
    badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
    description: 'Pembuatan akun login, manajemen level hak akses (L0-L3), reset password & audit trail.',
    readPermissions: ['audit:logs:read'],
    writePermissions: [
      'admin:users:manage',
      'admin:roles:assign',
      'admin:settings:write',
      'audit:logs:read',
      'hrd:employee:create',
    ],
  },
];

/**
 * Menghasilkan Default Access Matrix sesuai aturan bisnis & permintaan klien:
 * - L0_SUPER_ADMIN: Semua WRITE
 * - L1_DIREKSI: Finance & HRD WRITE, Operasional lain READ
 * - L2_MANAGER (Senior): WRITE pada divisinya sendiri, READ di semua divisi lain, RESTRICTED di admin (kecuali HRD/IT)
 * - L3_STAFF (Karyawan biasa): Default READ di semua modul operasional, RESTRICTED di Finance & Admin
 */
export function getDefaultAccessMatrix(userLevel: string, department: string): AccessMatrix {
  // L0 Super Admin
  if (userLevel === 'L0_SUPER_ADMIN') {
    return {
      sales: 'WRITE',
      procurement: 'WRITE',
      qc: 'WRITE',
      finance: 'WRITE',
      warehouse: 'WRITE',
      hrd: 'WRITE',
      admin: 'WRITE',
    };
  }

  // L1 Direksi
  if (userLevel === 'L1_DIREKSI') {
    return {
      sales: 'READ',
      procurement: 'READ',
      qc: 'READ',
      finance: 'WRITE',
      warehouse: 'READ',
      hrd: 'WRITE',
      admin: 'READ',
    };
  }

  // L2 Manager / Senior Role
  if (userLevel === 'L2_MANAGER') {
    const deptNorm = (department || '').toUpperCase();
    return {
      sales: deptNorm === 'SALES' ? 'WRITE' : 'READ',
      procurement: (deptNorm === 'EXTERNAL_PORTAL' || deptNorm === 'PROCUREMENT') ? 'WRITE' : 'READ',
      qc: (deptNorm === 'QC' || deptNorm === 'PPIC' || deptNorm === 'RND') ? 'WRITE' : 'READ',
      finance: deptNorm === 'FINANCE' ? 'WRITE' : 'READ',
      warehouse: deptNorm === 'WAREHOUSE' ? 'WRITE' : 'READ',
      hrd: deptNorm === 'HRD' ? 'WRITE' : 'READ',
      admin: deptNorm === 'HRD' ? 'WRITE' : 'RESTRICTED',
    };
  }

  // L3 Staff & Karyawan Biasa
  // Sesuai permintaan klien: "untuk karyawan biasa hanya bisa read disemua"
  const deptNorm = (department || '').toUpperCase();
  const isProdOrWh = deptNorm === 'PPIC' || deptNorm === 'WAREHOUSE';

  return {
    sales: deptNorm === 'SALES' ? 'WRITE' : 'READ',
    procurement: deptNorm === 'EXTERNAL_PORTAL' ? 'WRITE' : 'READ',
    qc: deptNorm === 'QC' ? 'WRITE' : 'READ',
    finance: deptNorm === 'FINANCE' ? 'WRITE' : 'RESTRICTED',
    warehouse: isProdOrWh ? 'WRITE' : 'READ',
    hrd: 'READ',
    admin: 'RESTRICTED',
  };
}

/**
 * Konversi AccessMatrix ke array PermissionClaim untuk disimpan atau di-check
 */
export function matrixToPermissions(matrix: AccessMatrix): PermissionClaim[] {
  const permsSet = new Set<PermissionClaim>();

  // Bila semua WRITE pada modul utama, berikan wildcard '*'
  const allWrite = Object.values(matrix).every((lvl) => lvl === 'WRITE');
  if (allWrite) {
    return ['*'];
  }

  for (const mod of ERP_MODULES_LIST) {
    const level = matrix[mod.key];
    if (level === 'WRITE') {
      mod.writePermissions.forEach((p) => permsSet.add(p));
    } else if (level === 'READ') {
      mod.readPermissions.forEach((p) => permsSet.add(p));
    }
  }

  return Array.from(permsSet);
}

/**
 * Merekonstruksi AccessMatrix dari daftar permissions user yang ada
 */
export function permissionsToMatrix(permissions: string[] = [], role?: string, department?: string): AccessMatrix {
  if (permissions.includes('*') || role === 'SUPER_ADMIN') {
    return {
      sales: 'WRITE',
      procurement: 'WRITE',
      qc: 'WRITE',
      finance: 'WRITE',
      warehouse: 'WRITE',
      hrd: 'WRITE',
      admin: 'WRITE',
    };
  }

  const matrix: AccessMatrix = {
    sales: 'RESTRICTED',
    procurement: 'RESTRICTED',
    qc: 'RESTRICTED',
    finance: 'RESTRICTED',
    warehouse: 'RESTRICTED',
    hrd: 'RESTRICTED',
    admin: 'RESTRICTED',
  };

  for (const mod of ERP_MODULES_LIST) {
    const hasWrite = mod.writePermissions.some((p) => permissions.includes(p));
    const hasRead = mod.readPermissions.some((p) => permissions.includes(p));

    if (hasWrite) {
      matrix[mod.key] = 'WRITE';
    } else if (hasRead) {
      matrix[mod.key] = 'READ';
    } else {
      matrix[mod.key] = 'RESTRICTED';
    }
  }

  return matrix;
}
