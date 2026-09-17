import { useAuthStore } from '../store/useAuthStore';
import { PermissionClaim } from '../types';
import { checkPermission } from '../utils/rbac';

/**
 * useRBAC Hook — Granular Role-Based Access Control
 *
 * Reads the authenticated user from useAuthStore (real backend).
 *
 * Provides:
 * - Role level booleans (isSuperAdmin, isExecutive, isAdminBidang, isStaff, isExternal)
 * - hasPermission(claim) — permission check
 * - hasDeptAccess(dept) — department access check
 * - canViewFinancialData() — HPP/margin masking guard
 * - canAccessModule(moduleId) — modul-level access gate
 * - canAccessAdminUsers() — admin RBAC panel gate
 * - canAccessTool(toolId) — sidebar tool gate (barcode scanner, audit trail)
 */
export const useRBAC = () => {
  const user = useAuthStore((state) => state.user);

  const isSuperAdmin = user?.tier === 0;
  const isExecutive  = user?.tier === 1;
  const isAdminBidang = user?.tier === 2;
  const isStaff      = user?.tier === 3;
  const isExternal   = user?.userLevel?.toUpperCase().includes('L4') ?? false;

  // ─── Core permission helper ────────────────────────────────
  const hasPermission = (permission: PermissionClaim | string): boolean => {
    if (isSuperAdmin || isExecutive) return true; // L0 & L1 bypass all checks
    const perms = (user?.permissions ?? []) as PermissionClaim[];
    if (perms.includes('*')) return true;
    return checkPermission(perms, permission as PermissionClaim);
  };

  const hasDeptAccess = (dept: string): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    return (user?.department ?? '').toUpperCase().includes(dept.toUpperCase());
  };

  // ─── Financial data masking ─────────────────────────────────
  const canViewFinancialData = (): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    if (isStaff) {
      const dept = (user?.department ?? '').toUpperCase();
      const blockedDepts = [
        'WAREHOUSE', 'LOGISTICS', 'SALES', 'COMMERCIAL',
        'PRODUCTION', 'PRODUKSI', 'QUALITY', 'QC', 'QA',
      ];
      if (blockedDepts.some((d) => dept.includes(d))) return false;
    }
    return hasPermission('finance:cost:read');
  };

  // ─── Module-level access ────────────────────────────────────
  /**
   * Returns true if the user can access the module.
   * L0/L1 → always true.
   * L2/L3 → must have at least one matching permission prefix.
   */
  const canAccessModule = (moduleId: string): boolean => {
    if (isSuperAdmin || isExecutive) return true;

    const perms = (user?.permissions ?? []) as string[];
    if (perms.includes('*')) return true;

    const hasPrefix = (prefixes: string[]) =>
      prefixes.some((prefix) =>
        perms.some((p) => p === '*' || p.startsWith(prefix))
      );

    switch (moduleId) {
      case 'finance':
        return hasPrefix(['finance:', 'cost_control:']);
      case 'qc':
        return hasPrefix(['qc:']);
      case 'procurement':
        return hasPrefix(['procurement:', 'exim:', 'vendor:']);
      case 'sales':
        return hasPrefix(['sales:']);
      case 'master_data':
        return hasPrefix(['inventory:', 'barcode:', 'master:', 'warehouse:']);
      case 'hrd':
        return hasPrefix(['hrd:']);
      case 'users':
        return canAccessAdminUsers();
      default:
        return false;
    }
  };

  // ─── Admin Users / RBAC Panel ─────────────────────────────
  /**
   * "Akun Pegawai & RBAC" panel:
   * - L0 Super Admin: full access
   * - L1 Direksi: read-only access (can view but not manage)
   * - L2 HRD Manager: can manage employees
   * - Everyone else: no access
   */
  const canAccessAdminUsers = (): boolean => {
    if (isSuperAdmin) return true;
    if (isExecutive) return true; // Direksi can view
    return hasPermission('admin:users:manage') || hasPermission('hrd:employee:create');
  };

  // ─── Sidebar tools ──────────────────────────────────────────
  /**
   * Gate for sidebar tool buttons (barcode scanner, audit trail).
   * - 'barcode': operators, warehouse, ppic, etc.
   * - 'audit': L0 and L1 only
   */
  const canAccessTool = (toolId: 'barcode' | 'audit'): boolean => {
    if (isSuperAdmin || isExecutive) return true;
    if (toolId === 'barcode') return hasPermission('barcode:scan');
    if (toolId === 'audit') return false; // L2/L3 cannot view audit trail
    return false;
  };

  return {
    user,
    isSuperAdmin,
    isExecutive,
    isAdminBidang,
    isStaff,
    isExternal,
    hasPermission,
    hasDeptAccess,
    canViewFinancialData,
    canAccessModule,
    canAccessAdminUsers,
    canAccessTool,
  };
};

