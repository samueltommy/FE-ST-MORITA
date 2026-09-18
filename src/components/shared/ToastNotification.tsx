import React, { useEffect } from 'react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export function ToastNotification() {
  const { message, type, visible } = useAppStore((state) => state.toast);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        appStore.hideToast();
      }, 2500); // Durasi dipersingkat agar tidak terlalu lama
      return () => clearTimeout(timer);
    }
  }, [visible, message]);

  // Dictionary untuk menerjemahkan pesan raw dari backend/keycloak agar lebih ramah (user-friendly)
  const getFriendlyMessage = (rawMsg: string) => {
    const text = rawMsg.toLowerCase();
    if (text.includes('invalid user credentials')) {
      return 'Kredensial tidak valid. Silakan periksa kembali username dan kata sandi Anda.';
    }
    if (text.includes('account is not fully set up')) {
      return 'Akun belum aktif atau profil belum lengkap. Silakan periksa kembali akun Anda.';
    }
    if (text.includes('network error') || text.includes('failed to fetch')) {
      return 'Terjadi masalah jaringan. Silakan periksa koneksi internet Anda.';
    }
    // Hapus awalan "Error: " jika ada
    if (rawMsg.startsWith('Error: ')) {
      return rawMsg.substring(7);
    }
    return rawMsg;
  };

  if (!visible) return null;

  const typeConfig = {
    error: {
      icon: <AlertCircle className="w-6 h-6 text-rose-500" />,
      bg: 'bg-white',
      border: 'border-rose-200',
      text: 'text-rose-700',
      titleText: 'text-rose-900',
      shadow: 'shadow-xl shadow-rose-500/10',
      title: 'Terjadi Kesalahan',
    },
    success: {
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
      bg: 'bg-white',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      titleText: 'text-emerald-900',
      shadow: 'shadow-xl shadow-emerald-500/10',
      title: 'Berhasil',
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-500" />,
      bg: 'bg-white',
      border: 'border-blue-200',
      text: 'text-blue-700',
      titleText: 'text-blue-900',
      shadow: 'shadow-xl shadow-blue-500/10',
      title: 'Informasi',
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div className="fixed top-6 right-6 z-[9999] w-full max-w-sm pointer-events-none animate-in slide-in-from-top-4 slide-in-from-right-8 fade-in duration-300">
      <div
        className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border ${config.bg} ${config.border} ${config.shadow}`}
      >
        <div className="shrink-0 mt-0.5">{config.icon}</div>
        
        <div className="flex-1 min-w-0 pb-0.5">
          <h3 className={`text-sm font-bold tracking-tight mb-0.5 ${config.titleText}`}>
            {config.title}
          </h3>
          <p className={`text-xs font-medium leading-relaxed ${config.text}`}>
            {getFriendlyMessage(message)}
          </p>
        </div>

        <button
          onClick={() => appStore.hideToast()}
          className={`shrink-0 p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-slate-100 transition-all ${config.text}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
