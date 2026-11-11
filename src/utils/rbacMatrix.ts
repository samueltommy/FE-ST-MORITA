import { PermissionClaim } from '../types';

export type AccessLevel = 'RESTRICTED' | 'READ' | 'WRITE';

export type ErpModuleKey =
  | 'sales'
  | 'delivery'
  | 'warehouse_ppic'
  | 'produksi_qc'
  | 'purchasing'
  | 'finance'
  | 'rnd'
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
    label: 'Sales',
    code: 'SALES',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Quotation (/sales/quotations), Incoming Order / IO (/sales/incoming-orders), Aktivitas & Kunjungan Sales / SDA, Master Customer.',
    readPermissions: ['sales:quotation:draft', 'sales:visit:read'],
    writePermissions: [
      'sales:quotation:draft',
      'sales:quotation:approve',
      'sales:io:create',
      'sales:sda:write',
      'sales:visit:read',
    ],
  },
  {
    key: 'delivery',
    label: 'Delivery',
    code: 'DELIVERY',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    description: 'Delivery Order / Surat Jalan (/logistics/delivery-orders), E-Tracking Barcode/GPS, Peminjaman Kendaraan Dinas (/hrd/vehicle-bookings).',
    readPermissions: ['barcode:scan'],
    writePermissions: [
      'warehouse:do:dispatch',
      'warehouse:do:approve',
      'hrd:vehicle:approve',
      'barcode:scan',
    ],
  },
  {
    key: 'warehouse_ppic',
    label: 'Warehouse & PPIC',
    code: 'WAREHOUSE_PPIC',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    description: 'Penerimaan Barang / Receiving LOG (/warehouse/goods-receipts), Pencatatan Limbah / Waste, SPK Produksi / Work Orders, Master Item & Stok.',
    readPermissions: ['inventory:stock:read', 'master:item:read'],
    writePermissions: [
      'warehouse:log:receive',
      'warehouse:log:approve',
      'ppic:spk:release',
      'ppic:spk:schedule',
      'master:item:read',
      'master:item:write',
      'master:barcode:print',
      'inventory:stock:read',
    ],
  },
  {
    key: 'produksi_qc',
    label: 'Produksi & QC',
    code: 'PRODUKSI_QC',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Input Hasil Produksi (/production/outputs), Inspeksi QC IQC/PQC/OQC (/qc/inspections), Rekam QC, Otorisasi Pelepasan Hold QC.',
    readPermissions: ['qc:coa:generate'],
    writePermissions: [
      'qc:inspection:write',
      'qc:hold:lock',
      'qc:hold:override',
      'qc:coa:generate',
      'qc:coa:approve',
      'qc:calibration:approve',
    ],
  },
  {
    key: 'purchasing',
    label: 'Pembelian (Purchasing)',
    code: 'PURCHASING',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Purchase Request / PR (/procurement/purchase-requests), Purchase Order / PO (/procurement/purchase-orders), Dokumen Exim, Master Supplier.',
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
    key: 'finance',
    label: 'Finance',
    code: 'FINANCE',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Validasi Cost Control Quotation, Kalkulasi & Sales Invoice 13 Rumus (/finance/invoices), Piutang AR & Pembayaran, E-Complaint & RMA.',
    readPermissions: ['finance:cost:read'],
    writePermissions: [
      'sales:quotation:validate',
      'cost_control:margin:approve',
      'finance:invoice:create',
      'finance:invoice:post',
      'finance:ar:reconcile',
      'finance:ap:pay',
      'finance:cost:read',
    ],
  },
  {
    key: 'rnd',
    label: 'RND',
    code: 'RND',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'R&D Trial Formula (/rnd/trials), Konversi Formula ke Master BOM, Publikasi E-Katalog (/marketing/catalog), Permintaan Sampel.',
    readPermissions: ['master:item:read'],
    writePermissions: [
      'master:item:read',
      'master:item:write',
      'qc:coa:generate',
    ],
  },
  {
    key: 'hrd',
    label: 'HRD',
    code: 'HRD',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Master Data Karyawan (/hrd/employees), Pengajuan & Approval Cuti/Izin (/hrd/requests), Presensi / Kehadiran Harian (/hrd/attendance).',
    readPermissions: ['hrd:employee:read'],
    writePermissions: [
      'hrd:employee:read',
      'hrd:employee:write',
      'hrd:employee:create',
      'hrd:attendance:manage',
      'hrd:attendance:write',
      'hrd:leave:approve',
    ],
  },
  {
    key: 'admin',
    label: 'Sistem Admin & Keamanan RBAC',
    code: 'ADMIN',
    badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
    description: 'Manajemen level hak akses (L0-L4), reset password, dan log audit keamanan sistem.',
    readPermissions: ['audit:logs:read'],
    writePermissions: [
      'admin:users:manage',
      'admin:roles:assign',
      'admin:settings:write',
      'audit:logs:read',
    ],
  },
];

