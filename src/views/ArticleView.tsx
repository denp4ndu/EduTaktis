import React, { useState } from 'react';
import { Clock, Calendar, Copy, Check, Sparkles, BookOpen } from 'lucide-react';
import { Article, ARTICLES, CATEGORIES, AUTHORS } from '../data/content';
import { Breadcrumb } from '../components/Breadcrumb';
import { TakeawayBox } from '../components/TakeawayBox';
import { AuthorBox } from '../components/AuthorBox';
import { ArticleCard } from '../components/ArticleCard';

interface ArticleViewProps {
  article: Article;
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (slug: string) => void;
  onSelectAuthor: (authorId: string) => void;
  onGoHome: () => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  article,
  onSelectArticle,
  onSelectCategory,
  onSelectAuthor,
  onGoHome,
}) => {
  const category = CATEGORIES.find((c) => c.id === article.categoryId);
  const author = AUTHORS[article.authorId];
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const popularArticles = ARTICLES.filter((a) => a.popular && a.id !== article.id).slice(0, 3);
  const relatedArticles = ARTICLES.filter(
    (a) => a.id !== article.id && (a.categoryId === article.categoryId || a.authorId === article.authorId)
  ).slice(0, 3);

  const handleCopyPrompt = (promptText: string, index: number) => {
    navigator.clipboard.writeText(promptText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 animate-in fade-in duration-150">
      
      {/* Breadcrumb Rail */}
      <Breadcrumb
        items={[
          { label: 'Beranda', onClick: onGoHome },
          { label: category?.name || 'Kategori', onClick: () => category && onSelectCategory(category.slug) },
          { label: article.title, active: true },
        ]}
      />

      {/* Main Article + Sidebar Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Main Article Content Column (68ch measure) */}
        <article className="lg:col-span-8 space-y-8">
          
          <header className="space-y-4 pb-6 border-b border-slate-200">
            <div className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              <button
                onClick={() => category && onSelectCategory(category.slug)}
                className="hover:underline focus:outline-hidden"
              >
                {category?.name}
              </button>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {article.title}
            </h1>

            <p className="text-base sm:text-xl text-slate-600 leading-relaxed font-normal">
              {article.excerpt}
            </p>

            {/* Quiet Unboxed Byline */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs sm:text-sm text-slate-500 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectAuthor(author.id)}
                  className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                >
                  {author?.name}
                </button>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">{author?.role}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-500">
                <span>Rilis: {article.publishedDate}</span>
                <span aria-hidden="true">·</span>
                <span>{article.readingTime}</span>
              </div>
            </div>
          </header>

          {/* Featured Graphic Hero Header (16:9 Aspect Ratio) */}
          <div className={`w-full h-64 sm:h-80 rounded-2xl bg-gradient-to-r ${article.coverGradient.from} ${article.coverGradient.to} p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden shadow-xs`}>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-300">
                EduTaktis Educational Article
              </span>
              <span className="text-xs font-mono text-white/80">{article.readingTime}</span>
            </div>

            <div className="relative z-10 space-y-2 max-w-2xl">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                {article.title}
              </h3>
              <p className="text-xs text-blue-100 font-mono">Panduan Praktis Guru Taktis</p>
            </div>
          </div>

          {/* Practical Takeaway Box ("Ringkasan Praktis") */}
          <TakeawayBox
            summary={article.takeaway.summary}
            points={article.takeaway.points}
            downloadLink={article.takeaway.downloadLink}
            downloadTitle={article.takeaway.downloadTitle}
          />

          {/* Prompts Section */}
          {article.prompts && article.prompts.length > 0 && (
            <section className="space-y-4 my-8">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>Template Prompt AI Siap Pakai</span>
              </h3>

              {article.prompts.map((p, idx) => (
                <div key={idx} className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                      {p.title}
                    </span>
                    <button
                      onClick={() => handleCopyPrompt(p.prompt, idx)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-teal-300" />
                          <span>Prompt Disalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Prompt AI</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800/80">
                    {p.prompt}
                  </pre>
                </div>
              ))}
            </section>
          )}

          {/* Main Prose Article Body (68ch Reading Measure) */}
          <div className="prose prose-slate max-w-[68ch] text-slate-800 leading-relaxed space-y-6 text-base sm:text-lg">
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>

          {/* Author Box */}
          <AuthorBox author={author} onSelectAuthor={onSelectAuthor} />

        </article>

        {/* Desktop Sidebar Column */}
        <aside className="lg:col-span-4 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              Tutorial Populer
            </h4>
            <div className="space-y-4">
              {popularArticles.map((pop) => (
                <div
                  key={pop.id}
                  onClick={() => onSelectArticle(pop)}
                  className="cursor-pointer group space-y-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <h5 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {pop.title}
                  </h5>
                  <span className="text-xs text-slate-500">{pop.readingTime}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              Kategori Pembelajaran
            </h4>
            <div className="space-y-2 text-sm">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.slug)}
                  className="block w-full text-left text-slate-700 hover:text-blue-600 font-medium py-1"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

        </aside>

      </div>

      {/* Related Articles Section */}
      {relatedArticles.length > 0 && (
        <section className="pt-12 border-t border-slate-200 space-y-6">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            Artikel Terkait Lainnya
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedArticles.map((rel) => (
              <ArticleCard
                key={rel.id}
                article={rel}
                onSelectArticle={onSelectArticle}
                onSelectCategory={onSelectCategory}
              />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
