import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { PermissionClaim } from '../types';
import { checkPermission } from '../utils/rbac';

/**
 * useRBAC Hook — Granular Role-Based Access Control
 * 
 * Reads the authenticated user from useAuthStore (real backend).
 * Falls back to useAppStore.currentUser for demo/mock compatibility.
 * 
 * Provides:
 * - Role level booleans (isSuperAdmin, isExecutive, isAdminBidang, isStaff, isExternal)
 * - hasPermission(claim) — permission check
 * - hasDeptAccess(dept) — department access check
 * - canViewFinancialData() — HPP/margin masking guard
 */
export const useRBAC = () => {
  const authUser = useAuthStore((state) => state.user);
  const mockUser = useAppStore((state) => state.currentUser);

  // Prefer real backend user, fall back to mock
  const user = authUser || mockUser;

  const isSuperAdmin = user?.tier === 0 || user?.role === 'SUPER_ADMIN';
  const isExecutive = user?.tier === 1 || user?.role === 'DIREKSI';
  const isAdminBidang = user?.tier === 2;
  const isStaff = user?.tier === 3;
  const isExternal = (user?.tier as number) === 4;

  const hasPermission = (permission: PermissionClaim | string): boolean => {
    if (isExecutive || isSuperAdmin) return true; // Bypass all standard permission checks
    return checkPermission(user?.permissions as PermissionClaim[] || [], permission as PermissionClaim);
  };

  const hasDeptAccess = (dept: string): boolean => {
    if (isExecutive || isSuperAdmin) return true;
    return user?.department === dept;
  };

  // Enforce Data Masking (Blokir L3 dari akses harga modal/HPP)
  const canViewFinancialData = (): boolean => {
    if (isExecutive || isSuperAdmin) return true;
    // Block L3 staff in warehouse, sales, production, QA departments
    if (isStaff) {
      const dept = (user?.department ?? '').toUpperCase();
      const blockedDepts = [
        'WAREHOUSE', 'LOGISTICS', 'SALES', 'COMMERCIAL',
        'PRODUCTION', 'PRODUKSI', 'QUALITY', 'QC', 'QA',
      ];
      if (blockedDepts.some((d) => dept.includes(d))) return false;
    }
    // Fallback: check explicit permission
    return checkPermission(user?.permissions as PermissionClaim[] || [], 'finance:cost:read');
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
    canViewFinancialData 
  };
};
