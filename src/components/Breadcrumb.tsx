import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 my-4 flex-wrap">
      <button
        onClick={items[0]?.onClick}
        className="flex items-center gap-1 hover:text-blue-600 transition-colors focus:outline-hidden"
      >
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>Beranda</span>
      </button>

      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          {item.active ? (
            <span className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md" aria-current="page">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="hover:text-blue-600 transition-colors focus:outline-hidden"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
