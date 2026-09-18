import React, { useState } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { appStore, useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

const CONTENT = {
  id: {
    title: 'Aktivasi Akun',
    desc: 'Ganti sandi sementara dengan sandi permanen Anda',
    username: 'Username',
    usernamePh: 'Masukkan username Anda',
    tempPw: 'Sandi Sementara',
    tempPwPh: 'Sandi yang diberikan admin',
    newPw: 'Sandi Baru',
    newPwPh: 'Minimal 8 karakter',
    confirmPw: 'Konfirmasi Sandi Baru',
    confirmPwPh: 'Ulangi sandi baru',
    submit: 'Aktivasi & Masuk',
    back: 'Kembali ke halaman Masuk',
    toastEmpty: 'Semua kolom wajib diisi.',
    toastMismatch: 'Konfirmasi sandi baru tidak cocok.',
    toastShort: 'Sandi baru minimal 8 karakter.',
    toastSuccess: 'Aktivasi berhasil! Mengalihkan ke halaman Masuk...',
    toastFail: 'Aktivasi gagal. Periksa kembali data Anda.',
  },
  en: {
    title: 'Account Activation',
    desc: 'Replace your temporary password with a permanent one',
    username: 'Username',
    usernamePh: 'Enter your username',
    tempPw: 'Temporary Password',
    tempPwPh: 'Password provided by admin',
    newPw: 'New Password',
    newPwPh: 'Minimum 8 characters',
    confirmPw: 'Confirm New Password',
    confirmPwPh: 'Repeat new password',
    submit: 'Activate & Sign In',
    back: 'Back to Sign In page',
    toastEmpty: 'All fields are required.',
    toastMismatch: 'New password confirmation does not match.',
    toastShort: 'New password must be at least 8 characters.',
    toastSuccess: 'Activation successful! Redirecting to Sign In...',
    toastFail: 'Activation failed. Please check your data.',
  }
};

interface ActivationPageProps {
  onNavigate?: (page: 'login' | 'activation' | 'forgot-password' | 'reset-password') => void;
}

export const ActivationPage: React.FC<ActivationPageProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState(() => sessionStorage.getItem('samhance_activation_username') || '');
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTempPw, setShowTempPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activate = useAuthStore((state) => state.activate);
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !tempPassword.trim() || !newPassword.trim()) {
      appStore.showToast(t.toastEmpty, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      appStore.showToast(t.toastMismatch, 'error');
      return;
    }

    if (newPassword.length < 8) {
      appStore.showToast(t.toastShort, 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await activate(username.trim(), tempPassword, newPassword);
    setIsSubmitting(false);

    if (result.success) {
      appStore.showToast(t.toastSuccess, 'success');
      sessionStorage.removeItem('samhance_activation_username');
      setTimeout(() => {
        onNavigate?.('login');
      }, 2000);
    } else {
      appStore.showToast(result.errorMessage || t.toastFail, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-3 relative selection:bg-blue-600 selection:text-white">
      {/* Background */}
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
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 space-y-4">
          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.desc}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.username}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePh}
                required
                autoComplete="username"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.tempPw}</label>
              <div className="relative">
                <input
                  type={showTempPw ? 'text' : 'password'}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder={t.tempPwPh}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowTempPw(!showTempPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showTempPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.newPw}</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.newPwPh}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.confirmPw}</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPwPh}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
                  <KeyRound className="w-4 h-4" />
                  <span>{t.submit}</span>
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
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
