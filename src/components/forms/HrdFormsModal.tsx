import React, { useState } from 'react';
import { X, Calendar, Clock, Car, MapPin, UserPlus, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { LeaveRequest, VehicleBooking, SalesOutdoorVisit } from '../../types';
import { ROLE_DEFINITIONS } from '../../utils/rbac';
import { useRBAC } from '../../hooks/useRBAC';
import { submitLeaveRequestApi } from '../../services/hrdService';
import { useSystemChoices, findOptionDescription, SelectOption } from '../../hooks/useSystemChoices';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'leave' | 'vehicle' | 'visit' | 'employee';
}

const CONTENT = {
  id: {
    formTitle: 'Formulir Input Data HRD & Administrasi',
    formDesc: 'Kelola pengajuan cuti/izin, peminjaman kendaraan pabrik, log kunjungan luar kota & karyawan baru',
    tabLeave: 'Pengajuan Cuti / Izin',
    tabVehicle: 'Peminjaman Armada Kendaraan',
    tabVisit: 'Log Kunjungan Sales (GPS)',
    tabEmployee: 'Pendaftaran Karyawan Baru',
    
    // Leave form
    lvName: 'Nama Karyawan',
    lvNik: 'Nomor Induk Karyawan (NIK)',
    lvDept: 'Departemen / Divisi',
    lvType: 'Jenis Cuti / Izin',
    lvType1: 'Cuti Tahunan (Hak Cuti Resmi)',
    lvType2: 'Izin Sakit (Surat Dokter Terlampir)',
    lvType3: 'Izin Khusus / Dispensasi Resmi',
    lvType4: 'Cuti Melahirkan / Gugur Kandungan',
    lvStart: 'Tanggal Mulai',
    lvEnd: 'Tanggal Selesai',
    lvDays: 'Durasi (Hari Kerja)',
    lvReason: 'Alasan Pengajuan / Keterangan',
    lvReasonPl: 'Contoh: Keperluan acara keluarga di luar kota / rawat inap di rumah sakit...',
    btnCancel: 'Batal',
    btnLeave: 'Kirim Pengajuan Cuti',

    // Vehicle form
    vhFleet: 'Pilihan Kendaraan / Armada',
    vhFleet1: 'Truk Wingbox Isuzu Giga (B 9128 UXT)',
    vhFleet2: 'Toyota Avanza Operasional Sales (B 2419 KFA)',
    vhFleet3: 'Mitsubishi Fuso Engkel Box (B 9912 UZ)',
    vhDriver: 'Nama Supir / Pengemudi',
    vhDest: 'Lokasi Tujuan / Client Site',
    vhDestPl: 'Contoh: PT Astra Daihatsu Motor (Sunter, Jakarta Utara)',
    vhTime: 'Waktu Keberangkatan',
    vhPurpose: 'Keperluan Operasional',
    vhPurposePl: 'Contoh: Pengantaran batch Delivery Order DO/SMI/2026/09/0112 ke plant perakitan otomotif',
    btnVehicle: 'Simpan Reservasi Armada',

    // Visit form
    vsRep: 'Nama Sales Representative',
    vsClient: 'Perusahaan Klien / Target',
    vsClientPl: 'Contoh: PT Toyota Astra Motor Karawang',
    vsAddress: 'Alamat Lokasi Kunjungan',
    vsAddressPl: 'Kawasan Industri KIIC Lot CC-4, Teluk Jambe, Karawang',
    vsLat: 'Koordinat GPS Latitude',
    vsLng: 'Koordinat GPS Longitude',
    vsPurpose: 'Tujuan Kunjungan',
    vsPurposePl: 'Presentasi produk pita perekat double-side & uji spesifikasi tahan panas...',
    vsResult: 'Catatan Hasil Pertemuan (Meeting Notes)',
    vsResultPl: 'Klien menyetujui sampel batch dan meminta penawaran harga (Quotation) untuk 1.000 roll...',
    btnVisit: 'Check-in Kunjungan Lapangan',

    // Employee form
    empNik: 'Nomor Induk Karyawan (NIK)',
    empNikPl: 'Contoh: NIK-2026-145',
    empName: 'Nama Lengkap Karyawan',
    empNamePl: 'Contoh: Aditya Nugroho, S.T.',
    empRole: 'Hak Akses Role (RBAC)',
    empRole1: 'Operator Lantai Produksi (Level 3)',
    empRole2: 'Sales Executive / Staff (Level 3)',
    empRole3: 'QC Inspector / Tester (Level 3)',
    empRole4: 'PPIC Planner (Level 2)',
    empDept: 'Departemen / Penempatan',
    empPhone: 'No. Kontak WhatsApp / Telepon',
    empPlant: 'Lokasi Plant / Fasilitas',
    btnEmployee: 'Daftarkan Karyawan',

    // Success Messages
    succLeave: 'Pengajuan {type} atas nama {name} berhasil didaftarkan.',
    succVehicle: 'Peminjaman armada {name} tujuan {dest} berhasil didaftarkan.',
    succVisit: 'Pencatatan kunjungan ke {client} berhasil disimpan.',
    succEmp: 'Karyawan baru {name} ({nik}) berhasil didaftarkan ke sistem HRD.',
  },
  en: {
    formTitle: 'HRD & Administration Data Input Form',
    formDesc: 'Manage leave/permit requests, factory vehicle bookings, out-of-town visit logs & new employees',
    tabLeave: 'Leave / Permit Request',
    tabVehicle: 'Vehicle Fleet Booking',
    tabVisit: 'Sales Visit Log (GPS)',
    tabEmployee: 'New Employee Registration',

    // Leave form
    lvName: 'Employee Name',
    lvNik: 'Employee ID (NIK)',
    lvDept: 'Department / Division',
    lvType: 'Leave / Permit Type',
    lvType1: 'Annual Leave (Official Leave Right)',
    lvType2: 'Sick Leave (Doctor\'s Note Attached)',
    lvType3: 'Special Permit / Official Dispensation',
    lvType4: 'Maternity / Miscarriage Leave',
    lvStart: 'Start Date',
    lvEnd: 'End Date',
    lvDays: 'Duration (Working Days)',
    lvReason: 'Reason / Remarks',
    lvReasonPl: 'Example: Family event out of town / hospitalization...',
    btnCancel: 'Cancel',
    btnLeave: 'Submit Leave Request',

    // Vehicle form
    vhFleet: 'Vehicle / Fleet Selection',
    vhFleet1: 'Isuzu Giga Wingbox Truck (B 9128 UXT)',
    vhFleet2: 'Toyota Avanza Sales Ops (B 2419 KFA)',
    vhFleet3: 'Mitsubishi Fuso Engkel Box (B 9912 UZ)',
    vhDriver: 'Driver Name',
    vhDest: 'Destination Location / Client Site',
    vhDestPl: 'Example: PT Astra Daihatsu Motor (Sunter, North Jakarta)',
    vhTime: 'Departure Time',
    vhPurpose: 'Operational Purpose',
    vhPurposePl: 'Example: Delivery Order batch DO/SMI/2026/09/0112 delivery to automotive assembly plant',
    btnVehicle: 'Save Fleet Reservation',

    // Visit form
    vsRep: 'Sales Representative Name',
    vsClient: 'Client Company / Target',
    vsClientPl: 'Example: PT Toyota Astra Motor Karawang',
    vsAddress: 'Visit Location Address',
    vsAddressPl: 'KIIC Industrial Estate Lot CC-4, Teluk Jambe, Karawang',
    vsLat: 'GPS Latitude Coordinate',
    vsLng: 'GPS Longitude Coordinate',
    vsPurpose: 'Visit Purpose',
    vsPurposePl: 'Double-sided adhesive tape product presentation & heat resistance spec testing...',
    vsResult: 'Meeting Notes',
    vsResultPl: 'Client approved batch sample and requested Quotation for 1,000 rolls...',
    btnVisit: 'Field Visit Check-in',

    // Employee form
    empNik: 'Employee ID (NIK)',
    empNikPl: 'Example: NIK-2026-145',
    empName: 'Employee Full Name',
    empNamePl: 'Example: Aditya Nugroho, S.T.',
    empRole: 'Access Role (RBAC)',
    empRole1: 'Production Floor Operator (Level 3)',
    empRole2: 'Sales Executive / Staff (Level 3)',
    empRole3: 'QC Inspector / Tester (Level 3)',
    empRole4: 'PPIC Planner (Level 2)',
    empDept: 'Department / Placement',
    empPhone: 'WhatsApp / Phone Contact No.',
    empPlant: 'Plant Location / Facility',
    btnEmployee: 'Register Employee',

    // Success Messages
    succLeave: 'Request {type} for {name} was successfully registered.',
    succVehicle: 'Fleet booking {name} to {dest} was successfully registered.',
    succVisit: 'Visit record to {client} was successfully saved.',
    succEmp: 'New employee {name} ({nik}) was successfully registered into HRD system.',
  }
};

