import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { appStore } from '../../store/useAppStore';
import { forgotPasswordApi } from '../../services/authService';

interface ForgotPasswordPageProps {
  onNavigate?: (page: 'login' | 'activation' | 'forgot-password' | 'reset-password') => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      appStore.showToast('Email wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPasswordApi(email.trim());
      appStore.showToast('Instruksi reset sandi telah dikirim ke email Anda. Silakan periksa inbox.', 'success');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string; message?: string } } };
      appStore.showToast(err?.response?.data?.detail || err?.response?.data?.message || 'Gagal mengirim email reset. Periksa kembali alamat email.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative selection:bg-blue-600 selection:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.08),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Lupa Kata Sandi</h3>
            <p className="text-xs text-slate-500 mt-1">
              Masukkan email terdaftar untuk menerima instruksi reset sandi
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Perusahaan</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@st-morita.co.id"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Kirim Instruksi Reset</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate?.('login')}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-blue-700 transition-colors py-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke halaman Masuk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
