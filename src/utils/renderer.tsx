import React from 'react';
import { Download } from 'lucide-react';
import { ParsedPage } from './documentModel';
import { exportSingleHeaderImage } from './imageExporter';

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
              className="font-bold text-black text-center shrink-0 w-full" 
              style={{ 
                fontSize: `${page.fontSize}pt`, 
                lineHeight: 1.3, 
                margin: 0, 
                padding: 0 
              }}
            >
              <span className="hussayni-line-span-render" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                {lineText.trim() === '' ? '\u00A0' : lineText}
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
                  className="text-black text-center"
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
                  className="font-bold text-black text-center pt-1 w-full mx-auto"
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

export interface HeaderOnlyPageProps {
  headerText: string;
  headerIndex: number;
  totalHeaders: number;
  fontSize: number;
  lineSpacing: number;
  theme?: 'dark' | 'light';
  docName?: string;
}

export const HeaderOnlyPage: React.FC<HeaderOnlyPageProps> = ({
  headerText,
  headerIndex,
  totalHeaders,
  fontSize,
  lineSpacing,
  theme = 'dark',
  docName = 'Header_Slide'
}) => {
  const isLight = theme === 'light';
  const bgColor = isLight ? '#ffffff' : '#000000';
  const textColor = isLight ? '#000000' : '#ffffff';
  const themeClass = isLight ? 'header-light' : 'header-dark';
  const borderColor = isLight ? 'border-slate-300' : 'border-zinc-800';
  const badgeClass = isLight 
    ? 'bg-slate-100/90 text-slate-700 border-slate-300' 
    : 'bg-zinc-900/90 text-zinc-300 border-zinc-700';
  const h1TextClass = isLight
    ? 'font-extrabold text-black text-center w-full leading-tight tracking-normal'
    : 'font-extrabold text-white text-center w-full leading-tight drop-shadow-md tracking-normal';

  return (
    <div 
      className={`header-page ${themeClass} select-text transition-all duration-200 shadow-2xl border ${borderColor}`}
      style={{
        width: '1920px',
        height: '1080px',
        backgroundColor: bgColor,
        color: textColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '80px 120px',
        boxSizing: 'border-box',
        direction: 'rtl',
        position: 'relative',
        fontFamily: 'Arial, "Traditional Arabic", sans-serif',
      }}
      dir="rtl"
    >
      {/* Decorative Slide Badge & Export Action Buttons (hidden when printing) */}
      <div className="absolute top-8 left-12 flex items-center gap-3 print:hidden select-none z-10">
        <span className={`text-base font-bold border px-5 py-2.5 rounded-full ${badgeClass}`}>
          1920 × 1080 • Slide {headerIndex + 1} of {totalHeaders}
        </span>
        <button
          onClick={() => exportSingleHeaderImage(headerText, headerIndex, { headers: [headerText], fontSize, lineSpacing, theme, format: 'png', docName })}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-full text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
          title="Export Slide as PNG Image"
        >
          <Download size={15} />
          <span>PNG</span>
        </button>
        <button
          onClick={() => exportSingleHeaderImage(headerText, headerIndex, { headers: [headerText], fontSize, lineSpacing, theme, format: 'jpg', docName })}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2.5 rounded-full text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
          title="Export Slide as JPG Image"
        >
          <Download size={15} />
          <span>JPG</span>
        </button>
      </div>

      {/* Header Display Content */}
      <div className="w-full h-full flex flex-col justify-center items-center text-center">
        {headerText.split('\n').map((lineText, idx) => (
          <h1 
            key={idx}
            className={h1TextClass}
            style={{ 
              fontSize: `${fontSize}px`, 
              lineHeight: lineSpacing,
              minHeight: `${fontSize * lineSpacing}px`,
              margin: 0, 
              padding: 0,
              unicodeBidi: 'plaintext'
            }}
          >
            {lineText.trim() === '' ? '\u00A0' : lineText}
          </h1>
        ))}
      </div>
    </div>
  );
};

export interface HeaderOnlyRendererProps {
  headers: string[];
  fontSize: number;
  lineSpacing: number;
  zoom: number;
  theme?: 'dark' | 'light';
  docName?: string;
}

export const HeaderOnlyRenderer: React.FC<HeaderOnlyRendererProps> = ({
  headers,
  fontSize,
  lineSpacing,
  zoom,
  theme = 'dark',
  docName = 'Header_Slide'
}) => {
  const displayHeaders = headers.length > 0 ? headers : ['عنوان القصيدة'];
  const baseScale = 0.42;
  const effectiveScale = baseScale * (zoom / 100);

  const scaledWidth = 1920 * effectiveScale;
  const scaledHeight = 1080 * effectiveScale;

  return (
    <div 
      id="print-container"
      className="flex flex-col items-center print:gap-0 max-w-full py-2"
    >
      {displayHeaders.map((headerText, index) => (
        <div
          key={index}
          className="relative flex justify-center mb-8 last:mb-0 print:mb-0 print:w-[1920px] print:h-[1080px]"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        >
          <div
            style={{
              width: '1920px',
              height: '1080px',
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            className="print:static print:transform-none"
          >
            <HeaderOnlyPage
              headerText={headerText}
              headerIndex={index}
              totalHeaders={displayHeaders.length}
              fontSize={fontSize}
              lineSpacing={lineSpacing}
              theme={theme}
              docName={docName}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

