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
  Stethoscope,
  DoorOpen,
  Plane,
  UserCog,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { VehicleBooking, SalesOutdoorVisit } from '../../types';
import { Can } from '../../components/rbac/Can';
import { useRBAC } from '../../hooks/useRBAC';
import { HrdFormsModal } from '../../components/forms/HrdFormsModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaveRequestsApi, getVehicleBookingsApi, getSalesVisitsApi, approveVehicleBookingApi, getEmployeesApi } from '../../services/hrdService';
import { LeaveRequestsTab } from './LeaveRequestsTab';
import { UserManagementModule } from '../admin_users/UserManagementModule';
import { UserManagementTab } from './UserManagementTab';
import { LeaveAndSickTab } from './LeaveAndSickTab';
import { ExitPermitsTab } from './ExitPermitsTab';
import { VehiclesAndBookingsTab } from './VehiclesAndBookingsTab';
import { OutOfTownVisitsTab } from './OutOfTownVisitsTab';
import { MyEmployeeProfileView } from './MyEmployeeProfileView';
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

  const [salesPage, setSalesPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewUserDetail, setViewUserDetail] = useState<any>(null);

  const currentUser = useAppStore((state) => state.currentUser);
  const { isSuperAdmin, isExecutive, userDivision, hasPermission } = useRBAC();
  const isHrdAdmin = isSuperAdmin || isExecutive || userDivision === 'HRD' || hasPermission('hrd:employee:read');
  const canManageUsersTab = isSuperAdmin || isExecutive || userDivision === 'HRD';

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

  const options: PageOptionItem[] = [
    ...(canManageUsersTab
      ? [
        {
          id: 'user_management',
          label: 'User Management',
          subtitle: 'Akun, Role & Akses Divisi',
          icon: UserCog,
        },
      ]
      : []),
    {
      id: 'employees',
      label: isHrdAdmin ? 'Database Karyawan' : 'Profil & Sisa Cuti Saya',
      subtitle: isHrdAdmin
        ? '17 grup profil & berkas karyawan'
        : 'Profil pribadi & sisa cuti aktif',
      icon: Users,
    },
    {
      id: 'cuti',
      label: 'Pengajuan Cuti',
      subtitle: 'Cuti tahunan & khusus',
      icon: Calendar,
    },
    {
      id: 'sakit_izin',
      label: 'Pengajuan Sakit / Izin Lainnya',
      subtitle: 'Surat dokter & izin lainnya',
      icon: Stethoscope,
    },
    {
      id: 'exit_permits',
      label: 'Izin Meninggalkan Tempat Kerja',
      subtitle: 'Terlambat & saat jam kerja',
      icon: DoorOpen,
    },
    {
      id: 'vehicles',
      label: 'Peminjaman Kendaraan Kantor',
      subtitle: 'Peminjaman & master armada',
      icon: Car,
    },
    {
      id: 'out_of_town_visits',
      label: 'Pengajuan Visit Luar Kota',
      subtitle: 'Dinas luar & estimasi biaya',
      icon: Plane,
    },
  ];

  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.hrd);

  // When no feature is selected yet, render simple selection menu hub
  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      ...(canManageUsersTab
        ? [
          {
            id: 'user_management',
            label: 'User Management',
            subtitle: 'Kelola akun login Keycloak, role, dan hak akses divisi pengguna',
            icon: UserCog,
            iconColor: 'text-indigo-600',
            badge: 'RBAC',
            badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            onClick: () => appStore.setActiveSubFeature('hrd', 'user_management'),
          },
        ]
        : []),
      {
        id: 'employees',
        label: isHrdAdmin ? 'Database Karyawan' : 'Profil & Sisa Cuti Saya',
        subtitle: isHrdAdmin
          ? 'Direktori data induk karyawan, 17 grup profil lengkap & berkas KTP/KK/NPWP/Ijazah'
          : 'Lihat profil kepegawaian dan sisa kuota cuti tahunan Anda',
        icon: Users,
        iconColor: 'text-purple-600',
        badge: isHrdAdmin ? '17 Field Group' : 'Profil Saya',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        onClick: () => appStore.setActiveSubFeature('hrd', 'employees'),
      },
      {
        id: 'cuti',
        label: 'Pengajuan Cuti',
        subtitle: 'Permohonan cuti tahunan/pribadi & cuti khusus dengan kalkulasi sisa cuti & approval bertahap',
        icon: Calendar,
        iconColor: 'text-emerald-600',
        onClick: () => appStore.setActiveSubFeature('hrd', 'cuti'),
      },
      {
        id: 'sakit_izin',
        label: 'Pengajuan Sakit / Izin Lainnya',
        subtitle: 'Pelaporan sakit (upload surat dokter) dan izin lainnya dengan approval Atasan & HRD',
        icon: Stethoscope,
        iconColor: 'text-rose-600',
        onClick: () => appStore.setActiveSubFeature('hrd', 'sakit_izin'),
      },
      {
        id: 'exit_permits',
        label: 'Izin Meninggalkan Tempat Kerja',
        subtitle: 'Pengajuan terlambat atau keluar kantor saat jam kerja, jam aktual & konfirmasi kembali',
        icon: DoorOpen,
        iconColor: 'text-amber-600',
        onClick: () => appStore.setActiveSubFeature('hrd', 'exit_permits'),
      },
      {
        id: 'vehicles',
        label: 'Peminjaman Kendaraan Kantor',
        subtitle: 'Master kendaraan, form penggunaan kendaraan (KM, parameter bensin) & approval 3 tahap',
        icon: Car,
        iconColor: 'text-blue-600',
        onClick: () => appStore.setActiveSubFeature('hrd', 'vehicles'),
      },
      {
        id: 'out_of_town_visits',
        label: 'Pengajuan Visit Luar Kota',
        subtitle: 'Perjalanan dinas luar kota, rincian estimasi biaya (auto-sum) & approval HRD/Finance',
        icon: Plane,
        iconColor: 'text-teal-600',
        onClick: () => appStore.setActiveSubFeature('hrd', 'out_of_town_visits'),
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="HRD"
        moduleName="HUMAN RESOURCES DEVELOPMENT (HRD)"
        moduleDescription="User Management, Database Karyawan, Pengajuan Cuti, Sakit/Izin, Izin Meninggalkan Tempat Kerja, Kendaraan Kantor & Visit Luar Kota."
        headerBgColor="bg-violet-700"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const rawSub = (activeSubFeature as any) || (isHrdAdmin ? 'employees' : 'cuti');
  const currentTab =
    rawSub === 'user_management'
      ? canManageUsersTab
        ? 'user_management'
        : 'employees'
      : rawSub === 'employees'
        ? 'employees'
        : rawSub === 'cuti' || rawSub === 'leave_requests' || rawSub === 'requests'
          ? 'cuti'
          : rawSub === 'sakit_izin'
            ? 'sakit_izin'
            : rawSub === 'exit_permits'
              ? 'exit_permits'
              : rawSub === 'vehicles'
                ? 'vehicles'
                : rawSub === 'out_of_town_visits'
                  ? 'out_of_town_visits'
                  : isHrdAdmin
                    ? 'employees'
                    : 'cuti';

  return (
    <div className="space-y-6">
      {/* Senior-Friendly Header with Option Buttons */}
      <ModulePageHeader
        moduleCode="HRD"
        title={isHrdAdmin ? 'Human Resources Development (HRD)' : 'Layanan Mandiri Karyawan (HRD)'}
        description="User Management, Database Karyawan, Cuti, Sakit/Izin, Izin Meninggalkan Tempat Kerja, Kendaraan & Visit Luar Kota"
        badgeColor="bg-violet-50 text-violet-800 border-violet-200"
        options={options}
        activeOption={currentTab}
        onSelectOption={(opt) => appStore.setActiveSubFeature('hrd', opt)}
        onBackToMenu={() => appStore.setActiveSubFeature('hrd', null)}
        menuName="HRD"
      />

      {currentTab === 'user_management' && <UserManagementTab />}

      {currentTab === 'employees' && (
        isHrdAdmin ? <UserManagementModule hideHeader={true} /> : <MyEmployeeProfileView />
      )}

      {currentTab === 'cuti' && <LeaveAndSickTab requestGroup="CUTI" />}

      {currentTab === 'sakit_izin' && <LeaveAndSickTab requestGroup="SAKIT_IZIN" />}

      {currentTab === 'exit_permits' && <ExitPermitsTab />}

      {currentTab === 'vehicles' && <VehiclesAndBookingsTab />}

      {currentTab === 'out_of_town_visits' && <OutOfTownVisitsTab />}

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

      {/* Client Standard Bottom Action Toolbar with prominent BACK Button */}
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
