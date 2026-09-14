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
import { HrdFormsModal } from '../../components/forms/HrdFormsModal';

export const HrdModule: React.FC = () => {
  const vehicleBookings = useAppStore((state) => state.vehicleBookings);
  const salesVisits = useAppStore((state) => state.salesVisits);
  const currentUser = useAppStore((state) => state.currentUser);

  const [activeTab, setActiveTab] = useState<'attendance_fleet' | 'sales_gps'>('attendance_fleet');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalTab, setFormModalTab] = useState<'leave' | 'vehicle' | 'visit' | 'employee'>('leave');

  const handleApproveVehicle = (bookingId: string) => {
    appStore.approveVehicleBooking(bookingId);
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
              HRD, Armada Pabrik & GPS Visit Sales
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Presensi staf shift kerja, jadwal pemesanan kendaraan dinas/truk armada, dan geo-tracking log visit sales outdoor
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => openFormWithTab('leave')}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Form Input HRD</span>
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('attendance_fleet')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'attendance_fleet'
                ? 'bg-white text-violet-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Presensi & Armada Pabrik
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
            <span>Log GPS Sales</span>
          </button>
        </div>
      </div>

      {activeTab === 'attendance_fleet' ? (
        <div className="space-y-6">
          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Karyawan Aktif</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">428 Orang</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fasilitas Plant 1 & 2</div>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Hadir Shift Pagi/Siang</span>
              <div className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-1">412 (96.2%)</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Fingerprint & Facial Valid</div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">Izin & Cuti Bersyarat</span>
              <div className="text-xl font-black text-amber-800 dark:text-amber-200 mt-1">11 Orang</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Surat Dokter / Cuti Tahunan</div>
            </div>

            <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">Tugas Luar Kota / Sales</span>
              <div className="text-xl font-black text-blue-800 dark:text-blue-200 mt-1">5 Orang</div>
              <div className="text-[10px] text-blue-600 mt-0.5">Kunjungan Kawasan Industri Mitra</div>
            </div>
          </div>

          {/* Vehicle Fleet Reservation Section */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-violet-600" />
                  <span>Jadwal Penggunaan Kendaraan Operasional & Truk Armada</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Persetujuan izin armada pabrik untuk pengiriman Delivery Order atau dinas luar
                </p>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Persetujuan: <strong className="text-violet-600">HRD & GA Officer</strong>
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
                        Tujuan: <strong>{vcl.destination}</strong> ({vcl.purpose})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Supir: {vcl.driverName} • Pemohon: {vcl.requestedBy || 'Staff Pabrik'} • Jadwal: {vcl.departureDate || vcl.departureTime} {vcl.returnDate ? `s/d ${vcl.returnDate}` : ''}
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
                            Setujui Penggunaan Armada
                          </button>
                        </Can>
                      ) : (
                        <div className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Telah Disetujui HRD</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Sales Outdoor GPS Visit Logs */
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-violet-600" />
                <span>Log Check-In GPS Kunjungan Lapangan Sales</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Pencatatan koordinat GPS real-time kunjungan klien tim Sales Executive
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
                  GPS: {vst.gpsCoords || (vst.coordinates ? `${vst.coordinates.lat}, ${vst.coordinates.lng}` : '-6.3245, 107.1382')} • Waktu: {vst.checkInTime}
                </div>

                <p className="text-slate-700 dark:text-slate-300 text-[11px] italic">
                  "{vst.notes || vst.resultNotes || vst.purpose}"
                </p>

                <div className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  Sales Rep: <strong>{vst.salesRep || vst.salesName}</strong>
                </div>
              </div>
            ))}
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
