import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Target,
  Compass,
  Award,
  Sparkles,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { appStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

interface LoginPageProps {
  onNavigate?: (page: 'login' | 'activation' | 'forgot-password' | 'reset-password' | 'complete-profile') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((state) => state.login);

  // Handle real credential login via backend API
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      appStore.showToast('Username/email dan kata sandi wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      // Auth store will set isAuthenticated=true → App.tsx re-renders to main layout
      return;
    }

    // TypeScript narrowing: at this point result is the failure type
    const failure = result as { success: false; requiresActivation: boolean; requiresProfileVerification: boolean; errorMessage: string };

    if (failure.requiresProfileVerification) {
      sessionStorage.setItem('samhance_complete_profile_username', identifier.trim());
      if (onNavigate) {
        onNavigate('complete-profile');
      }
      return;
    }

    if (failure.requiresActivation) {
      // Temporary password detected → automatically navigate to activation page seamlessly
      sessionStorage.setItem('samhance_activation_username', identifier.trim());
      if (onNavigate) {
        onNavigate('activation');
      }
      return;
    }

    appStore.showToast(failure.errorMessage, 'error');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-6 relative selection:bg-blue-600 selection:text-white">
      {/* Subtle Corporate Ambient Background for Light Mode */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.08),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header with Authentic ST. Morita Logo */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between pt-2 pb-4 lg:pt-1 lg:pb-2 z-10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Authentic ST. Morita Brand Mark */}
          <div className="flex items-center gap-3 lg:gap-2.5">
            <div className="relative w-10 h-10 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 p-0.5 shadow-sm shadow-blue-600/20 flex items-center justify-center">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 lg:w-5 lg:h-5">
                {/* Outer adhesive tape ring */}
                <circle cx="24" cy="24" r="19" stroke="white" strokeWidth="2.5" strokeOpacity="0.4" strokeDasharray="3 3" />
                <path
                  d="M12 28C12 21.3726 17.3726 16 24 16C28.5 16 32.5 18.5 34.5 22C36.5 25.5 35 30 31.5 32C28 34 23 33 20 30"
                  stroke="white"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                {/* Core ribbon roll */}
                <circle cx="24" cy="24" r="4.5" fill="white" />
                <path
                  d="M27 24C27 27 24 30 20 30C16 30 14 26 14 22"
                  stroke="#BAE6FD"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-lg lg:text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                <span>ST. MORITA</span>
                <span className="text-[10px] lg:text-[9px] font-semibold tracking-widest text-blue-600 uppercase">
                  INDUSTRIES
                </span>
              </div>
              <div className="text-[10px] lg:text-[9px] text-slate-500 font-medium tracking-wide mt-1 lg:mt-0.5">
                Adhesives & Industrial Tapes Manufacturing
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="w-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-10 items-center justify-center my-auto z-10 flex-1 h-full">
        
        {/* Company Profile (Hidden entirely on mobile to create a dedicated, clean login view) */}
        <div className="hidden lg:block lg:col-span-7 space-y-4 w-full">
          <div className="space-y-2">

            <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-extrabold tracking-tight text-slate-900 leading-tight">
              Solusi Terdepan Rekayasa Perekat & Manufaktur Industri
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed max-w-xl font-normal">
              PT ST. Morita Industries berdedikasi menghadirkan produk perekat, pita perekat industri,
              dan solusi pelapisan berstandar tinggi yang mendukung efisiensi manufaktur.
            </p>
          </div>

          {/* Visi & Misi Cards - Hidden on very small screens to save space */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Visi */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">Visi Perusahaan</h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Menjadi industri manufaktur perekat dan pita perekat yang kompetitif, inovatif,
                serta berwawasan lingkungan yang terdepan di pasar nasional maupun global.
              </p>
            </div>

            {/* Misi */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">Misi Perusahaan</h2>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Produk bermutu tinggi melalui riset berkelanjutan.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Layanan terbaik bernilai tambah.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Aktif dalam kepedulian lingkungan hidup.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Nilai Utama Perusahaan */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-800">Kualitas & Keandalan</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-semibold text-slate-800">Riset & Inovasi (R&D)</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold text-slate-800">Kemitraan Berkelanjutan</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md mx-auto lg:col-span-5 lg:max-w-none flex-shrink-0">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Masuk ke Akun Anda</h3>
              <p className="text-xs text-slate-500 mt-1">
                Silakan masukkan kredensial resmi perusahaan
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username atau Email
                </label>
                <input
                  id="login-identifier-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="contoh: nama@stmorita.co.id atau NIK"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('forgot-password')}
                    className="text-[11px] text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    Lupa Sandi?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    required
                    autoComplete="current-password"
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

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ingat saya di perangkat ini</span>
                </label>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>


          </div>
        </div>
      </main>

      {/* Simple, Clean Corporate Footer */}
      <footer className="w-full max-w-7xl mx-auto pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-[11px] text-slate-400 gap-2 z-10 shrink-0">
        <div>
          &copy; {new Date().getFullYear()} PT ST. Morita Industries. Hak cipta dilindungi.
        </div>
        <div className="flex items-center gap-3">
          <span>Sistem Enterprise Terpadu</span>
          <span>&bull;</span>
          <span>Privasi Data</span>
        </div>
      </footer>
    </div>
  );
};
