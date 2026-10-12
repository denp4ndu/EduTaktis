import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { BRAND_INFO, CATEGORIES } from '../data/content';

interface FooterProps {
  onSelectCategory: (slug: string | null) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      {/* Top Newsletter CTA Banner */}
      <div className="border-b border-slate-800 py-12 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-teal-400 font-extrabold text-xs tracking-widest uppercase block">
              KOMUNITAS GURU TAKTIS
            </span>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Dapatkan Template Prompt AI &amp; Modul Ajar Gratis
            </h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-normal">
              Bergabung bersama 15.000+ pendidik Indonesia. Buletin mingguan bebas spam dengan tutorial langsung pakai.
            </p>

            {subscribed ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-teal-950/80 border border-teal-800 text-teal-300 rounded-lg text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                <span>Terima kasih! Email Anda telah terdaftar.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email guru Anda..."
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0 shadow-xs"
                >
                  <span>Langganan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2 space-y-4">
            {/* Logo Slot Container */}
            <div 
              className="logo-slot h-12 w-48 sm:w-60 flex items-center shrink-0 cursor-pointer" 
              aria-label="Brand logo" 
              onClick={() => onSelectCategory(null)}
            >
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed pt-2">
              {BRAND_INFO.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
              <span>Domain: {BRAND_INFO.domain}</span>
              <span>·</span>
              <span>Portal Edukasi Guru Indonesia</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Kategori Pembelajaran
            </h4>
            <ul className="space-y-3 text-sm">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => onSelectCategory(cat.slug)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Informasi &amp; Legal
            </h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#tentang" className="hover:text-white transition-colors">Tentang EduTaktis</a></li>
              <li><a href="#tim" className="hover:text-white transition-colors">Tim Penulis</a></li>
              <li><a href="#kontak" className="hover:text-white transition-colors">Hubungi Kami</a></li>
              <li><a href="#privasi" className="hover:text-white transition-colors">Kebijakan Privasi</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            &copy; {new Date().getFullYear()} {BRAND_INFO.name}. Hak Cipta Dilindungi. Built on Phase 04B design system.
          </p>
          <div className="flex items-center gap-4">
            <span>Standar Aksesibilitas WCAG</span>
            <span>·</span>
            <span>Pedoman Media Siber</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
