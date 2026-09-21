import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { getLeaveRequestsApi, approveLeaveRequestApi } from '../../services/hrdService';
import type { LeaveRequestApi } from '../../lib/schemas';
import { CheckCircle2, XCircle, Clock, Calendar, Search, Filter, Download } from 'lucide-react';

interface Props {
  onOpenForm: () => void;
}

export const LeaveRequestsTab: React.FC<Props> = ({ onOpenForm }) => {
  const user = useAuthStore(state => state.user);
  const [requests, setRequests] = useState<LeaveRequestApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tabs for Manager (L2)
  const [l2Tab, setL2Tab] = useState<'team' | 'mine'>('team');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getLeaveRequestsApi();
      setRequests(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Gagal mengambil data cuti');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    const handleRefresh = () => fetchRequests();
    window.addEventListener('hrd:leave-submitted', handleRefresh);
    return () => window.removeEventListener('hrd:leave-submitted', handleRefresh);
  }, []);

  const handleApproveReject = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await approveLeaveRequestApi(id, action);
      // Refresh
      fetchRequests();
    } catch (err: any) {
      alert('Gagal memproses aksi: ' + (err?.response?.data?.message || err.message));
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1 w-max mx-auto"><CheckCircle2 className="w-3 h-3"/> Disetujui</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1 w-max mx-auto"><XCircle className="w-3 h-3"/> Ditolak</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center gap-1 w-max mx-auto"><Clock className="w-3 h-3"/> Menunggu</span>;
    }
  };

  // derived data
  const isL3 = user?.userLevel?.startsWith('L3');
  const isL2 = user?.userLevel?.startsWith('L2');
  const isL01 = user?.userLevel?.startsWith('L0') || user?.userLevel?.startsWith('L1');

  const filteredRequests = useMemo(() => {
    let result = requests;
    
    // Status filter applies to all
    if (filterStatus !== 'ALL') {
      result = result.filter(r => r.status === filterStatus);
    }
    
    // L2 specific tabs
    if (isL2) {
      if (l2Tab === 'mine') {
        result = result.filter(r => r.employeeId === user?.id || r.employeeName === user?.name);
      } else if (l2Tab === 'team') {
        result = result.filter(r => r.employeeId !== user?.id && r.employeeName !== user?.name);
      }
    }

    // L0/L1 specific filters
    if (isL01) {
      if (filterDept !== 'ALL') {
        result = result.filter(r => r.department === filterDept);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(r => 
          r.employeeName?.toLowerCase().includes(q) || 
          (r.reason || '').toLowerCase().includes(q)
        );
      }
    }
    
    return result;
  }, [requests, isL01, searchQuery, filterDept, filterStatus]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    requests.forEach(r => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts);
  }, [requests]);

  const renderTable = (data: LeaveRequestApi[], showActions: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
          <tr>
            <th className="px-4 py-3 rounded-tl-xl">Karyawan</th>
            <th className="px-4 py-3">Dept</th>
            <th className="px-4 py-3">Jenis & Alasan</th>
            <th className="px-4 py-3">Tanggal</th>
            <th className="px-4 py-3 text-center">Status</th>
            {showActions && <th className="px-4 py-3 text-right rounded-tr-xl">Aksi</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 6 : 5} className="py-8 text-center text-slate-400 text-xs">
                Tidak ada data pengajuan cuti.
              </td>
            </tr>
          ) : (
            data.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{r.employeeName}</div>
                  <div className="text-[10px] text-slate-400">{r.employeeNik}</div>
                </td>
                <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{r.department}</td>
                <td className="px-4 py-3">
                  <div className="text-xs font-bold text-violet-700 dark:text-violet-400">{r.requestType}</div>
                  <div className="text-[11px] text-slate-500 max-w-[200px] truncate" title={r.reason}>{r.reason}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-[11px] flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400"/> 
                    {r.startDate && r.startDate.split('T')[0]} s/d {r.endDate && r.endDate.split('T')[0]}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {getStatusBadge(r.status)}
                </td>
                {showActions && (
                  <td className="px-4 py-3 text-right">
                    {r.status === 'PENDING_APPROVAL' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleApproveReject(String(r.id), 'APPROVE')}
                          className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 transition-colors"
                          title="Setujui"
                        >
                          <CheckCircle2 className="w-4 h-4"/>
                        </button>
                        <button 
                          onClick={() => handleApproveReject(String(r.id), 'REJECT')}
                          className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 transition-colors"
                          title="Tolak"
                        >
                          <XCircle className="w-4 h-4"/>
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-600" />
              <span>
                {isL3 ? 'Daftar Pengajuan Cuti Anda' : isL2 ? 'Daftar Pengajuan Cuti (Tim & Saya)' : 'Dashboard HRD - Semua Pengajuan Cuti'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isL3 ? 'Pantau status permohonan cuti atau izin Anda.' : 'Kelola dan pantau pengajuan cuti/izin secara terpusat.'}
            </p>
          </div>
          <div className="flex gap-2">
            {(isL3 || isL2) && (
              <button
                onClick={onOpenForm}
                className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs"
              >
                Ajukan Cuti Baru
              </button>
            )}
            {isL01 && (
              <button
                onClick={() => alert('Fitur Export dalam pengembangan.')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5"/> Export
              </button>
            )}
          </div>
        </div>

        {isL2 && (
          <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            {[
              { id: 'team', label: 'Cuti Tim / Divisi' },
              { id: 'mine', label: 'Cuti Saya Sendiri' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setL2Tab(tab.id as any)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  l2Tab === tab.id ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Status filter for everyone */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400"/>
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING_APPROVAL">Menunggu Approval</option>
              <option value="APPROVED">Disetujui (Di ACC)</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>

          {/* HRD only filters */}
          {isL01 && (
            <>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Search className="w-4 h-4 text-slate-400"/>
                <input 
                  type="text" 
                  placeholder="Cari nama/alasan..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-none w-40 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter className="w-4 h-4 text-slate-400"/>
                <select 
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Semua Departemen</option>
                  {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs font-medium text-slate-400">Memuat data...</div>
        ) : error ? (
          <div className="py-8 text-center text-xs font-bold text-rose-500">{error}</div>
        ) : (
          renderTable(filteredRequests, isL01 || (isL2 && l2Tab === 'team'))
        )}
      </div>
    </div>
  );
};
