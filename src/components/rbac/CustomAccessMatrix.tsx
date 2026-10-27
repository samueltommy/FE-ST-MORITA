import React from 'react';
import {
  Lock,
  Eye,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  AccessLevel,
  AccessMatrix,
  ERP_MODULES_LIST,
  getDefaultAccessMatrix,
} from '../../utils/rbacMatrix';

interface CustomAccessMatrixProps {
  value: AccessMatrix;
  onChange?: (newMatrix: AccessMatrix) => void;
  userLevel?: string;
  department?: string;
  readOnly?: boolean;
}

export const CustomAccessMatrix: React.FC<CustomAccessMatrixProps> = ({
  value,
  onChange,
  userLevel = 'L3_STAFF',
  department = 'SALES',
  readOnly = false,
}) => {
  const handleLevelChange = (key: keyof AccessMatrix, level: AccessLevel) => {
    if (readOnly || !onChange) return;
    onChange({
      ...value,
      [key]: level,
    });
  };

  const handleApplyPreset = (presetType: 'default' | 'all_read' | 'all_write' | 'all_restricted') => {
    if (readOnly || !onChange) return;

    if (presetType === 'default') {
      onChange(getDefaultAccessMatrix(userLevel, department));
    } else if (presetType === 'all_read') {
      onChange({
        sales: 'READ',
        procurement: 'READ',
        qc: 'READ',
        finance: 'RESTRICTED',
        warehouse: 'READ',
        hrd: 'READ',
        admin: 'RESTRICTED',
      });
    } else if (presetType === 'all_write') {
      onChange({
        sales: 'WRITE',
        procurement: 'WRITE',
        qc: 'WRITE',
        finance: 'WRITE',
        warehouse: 'WRITE',
        hrd: 'WRITE',
        admin: 'WRITE',
      });
    } else if (presetType === 'all_restricted') {
      onChange({
        sales: 'RESTRICTED',
        procurement: 'RESTRICTED',
        qc: 'RESTRICTED',
        finance: 'RESTRICTED',
        warehouse: 'RESTRICTED',
        hrd: 'RESTRICTED',
        admin: 'RESTRICTED',
      });
    }
  };

  const levels = Object.values(value) as AccessLevel[];
  const counts: Record<AccessLevel, number> = {
    RESTRICTED: levels.filter((l) => l === 'RESTRICTED').length,
    READ: levels.filter((l) => l === 'READ').length,
    WRITE: levels.filter((l) => l === 'WRITE').length,
  };

  return (
    <div className="w-full space-y-3.5 select-none">
      {/* ─── Header & Presets Toolbar ─── */}
      <div className="bg-slate-100/90 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
              Kustomisasi Hak Akses Modul (Granular RBAC)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
              Atur hak akses karyawan per modul: <span className="font-semibold text-rose-600">Restricted</span> (Dibatasi), <span className="font-semibold text-blue-600">Read Only</span> (Hanya Baca), atau <span className="font-semibold text-emerald-600">Read & Write</span> (Akses Penuh).
            </p>
          </div>
        </div>

        {/* Quick Presets Bar */}
        {!readOnly && (
          <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
              <span>Pilihan Cepat (Presets):</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('default')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all shadow-2xs cursor-pointer"
                title="Reset ke rekomendasi otomatis berdasarkan role & departemen"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Reset Rekomendasi</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('all_read')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-all shadow-2xs cursor-pointer"
                title="Atur semua modul operasional ke Read Only (untuk staf biasa)"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Semua Read</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('all_write')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
                title="Berikan hak Full Write ke seluruh modul"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Full Akses</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('all_restricted')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 transition-all shadow-2xs cursor-pointer"
                title="Kunci semua modul (Restricted)"
              >
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>Kunci Semua</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Grid Matrix Table ─── */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
        {ERP_MODULES_LIST.map((mod) => {
          const currentLevel = value[mod.key] || 'RESTRICTED';

          return (
            <div
              key={mod.key}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              {/* Info Modul */}
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${mod.badgeColor}`}
                  >
                    {mod.code}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {mod.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  {mod.description}
                </p>
              </div>

              {/* Segmented Control Buttons (Restricted | Read Only | Read & Write) */}
              <div className="shrink-0 grid grid-cols-3 sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1 w-full sm:w-auto">
                {/* RESTRICTED */}
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleLevelChange(mod.key, 'RESTRICTED')}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    currentLevel === 'RESTRICTED'
                      ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                  } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Restricted</span>
                </button>

                {/* READ ONLY */}
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleLevelChange(mod.key, 'READ')}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    currentLevel === 'READ'
                      ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                  } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>Read Only</span>
                </button>

                {/* READ & WRITE */}
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleLevelChange(mod.key, 'WRITE')}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    currentLevel === 'WRITE'
                      ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                  } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Read & Write</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Summary Status Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{counts.WRITE} Modul Full Write</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>{counts.READ} Modul Read Only</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>{counts.RESTRICTED} Dibatasi (Restricted)</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-400 italic">
          *Pilihan otomatis terisi sesuai Role & Departemen, dapat disesuaikan per akun.
        </div>
      </div>
    </div>
  );
};
