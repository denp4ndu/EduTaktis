import React, { useState } from 'react';
import { Code, Download, FileCode, Check, Copy, ShieldCheck, Cpu, ArrowLeft } from 'lucide-react';
import { generateEduTaktisWPThemeFiles, downloadWPThemeZip } from '../utils/wpThemeGenerator';

interface ThemeExporterViewProps {
  onGoHome: () => void;
}

export const ThemeExporterView: React.FC<ThemeExporterViewProps> = ({ onGoHome }) => {
  const themeFiles = generateEduTaktisWPThemeFiles();
  const fileNames = Object.keys(themeFiles);
  const [activeFileName, setActiveFileName] = useState<string>(fileNames[0] || 'style.css');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const activeContent = themeFiles[activeFileName] || '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    await downloadWPThemeZip();
    setDownloading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="p-8 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950 border border-blue-800 text-teal-300 rounded-lg text-xs font-semibold uppercase tracking-wider mb-2">
              <Code className="w-3.5 h-3.5 text-teal-400" />
              <span>WordPress Theme Package Phase 05</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              EduTaktis Lightweight Custom WP Theme
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Tema WordPress resmi EduTaktis (edutaktis.com) tanpa Elementor, Divi, atau JavaScript berat.
            </p>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Memproses ZIP...' : 'Download edutaktis-theme.zip'}</span>
          </button>
        </div>

        {/* Verification Checkpoints */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Zero WP Footprints</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>XSS Escaping &amp; Sanitization</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Semantic HTML5</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Core Web Vitals Optimized</span>
          </div>
        </div>
      </div>

      {/* Code Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* File Tree Sidebar */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Struktur Berkas Tema PHP ({fileNames.length} File)
          </h3>

          <div className="space-y-1">
            {fileNames.map((fn) => (
              <button
                key={fn}
                onClick={() => setActiveFileName(fn)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-colors ${
                  activeFileName === fn
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-4 h-4 ${activeFileName === fn ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{fn}</span>
                </div>
                {fn.endsWith('.php') && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-sans">PHP</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Code View Panel */}
        <div className="lg:col-span-8 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-teal-300">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>{activeFileName}</span>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Kode Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>

          <div className="p-5 max-h-[550px] overflow-auto font-mono text-xs text-slate-200 leading-relaxed bg-slate-950">
            <pre className="whitespace-pre-wrap">{activeContent}</pre>
          </div>
        </div>

      </div>

    </div>
  );
};
