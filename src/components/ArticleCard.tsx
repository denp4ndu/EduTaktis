import React from 'react';
import { Clock, Eye, BookOpen, Sparkles } from 'lucide-react';
import { Article, CATEGORIES, AUTHORS } from '../data/content';

interface ArticleCardProps {
  article: Article;
  onSelectArticle: (article: Article) => void;
  onSelectCategory?: (categorySlug: string) => void;
  featuredLayout?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onSelectArticle,
  onSelectCategory,
  featuredLayout = false,
}) => {
  const category = CATEGORIES.find((c) => c.id === article.categoryId);
  const author = AUTHORS[article.authorId];

  if (featuredLayout) {
    return (
      <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-300 transition-all duration-200 grid grid-cols-1 lg:grid-cols-12 group shadow-2xs">
        {/* Large 16:9 Cover Thumbnail / Graphic Banner */}
        <div 
          onClick={() => onSelectArticle(article)}
          className={`lg:col-span-6 min-h-[280px] bg-gradient-to-br ${article.coverGradient.from} ${article.coverGradient.to} p-8 flex flex-col justify-between text-white cursor-pointer relative overflow-hidden`}
        >
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-xl" />
          
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-300">
              {category?.name}
            </span>
            <span className="text-xs font-mono text-white/80">{article.readingTime}</span>
          </div>

          <div className="relative z-10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs text-blue-100 font-medium max-w-sm line-clamp-2 leading-relaxed">
              {article.takeaway.summary}
            </p>
          </div>
        </div>

        {/* Content Details Column */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Unboxed Quiet Metadata Line — NO PILLS */}
            <div className="text-xs font-bold text-teal-600 tracking-wider uppercase">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (category && onSelectCategory) onSelectCategory(category.slug);
                }}
                className="hover:underline focus:outline-hidden"
              >
                {category?.name || 'Artikel'}
              </button>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-500 font-normal">Pilihan Utama</span>
            </div>

            <h2 
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight group-hover:text-blue-600 transition-colors cursor-pointer"
              onClick={() => onSelectArticle(article)}
            >
              {article.title}
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed line-clamp-3">
              {article.excerpt}
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-800">{author?.name}</span>
            <div className="flex items-center gap-2">
              <span>{article.publishedDate}</span>
              <span aria-hidden="true">·</span>
              <span>{article.readingTime}</span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all duration-200 flex flex-col h-full group shadow-2xs">
      
      {/* 16:9 Cover Thumbnail Canvas Header */}
      <div 
        onClick={() => onSelectArticle(article)}
        className={`h-44 bg-gradient-to-r ${article.coverGradient.from} ${article.coverGradient.to} p-5 flex flex-col justify-between text-white cursor-pointer relative overflow-hidden`}
      >
        <div className="flex items-center justify-between text-xs font-semibold text-teal-200 uppercase tracking-wider relative z-10">
          <span>{category?.name}</span>
          <span className="font-mono text-white/80">{article.readingTime}</span>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-200 opacity-80" />
          <span className="text-xs text-white/90 font-mono tracking-tight">edutaktis.com</span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Unboxed Quiet Metadata Line */}
          <div className="text-xs font-bold text-teal-600 tracking-wider uppercase mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (category && onSelectCategory) onSelectCategory(category.slug);
              }}
              className="hover:underline focus:outline-hidden"
            >
              {category?.name}
            </button>
          </div>

          <h3 
            onClick={() => onSelectArticle(article)}
            className="text-lg font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-2"
          >
            {article.title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-2 leading-relaxed">
            {article.excerpt}
          </p>
        </div>

        {/* Quiet Unboxed Byline */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{author?.name}</span>
          <div className="flex items-center gap-1.5">
            <span>{article.publishedDate}</span>
            <span aria-hidden="true">·</span>
            <span>{article.readingTime}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
