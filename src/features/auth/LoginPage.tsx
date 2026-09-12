import React, { useState } from 'react';
import {
  Building2,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Factory,
  FileKey,
  BadgeAlert,
  Fingerprint,
} from 'lucide-react';
import { appStore, DEMO_USERS } from '../../store/useAppStore';
import { UserProfile, UserRole } from '../../types';
import { ROLE_DEFINITIONS, getTierBadge } from '../../utils/rbac';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('hendra.morita@stmorita.co.id');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRolePreset, setSelectedRolePreset] = useState<UserRole>('DIREKSI');

  // Handle standard credential login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    setTimeout(() => {
      // Find matching user from DEMO_USERS or match by email/nik
      const allUsers = Object.values(DEMO_USERS);
      const matched = allUsers.find(
        (u) =>
          u.email.toLowerCase() === identifier.trim().toLowerCase() ||
          u.nik.toLowerCase() === identifier.trim().toLowerCase()
      );

      if (matched) {
        appStore.login(matched);
      } else {
        // Default to selected preset or Super Admin if not exact
        const fallback = DEMO_USERS[selectedRolePreset] || DEMO_USERS.DIREKSI;
        appStore.login(fallback);
      }
      setIsSubmitting(false);
    }, 450);
  };

  // Quick 1-click preset login
  const handleQuickLogin = (role: UserRole) => {
    const user = DEMO_USERS[role];
    if (!user) return;
    setSelectedRolePreset(role);
    setIdentifier(user.email);
    setPassword('MoritaSecure2026!');
    setIsSubmitting(true);

    setTimeout(() => {
      appStore.login(user);
      setIsSubmitting(false);
    }, 350);
  };

  const currentPresetUser = DEMO_USERS[selectedRolePreset];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative ambient background rings */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-2 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>ST. Morita Industries</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono font-bold uppercase">
                Pabrik Cikarang
              </span>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Enterprise ERP & Production System &bull; Adhesive Tapes Division
            </div>
          </div>
        </div>

        {/* Security Compliance Badges */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>ISO 9001 / IATF 16949</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
            <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
            <span>SHA-256 Audit Trail</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
        {/* Left Column: Industrial Plant & RBAC Architecture Brief */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Arsitektur Keamanan RBAC 4 Lapis (SRS v2.0)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
            Portal Terpadu Operasional, Keuangan & Mutu Pabrik Cikarang
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Sistem ERP mutakhir dengan otorisasi berbasis peran granular (RBAC) 4 tingkatan:
            Direksi (L1), Admin Bidang & Manager (L2), Staff & Operator (L3), dan Super Admin (L0).
            Dilengkapi proteksi data masking HPP, otorisasi dua lapis Cost Control, dan penguncian fisik QC Hold.
          </p>

          {/* 4-Tier RBAC Architecture Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Struktur Tingkatan Akses Pengguna (Role Matrix)</span>
              <span className="text-[10px] text-blue-400">Strict Enforcement</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Level 1: Direksi (Executive)
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Full Read-All, P&L Finansial, Otorisasi Transaksi Nilai Tinggi & Final Override QC Hold.
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Level 0: Super Admin
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Pengelolaan Akun Pegawai, Reset Password, Konfigurasi Sistem, dan Log Audit SHA-256.
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="font-bold text-blue-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Level 2: Admin Bidang / Manager
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Approval PO, Gating Margin Cost Control, Rilis SPK PPIC, Release QC Hold & Post Invoicing.
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                <div className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Level 3: Staff & Operator
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Entry Data, Scan Barcode, Lab Testing. Data Sensitif HPP & Margin Terkunci (Masked).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login Form & Preset Role Switcher */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white">Masuk ke Portal ERP</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gunakan email resmi atau NIK pegawai ST. Morita Industries
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>

            {/* Error feedback if any */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <BadgeAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Credential Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Email Perusahaan / NIK Pegawai
                </label>
                <div className="relative">
                  <input
                    id="login-identifier-input"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="nama.pegawai@stmorita.co.id atau NIK-2026-..."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Kata Sandi Keamanan
                  </label>
                  <span className="text-[11px] text-blue-400 hover:underline cursor-pointer">
                    Lupa sandi? Hubungi Admin
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ingat sesi browser di perangkat ini</span>
                </label>
                <span className="text-[11px] text-slate-500">Koneksi Terenkripsi SSL</span>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk ke Sistem ERP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-bold">
                <span className="bg-slate-900 px-3 text-slate-400">
                  Pilih Preset Akun Uji Coba (1-Klik Masuk)
                </span>
              </div>
            </div>

            {/* Quick Demo Accounts Selector (Grouped by Tier) */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400">
                Pilih profil peran untuk langsung menguji perilaku RBAC:
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Level 1: Direksi */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('DIREKSI')}
                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-all group"
                  title="Level 1: Direksi (Executive Full View)"
                >
                  <div className="text-[10px] font-mono font-bold text-amber-400 uppercase">L1 &bull; Direksi</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">Ir. Hendra M.</div>
                  <div className="text-[10px] text-slate-400 truncate">President Director</div>
                </button>

                {/* Level 0: Super Admin */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('SUPER_ADMIN')}
                  className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-all group"
                  title="Level 0: Super Admin (Manage Users & Config)"
                >
                  <div className="text-[10px] font-mono font-bold text-purple-400 uppercase">L0 &bull; Admin</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">Ir. Budi H.</div>
                  <div className="text-[10px] text-slate-400 truncate">Executive IT</div>
                </button>

                {/* Level 2: QC Manager */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('QC_MANAGER')}
                  className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-all group"
                  title="Level 2: QC Manager (Override & Release Hold)"
                >
                  <div className="text-[10px] font-mono font-bold text-blue-400 uppercase">L2 &bull; QC Mgr</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">Dr. Hendra W.</div>
                  <div className="text-[10px] text-slate-400 truncate">Release QC Hold</div>
                </button>

                {/* Level 2: Cost Control */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('COST_CONTROL')}
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all group"
                  title="Level 2: Cost Control (Gating Margin Approval)"
                >
                  <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">L2 &bull; Cost Ctrl</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">Lestari W., Ak.</div>
                  <div className="text-[10px] text-slate-400 truncate">Margin Gating</div>
                </button>

                {/* Level 2: Finance Manager */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('FINANCE_MANAGER')}
                  className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-all group"
                  title="Level 2: Finance Manager (13 Rumus Invoice & AR)"
                >
                  <div className="text-[10px] font-mono font-bold text-blue-400 uppercase">L2 &bull; Finance</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">Melinda K.</div>
                  <div className="text-[10px] text-slate-400 truncate">13-Formula Inv</div>
                </button>

                {/* Level 3: Operator Produksi */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('OPERATOR_PROD')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all group"
                  title="Level 3: Operator (Data HPP Masked)"
                >
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">L3 &bull; Operator</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">Wahyu H.</div>
                  <div className="text-[10px] text-slate-400 truncate">HPP Masked</div>
                </button>

                {/* Level 3: QC Inspector */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('QC_INSPECTOR')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all group"
                  title="Level 3: QC Inspector (Blocked from Hold Override)"
                >
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">L3 &bull; QC Insp</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">Rian Pratama</div>
                  <div className="text-[10px] text-slate-400 truncate">No Override</div>
                </button>

                {/* Level 3: Sales Staff */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('SALES_EXEC')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all group"
                  title="Level 3: Sales Staff (Draft Quotation)"
                >
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">L3 &bull; Sales</div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">Dimas Aditya</div>
                  <div className="text-[10px] text-slate-400 truncate">Draft Quote</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div>
          &copy; {new Date().getFullYear()} PT ST. Morita Industries. Kawasan Industri Cikarang, Jawa Barat, Indonesia.
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span>Enterprise ERP v2.0</span>
          <span>&bull;</span>
          <span>Kebijakan Keamanan RBAC</span>
          <span>&bull;</span>
          <span>Server Status: Online (Asia-SE1)</span>
        </div>
      </footer>
    </div>
  );
};
