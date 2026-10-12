import React, { useState, useEffect } from 'react';
import { Category, Article } from '../data/content';
import { contentService } from '../services/contentService';
import { Breadcrumb } from '../components/Breadcrumb';
import { ArticleCard } from '../components/ArticleCard';
import { BookOpen, Download, Cpu, FileText, CheckCircle2, Copy, FileCheck, ExternalLink } from 'lucide-react';

interface CategoryViewProps {
  category: Category;
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (slug: string) => void;
  onGoHome: () => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  category,
  onSelectArticle,
  onSelectCategory,
  onGoHome,
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'prompt' | 'template' | 'spreadsheet' | 'ebook' | 'checklist'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    contentService.getArticles(category.slug).then((fetchedArticles) => {
      setArticles(fetchedArticles);
    });
  }, [category.slug]);

  // Practical Resources List for Tools & Download category
  const downloadableResources = [
    {
      id: 'res-1',
      title: 'Master Prompt Generator Modul Ajar Kurikulum Merdeka',
      type: 'PROMPT',
      category: 'AI untuk Guru',
      format: 'TXT / Prompt Text',
      description: 'Prompt terstruktur untuk menghasilkan RPP / Modul Ajar otomatis dengan instruksi peran, CP, dan tabel indikator.',
      content: `Bertindaklah sebagai Ahli Pengembang Kurikulum Merdeka. Buat Modul Ajar IPA Kelas 7 untuk CP: 'Pemahaman Konsep Ekosistem'. Sajikan dalam tabel rapi mencakup TP, Pemahaman Bermakna, Langkah Pembelajaran PBL, dan Rubrik Asesmen.`,
      actionLabel: 'Salin Prompt',
      badge: 'Paling Populer',
      badgeClass: 'badge-blue',
      icon: Cpu,
      available: true,
    },
    {
      id: 'res-2',
      title: 'Template Spreadsheet Rubrik Penilaian KKTP',
      type: 'SPREADSHEET',
      category: 'Produktivitas',
      format: 'Google Sheets / XLSX',
      description: 'File spreadsheet siap pakai dengan rumus Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) dan penentuan predikat otomatis.',
      actionLabel: 'Gunakan Spreadsheet',
      badge: 'Gratis Download',
      badgeClass: 'badge-teal',
      icon: FileText,
      downloadUrl: '#spreadsheet-kktp-template',
      available: true,
    },
    {
      id: 'res-3',
      title: 'E-Book Cheatsheet 10 Tools AI Gratis untuk Guru',
      type: 'EBOOK',
      category: 'Tools Gratis',
      format: 'PDF (2.4 MB)',
      description: 'Panduan saku 10 platform AI terbaik (MagicSchool AI, Quizizz, Curipod, Canva) bebas biaya untuk kebutuhan mengajar.',
      actionLabel: 'Baca E-book',
      badge: 'Panduan PDF',
      badgeClass: 'badge-green',
      icon: Download,
      downloadUrl: '#ebook-cheatsheet-ai-guru',
      available: true,
    },
    {
      id: 'res-4',
      title: 'Checklist Integrasi Teknologi Pembelajaran',
      type: 'CHECKLIST',
      category: 'Teknologi Pendidikan',
      format: 'PDF / Printable',
      description: 'Daftar periksa kesiapan sarana blended learning, akun Pembelajaran Belajar.id, dan ketersediaan media interaktif.',
      actionLabel: 'Gunakan Checklist',
      badge: 'Checklist Saku',
      badgeClass: 'badge-amber',
      icon: FileCheck,
      downloadUrl: '#checklist-integrasi-teknologi',
      available: true,
    },
  ];

  const filteredResources = downloadableResources.filter((res) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'prompt') return res.type === 'PROMPT';
    if (activeTab === 'template') return res.type === 'TEMPLATE';
    if (activeTab === 'spreadsheet') return res.type === 'SPREADSHEET';
    if (activeTab === 'ebook') return res.type === 'EBOOK';
    if (activeTab === 'checklist') return res.type === 'CHECKLIST';
    return true;
  });

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150 py-2">
      
      <Breadcrumb
        items={[
          { label: 'Beranda', onClick: onGoHome },
          { label: category.name, active: true },
        ]}
      />

      {/* Category Header */}
      <header className="p-8 sm:p-10 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#2563EB] inline-block" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
            KATEGORI PEMBELAJARAN
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
          {category.name}
        </h1>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
          {category.description}
        </p>

        <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <span>Menampilkan {articles.length} tutorial &amp; panduan terverifikasi</span>
        </div>
      </header>

      {/* SPECIAL DOWNLOAD & RESOURCE LISTING FOR "TOOLS & DOWNLOAD" CATEGORY */}
      {category.id === 'tools-download' && (
        <section className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-extrabold text-[#148BA6] uppercase tracking-wider block">
                RESOURCE HUB
              </span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 font-heading">
                Pusat Sumber Daya &amp; Download Guru
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'all'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setActiveTab('prompt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'prompt'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Prompt AI
              </button>
              <button
                onClick={() => setActiveTab('spreadsheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'spreadsheet'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Spreadsheet
              </button>
              <button
                onClick={() => setActiveTab('ebook')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'ebook'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                E-Book
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'checklist'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Checklist
              </button>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredResources.map((res) => {
              const IconComponent = res.icon;
              return (
                <div
                  key={res.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {res.format}
                        </span>
                      </div>
                      <span className={res.badgeClass}>{res.badge}</span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-tight font-heading">
                      {res.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                      {res.description}
                    </p>

                    {/* Prompt Box if type is PROMPT */}
                    {res.type === 'PROMPT' && res.content && (
                      <div className="mt-3 p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono relative group overflow-x-auto">
                        <p className="line-clamp-3 leading-relaxed whitespace-pre-wrap">{res.content}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100">
                    {res.type === 'PROMPT' && res.content ? (
                      <button
                        onClick={() => handleCopyPrompt(res.id, res.content)}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-2xs"
                      >
                        {copiedId === res.id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-teal-300" />
                            <span>Berhasil Disalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>{res.actionLabel}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <a
                        href={res.downloadUrl || '#'}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 text-center shadow-2xs"
                      >
                        <span>{res.actionLabel}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Articles Grid */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
          {category.id === 'tools-download' ? 'Panduan & Tutorial Terkait' : 'Artikel dalam Kategori Ini'}
        </h2>

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((art) => (
              <ArticleCard
                key={art.id}
                article={art}
                onSelectArticle={onSelectArticle}
                onSelectCategory={onSelectCategory}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <p className="text-base font-bold text-slate-800">Belum Ada Artikel dalam Kategori Ini</p>
            <p className="text-xs text-slate-500">Kunjungi kembali nanti untuk artikel dan tutorial baru.</p>
          </div>
        )}
      </div>

    </div>
  );
};
