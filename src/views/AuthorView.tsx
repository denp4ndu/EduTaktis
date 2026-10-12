import React from 'react';
import { Author, ARTICLES, Article } from '../data/content';
import { Breadcrumb } from '../components/Breadcrumb';
import { ArticleCard } from '../components/ArticleCard';
import { Youtube, Linkedin, Twitter, BookOpen } from 'lucide-react';

interface AuthorViewProps {
  author: Author;
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (slug: string) => void;
  onGoHome: () => void;
}

export const AuthorView: React.FC<AuthorViewProps> = ({
  author,
  onSelectArticle,
  onSelectCategory,
  onGoHome,
}) => {
  const articles = ARTICLES.filter((a) => a.authorId === author.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      
      <Breadcrumb
        items={[
          { label: 'Beranda', onClick: onGoHome },
          { label: `Penulis: ${author.name}`, active: true },
        ]}
      />

      {/* Author Header */}
      <header className="p-8 sm:p-10 bg-white border border-slate-200 rounded-3xl shadow-xs flex flex-col sm:flex-row items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-md">
          {author.avatar}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">
                Profil Penulis EduTaktis
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {author.name}
              </h1>
            </div>

            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg self-start sm:self-auto">
              {author.role}
            </span>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
            {author.bio}
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <BookOpen className="w-4 h-4 text-blue-600" />
              {articles.length} Artikel Dipublikasikan
            </span>

            <div className="flex items-center gap-2">
              {author.socials.youtube && (
                <a href={author.socials.youtube} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-red-600">
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {author.socials.linkedin && (
                <a href={author.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Articles Published by Author */}
      <section className="space-y-6">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Artikel Oleh {author.name}
        </h2>

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
      </section>

    </div>
  );
};
