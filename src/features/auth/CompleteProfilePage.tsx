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
import { appStore, useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

const CONTENT = {
  id: {
    title: 'Lengkapi Profil Anda',
    desc: 'Akun Anda belum memiliki data penting (Email, Nama). Silakan lengkapi untuk melanjutkan.',
    username: 'Username',
    usernamePh: 'Masukkan username Anda',
    firstName: 'Nama Depan',
    firstNamePh: 'Nama depan',
    lastName: 'Nama Belakang',
    lastNamePh: 'Nama belakang',
    email: 'Email',
    emailPh: 'alamat@email.com',
    password: 'Kata Sandi (Untuk Verifikasi)',
    passwordPh: 'Masukkan kata sandi Anda saat ini',
    submit: 'Simpan & Lanjutkan',
    back: 'Batal dan kembali ke halaman Masuk',
    toastEmpty: 'Semua kolom wajib diisi.',
    toastSuccess: 'Profil berhasil dilengkapi! Mengalihkan ke halaman Masuk...',
    toastFail: 'Gagal menyimpan profil. Periksa kembali data Anda.',
  },
  en: {
    title: 'Complete Your Profile',
    desc: 'Your account is missing important data (Email, Name). Please complete it to continue.',
    username: 'Username',
    usernamePh: 'Enter your username',
    firstName: 'First Name',
    firstNamePh: 'First name',
    lastName: 'Last Name',
    lastNamePh: 'Last name',
    email: 'Email',
    emailPh: 'address@email.com',
    password: 'Password (For Verification)',
    passwordPh: 'Enter your current password',
    submit: 'Save & Continue',
    back: 'Cancel and back to Sign In page',
    toastEmpty: 'All fields are required.',
    toastSuccess: 'Profile completed successfully! Redirecting to Sign In...',
    toastFail: 'Failed to save profile. Please check your data.',
  }
};

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
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim() || !email.trim() || !firstName.trim() || !lastName.trim()) {
      appStore.showToast(t.toastEmpty, 'error');
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
      appStore.showToast(t.toastSuccess, 'success');
      sessionStorage.removeItem('samhance_complete_profile_username');
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
              <UserCircle className="w-6 h-6 text-white" />
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.firstName}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t.firstNamePh}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.lastName}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t.lastNamePh}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPh}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.password}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPh}
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
                  <span>{t.submit}</span>
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
              <span>{t.back}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
