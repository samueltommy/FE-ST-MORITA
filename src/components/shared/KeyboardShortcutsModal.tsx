import React from 'react';
import { Keyboard, X, Sparkles } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';

export const KeyboardShortcutsModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isKeyboardShortcutsOpen);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      groupName: 'Navigasi Modul Inti',
      shortcuts: [
        { keys: ['Alt', '1'], label: 'Buka Modul HRD, Armada Pabrik & Outdoor GPS' },
        { keys: ['Alt', '2'], label: 'Buka Master Data Management (MDM) & Label Zebra' },
        { keys: ['Alt', '3'], label: 'Buka Supply Chain & Dokumen Pabean EXIM' },
        { keys: ['Alt', '4'], label: 'Buka Modul Production & QC Hold Lockout' },
        { keys: ['Alt', '5'], label: 'Buka Sales Quotation & Barcode E-Tracking' },
        { keys: ['Alt', '6'], label: 'Buka Finance 13-Rumus Sales Invoice Multi-DO' },
        { keys: ['Alt', '7'], label: 'Buka Manajemen Akun Pegawai & RBAC (Admin/HRD)' },
      ],
    },
    {
      groupName: 'Alat Cepat & Kepatuhan',
      shortcuts: [
        { keys: ['Ctrl / ⌘', 'K'], label: 'Buka Command Palette & Pencarian Global' },
        { keys: ['Alt', 'B'], label: 'Buka Handheld Barcode Scanner PWA' },
        { keys: ['Alt', 'T'], label: 'Ganti Tema Gelap / Terang (Dark/Light Mode)' },
        { keys: ['Ctrl / ⌘', 'D'], label: 'Alihkan Kerapatan Tabel (Standar / High Density)' },
        { keys: ['?'], label: 'Buka Dialog Bantuan Pintasan Keyboard' },
        { keys: ['Esc'], label: 'Tutup Dialog / Modal yang Sedang Aktif' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pintasan Keyboard Power User
              </h2>
              <p className="text-xs text-slate-500">
                Akses cepat modul, scanner barcode operasional, dan fungsi portal
              </p>
            </div>
          </div>
          <button
            onClick={() => appStore.setKeyboardShortcutsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {shortcutGroups.map((group, idx) => (
            <div key={idx} className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                {group.groupName}
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
                {group.shortcuts.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {s.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md border border-slate-300 dark:border-slate-700 shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <div>
              <div className="font-bold">Tips Efisiensi Operator Pabrik</div>
              <div className="text-[11px] opacity-90 mt-0.5">
                Staf Gudang & QC di lapangan dapat menggunakan tombol cepat <kbd className="font-mono font-bold">Alt+B</kbd> untuk membuka kamera barcode scanner tanpa menyentuh mouse.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={() => appStore.setKeyboardShortcutsOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
