import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import { appStore, useAppStore } from '../../store/useAppStore';
import { resetPasswordApi } from '../../services/authService';

const CONTENT = {
  id: {
    title: 'Reset Kata Sandi',
    desc: 'Masukkan token reset dan sandi baru Anda',
    token: 'Token Reset',
    tokenPh: 'Token dari email Anda',
    newPw: 'Sandi Baru',
    newPwPh: 'Minimal 8 karakter',
    confirmPw: 'Konfirmasi Sandi Baru',
    confirmPwPh: 'Ulangi sandi baru',
    submit: 'Reset Sandi',
    back: 'Kembali ke halaman Masuk',
    toastEmpty: 'Token reset wajib diisi.',
    toastMismatch: 'Konfirmasi sandi tidak cocok.',
    toastShort: 'Sandi baru minimal 8 karakter.',
    toastSuccess: 'Sandi berhasil direset! Silakan masuk dengan sandi baru.',
    toastFail: 'Reset sandi gagal. Token mungkin sudah kedaluwarsa.',
  },
  en: {
    title: 'Reset Password',
    desc: 'Enter your reset token and new password',
    token: 'Reset Token',
    tokenPh: 'Token from your email',
    newPw: 'New Password',
    newPwPh: 'Minimum 8 characters',
    confirmPw: 'Confirm New Password',
    confirmPwPh: 'Repeat new password',
    submit: 'Reset Password',
    back: 'Back to Sign In page',
    toastEmpty: 'Reset token is required.',
    toastMismatch: 'Password confirmation does not match.',
    toastShort: 'New password must be at least 8 characters.',
    toastSuccess: 'Password reset successful! Please log in with your new password.',
    toastFail: 'Password reset failed. Token may have expired.',
  }
};

interface ResetPasswordPageProps {
  onNavigate?: (page: 'login' | 'activation' | 'forgot-password' | 'reset-password') => void;
  resetToken?: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigate, resetToken: propToken }) => {
  const [token, setToken] = useState(propToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
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
    try {
      await resetPasswordApi(token.trim(), newPassword);
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
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t.desc}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t.token}</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t.tokenPh}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t.newPw}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.newPwPh}
                  required
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t.confirmPw}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPwPh}
                  required
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  <ShieldCheck className="w-4 h-4" />
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
