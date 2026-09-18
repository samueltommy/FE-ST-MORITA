import React, { useState } from 'react';
import {
  UserCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { appStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

interface CompleteProfilePageProps {
  onNavigate?: (page: 'login' | 'activation' | 'forgot-password' | 'reset-password' | 'complete-profile') => void;
}

export const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState(() => sessionStorage.getItem('samhance_complete_profile_username') || '');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPw, setShowPw] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completeProfile = useAuthStore((state) => state.completeProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim() || !email.trim() || !firstName.trim() || !lastName.trim()) {
      appStore.showToast('Semua kolom wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await completeProfile({
      username: username.trim(),
      password,
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim()
    });
    setIsSubmitting(false);

    if (result.success) {
      appStore.showToast('Profil berhasil dilengkapi! Mengalihkan ke halaman Masuk...', 'success');
      sessionStorage.removeItem('samhance_complete_profile_username');
      setTimeout(() => {
        onNavigate?.('login');
      }, 2000);
    } else {
      appStore.showToast(result.errorMessage || 'Gagal menyimpan profil. Periksa kembali data Anda.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-3 relative selection:bg-blue-600 selection:text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.08),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 space-y-4">
          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/20">
              <UserCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Lengkapi Profil Anda</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Akun Anda belum memiliki data penting (Email, Nama). Silakan lengkapi untuk melanjutkan.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                required
                autoComplete="username"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Depan</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Belakang</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alamat@email.com"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi (Untuk Verifikasi)</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi Anda saat ini"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Simpan & Lanjutkan</span>
                  <ArrowRight className="w-4 h-4" />
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
              <span>Batal dan kembali ke halaman Masuk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
