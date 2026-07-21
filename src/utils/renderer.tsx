import React from 'react';
import { ParsedPage } from './documentModel';

interface A4PageProps {
  page: ParsedPage;
  totalPages: number;
  showDebug?: boolean;
  leftFooterText?: string;
  rightFooterText?: string;
  showPageNumber?: boolean;
  footerFontSize?: number;
}

/**
 * A standard A4 Portrait Page component.
 * Uses exact CSS dimensions and layout properties to ensure perfect rendering parity.
 */
export const A4Page: React.FC<A4PageProps> = ({ 
  page, 
  totalPages, 
  showDebug = false, 
  leftFooterText = '', 
  rightFooterText = '',
  showPageNumber = true,
  footerFontSize = 14
}) => {
  const [debugInfo, setDebugInfo] = React.useState({
    remainingHeightMm: 0,
    hasHorizontalOverflow: false,
  });

  const printableRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!printableRef.current) return;
    const el = printableRef.current;
    
    const clientH = el.clientHeight;
    const clientW = el.clientWidth;
    const scrollH = el.scrollHeight;
    
    // Remaining vertical height in pixels
    const remainingPx = Math.max(0, clientH - scrollH);
    
    // Convert pixels to mm (clientH corresponds to 271.6 mm printable area height)
    const pxToMm = 271.6 / clientH;
    const remainingMm = Math.round(remainingPx * pxToMm * 10) / 10;

    // Detect horizontal overflow of any rendered spans
    let hzOverflow = false;
    const spans = el.querySelectorAll('.hussayni-line-span-render');
    const elRect = el.getBoundingClientRect();

    for (let i = 0; i < spans.length; i++) {
      const span = spans[i] as HTMLElement;
      if (span.getBoundingClientRect().width > clientW + 0.1) {
        hzOverflow = true;
        break;
      }
      const rect = span.getBoundingClientRect();
      if (rect.right > elRect.right + 0.5 || rect.left < elRect.left - 0.5) {
        hzOverflow = true;
        break;
      }
    }

    setDebugInfo({
      remainingHeightMm: remainingMm,
      hasHorizontalOverflow: hzOverflow,
    });
  }, [page, totalPages]);

  return (
    <div 
      className="page select-text transition-all duration-200"
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: `${page.fontSize}pt`,
        direction: 'rtl'
      }}
      dir="rtl"
    >
      {/* Decorative Page Badge in editor view (hidden when printing) */}
      <span className="absolute top-2 left-2 text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded print:hidden select-none">
        A4 - {page.fontSize}pt
      </span>

      {/* Printable Area Container */}
      <div 
        ref={printableRef}
        className="printable-area"
        style={{
          outline: showDebug ? '2px dashed #ec4899' : 'none',
          outlineOffset: '-2px',
        }}
      >
        {/* Content Centered Block */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0, padding: 0 }}>
          {page.headerText && page.headerText.split('\n').map((lineText, idx) => (
            <h2 
              key={idx}
              className="font-bold text-slate-950 text-center shrink-0 w-full" 
              style={{ 
                fontSize: `${page.fontSize}pt`, 
                lineHeight: 1.3, 
                margin: 0, 
                padding: 0 
              }}
            >
              <span className="hussayni-line-span-render" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                {lineText}
              </span>
            </h2>
          ))}

          {/* 1 line break of size page.lineBreakSize between header and body */}
          {page.headerText && (
            <p 
              className="select-none text-center"
              style={{ fontSize: `${page.lineBreakSize}pt`, lineHeight: 1.3, margin: 0, padding: 0 }}
            >
              &nbsp;
            </p>
          )}

          {page.pairs.map((pair, pairIdx) => (
            <div key={pair.id} className="flex flex-col">
              {/* Space between previous footer and next body if multiple on same page */}
              {pairIdx > 0 && (
                <p 
                  className="select-none text-center"
                  style={{ fontSize: `${page.lineBreakSize}pt`, lineHeight: 1.3, margin: 0, padding: 0 }}
                >
                  &nbsp;
                </p>
              )}

              {/* Body block */}
              {pair.body.split('\n').map((lineText, idx) => (
                <p 
                  key={idx}
                  className="text-slate-800 text-center"
                  style={{ 
                    fontSize: `${page.fontSize}pt`, 
                    lineHeight: 1.3, 
                    fontWeight: 'normal', 
                    margin: 0, 
                    padding: 0 
                  }}
                >
                  <span className="hussayni-line-span-render" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {lineText}
                  </span>
                </p>
              ))}
              
              {/* 1 physical blank line between each body and footer */}
              {pair.footer && (
                <p 
                  className="select-none text-center"
                  style={{ fontSize: `${page.lineBreakSize}pt`, lineHeight: 1.3, margin: 0, padding: 0 }}
                >
                  &nbsp;
                </p>
              )}

              {/* Connected footer block */}
              {pair.footer && pair.footer.split('\n').map((lineText, idx) => (
                <p 
                  key={idx}
                  className="font-bold text-slate-900 text-center pt-1 w-full mx-auto"
                  style={{ 
                    fontSize: `${page.fontSize}pt`, 
                    lineHeight: 1.3, 
                    margin: 0 
                  }}
                >
                  <span className="hussayni-line-span-render" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {lineText}
                  </span>
                </p>
              ))}
            </div>
          ))}
        </div>
        
        {/* Page Footer Block */}
        <div 
          className="page-footer pt-2 shrink-0 border-t border-slate-100 flex items-center justify-between text-slate-500 select-none"
          style={{ fontSize: `${footerFontSize}px` }}
        >
          {/* Right Side Footer Text (placed rightmost in RTL direction) */}
          <div className="font-medium text-right max-w-[35%] truncate" dir="rtl" title={rightFooterText}>
            {rightFooterText || '\u00a0'}
          </div>

          {/* Center Page Numbers */}
          <div className="text-center tracking-wider font-semibold">
            {showPageNumber ? `${page.pageNumber} من ${totalPages}` : '\u00a0'}
          </div>

          {/* Left Side Footer Text (placed leftmost in RTL direction) */}
          <div className="font-medium text-left max-w-[35%] truncate" dir="rtl" title={leftFooterText}>
            {leftFooterText || '\u00a0'}
          </div>
        </div>
      </div>

      {/* Debug Info Overlay */}
      {showDebug && (
        <div 
          className="absolute bottom-4 left-4 right-4 bg-slate-900/95 text-slate-200 p-3 rounded-lg text-[10px] font-mono border border-pink-500/30 flex flex-wrap justify-between items-center gap-2 select-none print:hidden shadow-lg z-50"
          dir="ltr"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>PAGE:</strong> A4 Portrait (210x297mm)</span>
            <span><strong>PRINTABLE:</strong> 184.6 x 271.6 mm</span>
            <span><strong>FONT SIZE:</strong> {page.fontSize}pt</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>REMAINING SPACE:</strong> {debugInfo.remainingHeightMm}mm</span>
            <span className={debugInfo.hasHorizontalOverflow ? "text-rose-400 font-bold" : "text-emerald-400"}>
              <strong>OVERFLOW:</strong> {debugInfo.hasHorizontalOverflow ? "YES (Shrink!)" : "NO"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface DocumentRendererProps {
  pages: ParsedPage[];
  zoom: number;
  showDebug?: boolean;
  leftFooterText?: string;
  rightFooterText?: string;
  showPageNumber?: boolean;
  footerFontSize?: number;
}

/**
 * Renders the full list of A4 pages for the interactive preview or print view.
 */
export const DocumentRenderer: React.FC<DocumentRendererProps> = ({ 
  pages, 
  zoom, 
  showDebug = false, 
  leftFooterText = '', 
  rightFooterText = '',
  showPageNumber = true,
  footerFontSize = 14
}) => {
  return (
    <div 
      id="print-container"
      className="flex flex-col items-center gap-6 print:gap-0"
      style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top center',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: `${(zoom / 100) * 100}px`
      }}
    >
      {pages.map((page) => (
        <A4Page 
          key={page.pageNumber} 
          page={page} 
          totalPages={pages.length} 
          showDebug={showDebug} 
          leftFooterText={leftFooterText}
          rightFooterText={rightFooterText}
          showPageNumber={showPageNumber}
          footerFontSize={footerFontSize}
        />
      ))}
    </div>
  );
};
