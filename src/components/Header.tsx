import React, { useState } from 'react';
import { Search, Menu, X, User as UserIcon } from 'lucide-react';
import { CATEGORIES } from '../data/content';

interface HeaderProps {
  currentCategorySlug: string | null;
  onSelectCategory: (slug: string | null) => void;
  onGoHome: () => void;
  onOpenSearch: () => void;
  onOpenAuth?: () => void;
  onOpenCurriculumEngine?: () => void;
  currentUser?: { name: string; email: string; role: string } | null;
  onOpenCustomizer?: () => void;
  onOpenExporter?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCategorySlug,
  onSelectCategory,
  onGoHome,
  onOpenSearch,
  onOpenAuth,
  onOpenCurriculumEngine,
  currentUser,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
        
        {/* Zone 1: Logo Container Slot - ABSOLUTELY FROZEN */}
        <div 
          className="logo-slot h-12 w-48 sm:w-60 flex items-center shrink-0 cursor-pointer" 
          aria-label="Brand logo" 
          onClick={onGoHome}
        >
        </div>

        {/* Zone 2: Primary Navigation Links */}
        <nav className="hidden xl:flex items-center gap-7 text-sm font-semibold text-slate-700">
          <button
            onClick={() => onSelectCategory(null)}
            className={`py-1 border-b-2 transition-colors ${
              currentCategorySlug === null
                ? 'text-blue-600 border-blue-600 font-bold'
                : 'border-transparent hover:text-blue-600'
            }`}
          >
            Beranda
          </button>

          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap ${
                currentCategorySlug === cat.slug
                  ? 'text-blue-600 border-blue-600 font-bold'
                  : 'border-transparent hover:text-blue-600'
              }`}
            >
              {cat.id === 'tools-download' ? 'Download' : cat.name}
            </button>
          ))}
        </nav>

        {/* Zone 3: Search, Curriculum Engine & Auth */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCurriculumEngine}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg transition-colors hidden md:flex items-center gap-1.5 text-xs font-bold shrink-0 min-h-[44px]"
            aria-label="Engine Kurikulum"
          >
            <span>Engine Kurikulum</span>
          </button>

          <button
            onClick={onOpenSearch}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold"
            aria-label="Cari Tutorial"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Cari...</span>
          </button>

          {/* User Account Button */}
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 min-h-[44px]"
            aria-label="Akun Guru"
          >
            <UserIcon className="w-4 h-4 text-blue-600" />
            <span>{currentUser ? currentUser.name.split(' ')[0] : 'Akun Guru'}</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:text-slate-900 rounded-lg xl:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg">
          <button
            onClick={() => {
              onSelectCategory(null);
              setMobileMenuOpen(false);
            }}
            className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentCategorySlug === null ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Beranda
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                onSelectCategory(cat.slug);
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentCategorySlug === cat.slug ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
          
          <button
            onClick={() => {
              if (onOpenAuth) onOpenAuth();
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-blue-600 bg-blue-50"
          >
            {currentUser ? `Profil: ${currentUser.name}` : 'Masuk / Daftar Akun Guru'}
          </button>
        </div>
      )}
    </header>
  );
};
