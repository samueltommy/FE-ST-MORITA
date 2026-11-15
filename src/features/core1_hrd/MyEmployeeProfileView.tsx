import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Calendar, Building2, Mail, Phone, Loader2, Shield } from 'lucide-react';
import { getMyEmployeeProfileApi } from '../../services/hrdService';
import { useAuthStore } from '../../store/useAuthStore';

export const MyEmployeeProfileView: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading } = useQuery({
    queryKey: ['myEmployeeProfile'],
    queryFn: getMyEmployeeProfileApi,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat profil karyawan...
      </div>
    );
  }

  const name = profile?.fullName || user?.fullName || user?.username || '-';
  const nik = profile?.nik || (user as any)?.nik || '-';
  const dept = profile?.department || user?.department || '-';
  const level = profile?.userLevel || user?.userLevel || '-';
  const email = profile?.email || user?.email || '-';
  const phone = profile?.phone || '-';
  const joinDate = profile?.joinDate?.slice(0, 10) || '-';
  const status = profile?.employmentStatus || 'AKTIF';

  const quota = profile?.hakCutiTahunan ?? profile?.annualLeaveQuota ?? 12;
  const used = profile?.cutiTerpakai ?? profile?.annualLeaveUsed ?? 0;
  const balance = profile?.sisaCutiAktif ?? profile?.annualLeaveBalance ?? Math.max(0, quota - used);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-black text-lg">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{name}</h3>
              <div className="text-xs text-slate-500 font-medium">
                NIK: <b className="text-slate-700">{nik}</b> • Status:{' '}
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                  {status}
                </span>
              </div>
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-violet-50 border border-violet-200 text-xs font-bold text-violet-800 flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span>{level}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5" /> Divisi / Departemen
            </div>
            <div className="font-bold text-slate-900">{dept}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <Mail className="w-3.5 h-3.5" /> Email
            </div>
            <div className="font-bold text-slate-900 truncate">{email}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <Phone className="w-3.5 h-3.5" /> No. HP
            </div>
            <div className="font-bold text-slate-900">{phone}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
              <User className="w-3.5 h-3.5" /> Tgl Masuk Kerja
            </div>
            <div className="font-bold text-slate-900">{joinDate}</div>
          </div>
        </div>
      </div>

      {/* Kuota & Sisa Cuti */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-violet-600" />
          <span>Informasi Kuota & Sisa Cuti Tahunan</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Hak Cuti Tahunan</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{quota} Hari</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="text-xs text-amber-800">Cuti Terpakai</div>
            <div className="text-2xl font-black text-amber-900 mt-1">{used} Hari</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="text-xs text-emerald-800">Sisa Cuti Aktif</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{balance} Hari</div>
          </div>
        </div>
      </div>
    </div>
  );
};
