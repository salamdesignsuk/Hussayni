import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, ExternalLink, Download, ChevronDown, Minus, Plus } from 'lucide-react';
import { ParsedPage, RecentDocument, UserPreferences } from '../utils/documentModel';
import { A4Page } from '../utils/renderer';

interface PoemPreviewScreenProps {
  doc: RecentDocument;
  pages: ParsedPage[];
  preferences: UserPreferences;
  onClose: () => void;
  onOpenInEditor: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
}

const MIN_ZOOM = 20;
const MAX_ZOOM = 150;

export const PoemPreviewScreen: React.FC<PoemPreviewScreenProps> = ({
  doc,
  pages,
  preferences,
  onClose,
  onOpenInEditor,
  onExportDocx,
  onExportPdf,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);
  const fittedForDocId = useRef<string | null>(null);

  // Printing this screen must hide the rest of the app (see the matching
  // `body.hussayni-library-print main` rule in index.css) since it renders
  // outside <main> and isn't covered by the app's existing print stylesheet.
  useEffect(() => {
    document.body.classList.add('hussayni-library-print');
    return () => {
      document.body.classList.remove('hussayni-library-print');
    };
  }, []);

  // Default to fitting the page width to the available screen width, once per poem opened.
  useLayoutEffect(() => {
    if (pages.length === 0 || fittedForDocId.current === doc.id) return;
    const containerEl = containerRef.current;
    const pageEl = containerEl?.querySelector('.page') as HTMLElement | null;
    if (!containerEl || !pageEl) return;

    const containerWidth = containerEl.clientWidth - 48;
    const naturalPageWidth = pageEl.getBoundingClientRect().width / (zoom / 100);
    if (containerWidth > 0 && naturalPageWidth > 0) {
      const fitZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((containerWidth / naturalPageWidth) * 100)));
      setZoom(fitZoom);
    }
    fittedForDocId.current = doc.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, pages]);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-200 flex flex-col print:static print:inset-auto print:h-auto print:overflow-visible print:bg-white">
      {/* Top bar */}
      <div className="h-14 shrink-0 flex items-center justify-between px-3 sm:px-6 bg-slate-900 shadow-md print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 cursor-pointer shrink-0"
            title="Back to Library"
          >
            <X size={18} />
          </button>
          <h1 className="text-white font-mono font-bold text-sm truncate">{doc.name}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenInEditor}
            className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink size={14} className="text-blue-400" />
            <span className="hidden sm:inline">Open in Editor</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute top-full right-0 mt-1.5 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-1 z-10 select-none">
                <button
                  onClick={() => { setShowExportMenu(false); onExportDocx(); }}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-md text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Word (.docx)
                </button>
                <button
                  onClick={() => { setShowExportMenu(false); onExportPdf(); }}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-md text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  PDF (Print)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Read-only page preview, reusing the same A4Page/print CSS as the live editor */}
      <div ref={containerRef} className="flex-1 overflow-auto py-6 print:p-0 print:overflow-visible">
        <div
          className="flex flex-col items-center gap-6 print:gap-0"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          {pages.map((page) => (
            <A4Page
              key={page.pageNumber}
              page={page}
              totalPages={pages.length}
              leftFooterText={doc.leftFooter}
              rightFooterText={doc.rightFooter}
              showPageNumber={preferences.showPageNumber !== false}
              footerFontSize={preferences.footerFontSize || 14}
              useArabicNumerals={preferences.useArabicNumerals}
              paragraphSpacing={preferences.paragraphSpacing}
            />
          ))}
        </div>
      </div>

      {/* Zoom pill, matching the main editor's preview zoom control */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 text-white p-1 rounded-full flex items-center gap-1.5 shadow-2xl select-none print:hidden">
        <button
          onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 10))}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-90 active:bg-emerald-500 active:text-slate-950 flex items-center justify-center transition-all cursor-pointer"
          title="Zoom out"
        >
          <Minus size={15} />
        </button>
        <div className="px-1 min-w-[52px] h-8 flex items-center justify-center text-center">
          <span className="text-[13px] font-black text-emerald-400 tracking-tight leading-none">{zoom}%</span>
        </div>
        <button
          onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 10))}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-90 active:bg-emerald-500 active:text-slate-950 flex items-center justify-center transition-all cursor-pointer"
          title="Zoom in"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
};
