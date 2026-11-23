import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface PageOptionItem {
  id: string;
  label: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
}

interface ModulePageHeaderProps {
  moduleCode: string; // e.g. "HRD", "SALES", "FINANCE"
  title: string;
  description: string;
  badgeColor?: string;
  actionButtons?: React.ReactNode;
  options?: PageOptionItem[];
  activeOption?: string;
  onSelectOption?: (optionId: string) => void;
  onBackToMenu?: () => void;
  menuName?: string;
}

/**
 * Minimalist header: removes bulky top title bar & horizontal scrollable tab strip
 * across all pages so tables and workspaces have full width and vertical room.
 * Only renders a compact right-aligned action strip if actionButtons are provided.
 */
export const ModulePageHeader: React.FC<ModulePageHeaderProps> = ({
  actionButtons,
}) => {
  if (!actionButtons) return null;

  return (
    <div className="w-full flex items-center justify-end gap-2 mb-3">
      {actionButtons}
    </div>
  );
};
