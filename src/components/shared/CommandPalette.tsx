import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Building2,
  Shield,
  Scan,
  Calculator,
  ShieldCheck,
  Truck,
  Boxes,
  Users,
  FileSpreadsheet,
  History,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';

export const CommandPalette: React.FC = () => {
  const isOpen = useAppStore((state) => state.isCommandPaletteOpen);
  const themeMode = useAppStore((state) => state.themeMode);
  const items = useAppStore((state) => state.items);
  const [query, setQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        appStore.setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const quickActions = [
    {
      title: 'Buka Modul Finansial (13-Rumus Sales Invoice)',
      category: 'Navigasi',
      icon: Calculator,
      action: () => {
        appStore.setActiveModule('finance');
        appStore.setCommandPaletteOpen(false);
      },
    },
    {
      title: 'Buka Modul Production & QC Hold Lockout',
      category: 'Navigasi',
      icon: ShieldCheck,
      action: () => {
        appStore.setActiveModule('qc');
        appStore.setCommandPaletteOpen(false);
      },
    },
    {
      title: 'Buka Supply Chain & Dokumen Pabean EXIM',
      category: 'Navigasi',
      icon: Truck,
      action: () => {
        appStore.setActiveModule('procurement');
        appStore.setCommandPaletteOpen(false);
      },
    },
    {
      title: 'Buka Sales Quotation & Barcode E-Tracking',
      category: 'Navigasi',
      icon: FileSpreadsheet,
      action: () => {
        appStore.setActiveModule('sales');
        appStore.setCommandPaletteOpen(false);
      },
    },
    {
      title: 'Buka Master Data & Cetak Label Zebra',
      category: 'Navigasi',
      icon: Boxes,
      action: () => {
        appStore.setActiveModule('master_data');
        appStore.setCommandPaletteOpen(false);
      },
    },
    {
      title: 'Buka HRD, Armada Pabrik & Log Kunjungan Sales',
      category: 'Navigasi',
      icon: Users,
      action: () => {
        appStore.setActiveModule('hrd');
        appStore.setCommandPaletteOpen(false);
      },
    },
    {
      title: 'Buka Manajemen Akun Pegawai & RBAC (Admin / HRD)',
      category: 'Navigasi',
      icon: Users,
      action: () => {
        appStore.setActiveModule('users');
        appStore.setCommandPaletteOpen(false);
      },
    },
    {
      title: 'Keluar ke Halaman Login (Logout Sesi)',
      category: 'Keamanan',
      icon: X,
      action: () => {
        appStore.setCommandPaletteOpen(false);
        appStore.logout();
      },
    },
    {
      title: 'Buka Scanner Barcode Lapangan PWA (Kamera/Manual)',
      category: 'Peralatan Lapangan',
      icon: Scan,
      action: () => {
        appStore.setCommandPaletteOpen(false);
        appStore.setBarcodeModalOpen(true);
      },
    },
    {
      title: 'Periksa Audit Trail Enkripsi SHA-256',
      category: 'Kepatuhan',
      icon: History,
      action: () => {
        appStore.setCommandPaletteOpen(false);
        appStore.setAuditLogsOpen(true);
      },
    },
    {
      title: `Ubah Mode Tampilan (${themeMode === 'dark' ? 'Mode Terang' : 'Mode Gelap'})`,
      category: 'Preferensi',
      icon: themeMode === 'dark' ? Sun : Moon,
      action: () => {
        appStore.toggleThemeMode();
        appStore.setCommandPaletteOpen(false);
      },
    },
  ];

  // Filter actions or items based on query
  const filteredActions = quickActions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  const matchedItems = items
    .filter(
      (i) =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.code.toLowerCase().includes(query.toLowerCase()) ||
        i.lotNumber.toLowerCase().includes(query.toLowerCase()) ||
        i.barcode.includes(query)
    )
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Search Header Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            id="command-palette-input"
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik perintah, nomor DO, lot batch, nama produk, atau modul..."
            className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
          />
          <button
            onClick={() => appStore.setCommandPaletteOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-3">
          {/* Matched Master Items if searching */}
          {query.trim().length > 0 && matchedItems.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 px-2 mb-1.5">
                Barang Master / LOT Cocok
              </div>
              <div className="space-y-1">
                {matchedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      appStore.setActiveModule('master_data');
                      appStore.setCommandPaletteOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors group"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {item.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                        <span>LOT: {item.lotNumber}</span>
                        <span>Stok: {item.stockQty} {item.unit}</span>
                        <span>Lokasi: {item.locationRack}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions list */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 px-2 mb-1.5">
              Tindakan & Navigasi Cepat
            </div>
            <div className="space-y-1">
              {filteredActions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="w-full text-left p-2 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.category}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              Navigasi
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[10px]">
                Enter
              </kbd>{' '}
              Pilih
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[10px]">
                Esc
              </kbd>{' '}
              Tutup
            </span>
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            PT St. Morita Enterprise v1.0
          </span>
        </div>
      </div>
    </div>
  );
};
