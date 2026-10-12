import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Download, Cpu, Layout, FileText, CheckCircle2, Mail, FileCheck } from 'lucide-react';
import { Article, CATEGORIES } from '../data/content';
import { contentService } from '../services/contentService';
import { ArticleCard } from '../components/ArticleCard';

interface HomeViewProps {
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (categorySlug: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectArticle,
  onSelectCategory,
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    contentService.getArticles().then((fetchedArticles) => {
      setArticles(fetchedArticles);
    });
  }, []);

  // Articles segmentation
  const featuredPrimary = articles.find((a) => a.featured) || articles[0];
  const featuredSupporting = articles.filter((a) => a.id !== (featuredPrimary?.id || '')).slice(0, 3);
  const latestArticles = articles;

  // Topic Categories
  const topicCategories = [
    { name: 'AI untuk Guru', slug: 'ai-untuk-guru', count: '18 Panduan', desc: 'Prompt ChatGPT, Gemini, & Claude untuk modul ajar dan asesmen.' },
    { name: 'Teknologi Pendidikan', slug: 'teknologi-pendidikan', count: '14 Tutorial', desc: 'Google Classroom, LMS, dan platform belajar interaktif.' },
    { name: 'Tutorial', slug: 'ai-untuk-guru', count: '22 Artikel', desc: 'Panduan langkah demi langkah implementasi teknologi di kelas.' },
    { name: 'Produktivitas', slug: 'produktivitas', count: '12 Tools', desc: 'Otomatisasi nilai, rumus spreadsheet, dan administrasi guru.' },
    { name: 'Desain & Konten', slug: 'desain-konten', count: '15 Template', desc: 'Canva Education, infografis, dan media pembelajaran visual.' },
    { name: 'Tools', slug: 'tools-download', count: '10 Platform', desc: 'Aplikasi gratis pembantu tugas mengajar dan kuis otomatis.' },
    { name: 'Panduan Praktis', slug: 'ai-untuk-guru', count: '16 Modul', desc: 'Prosedur praktis siap pakai Kurikulum Merdeka.' },
  ];

  // Practical Resources
  const practicalResources = [
    {
      title: 'Prompt AI Modul Ajar & RPP',
      category: 'Prompt AI',
      desc: 'Kumpulan master prompt teruji untuk menyusun Modul Ajar Kurikulum Merdeka dalam hitungan menit.',
      badge: 'Paling Populer',
      badgeColor: 'badge-blue',
      icon: Cpu,
      actionText: 'Lihat Template Prompt',
      slug: 'ai-untuk-guru',
    },
    {
      title: 'Template Spreadsheet Penilaian',
      category: 'Template Pembelajaran',
      desc: 'File Google Sheets & Excel dengan rumus KKTP otomatis untuk pengolahan nilai dan rapor siswa.',
      badge: 'Gratis Download',
      badgeColor: 'badge-teal',
      icon: FileText,
      actionText: 'Download Spreadsheet',
      slug: 'produktivitas',
    },
    {
      title: 'Cheatsheet Tools AI Gratis Guru',
      category: 'Tools Gratis',
      desc: 'Panduan saku 10 platform AI terbaik (MagicSchool, Quizizz, Curipod) bebas biaya untuk sekolah.',
      badge: 'E-Book PDF',
      badgeColor: 'badge-green',
      icon: Download,
      actionText: 'Unduh E-Book',
      slug: 'tools-download',
    },
    {
      title: 'Checklist Integrasi Teknologi Kelas',
      category: 'Checklist Praktis',
      desc: 'Daftar periksa kesiapan media digital dan sarana blended learning untuk kegiatan belajar mengajar.',
      badge: 'Panduan Saku',
      badgeColor: 'badge-amber',
      icon: FileCheck,
      actionText: 'Buka Checklist',
      slug: 'teknologi-pendidikan',
    },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-16 lg:space-y-24 py-8">
      
      {/* 1. HERO SECTION (1 ONLY H1 PER PAGE FOR SEO) */}
      <section className="bg-gradient-to-br from-blue-50/70 via-white to-teal-50/50 border border-slate-200/90 rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column Text & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs sm:text-sm font-extrabold text-[#2563EB] uppercase tracking-widest block">
              AI &amp; TEKNOLOGI UNTUK GURU
            </span>

            {/* THE ONLY H1 ON THE HOMEPAGE */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12] font-heading">
              AI &amp; Teknologi Praktis untuk Guru
            </h1>

            <p className="text-slate-600 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl font-normal font-sans">
              Panduan, tutorial, dan sumber daya praktis untuk membantu guru memanfaatkan AI dan teknologi dalam pembelajaran.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onSelectCategory('ai-untuk-guru')}
                className="btn-primary min-h-[44px] px-7 py-3.5 text-sm font-extrabold shadow-md shadow-blue-500/20"
              >
                <span>Jelajahi Panduan</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => scrollToSection('artikel-terbaru')}
                className="btn-outline min-h-[44px] px-7 py-3.5 text-sm font-bold"
              >
                Artikel Terbaru
              </button>
            </div>
          </div>

          {/* Right Column: Educational Feature Graphic & Highlights */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-md border border-slate-200 p-8 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-bold shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 font-heading">Publikasi Edukasi Guru</h2>
                  <p className="text-xs text-slate-500 font-sans">Kurikulum Merdeka &amp; Pembelajaran Digital</p>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center gap-3 text-xs font-semibold text-blue-900">
                  <Cpu className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <span>Master Prompt Modul Ajar AI</span>
                </div>

                <div className="p-3 bg-teal-50/80 border border-teal-100 rounded-xl flex items-center gap-3 text-xs font-semibold text-[#0F768C]">
                  <Layout className="w-4 h-4 text-[#148BA6] shrink-0" />
                  <span>Desain Media Belajar Canva</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3 text-xs font-semibold text-slate-800">
                  <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Otomatisasi Nilai Spreadsheet</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. FEATURED / PILIHAN EDITOR */}
      {featuredPrimary && (
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-[#148BA6] uppercase tracking-wider block">
                SOROTAN UTAMA
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1 font-heading">
                Pilihan Editor
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Kurasi Redaksi EduTaktis
            </span>
          </div>

          {/* Featured Lockup Grid: 1 Primary Featured + 3 Supporting Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Primary Featured Card (7 cols) */}
            <div className="lg:col-span-7">
              <ArticleCard
                article={featuredPrimary}
                onSelectArticle={onSelectArticle}
                onSelectCategory={onSelectCategory}
                featuredLayout={true}
              />
            </div>

            {/* Supporting Featured List (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              {featuredSupporting.map((art) => (
                <div
                  key={art.id}
                  onClick={() => onSelectArticle(art)}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-xs transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#148BA6] uppercase tracking-wider">
                    <span>{CATEGORIES.find((c) => c.id === art.categoryId)?.name}</span>
                    <span className="text-slate-400 font-normal">{art.readingTime}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-[#2563EB] transition-colors line-clamp-2 font-heading">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {art.excerpt}
                  </p>

                  <div className="pt-2 text-xs text-slate-500 flex items-center justify-between font-medium">
                    <span>24 Sep 2026</span>
                    <span className="text-[#2563EB] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Baca &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* 3. TOPIC / CATEGORY NAVIGATION */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <span className="text-xs font-extrabold text-[#2563EB] uppercase tracking-wider block">
            EKSPLORASI TOPIK
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1 font-heading">
            Topik &amp; Kategori Pembelajaran
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {topicCategories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => onSelectCategory(cat.slug)}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#148BA6] uppercase tracking-wider">
                    {cat.count}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#2563EB]/40 group-hover:bg-[#2563EB] transition-colors" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors font-heading">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {cat.desc}
                </p>
              </div>

              <div className="pt-2 text-xs font-bold text-[#2563EB] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                <span>Jelajahi Panduan &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PRACTICAL RESOURCES / TOOLS SECTION */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <span className="text-xs font-extrabold text-[#148BA6] uppercase tracking-wider block">
            SIAP PAKAI DI KELAS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1 font-heading">
            Sumber Daya &amp; Tools Praktis
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Template, prompt, e-book, dan spreadsheet otomatis untuk mempermudah pekerjaan mengajar Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {practicalResources.map((res, idx) => {
            const IconComp = res.icon;
            return (
              <div
                key={idx}
                onClick={() => onSelectCategory(res.slug)}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className={res.badgeColor}>
                      {res.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors leading-snug font-heading">
                    {res.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {res.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button className="w-full min-h-[44px] px-4 py-2 bg-slate-50 hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 hover:border-blue-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                    <span>{res.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. LATEST ARTICLES STREAM */}
      <section id="artikel-terbaru" className="space-y-8 scroll-mt-28">
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold text-[#2563EB] uppercase tracking-wider block">
              PUBLIKASI BERKALA
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1 font-heading">
              Artikel &amp; Tutorial Terbaru
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Total {articles.length} Tutorial Dipublikasikan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {latestArticles.map((art) => (
            <ArticleCard
              key={art.id}
              article={art}
              onSelectArticle={onSelectArticle}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      </section>

      {/* 6. NEWSLETTER / CTA BANNER */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 lg:p-14 relative overflow-hidden shadow-md">
        <div className="max-w-3xl mx-auto text-center space-y-5 relative z-10">
          <span className="text-xs font-extrabold text-teal-400 tracking-widest uppercase block">
            BULETIN MINGGUAN GURU TAKTIS
          </span>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-heading">
            Dapatkan Tips AI &amp; Teknologi Praktis untuk Guru
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-normal font-sans">
            Panduan praktis dan sumber daya baru langsung ke inbox Anda. Bebas spam, dapat berhenti kapan saja.
          </p>

          {subscribed ? (
            <div className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-emerald-950/90 border border-emerald-800 text-emerald-300 rounded-xl text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Terima kasih! Email Anda telah terdaftar.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email guru Anda..."
                  required
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                type="submit"
                className="btn-primary min-h-[44px] px-6 py-2.5 font-bold text-sm rounded-xl shrink-0"
              >
                <span>Langganan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </section>

    </div>
  );
};
