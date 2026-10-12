import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    path?: string;
    isCurrent?: boolean;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    onNavigate?: (path: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
    return (
        <nav aria-label="Breadcrumb" className="py-2.5">
            <ol className="flex items-center space-x-2 text-xs text-slate-500">
                <li className="flex items-center">
                    <button
                        type="button"
                        onClick={() => onNavigate && onNavigate('/dashboard')}
                        className="hover:text-blue-600 transition-colors flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                        aria-label="Beranda"
                    >
                        <Home className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only sm:inline-block">Beranda</span>
                    </button>
                </li>

                {items.map((item, index) => {
                    const isLast = index === items.length - 1 || item.isCurrent;

                    return (
                        <li key={`${item.label}-${index}`} className="flex items-center space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            {isLast ? (
                                <span 
                                    className="font-bold text-slate-900" 
                                    aria-current="page"
                                >
                                    {item.label}
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => item.path && onNavigate && onNavigate(item.path)}
                                    className="hover:text-blue-600 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                                >
                                    {item.label}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};
