import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, Clock, Loader2 } from 'lucide-react';
import { Article } from '../data/content';
import { contentService } from '../services/contentService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle: (article: Article) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectArticle,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const articles = await contentService.searchArticles(query);
      setResults(articles);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const suggestedTopics = ['ChatGPT', 'Modul Ajar', 'Canva', 'Rubrik', 'Spreadsheet', 'Google Classroom'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari tutorial AI, prompt modul ajar, tools..."
            autoFocus
            className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-hidden font-medium"
          />
          {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
          {query && !loading && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-200 hover:bg-slate-300 rounded-md">
            ESC
          </button>
        </div>

        {/* Results / Empty State */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {query.trim() === '' ? (
            <div className="py-6 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Topik Pencarian Populer:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setQuery(topic)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Menampilkan {results.length} hasil pencarian untuk "{query}":
              </p>
              {results.map((art) => (
                <div
                  key={art.id}
                  onClick={() => {
                    onSelectArticle(art);
                    onClose();
                  }}
                  className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-start justify-between gap-3 group border border-transparent hover:border-slate-200"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-heading">
                      {art.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{art.excerpt}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{art.readingTime}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada artikel yang cocok</p>
              <p className="text-xs text-slate-500">Coba kata kunci lain seperti 'ChatGPT', 'Canva', atau 'Modul Ajar'</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