export const HrdFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'leave' }) => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const [activeTab, setActiveTab] = useState<'leave' | 'vehicle' | 'visit' | 'employee'>(defaultTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const { isSuperAdmin, isExecutive, hasPermission } = useRBAC();
  const isHrdAdmin = isSuperAdmin || isExecutive || hasPermission('hrd:employee:read') || hasPermission('hrd:attendance:write');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: requestTypeOptions, loading: loadingReqTypes } = useSystemChoices('request-types');
  const { data: deptOptions, loading: loadingDepts } = useSystemChoices('departments');

  const requestTypes: SelectOption[] = Array.isArray(requestTypeOptions) ? requestTypeOptions : [];
  const departments: SelectOption[] = Array.isArray(deptOptions) ? deptOptions : [];

  // Form 1: Leave Request state
  const [leaveType, setLeaveType] = useState<string>('CUTI');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');

  React.useEffect(() => {
    if (requestTypes.length > 0 && (!leaveType || !requestTypes.some(r => r.value === leaveType))) {
      setLeaveType(requestTypes[0].value);
    }
  }, [requestTypes, leaveType]);

  // Form 2: Vehicle Booking state
  const [vehicleName, setVehicleName] = useState('Isuzu Giga Wingbox (B 9128 UXT)');
  const [licensePlate, setLicensePlate] = useState('B 9128 UXT');
  const [destination, setDestination] = useState('');
  const [driverName, setDriverName] = useState('Pak Sutrisno');
  const [departureTime, setDepartureTime] = useState(new Date().toISOString().slice(0, 16));
  const [vehiclePurpose, setVehiclePurpose] = useState('');

  // Form 3: Sales Visit state
  const [visitSalesName, setVisitSalesName] = useState('Dimas Aditya');
  const [visitClientName, setVisitClientName] = useState('');
  const [visitAddress, setVisitAddress] = useState('');
  const [visitLat, setVisitLat] = useState('-6.3142');
  const [visitLng, setVisitLng] = useState('107.1478');
  const [visitPurpose, setVisitPurpose] = useState('');
  const [visitResult, setVisitResult] = useState('');

  const [empNik, setEmpNik] = useState('');
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<'OPERATOR' | 'SALES_STAFF' | 'QC_INSPECTOR' | 'PPIC_PLANNER'>('OPERATOR');
  const [empDept, setEmpDept] = useState('');
  const [empPhone, setEmpPhone] = useState('+62 812-');
  const [empPlant, setEmpPlant] = useState('Pabrik Utama Cikarang Barat (Kawasan Berikat)');

  React.useEffect(() => {
    if (departments.length > 0 && !empDept) {
      setEmpDept(departments[0].value);
    }
  }, [departments, empDept]);

  if (!isOpen) return null;

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) return;

    try {
      await submitLeaveRequestApi({
        requestType: leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason.trim()
      });

      setSuccessMessage(t.succLeave.replace('{type}', leaveType).replace('{name}', currentUser.name));
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
        // Trigger a custom event to tell LeaveRequestsTab to refresh
        window.dispatchEvent(new Event('hrd:leave-submitted'));
      }, 1200);
    } catch (err: any) {
      alert('Gagal mengajukan cuti: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !vehiclePurpose.trim()) return;

    const newBooking: VehicleBooking = {
      id: `VB-${Date.now()}`,
      vehicleName,
      licensePlate,
      destination: destination.trim(),
      driverName,
      departureTime: departureTime.replace('T', ' '),
      purpose: vehiclePurpose.trim(),
      status: 'PENDING',
    };

    appStore.addVehicleBooking(newBooking);
    setSuccessMessage(t.succVehicle.replace('{name}', vehicleName).replace('{dest}', destination));
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitClientName.trim() || !visitPurpose.trim()) return;

    const newVisit: SalesOutdoorVisit = {
      id: `VISIT-${Date.now()}`,
      salesName: visitSalesName.trim(),
      clientName: visitClientName.trim(),
      clientAddress: visitAddress.trim(),
      checkInTime: `${new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      coordinates: { lat: parseFloat(visitLat) || -6.3, lng: parseFloat(visitLng) || 107.1 },
      purpose: visitPurpose.trim(),
      resultNotes: visitResult.trim() || 'Kunjungan telah selesai dan dicatat via GPS sales portal.',
    };

    appStore.addSalesVisit(newVisit);
    setSuccessMessage(t.succVisit.replace('{client}', visitClientName));
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNik.trim() || !empName.trim()) return;

    const roleDef = ROLE_DEFINITIONS[empRole] || ROLE_DEFINITIONS.OPERATOR_PROD;

    appStore.createUser({
      nik: empNik.trim(),
      name: empName.trim(),
      email: `${empNik.toLowerCase().replace(/[^a-z0-9]/g, '')}@stmorita.co.id`,
      role: empRole,
      tier: roleDef.tier,
      department: empDept,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      permissions: roleDef.permissions,
      plantLocation: empPlant,
      status: 'ACTIVE',
      phoneNumber: empPhone,
    });

    setSuccessMessage(t.succEmp.replace('{name}', empName).replace('{nik}', empNik));
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <span>{t.formTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.formDesc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'leave'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t.tabLeave}</span>
          </button>
          {isHrdAdmin && (
            <>
              <button
                onClick={() => setActiveTab('vehicle')}
                className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'vehicle'
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>{t.tabVehicle}</span>
              </button>
              <button
                onClick={() => setActiveTab('visit')}
                className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'visit'
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>{t.tabVisit}</span>
              </button>
            </>
          )}
          {/* Hanya admin yg memiliki akses spesifik bisa mendaftar akun */}
          {(isHrdAdmin || hasPermission('admin:users:manage')) && (
            <button
              onClick={() => setActiveTab('employee')}
              className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'employee'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.tabEmployee}</span>
            </button>
          )}
        </div>

        {/* Form Body with Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Pengajuan Cuti / Izin */}
          {activeTab === 'leave' && (
            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.lvType}</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  disabled={loadingReqTypes}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                >
                  {requestTypes.map((opt) => (
                    <option key={opt.value} value={opt.value} title={opt.description}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {findOptionDescription(requestTypes, leaveType) && (
                  <p className="mt-1 text-[11px] text-slate-500 italic">
                    {findOptionDescription(requestTypes, leaveType)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.lvStart}</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.lvEnd}</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.lvDays}</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.lvReason}</label>
                <textarea
                  rows={2}
                  required
                  placeholder={t.lvReasonPl}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {t.btnLeave}
                </button>
              </div>
            </form>
          )}

          {/* 2. Peminjaman Kendaraan */}
          {activeTab === 'vehicle' && isHrdAdmin && (
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.vhFleet}</label>
                  <select
                    value={vehicleName}
                    onChange={(e) => {
                      setVehicleName(e.target.value);
                      if (e.target.value.includes('B 9128 UXT')) setLicensePlate('B 9128 UXT');
                      else if (e.target.value.includes('B 2419 KFA')) setLicensePlate('B 2419 KFA');
                      else if (e.target.value.includes('B 9912 UZ')) setLicensePlate('B 9912 UZ');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Isuzu Giga Wingbox (B 9128 UXT)">{t.vhFleet1}</option>
                    <option value="Toyota Avanza Dinas Sales (B 2419 KFA)">{t.vhFleet2}</option>
                    <option value="Mitsubishi Fuso Fighter (B 9912 UZ)">{t.vhFleet3}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.vhDriver}</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.vhDest}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.vhDestPl}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.vhTime}</label>
                  <input
                    type="datetime-local"
                    required
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.vhPurpose}</label>
                <textarea
                  rows={2}
                  required
                  placeholder={t.vhPurposePl}
                  value={vehiclePurpose}
                  onChange={(e) => setVehiclePurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {t.btnVehicle}
                </button>
              </div>
            </form>
          )}

          {/* 3. Log Kunjungan Sales (GPS) */}
          {activeTab === 'visit' && isHrdAdmin && (
            <form onSubmit={handleVisitSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.vsRep}</label>
                  <input
                    type="text"
                    required
                    value={visitSalesName}
                    onChange={(e) => setVisitSalesName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.vsClient}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.vsClientPl}
                    value={visitClientName}
                    onChange={(e) => setVisitClientName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.vsAddress}</label>
                <input
                  type="text"
                  required
                  placeholder={t.vsAddressPl}
                  value={visitAddress}
                  onChange={(e) => setVisitAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.vsLat}</label>
                  <input
                    type="text"
                    value={visitLat}
                    onChange={(e) => setVisitLat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.vsLng}</label>
                  <input
                    type="text"
                    value={visitLng}
                    onChange={(e) => setVisitLng(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.vsPurpose}</label>
                <input
                  type="text"
                  required
                  placeholder={t.vsPurposePl}
                  value={visitPurpose}
                  onChange={(e) => setVisitPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.vsResult}</label>
                <textarea
                  rows={2}
                  placeholder={t.vsResultPl}
                  value={visitResult}
                  onChange={(e) => setVisitResult(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {t.btnVisit}
                </button>
              </div>
            </form>
          )}

          {/* 4. Pendaftaran Karyawan Baru */}
          {activeTab === 'employee' && (isHrdAdmin || hasPermission('admin:users:manage')) && (
            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.empNik}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.empNikPl}
                    value={empNik}
                    onChange={(e) => setEmpNik(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.empName}</label>
                  <input
                    type="text"
                    required
                    placeholder={t.empNamePl}
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.empRole}</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="OPERATOR">{t.empRole1}</option>
                    <option value="SALES_STAFF">{t.empRole2}</option>
                    <option value="QC_INSPECTOR">{t.empRole3}</option>
                    <option value="PPIC_PLANNER">{t.empRole4}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.empDept}</label>
                  <select
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    disabled={loadingDepts}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="" disabled>
                      {loadingDepts ? 'Memuat data...' : '-- Pilih Departemen --'}
                    </option>
                    {departments.map((d) => (
                      <option key={d.value} value={d.value} title={d.description}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {findOptionDescription(departments, empDept) && (
                    <p className="mt-1 text-[10px] text-slate-500 italic truncate" title={findOptionDescription(departments, empDept)}>
                      {findOptionDescription(departments, empDept)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.empPhone}</label>
                  <input
                    type="text"
                    required
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.empPlant}</label>
                  <input
                    type="text"
                    required
                    value={empPlant}
                    onChange={(e) => setEmpPlant(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {t.btnEmployee}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
