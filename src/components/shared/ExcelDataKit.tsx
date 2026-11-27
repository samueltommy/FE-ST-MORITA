import React from 'react';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  LayoutList,
  Loader2,
  Table2,
} from 'lucide-react';
import { toast } from 'sonner';

export type TableViewStyle = 'preview' | 'excel';

export interface ExcelColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: string;
  mono?: boolean;
  /** Plain value used for CSV export & fallback rendering */
  getValue: (row: T, index: number) => string | number | null | undefined;
  /** Optional custom React cell renderer */
  render?: (row: T, index: number) => React.ReactNode;
  /** Optional footer cell value/node (e.g. total sum) */
  footer?: React.ReactNode;
}

/** Converts 0-based index to Excel column letter: 0->A, 25->Z, 26->AA */
export function indexToExcelCol(idx: number): string {
  let n = idx;
  let result = '';
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

/** Exports rows to UTF-8 BOM CSV so Microsoft Excel opens Indonesian characters cleanly */
export function exportExcelCsv<T>(
  filenameBase: string,
  columns: ExcelColumn<T>[],
  rows: T[]
): void {
  const escapeCsv = (val: unknown) => {
    const s = String(val ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ['No', ...columns.map((c) => c.header)];
  const dataLines = rows.map((row, idx) => [
    idx + 1,
    ...columns.map((c) => c.getValue(row, idx) ?? ''),
  ]);
  const csv =
    '\uFEFF' +
    [headers, ...dataLines].map((line) => line.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateTag = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `${filenameBase}-${dateTag}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Berhasil mengekspor ${rows.length} baris ke Excel (.csv)`);
}

/** Shared CSS classes for Excel-style Key-Value & Grid cells */
export const EXCEL_CELL = {
  label:
    'px-3.5 py-2.5 bg-slate-100/90 text-xs font-bold text-slate-700 uppercase tracking-wide border border-slate-300 align-middle',
  value: 'p-0 bg-white border border-slate-300 align-middle text-sm text-slate-900',
  input:
    'w-full h-full px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:bg-blue-50/50 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors',
  readValue: 'px-3 py-2.5 text-sm text-slate-900',
};

/** Toggle between Ringkas (Preview) and Tabel Excel (Comprehensive), plus Export CSV button */
export const ExcelViewToggle: React.FC<{
  value: TableViewStyle;
  onChange: (next: TableViewStyle) => void;
  onExport?: () => void;
  exportDisabled?: boolean;
}> = ({ value, onChange, onExport, exportDisabled }) => (
  <div className="inline-flex items-center gap-2">
    <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200">
      <button
        type="button"
        onClick={() => onChange('preview')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
          value === 'preview'
            ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-slate-200'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <LayoutList className="w-3.5 h-3.5" />
        <span>Ringkas</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('excel')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
          value === 'excel'
            ? 'bg-emerald-600 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Table2 className="w-3.5 h-3.5" />
        <span>Tabel Excel</span>
      </button>
    </div>

    {value === 'excel' && onExport && (
      <button
        type="button"
        onClick={onExport}
        disabled={exportDisabled}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer disabled:opacity-40 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export Excel (.csv)</span>
      </button>
    )}
  </div>
);

/** Comprehensive Excel-style spreadsheet table with A..Z headers, sticky left columns & optional footer */
export function ExcelSpreadsheetTable<T>({
  title,
  subtitle = 'Klik baris untuk melihat detail • Geser horizontal untuk membandingkan seluruh kolom',
  columns,
  rows,
  rowKey,
  isLoading,
  emptyText = 'Belum ada data.',
  onRowClick,
  footerLabel,
  pagination,
}: {
  title: string;
  subtitle?: string;
  columns: ExcelColumn<T>[];
  rows: T[];
  rowKey: (row: T, idx: number) => string;
  isLoading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  footerLabel?: string;
  pagination?: {
    page: number;
    totalPages: number;
    totalItems?: number;
    unitLabel?: string;
    onPrev: () => void;
    onNext: () => void;
  };
}) {
  const hasFooter = Boolean(footerLabel) || columns.some((c) => c.footer !== undefined);

  return (
    <div className="bg-white rounded-xl border border-slate-300 border-t-4 border-t-emerald-600 overflow-hidden shadow-xs">
      <div className="px-4 py-2 bg-emerald-50/70 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-emerald-900">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{title}</span>
        </div>
        <span className="text-slate-600">{subtitle}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            {/* Excel Column Letters Row */}
            <tr className="bg-slate-200/80 text-[10px] font-mono font-bold text-slate-500 text-center select-none">
              <th className="border border-slate-300 px-2 py-1 sticky left-0 z-20 bg-slate-200 w-10">
                #
              </th>
              {columns.map((col, i) => (
                <th
                  key={`letter-${col.key}`}
                  className={`border border-slate-300 px-2 py-1 ${
                    i === 0 ? 'sticky left-10 z-20 bg-slate-200' : ''
                  }`}
                >
                  {indexToExcelCol(i)}
                </th>
              ))}
            </tr>
            {/* Column Headers */}
            <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
              <th className="border border-slate-300 px-2 py-2.5 text-center sticky left-0 z-20 bg-slate-100 w-10">
                No
              </th>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`border border-slate-300 px-3 py-2.5 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.minWidth || ''} ${i === 0 ? 'sticky left-10 z-20 bg-slate-100' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-xs sm:text-sm">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="border border-slate-300 py-12 text-center text-slate-400"
                >
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="border border-slate-300 py-12 text-center text-slate-400"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr
                  key={rowKey(row, rowIdx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${
                    onRowClick ? 'hover:bg-emerald-50/50 cursor-pointer' : 'hover:bg-slate-50'
                  } transition-colors ${rowIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                >
                  <td className="border border-slate-300 px-2 py-2 text-center font-mono text-xs text-slate-500 bg-slate-100/80 sticky left-0 z-10">
                    {rowIdx + 1}
                  </td>
                  {columns.map((col, colIdx) => {
                    const rawVal = col.getValue(row, rowIdx);
                    const content = col.render
                      ? col.render(row, rowIdx)
                      : rawVal !== null && rawVal !== undefined && rawVal !== ''
                      ? String(rawVal)
                      : '-';
                    return (
                      <td
                        key={`${col.key}-${rowIdx}`}
                        className={`border border-slate-300 px-3 py-2 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${col.mono ? 'font-mono' : ''} ${
                          colIdx === 0
                            ? 'sticky left-10 z-10 bg-inherit font-bold text-blue-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {hasFooter && rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                <td className="border border-slate-300 px-2 py-2.5 text-center font-mono text-xs text-slate-500 sticky left-0 z-10 bg-slate-100">
                  Σ
                </td>
                {columns.map((col, colIdx) => (
                  <td
                    key={`foot-${col.key}`}
                    className={`border border-slate-300 px-3 py-2.5 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.mono ? 'font-mono' : ''} ${
                      colIdx === 0 ? 'sticky left-10 z-10 bg-slate-100 text-slate-600 uppercase text-xs' : ''
                    }`}
                  >
                    {colIdx === 0 && footerLabel ? footerLabel : col.footer ?? ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pagination && (
        <div className="px-4 py-3 border-t border-slate-300 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            Halaman <strong className="text-slate-900">{pagination.page}</strong> dari{' '}
            <strong className="text-slate-900">{pagination.totalPages}</strong>
            {pagination.totalItems !== undefined && (
              <>
                {' '}
                • Total <strong className="text-slate-900">{pagination.totalItems}</strong>{' '}
                {pagination.unitLabel || 'data'}
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={pagination.onPrev}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={pagination.onNext}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Full-page Excel-style Worksheet Shell for Detail, Create, and Edit views */
export const ExcelWorksheetShell: React.FC<{
  onBack: () => void;
  backLabel?: string;
  docTitle: string;
  badge?: React.ReactNode;
  formCode: string;
  sheetTitle: string;
  modeHint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({
  onBack,
  backLabel = 'Kembali ke Daftar',
  docTitle,
  badge,
  formCode,
  sheetTitle,
  modeHint,
  actions,
  children,
}) => (
  <div className="space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </button>
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-2.5 flex-wrap">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-base font-black text-slate-900 font-mono">{docTitle}</span>
          {badge}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>

    <div className="bg-white rounded-xl border border-slate-300 border-t-4 border-t-emerald-600 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
            PT ST. MORITA INDUSTRIES — {formCode}
          </div>
          <h2 className="text-base font-black text-slate-900">{sheetTitle}</h2>
        </div>
        {modeHint && <div className="text-xs text-slate-500 font-mono">{modeHint}</div>}
      </div>
      <div className="p-5 space-y-6">{children}</div>
    </div>
  </div>
);
