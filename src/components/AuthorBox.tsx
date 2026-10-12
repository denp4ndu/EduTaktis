import React from 'react';
import { Youtube, Linkedin, Twitter, Globe, BookOpen } from 'lucide-react';
import { Author } from '../data/content';

interface AuthorBoxProps {
  author: Author;
  onSelectAuthor?: (authorId: string) => void;
}

export const AuthorBox: React.FC<AuthorBoxProps> = ({ author, onSelectAuthor }) => {
  return (
    <div className="mt-12 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start gap-5">
      <div 
        onClick={() => onSelectAuthor && onSelectAuthor(author.id)}
        className="w-16 h-16 rounded-full bg-blue-600 text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:bg-blue-700 transition-colors"
      >
        {author.avatar}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 
              onClick={() => onSelectAuthor && onSelectAuthor(author.id)}
              className="text-base font-extrabold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
            >
              {author.name}
            </h4>
            <p className="text-xs font-medium text-slate-500">{author.role}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>{author.articlesCount} Artikel Ditulis</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {author.bio}
        </p>

        <div className="pt-2 flex items-center gap-3">
          {author.socials.youtube && (
            <a href={author.socials.youtube} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
              <Youtube className="w-4 h-4" />
            </a>
          )}
          {author.socials.linkedin && (
            <a href={author.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
          )}
          {author.socials.twitter && (
            <a href={author.socials.twitter} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-sky-500 transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
