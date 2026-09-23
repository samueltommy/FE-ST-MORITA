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
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { VehicleBooking, SalesOutdoorVisit } from '../../types';
import { Can } from '../../components/rbac/Can';
import { useRBAC } from '../../hooks/useRBAC';
import { HrdFormsModal } from '../../components/forms/HrdFormsModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaveRequestsApi, getVehicleBookingsApi, getSalesVisitsApi, approveVehicleBookingApi, getAttendanceApi } from '../../services/hrdService';
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

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: getLeaveRequestsApi,
  });

  const { data: vehicleBookings = [] } = useQuery({
    queryKey: ['vehicleBookings'],
    queryFn: getVehicleBookingsApi,
  });

  const [attPage, setAttPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const pageSize = 10;

  const { data: salesVisitsRes, isLoading: loadingSales } = useQuery({
    queryKey: ['salesVisits', salesPage, pageSize],
    queryFn: () => getSalesVisitsApi(salesPage, pageSize),
  });
  const salesVisits = salesVisitsRes?.data || [];
  const salesTotalPages = salesVisitsRes?.meta?.total_pages || 1;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: attendanceRes, isLoading: loadingAtt } = useQuery({
    queryKey: ['attendanceLogs', attPage, pageSize, startDate, endDate],
    queryFn: () => getAttendanceApi(attPage, pageSize, startDate, endDate),
  });
  const attendanceLogs = attendanceRes?.data || [];
  const attTotalPages = attendanceRes?.meta?.total_pages || 1;

  const currentUser = useAppStore((state) => state.currentUser);
  const { isSuperAdmin, isExecutive, hasPermission } = useRBAC();
  const isHrdAdmin = isSuperAdmin || isExecutive || hasPermission('hrd:employee:read') || hasPermission('hrd:attendance:write');

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
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Detail Presensi Karyawan Harian
              </h3>
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
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-bold">Nama Karyawan</th>
                    <th className="px-4 py-3 font-bold">Departemen</th>
                    <th className="px-4 py-3 font-bold">Shift</th>
                    <th className="px-4 py-3 font-bold">Check In</th>
                    <th className="px-4 py-3 font-bold">Check Out</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{log.employeeName}</td>
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
                  {attendanceLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                        {loadingAtt ? 'Memuat data presensi...' : 'Tidak ada data presensi hari ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* KONTROL PAGINATION ATTENDANCE */}
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">
                Halaman {attPage} dari {attTotalPages}
              </span>
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

      {/* HRD Forms Modal */}
      <HrdFormsModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        defaultTab={formModalTab}
      />
    </div>
  );
};
