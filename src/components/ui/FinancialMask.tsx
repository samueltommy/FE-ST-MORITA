import React from 'react';
import { useRBAC } from '../../hooks/useRBAC';

interface FinancialMaskProps {
  value: number | string;
  currency?: string;
  className?: string;
}

export const FinancialMask: React.FC<FinancialMaskProps> = ({ value, currency = 'Rp', className = '' }) => {
  const { canViewFinancialData } = useRBAC();

  if (!canViewFinancialData()) {
    return <span className={`font-mono text-slate-400 dark:text-slate-500 select-none ${className}`}>******</span>;
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  return (
    <span className={`font-mono font-medium ${className}`}>
      {currency} {isNaN(numericValue) ? '0' : numericValue.toLocaleString('id-ID')}
    </span>
  );
};
