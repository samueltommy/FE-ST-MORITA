import React from 'react';
import { Printer, X } from 'lucide-react';
import { StMoritaFormLogo } from './StMoritaFormLogo';

interface PaperFormModalProps {
  open: boolean;
  toolbarTitle: string;
  onClose: () => void;
  onPrint?: () => void;
  children: React.ReactNode;
}

export const PaperFormModal: React.FC<PaperFormModalProps> = ({
  open,
  toolbarTitle,
  onClose,
  onPrint,
  children,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 flex items-start justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-[860px] bg-slate-200 rounded-xl shadow-2xl overflow-hidden my-2 sm:my-4">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white sticky top-0 z-20">
          <span className="text-xs sm:text-sm font-bold tracking-wide">{toolbarTitle}</span>
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* A4-style Paper Sheet */}
        <div className="p-3 sm:p-6">
          <div className="bg-white border border-slate-300 shadow-md p-5 sm:p-8 text-black font-sans text-xs sm:text-[13px] leading-snug">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PaperFormHeader: React.FC<{
  title: string;
  subtitle?: string;
}> = ({ title, subtitle }) => (
  <div className="grid grid-cols-12 border-2 border-black mb-2">
    <div className="col-span-4 sm:col-span-3 border-r-2 border-black flex items-center justify-center p-2 min-h-[68px]">
      <StMoritaFormLogo />
    </div>
    <div className="col-span-8 sm:col-span-9 flex flex-col items-center justify-center p-2.5 text-center">
      <h2 className="text-sm sm:text-lg font-extrabold uppercase tracking-wide leading-tight">
        {title}
      </h2>
      {subtitle && (
        <div className="text-sm sm:text-lg font-extrabold uppercase tracking-wide leading-tight">
          {subtitle}
        </div>
      )}
    </div>
  </div>
);

export const PaperIdentityGrid: React.FC<{
  name: string;
  nik: string;
  department: string;
  dateNode: React.ReactNode;
}> = ({ name, nik, department, dateNode }) => (
  <div className="grid grid-cols-12 border border-black mb-2 text-xs">
    <div className="col-span-2 border-r border-b border-black px-2 py-1.5 font-bold bg-slate-50">
      NAMA
    </div>
    <div className="col-span-5 border-r border-b border-black px-2 py-1.5 font-medium">
      {name}
    </div>
    <div className="col-span-2 border-r border-b border-black px-2 py-1.5 font-bold bg-slate-50">
      NIK
    </div>
    <div className="col-span-3 border-b border-black px-2 py-1.5 font-medium">
      {nik}
    </div>

    <div className="col-span-2 border-r border-black px-2 py-1.5 font-bold bg-slate-50">
      BAGIAN
    </div>
    <div className="col-span-5 border-r border-black px-2 py-1.5 font-medium">
      {department}
    </div>
    <div className="col-span-2 border-r border-black px-2 py-1.5 font-bold bg-slate-50">
      TANGGAL
    </div>
    <div className="col-span-3 px-2 py-1.5 font-medium flex items-center">
      {dateNode}
    </div>
  </div>
);

export const PaperFormFooter: React.FC<{ formCode: string }> = ({ formCode }) => (
  <div className="flex items-center justify-between text-[11px] text-slate-800 mt-1.5 px-0.5">
    <span className="italic font-serif">PT. St. Morita Industries</span>
    <span className="font-mono font-bold">{formCode}</span>
  </div>
);

