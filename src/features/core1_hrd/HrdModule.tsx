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
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';

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

  const leaveList = Array.isArray(leaveRequests) ? leaveRequests : (leaveRequests as any)?.data || [];

  const options: PageOptionItem[] = isHrdAdmin
    ? [
        {
          id: 'attendance_fleet',
          label: '1. Presensi & Armada Pabrik',
          subtitle: 'Presensi shift staf pabrik & pemesanan truk operasional',
          icon: Users,
          badge: attendanceLogs.length > 0 ? `${attendanceLogs.length} Log` : undefined,
        },
        {
          id: 'sales_gps',
          label: '2. Log GPS Sales Lapangan',
          subtitle: 'Geo-tracking check-in kunjungan outdoor sales',
          icon: Navigation,
          badge: salesVisits.length > 0 ? `${salesVisits.length} Visit` : undefined,
        },
        {
          id: 'leave_requests',
          label: '3. Pengajuan Cuti & Izin',
          subtitle: 'Persetujuan izin sakit, cuti tahunan & dispensasi',
          icon: Calendar,
          badge: leaveList.length > 0 ? `${leaveList.length} Pengajuan` : undefined,
        },
      ]
    : [
        {
          id: 'leave_requests',
          label: '1. Pengajuan Cuti & Izin Saya',
          subtitle: 'Kelola dan ajukan permohonan cuti Anda',
          icon: Calendar,
        },
      ];

  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.hrd);

  // When no feature is selected yet, render simple selection menu hub (matches client reference screenshot 1)
  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = isHrdAdmin
      ? [
          {
            id: 'attendance_fleet',
            label: 'Presensi Kehadiran & Jadwal Armada Truk Pabrik',
            subtitle: 'Kehadiran shift pagi/siang, fingerprint valid & persetujuan pemakaian armada',
            icon: Users,
            iconColor: 'text-violet-600',
            badge: `${attendanceLogs.length} Log Hari Ini`,
            badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
            onClick: () => appStore.setActiveSubFeature('hrd', 'attendance_fleet'),
          },
          {
            id: 'sales_gps',
            label: 'Log GPS Kunjungan Lapangan Sales',
            subtitle: `Rekam jejak koordinat GPS real-time kunjungan klien tim Sales (${salesVisits.length} Kunjungan)`,
            icon: Navigation,
            iconColor: 'text-blue-600',
            badge: `${salesVisits.length} Check-in`,
            badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
            onClick: () => appStore.setActiveSubFeature('hrd', 'sales_gps'),
          },
          {
            id: 'leave_requests',
            label: 'Pengajuan & Persetujuan Cuti Pegawai',
            subtitle: `Cuti tahunan, izin sakit, surat dokter & verifikasi atasan (${leaveList.length} Pengajuan)`,
            icon: Calendar,
            iconColor: 'text-emerald-600',
            badge: leaveList.length > 0 ? `${leaveList.length} Pengajuan` : undefined,
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            onClick: () => appStore.setActiveSubFeature('hrd', 'leave_requests'),
          },
          {
            id: 'form',
            label: 'Formulir HRD & Pengajuan Baru',
            subtitle: 'Input permohonan cuti, izin kendaraan operasional, atau pendaftaran dinas luar',
            icon: Plus,
            iconColor: 'text-amber-600',
            badge: 'Input Baru',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
            onClick: () => openFormWithTab('leave'),
          },
        ]
      : [
          {
            id: 'leave_requests',
            label: 'Pengajuan Cuti & Izin Saya',
            subtitle: `Kelola dan ajukan permohonan cuti atau izin kerja Anda (${leaveList.length} Pengajuan)`,
            icon: Calendar,
            iconColor: 'text-violet-600',
            onClick: () => appStore.setActiveSubFeature('hrd', 'leave_requests'),
          },
          {
            id: 'form',
            label: 'Buat Pengajuan Cuti Baru',
            subtitle: 'Formulir pengajuan cuti tahunan, izin sakit atau keperluan mendesak',
            icon: Plus,
            iconColor: 'text-emerald-600',
            badge: 'Ajukan',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            onClick: () => openFormWithTab('leave'),
          },
        ];

    return (
      <ModuleFeatureHub
        moduleCode="Core 1"
        moduleName="HRD, ARMADA PABRIK & FASILITAS"
        moduleDescription="Presensi staf shift kerja, jadwal pemesanan kendaraan dinas/truk armada, geo-tracking log visit sales outdoor, dan kelola cuti pegawai."
        headerBgColor="bg-violet-600"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const currentTab = (activeSubFeature as any) || (isHrdAdmin ? 'attendance_fleet' : 'leave_requests');

  return (
    <div className="space-y-6">
      {/* Senior-Friendly Header with Option Buttons */}
      <ModulePageHeader
        moduleCode="Core 1"
        title={isHrdAdmin ? t.title : 'Pengajuan Cuti & Izin Staf'}
        description={isHrdAdmin ? t.desc : 'Kelola dan ajukan permohonan cuti atau izin kerja Anda'}
        badgeColor="bg-violet-50 text-violet-800 border-violet-200"
        options={options}
        activeOption={currentTab}
        onSelectOption={(opt) => appStore.setActiveSubFeature('hrd', opt)}
        onBackToMenu={() => appStore.setActiveSubFeature('hrd', null)}
        menuName="HRD"
        actionButtons={
          <button
            onClick={() => openFormWithTab('leave')}
            className="px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-base font-extrabold shadow-sm flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>{isHrdAdmin ? t.btnInput : 'Buat Pengajuan'}</span>
          </button>
        }
      />

      {activeTab === 'leave_requests' ? (
        <LeaveRequestsTab onOpenForm={() => openFormWithTab('leave')} />
      ) : activeTab === 'attendance_fleet' && isHrdAdmin ? (
        <div className="space-y-6">
          {/* Attendance KPI Cards (Enlarged) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 sm:p-6 rounded-3xl border-2 border-slate-200 bg-white shadow-xs">
              <span className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider">{t.kpi1Title}</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">{t.kpi1Value}</div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">{t.kpi1Desc}</div>
            </div>

            <div className="p-5 sm:p-6 rounded-3xl border-2 border-emerald-200 bg-emerald-50/50 shadow-xs">
              <span className="text-xs sm:text-sm font-black text-emerald-800 uppercase tracking-wider">{t.kpi2Title}</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1.5">412 (96.2%)</div>
              <div className="text-xs sm:text-sm font-medium text-emerald-700 mt-1">{t.kpi2Desc}</div>
            </div>

            <div className="p-5 sm:p-6 rounded-3xl border-2 border-amber-200 bg-amber-50/50 shadow-xs">
              <span className="text-xs sm:text-sm font-black text-amber-800 uppercase tracking-wider">{t.kpi3Title}</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-900 mt-1.5">{t.kpi3Value}</div>
              <div className="text-xs sm:text-sm font-medium text-amber-700 mt-1">{t.kpi3Desc}</div>
            </div>

            <div className="p-5 sm:p-6 rounded-3xl border-2 border-blue-200 bg-blue-50/50 shadow-xs">
              <span className="text-xs sm:text-sm font-black text-blue-800 uppercase tracking-wider">{t.kpi4Title}</span>
              <div className="text-2xl sm:text-3xl font-black text-blue-900 mt-1.5">{t.kpi4Value}</div>
              <div className="text-xs sm:text-sm font-medium text-blue-700 mt-1">{t.kpi4Desc}</div>
            </div>
          </div>

          {/* Attendance Detail Table (Large & High Contrast) */}
          <div className="mt-8 bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 sm:p-6 border-b-2 border-slate-200 bg-slate-50 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2.5">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                  Detail Presensi Karyawan
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={attSearch}
                      onChange={(e) => { setAttSearch(e.target.value); setAttPage(1); }}
                      placeholder="Cari nama karyawan..."
                      className="pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-800 text-sm sm:text-base font-semibold focus:border-indigo-600 outline-none w-full shadow-2xs"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-2xl">
                  <button onClick={() => handleDateFilterModeChange('today')} className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all cursor-pointer ${dateFilterMode === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Hari Ini</button>
                  <button onClick={() => handleDateFilterModeChange('week')} className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all cursor-pointer ${dateFilterMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>1 Minggu</button>
                  <button onClick={() => handleDateFilterModeChange('month')} className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all cursor-pointer ${dateFilterMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>1 Bulan</button>
                  <button onClick={() => handleDateFilterModeChange('custom')} className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all cursor-pointer ${dateFilterMode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Pilih Tanggal</button>
                </div>
                
                {dateFilterMode === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-bold">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => { setStartDate(e.target.value); setAttPage(1); }} 
                      className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 outline-none focus:border-indigo-600"
                    />
                    <span className="text-slate-500 font-extrabold">s/d</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => { setEndDate(e.target.value); setAttPage(1); }} 
                      className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 outline-none focus:border-indigo-600"
                    />
                    {(startDate || endDate) && (
                      <button 
                        onClick={() => { setStartDate(''); setEndDate(''); setAttPage(1); }}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Reset Tanggal"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-auto max-h-[60vh] 2xl:max-h-[70vh]">
              <table className="w-full text-sm sm:text-base text-left relative">
                <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm text-slate-700 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-5 py-4 font-black">Nama Karyawan</th>
                    <th className="px-5 py-4 font-black">Departemen</th>
                    <th className="px-5 py-4 font-black">Shift</th>
                    <th className="px-5 py-4 font-black">Check In</th>
                    <th className="px-5 py-4 font-black">Check Out</th>
                    <th className="px-5 py-4 font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAttendanceLogs.map((log: any) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        const employeeInfo = allApiUsers.find((u: any) => String(u.id) === String(log.employeeId) || u.fullName === log.employeeName) || { full_name: log.employeeName, department: log.department };
                        setViewUserDetail(employeeInfo);
                      }}
                      title="Klik untuk melihat profil lengkap"
                    >
                      <td className="px-5 py-4 font-black text-blue-700 text-base sm:text-lg group-hover:underline">{log.employeeName}</td>
                      <td className="px-5 py-4 text-slate-800 font-semibold">{log.department}</td>
                      <td className="px-5 py-4 text-slate-800 font-bold">{log.shift}</td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">{log.checkIn}</td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">{log.checkOut}</td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 text-xs sm:text-sm font-black rounded-full ${
                          log.status === 'HADIR' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          log.status === 'TERLAMBAT' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAttendanceLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500 font-bold text-base italic">
                        {loadingAtt ? 'Memuat data presensi...' : 'Tidak ada data presensi yang sesuai.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* KONTROL PAGINATION ATTENDANCE */}
            <div className="flex flex-wrap justify-between items-center p-5 bg-slate-50 border-t-2 border-slate-200 gap-3">
              <div className="flex items-center gap-4">
                <span className="text-sm sm:text-base text-slate-600 font-extrabold">
                  Halaman {attPage} dari {attTotalPages}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setAttPage(1);
                  }}
                  className="text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl bg-white px-3 py-2 text-slate-800 outline-none focus:border-indigo-600 transition-colors cursor-pointer"
                >
                  <option value={10}>10 Baris per Halaman</option>
                  <option value={20}>20 Baris per Halaman</option>
                  <option value={50}>50 Baris per Halaman</option>
                  <option value={100}>100 Baris per Halaman</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={attPage === 1}
                  onClick={() => setAttPage(p => Math.max(1, p - 1))}
                  className="px-4 py-2 text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  &larr; Sebelumnya
                </button>
                <button 
                  disabled={attPage >= attTotalPages}
                  onClick={() => setAttPage(p => p + 1)}
                  className="px-4 py-2 text-sm sm:text-base font-extrabold border-2 border-slate-300 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Selanjutnya &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Vehicle Fleet Reservation Section (Large Cards) */}
          <div className="p-6 sm:p-8 rounded-3xl border-2 border-slate-200 bg-white shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Car className="w-6 h-6 text-violet-600" />
                  <span>{t.fleetTitle}</span>
                </h3>
                <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
                  {t.fleetDesc}
                </p>
              </div>

              <div className="text-sm sm:text-base text-slate-600 font-bold">
                {t.fleetApproveLabel} <strong className="text-violet-700">{t.fleetApproveRole}</strong>
              </div>
            </div>

            <div className="divide-y-2 divide-slate-100">
              {vehicleBookings.map((vcl) => {
                const isPending = vcl.status === 'PENDING' || (vcl.status as string) === 'PENDING_HRD';
                return (
                  <div key={vcl.id} className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm sm:text-base font-black text-slate-900 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200">
                          {vcl.vehiclePlate || vcl.licensePlate}
                        </span>
                        <span className="font-extrabold text-base sm:text-lg text-slate-900">
                          {vcl.vehicleModel || vcl.vehicleName}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full uppercase ${
                            vcl.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {vcl.status}
                        </span>
                      </div>
                      <div className="text-slate-800 text-sm sm:text-base font-medium">
                        {t.fleetDest} <strong className="font-black text-slate-950">{vcl.destination}</strong> ({vcl.purpose})
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 font-semibold flex flex-wrap gap-2">
                        <span>{t.fleetDriver} <strong>{vcl.driverName}</strong></span>
                        <span>•</span>
                        <span>{t.fleetReq} <strong>{vcl.requestedBy || 'Staff Pabrik'}</strong></span>
                        <span>•</span>
                        <span>{t.fleetSched} <strong>{vcl.departureDate || vcl.departureTime}</strong> {vcl.returnDate ? `${t.fleetSdt} ${vcl.returnDate}` : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isPending ? (
                        <Can
                          perform="hrd:vehicle:approve"
                          fallback={
                            <span className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                              Menunggu Persetujuan HRD
                            </span>
                          }
                        >
                          <button
                            onClick={() => handleApproveVehicle(vcl.id)}
                            className="px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm sm:text-base shadow-sm cursor-pointer transition-all"
                          >
                            {t.fleetBtnApprove}
                          </button>
                        </Can>
                      ) : (
                        <div className="text-emerald-700 font-black text-sm sm:text-base flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
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
        /* Sales Outdoor GPS Visit Logs (Enlarged Cards) */
        <div className="p-6 sm:p-8 rounded-3xl border-2 border-slate-200 bg-white shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 pb-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                <Navigation className="w-6 h-6 text-violet-600" />
                <span>{t.gpsTitle}</span>
              </h3>
              <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
                {t.gpsDesc}
              </p>
            </div>
            <div className="text-sm font-extrabold text-slate-500">
              Total: {salesVisits.length} Kunjungan
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {salesVisits.map((vst) => (
              <div
                key={vst.id}
                className="p-5 sm:p-6 rounded-3xl border-2 border-slate-200 bg-slate-50/60 text-sm sm:text-base space-y-3.5 shadow-2xs hover:border-violet-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-base sm:text-xl text-slate-900 leading-snug">
                    {vst.clientCompany || vst.clientName}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-xs sm:text-sm font-black shrink-0">
                    {vst.status || 'VERIFIED'}
                  </span>
                </div>

                <div className="text-sm sm:text-base text-slate-700 flex items-center gap-2 font-medium">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{vst.locationArea || vst.clientAddress}</span>
                </div>

                <div className="p-3 rounded-2xl bg-white font-mono text-xs sm:text-sm text-slate-700 border border-slate-200 font-bold">
                  GPS: {vst.gpsCoords || (vst.coordinates ? `${vst.coordinates.lat}, ${vst.coordinates.lng}` : '-6.3245, 107.1382')} • {t.gpsTime} {vst.checkInTime}
                </div>

                <p className="text-slate-800 text-sm sm:text-base italic bg-white/70 p-3 rounded-2xl border border-slate-200">
                  "{vst.notes || vst.resultNotes || vst.purpose}"
                </p>

                <div className="text-xs sm:text-sm text-slate-600 border-t border-slate-200 pt-2 font-bold flex items-center justify-between">
                  <span>{t.gpsRep} <strong className="text-slate-900">{vst.salesRep || vst.salesName}</strong></span>
                  <span className="text-violet-600 font-mono text-xs">Geo-Verified</span>
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
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Identitas & Pekerjaan</h3>
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
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Dokumen Resmi & Finansial</h3>
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
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Data Pribadi</h3>
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
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Keluarga & Darurat</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500 dark:text-slate-400">Kontak Darurat (No)</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.emergency_contact_phone || viewUserDetail.emergencyContactPhone || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Relasi Darurat</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.emergency_contact_relationship || viewUserDetail.emergencyContactRelationship || '-'}</div>
                    <div className="text-slate-500 dark:text-slate-400">Nama Pasangan</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{viewUserDetail.spouse_name || viewUserDetail.spouseName || '-'}</div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data Anak:</div>
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
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Kuota & Sisa Cuti</h3>
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

      {/* ─── Client Standard Bottom Action Toolbar with prominent BACK Button ─── */}
      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('hrd', null)}
        backLabel="BACK (KEMBALI KE MENU HRD)"
        actions={
          <button
            onClick={() => openFormWithTab('leave')}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Form Input HRD</span>
          </button>
        }
      />

      {/* HRD Forms Modal */}
      <HrdFormsModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        defaultTab={formModalTab}
      />
    </div>
  );
};
