import React, { useState } from 'react';
import { X, Calendar, Clock, Car, MapPin, UserPlus, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { LeaveRequest, VehicleBooking, SalesOutdoorVisit } from '../../types';
import { ROLE_DEFINITIONS } from '../../utils/rbac';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'leave' | 'vehicle' | 'visit' | 'employee';
}

export const HrdFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'leave' }) => {
  const [activeTab, setActiveTab] = useState<'leave' | 'vehicle' | 'visit' | 'employee'>(defaultTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form 1: Leave Request state
  const [leaveEmployeeName, setLeaveEmployeeName] = useState(currentUser.name);
  const [leaveEmployeeNik, setLeaveEmployeeNik] = useState(currentUser.nik);
  const [leaveDepartment, setLeaveDepartment] = useState(currentUser.department);
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('CUTI_TAHUNAN');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');

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

  // Form 4: New Employee state
  const [empNik, setEmpNik] = useState('');
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<'OPERATOR' | 'SALES_STAFF' | 'QC_INSPECTOR' | 'PPIC_PLANNER'>('OPERATOR');
  const [empDept, setEmpDept] = useState('Produksi - Slitting 02');
  const [empPhone, setEmpPhone] = useState('+62 812-');
  const [empPlant, setEmpPlant] = useState('Pabrik Utama Cikarang Barat (Kawasan Berikat)');

  if (!isOpen) return null;

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) return;

    const newLeave: LeaveRequest = {
      id: `LV-${Date.now()}`,
      employeeName: leaveEmployeeName.trim(),
      employeeNik: leaveEmployeeNik.trim(),
      department: leaveDepartment,
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      durationDays: Math.max(1, leaveDays),
      reason: leaveReason.trim(),
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    appStore.addLeaveRequest(newLeave);
    setSuccessMessage(`Pengajuan ${leaveType} atas nama ${leaveEmployeeName} berhasil didaftarkan.`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
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
    setSuccessMessage(`Peminjaman armada ${vehicleName} tujuan ${destination} berhasil didaftarkan.`);
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
    setSuccessMessage(`Pencatatan kunjungan ke ${visitClientName} berhasil disimpan.`);
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

    setSuccessMessage(`Karyawan baru ${empName} (${empNik}) berhasil didaftarkan ke sistem HRD.`);
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
              <span>Formulir Input Data HRD & Administrasi</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola pengajuan cuti/izin, peminjaman kendaraan pabrik, log kunjungan luar kota & karyawan baru
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
            <span>Pengajuan Cuti / Izin</span>
          </button>
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'vehicle'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Peminjaman Armada Kendaraan</span>
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
            <span>Log Kunjungan Sales (GPS)</span>
          </button>
          <button
            onClick={() => setActiveTab('employee')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'employee'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Pendaftaran Karyawan Baru</span>
          </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Karyawan</label>
                  <input
                    type="text"
                    required
                    value={leaveEmployeeName}
                    onChange={(e) => setLeaveEmployeeName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Induk Karyawan (NIK)</label>
                  <input
                    type="text"
                    required
                    value={leaveEmployeeNik}
                    onChange={(e) => setLeaveEmployeeNik(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Departemen / Divisi</label>
                  <input
                    type="text"
                    required
                    value={leaveDepartment}
                    onChange={(e) => setLeaveDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Cuti / Izin</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveRequest['leaveType'])}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="CUTI_TAHUNAN">Cuti Tahunan (Hak Cuti Resmi)</option>
                    <option value="SAKIT_SURAT_DOKTER">Izin Sakit (Surat Dokter Terlampir)</option>
                    <option value="IZIN_KEPERLUAN_KHUSUS">Izin Khusus / Dispensasi Resmi</option>
                    <option value="CUTI_MELAHIRKAN">Cuti Melahirkan / Gugur Kandungan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Durasi (Hari Kerja)</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Pengajuan / Keterangan</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Keperluan acara keluarga di luar kota / rawat inap di rumah sakit..."
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Kirim Pengajuan Cuti
                </button>
              </div>
            </form>
          )}

          {/* 2. Peminjaman Kendaraan */}
          {activeTab === 'vehicle' && (
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilihan Kendaraan / Armada</label>
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
                    <option value="Isuzu Giga Wingbox (B 9128 UXT)">Truk Wingbox Isuzu Giga (B 9128 UXT)</option>
                    <option value="Toyota Avanza Dinas Sales (B 2419 KFA)">Toyota Avanza Operasional Sales (B 2419 KFA)</option>
                    <option value="Mitsubishi Fuso Fighter (B 9912 UZ)">Mitsubishi Fuso Engkel Box (B 9912 UZ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Supir / Pengemudi</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Tujuan / Client Site</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Astra Daihatsu Motor (Sunter, Jakarta Utara)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Waktu Keberangkatan</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Keperluan Operasional</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Pengantaran batch Delivery Order DO/SMI/2026/09/0112 ke plant perakitan otomotif"
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Simpan Reservasi Armada
                </button>
              </div>
            </form>
          )}

          {/* 3. Log Kunjungan Sales (GPS) */}
          {activeTab === 'visit' && (
            <form onSubmit={handleVisitSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Sales Representative</label>
                  <input
                    type="text"
                    required
                    value={visitSalesName}
                    onChange={(e) => setVisitSalesName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perusahaan Klien / Target</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Toyota Astra Motor Karawang"
                    value={visitClientName}
                    onChange={(e) => setVisitClientName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lokasi Kunjungan</label>
                <input
                  type="text"
                  required
                  placeholder="Kawasan Industri KIIC Lot CC-4, Teluk Jambe, Karawang"
                  value={visitAddress}
                  onChange={(e) => setVisitAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Koordinat GPS Latitude</label>
                  <input
                    type="text"
                    value={visitLat}
                    onChange={(e) => setVisitLat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Koordinat GPS Longitude</label>
                  <input
                    type="text"
                    value={visitLng}
                    onChange={(e) => setVisitLng(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tujuan Kunjungan</label>
                <input
                  type="text"
                  required
                  placeholder="Presentasi produk pita perekat double-side & uji spesifikasi tahan panas..."
                  value={visitPurpose}
                  onChange={(e) => setVisitPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Hasil Pertemuan (Meeting Notes)</label>
                <textarea
                  rows={2}
                  placeholder="Klien menyetujui sampel batch dan meminta penawaran harga (Quotation) untuk 1.000 roll..."
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Check-in Kunjungan Lapangan
                </button>
              </div>
            </form>
          )}

          {/* 4. Pendaftaran Karyawan Baru */}
          {activeTab === 'employee' && (
            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Induk Karyawan (NIK)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NIK-2026-145"
                    value={empNik}
                    onChange={(e) => setEmpNik(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Karyawan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Aditya Nugroho, S.T."
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hak Akses Role (RBAC)</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="OPERATOR">Operator Lantai Produksi (Level 3)</option>
                    <option value="SALES_STAFF">Sales Executive / Staff (Level 3)</option>
                    <option value="QC_INSPECTOR">QC Inspector / Tester (Level 3)</option>
                    <option value="PPIC_PLANNER">PPIC Planner (Level 2)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Departemen / Penempatan</label>
                  <input
                    type="text"
                    required
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Kontak WhatsApp / Telepon</label>
                  <input
                    type="text"
                    required
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Plant / Fasilitas</label>
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Daftarkan Karyawan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
