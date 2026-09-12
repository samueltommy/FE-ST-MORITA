import React, { useState } from 'react';
import {
  FileCheck,
  X,
  Download,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { exportAuditLogsToCSV } from '../../utils/cryptoAudit';

export const AuditLogsDrawer: React.FC = () => {
  const isOpen = useAppStore((state) => state.isAuditLogsOpen);
  const auditLogs = useAppStore((state) => state.auditLogs);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    const matchesQuery =
      searchQuery === '' ||
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.sha256Hash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesQuery;
  });

  const handleDownloadCsv = () => {
    const csvContent = exportAuditLogsToCSV(filteredLogs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PT_St_Morita_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-150">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Audit Trail & Kepatuhan Regulasi
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  SHA-256 Immutability Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Log rekaman perubahan sistem terenkripsi untuk audit ISO 9001 & Bea Cukai Kawasan Berikat
              </p>
            </div>
          </div>
          <button
            onClick={() => appStore.setAuditLogsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Search & Export CSV */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari user, ID entitas, detail, atau hash..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="OVERRIDE_HOLD">OVERRIDE_HOLD</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada riwayat audit yang sesuai dengan filter pencarian.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-xs space-y-2"
                >
                  {/* Top line: Action badge + Actor + Timestamp */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase tracking-wider ${
                          log.action === 'OVERRIDE_HOLD'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                            : log.action === 'APPROVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : log.action === 'CREATE'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {log.actorName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        [{log.actorRole}]
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono shrink-0">
                      <Clock className="w-3 h-3" />
                      {log.timestamp.replace('T', ' ').slice(0, 19)}
                    </div>
                  </div>

                  {/* Details text */}
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {log.details}
                  </p>

                  {/* Entity tag & IP */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span>
                        Entitas: <strong className="text-slate-600 dark:text-slate-300">{log.entity}</strong> ({log.entityId})
                      </span>
                      <span>IP: {log.ipAddress}</span>
                    </div>

                    {(log.stateBefore || log.stateAfter) && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {isExpanded ? 'Sembunyikan Diff' : 'Lihat Diff Perubahan'}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {/* Cryptographic SHA-256 Seal */}
                  <div className="p-2 rounded-lg bg-black/5 dark:bg-black/30 font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Hash: {log.sha256Hash}</span>
                  </div>

                  {/* State Diff preview if expanded */}
                  {isExpanded && (log.stateBefore || log.stateAfter) && (
                    <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2 mt-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        State Transition Diff:
                      </div>
                      {log.stateBefore && (
                        <div>
                          <span className="text-rose-400 font-bold">- SEBELUM: </span>
                          <span>{JSON.stringify(log.stateBefore)}</span>
                        </div>
                      )}
                      {log.stateAfter && (
                        <div>
                          <span className="text-emerald-400 font-bold">+ SESUDAH: </span>
                          <span>{JSON.stringify(log.stateAfter)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredLogs.length} rekaman audit</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Sertifikasi Keamanan ISO 27001 Ready
          </span>
        </div>
      </div>
    </div>
  );
};
