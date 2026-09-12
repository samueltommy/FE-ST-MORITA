import React from 'react';
import { PermissionClaim } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { checkPermission, checkAnyPermission, checkAllPermissions } from '../../utils/rbac';

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
  const currentUser = useAppStore((state) => state.currentUser);
  const permissions = currentUser?.permissions || [];

  const isAllowed = Array.isArray(perform)
    ? mode === 'all'
      ? checkAllPermissions(permissions, perform)
      : checkAnyPermission(permissions, perform)
    : checkPermission(permissions, perform);

  if (!isAllowed) return <>{fallback}</>;
  return <>{children}</>;
};
