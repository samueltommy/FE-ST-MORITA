import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { appStore, useAppStore } from '../../store/useAppStore';
import { forgotPasswordApi } from '../../services/authService';

const CONTENT = {
  id: {
    title: 'Lupa Kata Sandi',
    desc: 'Masukkan email terdaftar untuk menerima instruksi reset sandi',
    email: 'Email Perusahaan',
    emailPh: 'nama@st-morita.co.id',
    submit: 'Kirim Instruksi Reset',
    back: 'Kembali ke halaman Masuk',
    toastEmpty: 'Email wajib diisi.',
    toastSuccess: 'Instruksi reset sandi telah dikirim ke email Anda. Silakan periksa inbox.',
    toastFail: 'Gagal mengirim email reset. Periksa kembali alamat email.',
  },
  en: {
    title: 'Forgot Password',
    desc: 'Enter your registered email to receive reset instructions',
    email: 'Company Email',
    emailPh: 'name@st-morita.co.id',
    submit: 'Send Reset Instructions',
    back: 'Back to Sign In page',
    toastEmpty: 'Email is required.',
    toastSuccess: 'Password reset instructions have been sent to your email. Please check your inbox.',
    toastFail: 'Failed to send reset email. Please check your email address.',
  }
};

interface ForgotPasswordPageProps {
  onNavigate?: (page: 'login' | 'activation' | 'forgot-password' | 'reset-password') => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      appStore.showToast(t.toastEmpty, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPasswordApi(email.trim());
      appStore.showToast(t.toastSuccess, 'success');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string; message?: string } } };
      appStore.showToast(err?.response?.data?.detail || err?.response?.data?.message || t.toastFail, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative selection:bg-blue-600 selection:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.08),rgba(255,255,255,0))] pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 px-3 py-1.5 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-full shadow-sm z-20">
        <button 
          onClick={() => appStore.setLanguage('id')}
          className={`text-xs font-bold transition-colors ${language === 'id' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          ID
        </button>
        <span className="text-slate-300 text-xs font-light">|</span>
        <button 
          onClick={() => appStore.setLanguage('en')}
          className={`text-xs font-bold transition-colors ${language === 'en' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          EN
        </button>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t.desc}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPh}
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
                  <span>{t.submit}</span>
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
              <span>{t.back}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
