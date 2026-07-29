import React, { useState } from 'react';
import { 
  Type, 
  MoveVertical, 
  ZoomIn, 
  Sun, 
  Moon, 
  Minus, 
  Plus, 
  Printer,
  X
} from 'lucide-react';
import { UserPreferences } from '../utils/documentModel';

interface DesktopPreviewToolbarProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  onOpenExport: () => void;
}

type ActivePopup = 'none' | 'minSize' | 'size' | 'spacing' | 'zoom';

export const DesktopPreviewToolbar: React.FC<DesktopPreviewToolbarProps> = ({
  preferences,
  setPreferences,
  onOpenExport
}) => {
  const [activePopup, setActivePopup] = useState<ActivePopup>('none');

  const togglePopup = (popup: ActivePopup) => {
    setActivePopup(prev => prev === popup ? 'none' : popup);
  };

  const isHeaderMode = preferences.outputMode === 'H';
  const isDarkHeaderTheme = preferences.headerTheme !== 'light';

  // Toggle Header Theme (Light / Dark)
  const handleToggleHeaderTheme = () => {
    setPreferences(p => ({
      ...p,
      headerTheme: p.headerTheme === 'light' ? 'dark' : 'light'
    }));
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

  // Display values
  const minSizeBtnValue = `${preferences.minFontSize || 16}`;
  const sizeBtnValue = isHeaderMode 
    ? `${preferences.headerFontSize || 145}` 
    : `${preferences.maxFontSize || 26}`;

  const spacingBtnValue = isHeaderMode 
    ? `${(preferences.headerLineSpacing || 1.2).toFixed(1)}x` 
    : (preferences.paragraphSpacing === 'compact' ? 'Compact' : preferences.paragraphSpacing === 'relaxed' ? 'Relaxed' : 'Normal');

  const zoomBtnValue = `${preferences.zoom}%`;

  return (
    <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col items-center gap-3 bg-slate-900/95 text-white p-3 rounded-2xl border border-slate-700/90 shadow-2xl backdrop-blur-md z-40 select-none print:hidden">
      
      {/* FLOATING POPUP TO THE LEFT OF TOOLBAR */}
      {activePopup !== 'none' && (
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 w-72 bg-slate-900/98 border border-slate-700/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-slate-100 animate-fade-in z-50">
          
          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              {activePopup === 'minSize' && <Type size={16} className="text-emerald-400" />}
              {activePopup === 'size' && <Type size={16} className="text-emerald-400" />}
              {activePopup === 'spacing' && <MoveVertical size={16} className="text-emerald-400" />}
              {activePopup === 'zoom' && <ZoomIn size={16} className="text-emerald-400" />}
              <span className="font-bold text-xs text-slate-200">
                {activePopup === 'minSize' && 'Min Font Size'}
                {activePopup === 'size' && (isHeaderMode ? 'Header Font Size' : 'Max Font Size')}
                {activePopup === 'spacing' && (isHeaderMode ? 'Line Spacing' : 'Paragraph Spacing')}
                {activePopup === 'zoom' && 'Zoom Level'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActivePopup('none')}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Controls Row - Only +/- Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                if (activePopup === 'minSize') handleMinSizeChange(-1);
                if (activePopup === 'size') handleSizeChange(-1);
                if (activePopup === 'spacing') handleSpacingChange(-1);
                if (activePopup === 'zoom') handleZoomChange(-1);
              }}
              className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 active:bg-emerald-500 active:text-slate-950 text-white font-black flex items-center justify-center transition-all cursor-pointer border border-slate-700/80 shadow-md"
              title="Decrease"
            >
              <Minus size={18} />
            </button>

            <div className="px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-center min-w-[90px] shrink-0">
              <span className="text-sm font-extrabold text-emerald-400">
                {activePopup === 'minSize' && `${minSizeBtnValue} px`}
                {activePopup === 'size' && (isHeaderMode ? `${sizeBtnValue}%` : `${sizeBtnValue} px`)}
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
              className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 active:bg-emerald-500 active:text-slate-950 text-white font-black flex items-center justify-center transition-all cursor-pointer border border-slate-700/80 shadow-md"
              title="Increase"
            >
              <Plus size={18} />
            </button>
          </div>

        </div>
      )}

      {/* 1. OUTPUT MODE SWITCH (H / P) */}
      <button
        type="button"
        onClick={() => setPreferences(p => ({ ...p, outputMode: p.outputMode === 'H' ? 'P' : 'H' }))}
        className="w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 group"
        title="Toggle Output Mode (Header vs Poem)"
      >
        <span className="text-sm font-black text-emerald-400 group-hover:text-emerald-300">
          {preferences.outputMode}
        </span>
        <span className="text-[9px] font-bold text-slate-400 tracking-tighter uppercase">
          {isHeaderMode ? 'Header' : 'Poem'}
        </span>
      </button>

      <div className="w-7 h-px bg-slate-800 my-0.5"></div>

      {/* 2. MIN FONT SIZE BUTTON (Paragraph Mode Only) */}
      {!isHeaderMode && (
        <button
          type="button"
          onClick={() => togglePopup('minSize')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md border ${
            activePopup === 'minSize'
              ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 scale-105'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80'
          }`}
          title="Min Paragraph Font Size"
        >
          <Type size={14} className={activePopup === 'minSize' ? 'text-slate-950' : 'text-emerald-400'} />
          <span className="text-[10px] font-extrabold">{minSizeBtnValue}</span>
        </button>
      )}

      {/* 3. MAIN / MAX FONT SIZE BUTTON */}
      <button
        type="button"
        onClick={() => togglePopup('size')}
        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md border ${
          activePopup === 'size'
            ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 scale-105'
            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80'
        }`}
        title={isHeaderMode ? 'Header Font Size' : 'Max Paragraph Font Size'}
      >
        <Type size={18} className={activePopup === 'size' ? 'text-slate-950' : 'text-emerald-400'} />
        <span className="text-[10px] font-extrabold">{sizeBtnValue}</span>
      </button>

      {/* 4. SPACING BUTTON */}
      <button
        type="button"
        onClick={() => togglePopup('spacing')}
        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md border ${
          activePopup === 'spacing'
            ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 scale-105'
            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80'
        }`}
        title="Spacing Settings"
      >
        <MoveVertical size={16} className={activePopup === 'spacing' ? 'text-slate-950' : 'text-emerald-400'} />
        <span className="text-[10px] font-extrabold truncate max-w-[38px]">{spacingBtnValue}</span>
      </button>

      {/* 5. ZOOM BUTTON */}
      <button
        type="button"
        onClick={() => togglePopup('zoom')}
        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md border ${
          activePopup === 'zoom'
            ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 scale-105'
            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80'
        }`}
        title="Zoom Level"
      >
        <ZoomIn size={16} className={activePopup === 'zoom' ? 'text-slate-950' : 'text-emerald-400'} />
        <span className="text-[10px] font-extrabold">{zoomBtnValue}</span>
      </button>

      <div className="w-7 h-px bg-slate-800 my-0.5"></div>

      {/* 6. LIGHT / DARK THEME BUTTON (ONLY in H mode!) */}
      {isHeaderMode && (
        <button
          type="button"
          onClick={handleToggleHeaderTheme}
          className="w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-md"
          title="Toggle Header Light / Dark Mode"
        >
          {isDarkHeaderTheme ? (
            <>
              <Moon size={16} className="text-amber-400" />
              <span className="text-[9px] font-bold text-amber-300">Dark</span>
            </>
          ) : (
            <>
              <Sun size={16} className="text-amber-400" />
              <span className="text-[9px] font-bold text-amber-300">Light</span>
            </>
          )}
        </button>
      )}

      {/* 7. PRINT / EXPORT BUTTON (Opens Export Modal) */}
      <button
        type="button"
        onClick={onOpenExport}
        className="w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-md hover:text-emerald-400"
        title="Export & Print Document"
      >
        <Printer size={18} />
        <span className="text-[9px] font-bold tracking-tighter">Export</span>
      </button>

    </div>
  );
};
