import React, { useState } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { Article, ARTICLES } from '../data/content';
import { ArticleCard } from '../components/ArticleCard';
import { User, Bookmark, History, LogOut, CheckCircle2, ShieldCheck, Cpu, FileText, DownloadCloud } from 'lucide-react';

interface ProfileViewProps {
  user: { name: string; email: string; role: string };
  onLogout: () => void;
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (slug: string) => void;
  onGoHome: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onLogout,
  onSelectArticle,
  onSelectCategory,
  onGoHome,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'history' | 'settings'>('saved');

  // Sample Saved Resources
  const [savedItems, setSavedItems] = useState([
    {
      id: 'saved-1',
      title: 'Master Prompt Generator Modul Ajar Kurikulum Merdeka',
      type: 'PROMPT AI',
      category: 'ai-untuk-guru',
      format: 'Prompt Text',
      savedAt: '28 Sep 2026',
    },
    {
      id: 'saved-2',
      title: 'Template Spreadsheet Rubrik Penilaian KKTP',
      type: 'SPREADSHEET',
      category: 'produktivitas',
      format: 'Google Sheets / XLSX',
      savedAt: '25 Sep 2026',
    },
  ]);

  const handleRemoveSaved = (id: string) => {
    setSavedItems(savedItems.filter((item) => item.id !== id));
  };

  const recentlyViewedArticles = ARTICLES.slice(0, 2);

  return (
    <div className="space-y-8 animate-in fade-in duration-150 py-2">
      
      <Breadcrumb
        items={[
          { label: 'Beranda', onClick: onGoHome },
          { label: 'Dasbor Akun Guru', active: true },
        ]}
      />

      {/* Profile Header */}
      <div className="p-8 sm:p-10 bg-white border border-slate-200 rounded-3xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-md">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                {user.name}
              </h1>
              <span className="badge-blue flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Terverifikasi</span>
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600 font-sans">{user.email}</p>
            <p className="text-xs text-slate-500">{user.role} · Akun Aktif EduTaktis</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors flex items-center gap-2 shrink-0 min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Sesi</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 min-h-[44px] ${
            activeTab === 'saved'
              ? 'bg-[#2563EB] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Resource Tersimpan ({savedItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 min-h-[44px] ${
            activeTab === 'history'
              ? 'bg-[#2563EB] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Aktivitas ({recentlyViewedArticles.length})</span>
        </button>
      </div>

      {/* Tab 1: Saved Resources */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 font-heading">Koleksi Resource Terpublikasi</h2>

          {savedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {savedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3 shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="badge-teal">{item.type}</span>
                      <span className="text-slate-400 font-normal">Disimpan {item.savedAt}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 font-heading leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500">{item.format}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectCategory(item.category)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Buka Resource &rarr;
                    </button>
                    <button
                      onClick={() => handleRemoveSaved(item.id)}
                      className="text-xs text-red-600 font-semibold hover:underline"
                    >
                      Hapus Simpanan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-800">Belum Ada Resource Tersimpan</p>
              <p className="text-xs text-slate-500">Simpan prompt AI atau template pembelajaran saat Anda membaca artikel.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Activity History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 font-heading">Artikel Terakhir Dilihat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentlyViewedArticles.map((art) => (
              <ArticleCard
                key={art.id}
                article={art}
                onSelectArticle={onSelectArticle}
                onSelectCategory={onSelectCategory}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
