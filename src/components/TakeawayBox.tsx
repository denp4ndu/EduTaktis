import React, { useState } from 'react';
import { CheckCircle, Download, FileText, Sparkles } from 'lucide-react';

interface TakeawayBoxProps {
  summary: string;
  points: string[];
  downloadLink?: string;
  downloadTitle?: string;
}

export const TakeawayBox: React.FC<TakeawayBoxProps> = ({
  summary,
  points,
  downloadLink,
  downloadTitle,
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="my-8 p-6 bg-teal-50/70 border-l-4 border-teal-500 rounded-r-2xl border-y border-r border-teal-100 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-teal-950 uppercase tracking-wider">
          Ringkasan Praktis (Practical Takeaway)
        </h3>
      </div>

      <p className="text-sm font-medium text-teal-900 leading-relaxed mb-4">
        {summary}
      </p>

      <ul className="space-y-2 mb-5">
        {points.map((pt, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-xs text-teal-800 leading-relaxed">
            <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <span>{pt}</span>
          </li>
        ))}
      </ul>

      {downloadTitle && (
        <div className="pt-4 border-t border-teal-200/80 flex flex-col sm:flex-row items-sm-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-900">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>{downloadTitle}</span>
          </div>

          <button
            onClick={handleDownload}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloaded ? 'Mengunduh File...' : 'Download Template'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
