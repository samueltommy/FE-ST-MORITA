import React, { useState } from 'react';
import {
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Car,
  Shield,
  FileCheck,
  AlertCircle,
  Plus,
  Navigation,
  X,
  Search,
  Lock,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { VehicleBooking, SalesOutdoorVisit } from '../../types';
import { Can } from '../../components/rbac/Can';
import { useRBAC } from '../../hooks/useRBAC';
import { HrdFormsModal } from '../../components/forms/HrdFormsModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaveRequestsApi, getVehicleBookingsApi, getSalesVisitsApi, approveVehicleBookingApi, getAttendanceApi, getEmployeesApi } from '../../services/hrdService';
import { LeaveRequestsTab } from './LeaveRequestsTab';

const CONTENT = {
  id: {
    title: 'HRD, Armada Pabrik & GPS Visit Sales',
    desc: 'Presensi staf shift kerja, jadwal pemesanan kendaraan dinas/truk armada, dan geo-tracking log visit sales outdoor',
    btnInput: 'Form Input HRD',
    tabFleet: 'Presensi & Armada Pabrik',
    tabGps: 'Log GPS Sales',
    tabLeave: 'Pengajuan Cuti',
    kpi1Title: 'Total Karyawan Aktif',
    kpi1Desc: 'Fasilitas Plant 1 & 2',
    kpi1Value: '428 Orang',
    kpi2Title: 'Hadir Shift Pagi/Siang',
    kpi2Desc: 'Fingerprint & Facial Valid',
    kpi3Title: 'Izin & Cuti Bersyarat',
    kpi3Value: '11 Orang',
    kpi3Desc: 'Surat Dokter / Cuti Tahunan',
    kpi4Title: 'Tugas Luar Kota / Sales',
    kpi4Value: '5 Orang',
    kpi4Desc: 'Kunjungan Kawasan Industri Mitra',
    fleetTitle: 'Jadwal Penggunaan Kendaraan Operasional & Truk Armada',
    fleetDesc: 'Persetujuan izin armada pabrik untuk pengiriman Delivery Order atau dinas luar',
    fleetApproveLabel: 'Persetujuan:',
    fleetApproveRole: 'HRD & GA Officer',
    fleetDest: 'Tujuan:',
    fleetDriver: 'Supir:',
    fleetReq: 'Pemohon:',
    fleetSched: 'Jadwal:',
    fleetSdt: 's/d',
    fleetPending: 'Menunggu Persetujuan HRD',
    fleetBtnApprove: 'Setujui Penggunaan Armada',
    fleetApproved: 'Telah Disetujui HRD',
    gpsTitle: 'Log Check-In GPS Kunjungan Lapangan Sales',
    gpsDesc: 'Pencatatan koordinat GPS real-time kunjungan klien tim Sales Executive',
    gpsTime: 'Waktu:',
    gpsRep: 'Sales Rep:',
  },
  en: {
    title: 'HRD, Factory Fleet & Sales GPS Visit',
    desc: 'Shift staff attendance, official vehicle/truck fleet booking schedules, and outdoor sales visit geo-tracking logs',
    btnInput: 'HRD Input Form',
    tabFleet: 'Attendance & Factory Fleet',
    tabGps: 'Sales GPS Log',
    tabLeave: 'Leave Requests',
    kpi1Title: 'Total Active Employees',
    kpi1Desc: 'Plant 1 & 2 Facilities',
    kpi1Value: '428 People',
    kpi2Title: 'Morning/Afternoon Shift Present',
    kpi2Desc: 'Fingerprint & Facial Valid',
    kpi3Title: 'Permits & Conditional Leave',
    kpi3Value: '11 People',
    kpi3Desc: 'Doctor\'s Note / Annual Leave',
    kpi4Title: 'Out of Town Duty / Sales',
    kpi4Value: '5 People',
    kpi4Desc: 'Partner Industrial Estate Visits',
    fleetTitle: 'Operational Vehicle & Truck Fleet Usage Schedule',
    fleetDesc: 'Factory fleet permit approval for Delivery Order dispatch or out of town duty',
    fleetApproveLabel: 'Approval:',
    fleetApproveRole: 'HRD & GA Officer',
    fleetDest: 'Destination:',
    fleetDriver: 'Driver:',
    fleetReq: 'Requested By:',
    fleetSched: 'Schedule:',
    fleetSdt: 'to',
    fleetPending: 'Waiting for HRD Approval',
    fleetBtnApprove: 'Approve Fleet Usage',
    fleetApproved: 'Approved by HRD',
    gpsTitle: 'Sales Field Visit GPS Check-In Log',
    gpsDesc: 'Real-time GPS coordinate recording of Sales Executive team client visits',
    gpsTime: 'Time:',
    gpsRep: 'Sales Rep:',
  }
};

export const HrdModule: React.FC = () => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;
  const queryClient = useQueryClient();

  const { data: leaveRequests = [], error: leaveError } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: () => getLeaveRequestsApi(),
  });
  const isLeaveForbidden = (leaveError as any)?.response?.status === 403;

  const { data: vehicleBookings = [] } = useQuery({
    queryKey: ['vehicleBookings'],
    queryFn: () => getVehicleBookingsApi(),
  });

  const [attPage, setAttPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: salesVisitsRes, isLoading: loadingSales } = useQuery({
    queryKey: ['salesVisits', salesPage, pageSize],
    queryFn: () => getSalesVisitsApi(salesPage, pageSize),
  });
  const salesVisits = salesVisitsRes?.data || [];
  const salesTotalPages = salesVisitsRes?.meta?.total_pages || 1;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'week' | 'month' | 'custom'>('custom');
  const [attSearch, setAttSearch] = useState('');
  const [viewUserDetail, setViewUserDetail] = useState<any>(null);

  const handleDateFilterModeChange = (mode: 'today' | 'week' | 'month' | 'custom') => {
    setDateFilterMode(mode);
    setAttPage(1);
    if (mode === 'custom') return;
    
    const getLocalDateString = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };
    
    const today = new Date();
    const end = getLocalDateString(today);
    let start = end;
    
    if (mode === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      start = getLocalDateString(weekAgo);
    } else if (mode === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      start = getLocalDateString(monthAgo);
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  React.useEffect(() => {
    // handleDateFilterModeChange('today');
  }, []);

  const { data: attendanceRes, isLoading: loadingAtt } = useQuery({
    queryKey: ['attendanceLogs', attPage, pageSize, startDate, endDate],
    queryFn: () => getAttendanceApi(attPage, pageSize, startDate, endDate),
  });
  const attendanceLogs = attendanceRes?.data || [];
  const attTotalPages = attendanceRes?.meta?.total_pages || 1;

  const currentUser = useAppStore((state) => state.currentUser);
  const { isSuperAdmin, isExecutive, hasPermission } = useRBAC();
  const isHrdAdmin = isSuperAdmin || isExecutive || hasPermission('hrd:employee:read') || hasPermission('hrd:attendance:write');

  // We don't need all-metrics here anymore
  const allApiUsers: any[] = [];

  const filteredAttendanceLogs = attendanceLogs.filter((log: any) => 
    log.employeeName.toLowerCase().includes(attSearch.toLowerCase())
  );

  const [activeTab, setActiveTab] = useState<'attendance_fleet' | 'sales_gps' | 'leave_requests'>(isHrdAdmin ? 'attendance_fleet' : 'leave_requests');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalTab, setFormModalTab] = useState<'leave' | 'vehicle' | 'visit' | 'employee'>('leave');

  const approveVehicleMutation = useMutation({
    mutationFn: approveVehicleBookingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleBookings'] });
    }
  });

  const handleApproveVehicle = (bookingId: string) => {
    approveVehicleMutation.mutate(bookingId);
  };

  const openFormWithTab = (tab: 'leave' | 'vehicle' | 'visit' | 'employee') => {
    setFormModalTab(tab);
    setFormModalOpen(true);
  };

  if (isLeaveForbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Lock className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-600">Akses Terbatas</h2>
        <p className="mt-2 text-sm text-center max-w-md">
          Anda tidak memiliki izin (role) yang memadai untuk mengakses modul ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isHrdAdmin ? t.title : 'Pengajuan Cuti'}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {isHrdAdmin ? t.desc : 'Kelola dan ajukan permohonan cuti atau izin Anda'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => openFormWithTab('leave')}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isHrdAdmin ? t.btnInput : 'Buat Pengajuan'}</span>
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start overflow-x-auto max-w-full">
          {isHrdAdmin && (
            <>
              <button
                onClick={() => setActiveTab('attendance_fleet')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'attendance_fleet'
                    ? 'bg-white text-violet-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {t.tabFleet}
              </button>
              <button
                onClick={() => setActiveTab('sales_gps')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'sales_gps'
                    ? 'bg-white text-violet-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>{t.tabGps}</span>
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('leave_requests')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'leave_requests'
                ? 'bg-white text-violet-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t.tabLeave}</span>
          </button>
        </div>
      </div>

      {activeTab === 'leave_requests' ? (
        <LeaveRequestsTab onOpenForm={() => openFormWithTab('leave')} />
      ) : activeTab === 'attendance_fleet' && isHrdAdmin ? (
        <div className="space-y-6">
          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">{t.kpi1Title}</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{t.kpi1Value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t.kpi1Desc}</div>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">{t.kpi2Title}</span>
              <div className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-1">412 (96.2%)</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">{t.kpi2Desc}</div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">{t.kpi3Title}</span>
              <div className="text-xl font-black text-amber-800 dark:text-amber-200 mt-1">{t.kpi3Value}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">{t.kpi3Desc}</div>
            </div>

            <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">{t.kpi4Title}</span>
              <div className="text-xl font-black text-blue-800 dark:text-blue-200 mt-1">{t.kpi4Value}</div>
              <div className="text-[10px] text-blue-600 mt-0.5">{t.kpi4Desc}</div>
            </div>
          </div>

          {/* Attendance Detail Table */}
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Detail Presensi Karyawan
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={attSearch}
                      onChange={(e) => { setAttSearch(e.target.value); setAttPage(1); }}
                      placeholder="Cari nama karyawan..."
                      className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl w-fit">
                  <button onClick={() => handleDateFilterModeChange('today')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${dateFilterMode === 'today' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Hari Ini</button>
                  <button onClick={() => handleDateFilterModeChange('week')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${dateFilterMode === 'week' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>1 Minggu</button>
                  <button onClick={() => handleDateFilterModeChange('month')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${dateFilterMode === 'month' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>1 Bulan</button>
                  <button onClick={() => handleDateFilterModeChange('custom')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${dateFilterMode === 'custom' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Custom</button>
                </div>
                
                {dateFilterMode === 'custom' && (
                  <div className="flex items-center gap-2 text-xs">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => { setStartDate(e.target.value); setAttPage(1); }} 
                      className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <span className="text-slate-500 font-medium">s/d</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => { setEndDate(e.target.value); setAttPage(1); }} 
                      className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    {(startDate || endDate) && (
                      <button 
                        onClick={() => { setStartDate(''); setEndDate(''); setAttPage(1); }}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                        title="Reset Tanggal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-auto max-h-[60vh] 2xl:max-h-[70vh]">
              <table className="w-full text-xs text-left relative">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-sm text-slate-500 dark:text-slate-400">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 font-bold">Nama Karyawan</th>
                    <th className="px-4 py-3 font-bold">Departemen</th>
                    <th className="px-4 py-3 font-bold">Shift</th>
                    <th className="px-4 py-3 font-bold">Check In</th>
                    <th className="px-4 py-3 font-bold">Check Out</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendanceLogs.map((log: any) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        const employeeInfo = allApiUsers.find((u: any) => String(u.id) === String(log.employeeId) || u.fullName === log.employeeName) || { full_name: log.employeeName, department: log.department };
                        setViewUserDetail(employeeInfo);
                      }}
                      title="Klik untuk melihat profil lengkap"
                    >
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400 group-hover:underline">{log.employeeName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.department}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.shift}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.checkIn}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.checkOut}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                          log.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                          log.status === 'TERLAMBAT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAttendanceLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                        {loadingAtt ? 'Memuat data presensi...' : 'Tidak ada data presensi yang sesuai.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* KONTROL PAGINATION ATTENDANCE */}
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 font-medium">
                  Halaman {attPage} dari {attTotalPages}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setAttPage(1);
                  }}
                  className="text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <option value={10}>10 Baris</option>
                  <option value={20}>20 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={attPage === 1}
                  onClick={() => setAttPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Sebelumnya
                </button>
                <button 
                  disabled={attPage >= attTotalPages}
                  onClick={() => setAttPage(p => p + 1)}
                  className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>

          {/* Vehicle Fleet Reservation Section */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-violet-600" />
                  <span>{t.fleetTitle}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {t.fleetDesc}
                </p>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {t.fleetApproveLabel} <strong className="text-violet-600">{t.fleetApproveRole}</strong>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {vehicleBookings.map((vcl) => {
                const isPending = vcl.status === 'PENDING' || (vcl.status as string) === 'PENDING_HRD';
                return (
                  <div key={vcl.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {vcl.vehiclePlate || vcl.licensePlate}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {vcl.vehicleModel || vcl.vehicleName}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                            vcl.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {vcl.status}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 font-medium">
                        {t.fleetDest} <strong>{vcl.destination}</strong> ({vcl.purpose})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.fleetDriver} {vcl.driverName} • {t.fleetReq} {vcl.requestedBy || 'Staff Pabrik'} • {t.fleetSched} {vcl.departureDate || vcl.departureTime} {vcl.returnDate ? `${t.fleetSdt} ${vcl.returnDate}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <Can
                          perform="hrd:vehicle:approve"
                          fallback={
                            <span className="text-[11px] text-amber-600 italic">
                              Menunggu Persetujuan HRD
                            </span>
                          }
                        >
                          <button
                            onClick={() => handleApproveVehicle(vcl.id)}
                            className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs"
                          >
                            {t.fleetBtnApprove}
                          </button>
                        </Can>
                      ) : (
                        <div className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.fleetApproved}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : isHrdAdmin ? (
        /* Sales Outdoor GPS Visit Logs */
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-violet-600" />
                <span>{t.gpsTitle}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {t.gpsDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {salesVisits.map((vst) => (
              <div
                key={vst.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {vst.clientCompany || vst.clientName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px] font-bold">
                    {vst.status || 'VERIFIED_CHECKIN'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{vst.locationArea || vst.clientAddress}</span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                  GPS: {vst.gpsCoords || (vst.coordinates ? `${vst.coordinates.lat}, ${vst.coordinates.lng}` : '-6.3245, 107.1382')} • {t.gpsTime} {vst.checkInTime}
                </div>

                <p className="text-slate-700 dark:text-slate-300 text-[11px] italic">
                  "{vst.notes || vst.resultNotes || vst.purpose}"
                </p>

                <div className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  {t.gpsRep} <strong>{vst.salesRep || vst.salesName}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* MODAL: View Employee Detail */}
      {viewUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Detail Lengkap Karyawan
              </h2>
              <button
                onClick={() => setViewUserDetail(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Identitas & Pekerjaan</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">Nama Lengkap</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.full_name || viewUserDetail.fullName || viewUserDetail.name || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">NIK</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.nik || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Email</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.email || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">No HP</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.phone_number || viewUserDetail.phoneNumber || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Departemen</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.department || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Status Pegawai</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.employment_status || viewUserDetail.employmentStatus || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Level Akses</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.user_level || viewUserDetail.userLevel || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Tgl Bergabung</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.join_date || viewUserDetail.joinDate || '-'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Dokumen Resmi & Finansial</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">No. KTP</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{viewUserDetail.identity_card_number || viewUserDetail.identityCardNumber || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">No. NPWP</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{viewUserDetail.npwp_number || viewUserDetail.npwpNumber || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">BPJS Kesehatan</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{viewUserDetail.bpjs_kesehatan || viewUserDetail.bpjsKesehatan || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">BPJS Ketenagakerjaan</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{viewUserDetail.bpjs_ketenagakerjaan || viewUserDetail.bpjsKetenagakerjaan || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Gaji Pokok</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">Rp {(viewUserDetail.basic_salary || viewUserDetail.basicSalary)?.toLocaleString() || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Bank & Rekening</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {viewUserDetail.bank_name || viewUserDetail.bankName || '-'} - {viewUserDetail.bank_account_number || viewUserDetail.bankAccountNumber || '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Data Pribadi</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">Tempat Lahir</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.place_of_birth || viewUserDetail.placeOfBirth || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Tanggal Lahir</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.date_of_birth || viewUserDetail.dateOfBirth || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Agama</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.religion || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Status Pernikahan</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.marital_status || viewUserDetail.maritalStatus || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Alamat</div>
                    <div className="col-span-2 font-medium text-slate-800 dark:text-slate-200 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{viewUserDetail.address || '-'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Keluarga & Darurat</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">Kontak Darurat (No)</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.emergency_contact_phone || viewUserDetail.emergencyContactPhone || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Relasi Darurat</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.emergency_contact_relationship || viewUserDetail.emergencyContactRelationship || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Nama Pasangan</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.spouse_name || viewUserDetail.spouseName || '-'}</div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Data Anak:</div>
                    {(viewUserDetail.children && viewUserDetail.children.length > 0) ? (
                      <div className="space-y-1">
                        {viewUserDetail.children.map((child: any, idx: number) => (
                          <div key={idx} className="flex justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{child.name}</span>
                            <span className="text-slate-500 dark:text-slate-400">{child.age} tahun</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic">Tidak ada data anak.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Kuota & Sisa Cuti</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Hak Cuti Tahunan</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.hak_cuti_tahunan ?? '-'} hari</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Cuti Terpakai</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.cuti_terpakai ?? '-'} hari</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="text-blue-600 dark:text-blue-400 mb-1">Sisa Cuti Aktif</div>
                    <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">{viewUserDetail.sisa_cuti_aktif ?? '-'} hari</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Periode Berlaku</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.periode_berlaku_cuti || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HRD Forms Modal */}
      <HrdFormsModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        defaultTab={formModalTab}
      />
    </div>
  );
};
