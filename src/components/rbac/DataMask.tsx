import React from 'react';
import { Lock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { canViewHpp } from '../../utils/rbac';

interface DataMaskProps {
  value: React.ReactNode;
  fallbackText?: string;
  className?: string;
}

/**
 * DataMask component:
 * Protects high-value data (HPP unit cost, Gross Margin %, P&L)
 * from Level 3 staff/operators according to SRS v2.0 Section 4 (Data Masking).
 */
export const DataMask: React.FC<DataMaskProps> = ({
  value,
  fallbackText = 'Terkunci (L3 Masked)',
  className = '',
}) => {
  const currentUser = useAppStore((state) => state.currentUser);
  const authorized = canViewHpp(currentUser);

  if (authorized) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 select-none ${className}`}
      title="Akses HPP & Margin dibatasi untuk Level 3 Staff/Operator (RBAC Policy SRS v2.0)"
    >
      <Lock className="w-3 h-3 text-amber-600 dark:text-amber-500 shrink-0" />
      <span>{fallbackText}</span>
    </span>
  );
};
