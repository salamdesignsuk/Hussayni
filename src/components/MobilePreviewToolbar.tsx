import React, { useState, useEffect } from 'react';
import { 
  Type, 
  MoveVertical, 
  ZoomIn, 
  Sun, 
  Moon, 
  Minus, 
  Plus, 
  FileText
} from 'lucide-react';
import { UserPreferences } from '../utils/documentModel';

interface MobilePreviewToolbarProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  onPopupStateChange?: (isOpen: boolean) => void;
}

type ActivePopup = 'none' | 'minSize' | 'size' | 'spacing' | 'zoom';

export const MobilePreviewToolbar: React.FC<MobilePreviewToolbarProps> = ({
  preferences,
  setPreferences,
  onPopupStateChange
}) => {
  const [activePopup, setActivePopup] = useState<ActivePopup>('none');

  useEffect(() => {
    onPopupStateChange?.(activePopup !== 'none');
    return () => {
      onPopupStateChange?.(false);
    };
  }, [activePopup, onPopupStateChange]);

  const togglePopup = (popup: ActivePopup) => {
    setActivePopup(prev => prev === popup ? 'none' : popup);
  };

  const isHeaderMode = preferences.outputMode === 'H';
  const isDarkTheme = isHeaderMode 
    ? preferences.headerTheme !== 'light'
    : (preferences.theme === 'dark' || preferences.theme === 'slate');

  // Toggle Theme (Light / Dark)
  const handleToggleTheme = () => {
    setPreferences(p => {
      if (p.outputMode === 'H') {
        const nextHeaderTheme = p.headerTheme === 'light' ? 'dark' : 'light';
        return { ...p, headerTheme: nextHeaderTheme };
      } else {
        const nextTheme = (p.theme === 'dark' || p.theme === 'slate') ? 'classic' : 'dark';
        return { ...p, theme: nextTheme };
      }
    });
  };

  // Adjustments via +/-
  const handleMinSizeChange = (delta: number) => {
    setPreferences(p => {
      const curMin = p.minFontSize || 16;
      const curMax = p.maxFontSize || 26;
      const newMin = Math.min(curMax - 1, Math.max(8, curMin + delta));
      return { ...p, minFontSize: newMin };
    });
  };

  const handleSizeChange = (delta: number) => {
    setPreferences(p => {
      if (p.outputMode === 'H') {
        const cur = p.headerFontSize || 145;
        return { ...p, headerFontSize: Math.min(240, Math.max(30, cur + delta * 5)) };
      } else {
        const curMax = p.maxFontSize || 26;
        const curMin = p.minFontSize || 16;
        const newMax = Math.min(48, Math.max(curMin + 1, curMax + delta * 2));
        return { ...p, maxFontSize: newMax };
      }
    });
  };

  const handleSpacingChange = (delta: number) => {
    setPreferences(p => {
      if (p.outputMode === 'H') {
        const cur = p.headerLineSpacing || 1.2;
        const next = Math.min(2.5, Math.max(0.8, parseFloat((cur + delta * 0.1).toFixed(1))));
        return { ...p, headerLineSpacing: next };
      } else {
        const spacingOptions: Array<'compact' | 'normal' | 'relaxed'> = ['compact', 'normal', 'relaxed'];
        const curIdx = spacingOptions.indexOf(p.paragraphSpacing || 'normal');
        const nextIdx = Math.min(2, Math.max(0, curIdx + delta));
        return { ...p, paragraphSpacing: spacingOptions[nextIdx] };
      }
    });
  };

  const handleZoomChange = (delta: number) => {
    setPreferences(p => {
      const newZoom = Math.min(150, Math.max(20, p.zoom + delta * 10));
      return { ...p, zoom: newZoom };
    });
  };

  // Button display values
  const minSizeBtnValue = `${preferences.minFontSize || 16}`;
  const sizeBtnValue = isHeaderMode 
    ? `${preferences.headerFontSize || 145}` 
    : `${preferences.maxFontSize || 26}`;

  const spacingBtnValue = isHeaderMode 
    ? `${(preferences.headerLineSpacing || 1.2).toFixed(1)}x` 
    : (preferences.paragraphSpacing === 'compact' ? 'Compact' : preferences.paragraphSpacing === 'relaxed' ? 'Relaxed' : 'Normal');

  const zoomBtnValue = `${preferences.zoom}%`;

  return (
    <>
      {/* FLOATING PILL POPUP (MATCHING SWITCHER PILL POSITION & SIZING) */}
      {activePopup !== 'none' && (
        <div className="fixed bottom-[calc(3.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 bg-slate-900 p-1 rounded-full border border-slate-700/80 flex items-center gap-1.5 shadow-2xl select-none print:hidden animate-fade-in">
          <button
            type="button"
            onClick={() => {
              if (activePopup === 'minSize') handleMinSizeChange(-1);
              if (activePopup === 'size') handleSizeChange(-1);
              if (activePopup === 'spacing') handleSpacingChange(-1);
              if (activePopup === 'zoom') handleZoomChange(-1);
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-90 active:bg-emerald-500 active:text-slate-950 text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/80"
            title="Decrease"
          >
            <Minus size={15} />
          </button>

          <div className="px-1 min-w-[64px] h-8 flex items-center justify-center text-center">
            <span className="text-[14px] font-black text-emerald-400 tracking-tight leading-none">
              {activePopup === 'minSize' && `${minSizeBtnValue}px`}
              {activePopup === 'size' && (isHeaderMode ? `${sizeBtnValue}%` : `${sizeBtnValue}px`)}
              {activePopup === 'spacing' && spacingBtnValue}
              {activePopup === 'zoom' && zoomBtnValue}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activePopup === 'minSize') handleMinSizeChange(1);
              if (activePopup === 'size') handleSizeChange(1);
              if (activePopup === 'spacing') handleSpacingChange(1);
              if (activePopup === 'zoom') handleZoomChange(1);
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-90 active:bg-emerald-500 active:text-slate-950 text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/80"
            title="Increase"
          >
            <Plus size={15} />
          </button>
        </div>
      )}

      {/* BOTTOM MOBILE PREVIEW TOOLBAR BAR */}
      <div className="fixed bottom-0 -left-px -right-px -bottom-px z-40 bg-slate-900 border-t border-slate-800 text-slate-100 px-2.5 py-2 flex items-center justify-between pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl select-none print:hidden">
        
        {/* LEFT GROUP: Min Font Size (P mode only) & Max Font Size */}
        <div className="flex items-center gap-1.5 z-50">
          
          {/* 1A. SMALL T BUTTON FOR MIN FONT SIZE (Paragraph Mode Only) */}
          {!isHeaderMode && (
            <button
              type="button"
              onClick={() => togglePopup('minSize')}
              className={`h-8 px-2.5 rounded-xl flex items-center justify-center gap-1 border transition-all cursor-pointer shadow-sm ${
                activePopup === 'minSize'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/80'
              }`}
              title="Min Paragraph Text Size"
            >
              <Type size={12} className={activePopup === 'minSize' ? 'text-slate-950' : 'text-emerald-400'} />
              <span className="text-[13px] font-black">{minSizeBtnValue}</span>
            </button>
          )}

          {/* 1B. MAIN / MAX TEXT SIZE BUTTON */}
          <button
            type="button"
            onClick={() => togglePopup('size')}
            className={`h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
              activePopup === 'size'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/80'
            }`}
            title="Max Text Size"
          >
            <Type size={14} className={activePopup === 'size' ? 'text-slate-950' : 'text-emerald-400'} />
            <span className="text-[13px] font-black">{sizeBtnValue}</span>
          </button>
        </div>

        {/* 2. SPACING BUTTON */}
        <div className="z-50">
          <button
            type="button"
            onClick={() => togglePopup('spacing')}
            className={`h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
              activePopup === 'spacing'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/80'
            }`}
            title="Line Spacing"
          >
            <MoveVertical size={13} className={activePopup === 'spacing' ? 'text-slate-950' : 'text-emerald-400'} />
            <span className="text-[13px] font-black">{spacingBtnValue}</span>
          </button>
        </div>

        {/* 3. ZOOM BUTTON */}
        <div className="z-50">
          <button
            type="button"
            onClick={() => togglePopup('zoom')}
            className={`h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
              activePopup === 'zoom'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/80'
            }`}
            title="Zoom"
          >
            <ZoomIn size={13} className={activePopup === 'zoom' ? 'text-slate-950' : 'text-emerald-400'} />
            <span className="text-[13px] font-black">{zoomBtnValue}</span>
          </button>
        </div>

        {/* RIGHT GROUP: Dark/Light Theme Button (Header Mode Only) & H/P Switcher */}
        <div className="flex items-center gap-1.5 z-50">
          
          {/* 4. LIGHT / DARK THEME TOGGLE BUTTON (Only rendered in Header Mode) */}
          {isHeaderMode && (
            <button
              type="button"
              onClick={handleToggleTheme}
              className="h-8 px-2.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Toggle Light / Dark Theme"
            >
              {isDarkTheme ? (
                <>
                  <Moon size={14} className="text-amber-400" />
                  <span className="text-[11px] font-bold">Dark</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-amber-400" />
                  <span className="text-[11px] font-bold">Light</span>
                </>
              )}
            </button>
          )}

          {/* 5. OUTPUT MODE SWITCHER */}
          <button
            type="button"
            onClick={() => setPreferences(p => ({ ...p, outputMode: p.outputMode === 'H' ? 'P' : 'H' }))}
            className="h-8 px-2.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
            title="Toggle Header Mode vs Full Poem Mode"
          >
            {isHeaderMode ? (
              <>
                <Type size={13} className="shrink-0 text-emerald-400" />
                <span className="text-xs font-black">H</span>
              </>
            ) : (
              <>
                <FileText size={13} className="shrink-0 text-emerald-400" />
                <span className="text-xs font-black">P</span>
              </>
            )}
          </button>
        </div>

      </div>
    </>
  );
};
