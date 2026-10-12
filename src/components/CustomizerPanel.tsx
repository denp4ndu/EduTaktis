import React from 'react';
import { Monitor, Tablet, Smartphone, Palette, Sliders, X, Code, Download, Check } from 'lucide-react';
import { downloadWPThemeZip } from '../utils/wpThemeGenerator';

interface CustomizerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  setViewport: (v: 'desktop' | 'tablet' | 'mobile') => void;
  colorTheme: 'default' | 'ocean' | 'forest';
  setColorTheme: (c: 'default' | 'ocean' | 'forest') => void;
  fontScale: 'normal' | 'large';
  setFontScale: (f: 'normal' | 'large') => void;
  onOpenExporter: () => void;
}

export const CustomizerPanel: React.FC<CustomizerPanelProps> = ({
  isOpen,
  onClose,
  viewport,
  setViewport,
  colorTheme,
  setColorTheme,
  fontScale,
  setFontScale,
  onOpenExporter,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-slate-200 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-900">Customizer Tema WP</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Frame Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Pratinjau Perangkat (Responsive)
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setViewport('desktop')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-colors ${
                viewport === 'desktop' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Desktop</span>
            </button>

            <button
              onClick={() => setViewport('tablet')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-colors ${
                viewport === 'tablet' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tablet className="w-4 h-4" />
              <span>Tablet</span>
            </button>

            <button
              onClick={() => setViewport('mobile')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-colors ${
                viewport === 'mobile' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Color Palette Switcher */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Aksen Warna Tema
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setColorTheme('default')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs font-medium transition-all ${
                colorTheme === 'default'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block" />
                <span>EduTaktis Royal Blue (Default)</span>
              </div>
              {colorTheme === 'default' && <Check className="w-4 h-4 text-blue-600" />}
            </button>

            <button
              onClick={() => setColorTheme('ocean')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs font-medium transition-all ${
                colorTheme === 'ocean'
                  ? 'border-teal-600 bg-teal-50/50 text-teal-900 font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-teal-600 inline-block" />
                <span>Teal &amp; Ocean Professional</span>
              </div>
              {colorTheme === 'ocean' && <Check className="w-4 h-4 text-teal-600" />}
            </button>
          </div>
        </div>

        {/* Typography Size Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Ukuran Teks Bacaan
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFontScale('normal')}
              className={`py-2 text-xs font-semibold rounded-lg border ${
                fontScale === 'normal'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Standar (16px)
            </button>
            <button
              onClick={() => setFontScale('large')}
              className={`py-2 text-xs font-semibold rounded-lg border ${
                fontScale === 'large'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Besar (18px)
            </button>
          </div>
        </div>
      </div>

      {/* Exporter Section */}
      <div className="pt-6 border-t border-slate-200 space-y-2">
        <button
          onClick={() => {
            downloadWPThemeZip();
          }}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download edutaktis-theme.zip</span>
        </button>

        <button
          onClick={() => {
            onOpenExporter();
            onClose();
          }}
          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Code className="w-4 h-4 text-blue-600" />
          <span>Inspeksi Kode PHP Tema</span>
        </button>
      </div>
    </div>
  );
};
