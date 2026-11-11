import React, { useState } from 'react';
import { Upload, Loader2, FileText, ExternalLink, X, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  uploadEmployeeDocumentApi,
  resolveBackendFileUrl,
  EmployeeDocType,
} from '../../services/hrdService';

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

export function isImageUrl(url?: string | null): boolean {
  return !!url && IMAGE_EXT_RE.test(url);
}

/**
 * Preview / "Lihat / Unduh Dokumen" block for an employee document URL.
 */
export const DocumentPreview: React.FC<{ label: string; url?: string | null; compact?: boolean }> = ({
  label,
  url,
  compact = false,
}) => {
  const resolved = resolveBackendFileUrl(url);
  if (!resolved) {
    return (
      <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400 italic">
        {label}: belum diunggah
      </div>
    );
  }
  return (
    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2">
      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</div>
      {isImageUrl(resolved) && !compact && (
        <a href={resolved} target="_blank" rel="noopener noreferrer">
          <img
            src={resolved}
            alt={label}
            className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700 hover:opacity-90"
          />
        </a>
      )}
      <a
        href={resolved}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Lihat / Unduh Dokumen</span>
      </a>
    </div>
  );
};

interface DocumentUploadFieldProps {
  label: string;
  docType: EmployeeDocType;
  value: string;
  onChange: (fileUrl: string) => void;
  disabled?: boolean;
  accept?: string;
}

/**
 * Cara A — upload file segera saat dipilih via POST /hrd/upload-document,
 * lalu simpan `file_url` ke state form.
 */
export const DocumentUploadField: React.FC<DocumentUploadFieldProps> = ({
  label,
  docType,
  value,
  onChange,
  disabled,
  accept = 'image/*,application/pdf',
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const resolved = resolveBackendFileUrl(value);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10 MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const res = await uploadEmployeeDocumentApi(docType, file);
      if (!res.fileUrl) throw new Error('Server tidak mengembalikan file_url.');
      setFileName(res.fileName);
      onChange(res.fileUrl);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message;
      setError(typeof detail === 'string' ? detail : 'Gagal mengunggah dokumen.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>
      <div className="flex items-center gap-2 flex-wrap">
        <label
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
            disabled || uploading
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
          }`}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-blue-600" />}
          <span>{uploading ? 'Mengunggah...' : value ? 'Ganti File' : 'Pilih File'}</span>
          <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={disabled || uploading} />
        </label>

        {resolved && (
          <>
            <a
              href={resolved}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
              title={value}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="max-w-[160px] truncate">{fileName || value.split('/').pop()}</span>
            </a>
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setFileName('');
                }}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Hapus lampiran"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
        {!resolved && !uploading && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <FileText className="w-3.5 h-3.5" /> JPG/PNG/PDF
          </span>
        )}
      </div>
      {resolved && isImageUrl(resolved) && (
        <img src={resolved} alt={label} className="h-16 rounded-lg border border-slate-200 object-cover" />
      )}
      {error && (
        <p className="text-xs text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
};

