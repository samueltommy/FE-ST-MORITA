import { useAuthStore, normalizeDivisionCode } from '../store/useAuthStore';
import { OFFICIAL_DIVISIONS, PermissionClaim } from '../types';
import { checkPermission } from '../utils/rbac';

const MODULE_TO_DIVISION_MAP: Record<string, string> = {
  sales: 'SALES',
  delivery: 'DELIVERY',
  warehouse_ppic: 'WAREHOUSE_PPIC',
  master_data: 'WAREHOUSE_PPIC',
  produksi_qc: 'PRODUKSI_QC',
  qc: 'PRODUKSI_QC',
  purchasing: 'PURCHASING',
  procurement: 'PURCHASING',
  finance: 'FINANCE',
  rnd: 'RND',
  hrd: 'HRD',
};

/**
 * useRBAC Hook — Granular Role-Based Access Control (8 Divisions Architecture)
 */
export const useRBAC = () => {
  const user = useAuthStore((state) => state.user);

  const userLevelNorm = (user?.userLevel ?? '').toUpperCase();
  const isSuperAdmin = user?.tier === 0 || userLevelNorm === 'L0_SUPER_ADMIN';
  const isExecutive  = user?.tier === 1 || userLevelNorm === 'L1_DIREKSI';
  const isAdminBidang = user?.tier === 2 || userLevelNorm === 'L2_MANAGER';
  const isStaff      = user?.tier === 3 || userLevelNorm === 'L3_STAFF';
  const isExternal   = userLevelNorm.includes('L4') || userLevelNorm === 'L4_EXTERNAL';

  const userDivision = normalizeDivisionCode(user?.department);

  const allowedDivisions: string[] = (() => {
    if (isSuperAdmin || isExecutive) {
      return [...OFFICIAL_DIVISIONS];
    }
    if (Array.isArray(user?.allowedDivisions) && user.allowedDivisions.length > 0) {
      return user.allowedDivisions.map((d) => normalizeDivisionCode(d)).filter(Boolean);
    }
    if (userDivision && (OFFICIAL_DIVISIONS as string[]).includes(userDivision)) {
      return [userDivision];
    }
    return [];
  })();

  // ─── Core permission helper ────────────────────────────────
  const hasPermission = (permission: PermissionClaim | string): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    const perms = (user?.permissions ?? []) as PermissionClaim[];
    if (perms.includes('*')) return true;
    return checkPermission(perms, permission as PermissionClaim);
  };

  const hasDeptAccess = (dept: string): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    const targetDiv = normalizeDivisionCode(dept);
    if (allowedDivisions.includes(targetDiv)) return true;
    return userDivision === targetDiv;
  };

  /**
   * Checks if user has access to one of the 8 divisions (`SALES`, `DELIVERY`, `WAREHOUSE_PPIC`, `PRODUKSI_QC`, `PURCHASING`, `FINANCE`, `RND`, `HRD`)
   */
  const canAccessDivision = (divisionCode: string): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    if (isExternal) return false;
    const target = normalizeDivisionCode(divisionCode);
    if (allowedDivisions.length > 0) {
      return allowedDivisions.includes(target);
    }
    return userDivision === target;
  };

  // ─── Sensitive HRD data masking (Basic Salary & Bank Account) ─
  /**
   * For L3_STAFF, hide sensitive info like Basic Salary (`basic_salary`)
   * and Bank Account Number (`bank_account_number`).
   */
  const canViewSensitiveHrdData = (): boolean => {
    if (isStaff || isExternal) return false;
    if (isSuperAdmin || isExecutive) return true;
    return isAdminBidang;
  };

  // ─── Financial data masking ─────────────────────────────────
  const canViewFinancialData = (): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    if (isStaff) {
      if (userDivision !== 'FINANCE') return false;
    }
    return userDivision === 'FINANCE' || hasPermission('finance:cost:read');
  };

  // ─── Module-level access ────────────────────────────────────
  /**
   * Filters Sidebar & Home Launcher modules using `user.allowed_divisions`
   * (or `user_level` + `department`):
   * - L0_SUPER_ADMIN & L1_DIREKSI: show all 8 divisions.
   * - L2_MANAGER & L3_STAFF: show division menu matching `user.allowed_divisions` / `user.department`.
   */
  const canAccessModule = (moduleId: string): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    if (isExternal) return false;

    if (moduleId === 'home') return true;
    if (moduleId === 'users') return canAccessAdminUsers();

    const mappedDivision = MODULE_TO_DIVISION_MAP[moduleId] || normalizeDivisionCode(moduleId);
    if ((OFFICIAL_DIVISIONS as string[]).includes(mappedDivision)) {
      return canAccessDivision(mappedDivision);
    }

    return false;
  };

  // ─── Admin Users / Master Data Karyawan Management ──────────
  const canAccessAdminUsers = (): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    if (userDivision === 'HRD') return true;
    return hasPermission('admin:users:manage') || hasPermission('hrd:employee:create') || hasPermission('hrd:employee:read');
  };

  // ─── Sidebar tools ──────────────────────────────────────────
  const canAccessTool = (toolId: 'barcode' | 'audit'): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    if (toolId === 'barcode') {
      return (
        userDivision === 'DELIVERY' ||
        userDivision === 'WAREHOUSE_PPIC' ||
        userDivision === 'PRODUKSI_QC' ||
        hasPermission('barcode:scan')
      );
    }
    if (toolId === 'audit') return false;
    return false;
  };

  return {
    user,
    userDivision,
    allowedDivisions,
    isSuperAdmin,
    isExecutive,
    isAdminBidang,
    isStaff,
    isExternal,
    hasPermission,
    hasDeptAccess,
    canAccessDivision,
    canViewSensitiveHrdData,
    canViewFinancialData,
    canAccessModule,
    canAccessAdminUsers,
    canAccessTool,
  };
};