/**
 * Menghasilkan Default Access Matrix sesuai 8 Divisi:
 * - L0_SUPER_ADMIN & L1_DIREKSI: Akses penuh ke seluruh 8 divisi
 * - L2_MANAGER: WRITE pada divisinya sendiri, READ pada HRD (cuti/absensi)
 * - L3_STAFF: WRITE/READ pada divisinya sendiri, READ pada HRD (pengajuan mandiri)
 */
export function getDefaultAccessMatrix(userLevel: string, department: string): AccessMatrix {
  if (userLevel === 'L0_SUPER_ADMIN') {
    return {
      sales: 'WRITE',
      delivery: 'WRITE',
      warehouse_ppic: 'WRITE',
      produksi_qc: 'WRITE',
      purchasing: 'WRITE',
      finance: 'WRITE',
      rnd: 'WRITE',
      hrd: 'WRITE',
      admin: 'WRITE',
    };
  }

  if (userLevel === 'L1_DIREKSI') {
    return {
      sales: 'WRITE',
      delivery: 'WRITE',
      warehouse_ppic: 'WRITE',
      produksi_qc: 'WRITE',
      purchasing: 'WRITE',
      finance: 'WRITE',
      rnd: 'WRITE',
      hrd: 'WRITE',
      admin: 'READ',
    };
  }

  const deptNorm = (department || '').toUpperCase().trim();

  if (userLevel === 'L2_MANAGER') {
    return {
      sales: deptNorm === 'SALES' ? 'WRITE' : 'RESTRICTED',
      delivery: deptNorm === 'DELIVERY' ? 'WRITE' : 'RESTRICTED',
      warehouse_ppic: deptNorm === 'WAREHOUSE_PPIC' ? 'WRITE' : 'RESTRICTED',
      produksi_qc: deptNorm === 'PRODUKSI_QC' ? 'WRITE' : 'RESTRICTED',
      purchasing: deptNorm === 'PURCHASING' ? 'WRITE' : 'RESTRICTED',
      finance: deptNorm === 'FINANCE' ? 'WRITE' : 'RESTRICTED',
      rnd: deptNorm === 'RND' ? 'WRITE' : 'RESTRICTED',
      hrd: deptNorm === 'HRD' ? 'WRITE' : 'READ',
      admin: deptNorm === 'HRD' ? 'WRITE' : 'RESTRICTED',
    };
  }

  return {
    sales: deptNorm === 'SALES' ? 'WRITE' : 'RESTRICTED',
    delivery: deptNorm === 'DELIVERY' ? 'WRITE' : 'RESTRICTED',
    warehouse_ppic: deptNorm === 'WAREHOUSE_PPIC' ? 'WRITE' : 'RESTRICTED',
    produksi_qc: deptNorm === 'PRODUKSI_QC' ? 'WRITE' : 'RESTRICTED',
    purchasing: deptNorm === 'PURCHASING' ? 'WRITE' : 'RESTRICTED',
    finance: deptNorm === 'FINANCE' ? 'WRITE' : 'RESTRICTED',
    rnd: deptNorm === 'RND' ? 'WRITE' : 'RESTRICTED',
    hrd: deptNorm === 'HRD' ? 'WRITE' : 'READ',
    admin: 'RESTRICTED',
  };
}

/**
 * Konversi AccessMatrix ke array PermissionClaim untuk disimpan atau di-check
 */
export function matrixToPermissions(matrix: AccessMatrix): PermissionClaim[] {
  const permsSet = new Set<PermissionClaim>();

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
      delivery: 'WRITE',
      warehouse_ppic: 'WRITE',
      produksi_qc: 'WRITE',
      purchasing: 'WRITE',
      finance: 'WRITE',
      rnd: 'WRITE',
      hrd: 'WRITE',
      admin: 'WRITE',
    };
  }

  if (!permissions || permissions.length === 0) {
    return getDefaultAccessMatrix(role || 'L3_STAFF', department || '');
  }

  const matrix: AccessMatrix = {
    sales: 'RESTRICTED',
    delivery: 'RESTRICTED',
    warehouse_ppic: 'RESTRICTED',
    produksi_qc: 'RESTRICTED',
    purchasing: 'RESTRICTED',
    finance: 'RESTRICTED',
    rnd: 'RESTRICTED',
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
