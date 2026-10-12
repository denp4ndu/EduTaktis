import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string; role: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleModeSwitch = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    // Validations
    if (!email || !email.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    if (mode === 'login' || mode === 'register') {
      if (!password || password.length < 6) {
        setError('Password minimal terdiri dari 6 karakter.');
        return;
      }
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Nama lengkap wajib diisi.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi password tidak cocok dengan password.');
        return;
      }
    }

    // Simulate Async Request
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (mode === 'login') {
        onLoginSuccess({
          name: email.split('@')[0].replace('.', ' ').toUpperCase(),
          email: email,
          role: 'Guru Pendidik',
        });
        onClose();
      } else if (mode === 'register') {
        onLoginSuccess({
          name: name.trim(),
          email: email,
          role: 'Guru Pendidik',
        });
        onClose();
      } else if (mode === 'forgot') {
        setSuccessMessage('Tautan pemulihan kata sandi telah dikirim ke email Anda.');
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 text-center pt-2">
          <span className="badge-blue">
            EDUTAKTIS AKUN
          </span>
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            {mode === 'login' && 'Masuk ke Akun Guru'}
            {mode === 'register' && 'Daftar Akun Baru'}
            {mode === 'forgot' && 'Pemulihan Password'}
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            {mode === 'login' && 'Akses simpanan modul, prompt AI, dan riwayat belajar.'}
            {mode === 'register' && 'Bergabung bersama komunitas guru taktis Indonesia.'}
            {mode === 'forgot' && 'Masukkan email terdaftar untuk menerima instruksi.'}
          </p>
        </div>

        {/* Backend Status Disclaimer Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-0.5">
          <p className="font-bold">Informasi Sistem Akun Demo:</p>
          <p className="text-amber-700">Autentikasi produksi server belum diaktifkan (`BACKEND AUTHENTICATION: NOT IMPLEMENTED`). Sesi uji coba disimpan secara lokal.</p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nama Lengkap Guru</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi Santoso, M.Pd"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Email Pembelajaran / Sekolah</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@guru.belajar.id"
                className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Kata Sandi (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Konfirmasi Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>Ingat saya</span>
              </label>
              <button
                type="button"
                onClick={() => handleModeSwitch('forgot')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Lupa password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Masuk Sekarang'}
                  {mode === 'register' && 'Buat Akun Guru'}
                  {mode === 'forgot' && 'Kirim Tautan'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Modal Switch Footer */}
        <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-600">
          {mode === 'login' && (
            <p>
              Belum punya akun?{' '}
              <button
                onClick={() => handleModeSwitch('register')}
                className="text-blue-600 font-bold hover:underline"
              >
                Daftar di sini
              </button>
            </p>
          )}

          {(mode === 'register' || mode === 'forgot') && (
            <p>
              Sudah punya akun?{' '}
              <button
                onClick={() => handleModeSwitch('login')}
                className="text-blue-600 font-bold hover:underline"
              >
                Masuk di sini
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
