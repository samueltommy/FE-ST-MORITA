import React from 'react';
import { PermissionClaim } from '../../types';
import { useRBAC } from '../../hooks/useRBAC';
import { checkAnyPermission, checkAllPermissions } from '../../utils/rbac';

interface CanProps {
  perform: PermissionClaim | PermissionClaim[];
  mode?: 'all' | 'any';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  perform,
  mode = 'any',
  fallback = null,
  children,
}) => {
  const { user, hasPermission, isExecutive, isSuperAdmin } = useRBAC();
  const permissions = user?.permissions || [];

  let isAllowed = false;

  if (isExecutive || isSuperAdmin) {
    isAllowed = true;
  } else if (Array.isArray(perform)) {
    isAllowed = mode === 'all'
      ? checkAllPermissions(permissions, perform)
      : checkAnyPermission(permissions, perform);
  } else {
    isAllowed = hasPermission(perform as PermissionClaim);
  }

  if (!isAllowed) return <>{fallback}</>;

  return <>{children}</>;
};
