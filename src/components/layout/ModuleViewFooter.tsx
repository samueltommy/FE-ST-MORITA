import React from 'react';

interface ModuleViewFooterProps {
  onBack: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Intentionally renders nothing so the bottom "Kembali ke Menu" bar is hidden
 * across all module views (navigation is handled by Sidebar, Navbar, and Browser Back/Forward).
 */
export const ModuleViewFooter: React.FC<ModuleViewFooterProps> = () => null;
