import { useAppStore } from '../store/useAppStore';
import { PermissionClaim } from '../types';
import { checkPermission } from '../utils/rbac';

export const useRBAC = () => {
  const user = useAppStore((state) => state.currentUser);

  const isSuperAdmin = user?.tier === 0 || user?.role === 'SUPER_ADMIN';
  const isExecutive = user?.tier === 1 || user?.role === 'DIREKSI';
  const isAdminBidang = user?.tier === 2;
  const isStaff = user?.tier === 3;
  const isExternal = user?.tier === (4 as any);

  const hasPermission = (permission: PermissionClaim | string): boolean => {
    if (isExecutive || isSuperAdmin) return true; // Bypass all standard permission checks
    return checkPermission(user?.permissions || [], permission as PermissionClaim);
  };

  const hasDeptAccess = (dept: string): boolean => {
    if (isExecutive || isSuperAdmin) return true;
    return user?.department === dept;
  };

  // Enforce Data Masking (Blokir L3 dari akses harga modal/HPP)
  const canViewFinancialData = (): boolean => {
    if (isExecutive || isSuperAdmin) return true;
    if (isStaff && ['Warehouse & Finished Goods', 'Commercial Sales', 'Produksi Slitting & Coating', 'Quality Assurance'].includes(user?.department ?? '')) return false;
    // Fallback based on rbac.ts function if available
    return checkPermission(user?.permissions || [], 'finance:cost:read');
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
