import React from 'react';
import { Home, Search, ArrowRight } from 'lucide-react';

interface NotFoundViewProps {
  onGoHome: () => void;
  onOpenSearch: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome, onOpenSearch }) => {
  return (
    <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-6 animate-in fade-in duration-150">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-extrabold text-xl mx-auto shadow-sm">
        404
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
          Halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau kata kunci pencarian belum tersedia.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <button
          onClick={onGoHome}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        <button
          onClick={onOpenSearch}
          className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4 text-slate-500" />
          <span>Cari Tutorial Lain</span>
        </button>
      </div>
    </div>
  );
};
