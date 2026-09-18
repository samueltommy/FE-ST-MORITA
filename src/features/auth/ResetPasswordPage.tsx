import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import { appStore } from '../../store/useAppStore';
import { resetPasswordApi } from '../../services/authService';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      appStore.showToast('Token reset wajib diisi.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      appStore.showToast('Konfirmasi sandi tidak cocok.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      appStore.showToast('Sandi baru minimal 8 karakter.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordApi(token.trim(), newPassword);
      appStore.showToast('Sandi berhasil direset! Silakan masuk dengan sandi baru.', 'success');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string; message?: string } } };
      appStore.showToast(err?.response?.data?.detail || err?.response?.data?.message || 'Reset sandi gagal. Token mungkin sudah kedaluwarsa.', 'error');
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
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Reset Kata Sandi</h3>
            <p className="text-xs text-slate-500 mt-1">
              Masukkan token reset dan sandi baru Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Token Reset</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token dari email Anda"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sandi Baru</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Konfirmasi Sandi Baru</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi sandi baru"
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
                  <span>Reset Sandi</span>
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
