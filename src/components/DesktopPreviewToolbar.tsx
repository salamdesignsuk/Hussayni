import React, { useState, useEffect } from 'react';
import { 
  Type, 
  MoveVertical, 
  ZoomIn, 
  Sun, 
  Moon, 
  Minus, 
  Plus, 
  Printer,
  X,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  useEffect(() => {
    if (activePopup === 'none') return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.preview-toolbar-item') && !target.closest('.preview-adjuster')) {
        setActivePopup('none');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activePopup]);

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

  const currentZoom = isHeaderMode 
    ? (preferences.zoomH !== undefined ? preferences.zoomH : preferences.zoom)
    : (preferences.zoomP !== undefined ? preferences.zoomP : preferences.zoom);

  const handleZoomChange = (delta: number) => {
    setPreferences(p => {
      if (p.outputMode === 'H') {
        const curZoom = p.zoomH !== undefined ? p.zoomH : p.zoom;
        const newZoom = Math.min(150, Math.max(20, curZoom + delta * 10));
        return { ...p, zoomH: newZoom };
      } else {
        const curZoom = p.zoomP !== undefined ? p.zoomP : p.zoom;
        const newZoom = Math.min(150, Math.max(20, curZoom + delta * 10));
        return { ...p, zoomP: newZoom };
      }
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

  const zoomBtnValue = `${currentZoom}%`;

  const renderVerticalAdjuster = (
    popupKey: ActivePopup,
    onIncrease: () => void,
    onDecrease: () => void,
    displayValue: string
  ) => {
    return (
      <AnimatePresence>
        {activePopup === popupKey && (
          <motion.div
            key={popupKey}
            initial={{ opacity: 0, x: 12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="preview-adjuster absolute right-[calc(100%+24px)] top-1/2 -translate-y-1/2 flex flex-col items-center bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 w-11 select-none shadow-2xl z-50 shrink-0 gap-1.5"
          >
            <button
              type="button"
              onClick={onIncrease}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-90 active:bg-emerald-500 active:text-slate-950 text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/80"
              title="Increase"
            >
              <Plus size={13} />
            </button>

            <div className="w-full py-1 text-center select-none">
              <span className="text-[10px] font-black text-emerald-400 tracking-tight leading-none block whitespace-nowrap">
                {displayValue}
              </span>
            </div>

            <button
              type="button"
              onClick={onDecrease}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-90 active:bg-emerald-500 active:text-slate-950 text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/80"
              title="Decrease"
            >
              <Minus size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col items-center gap-3 bg-slate-900/95 text-white p-3 rounded-2xl border border-slate-700/90 shadow-2xl backdrop-blur-md z-40 select-none print:hidden">
      
      {/* 1. OUTPUT MODE SWITCH (H / P) AS A VERTICAL SLIDING PILL */}
      <div className="bg-slate-950/60 p-1 rounded-2xl border border-slate-700/80 flex flex-col items-center gap-1 shadow-md select-none">
        <button
          type="button"
          onClick={() => setPreferences(p => ({ ...p, outputMode: 'H' }))}
          className="relative w-9 h-11 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden"
          title="Switch to Header Mode"
        >
          {preferences.outputMode === 'H' && (
            <motion.div
              layoutId="desktopActiveModeBg"
              className="absolute inset-0 bg-emerald-500 z-0 rounded-xl"
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
            <Type size={13} className={preferences.outputMode === 'H' ? 'text-slate-950' : 'text-emerald-400'} />
            <span className={`text-[10px] font-black leading-none ${
              preferences.outputMode === 'H' ? 'text-slate-950' : 'text-slate-300'
            }`}>
              H
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setPreferences(p => ({ ...p, outputMode: 'P' }))}
          className="relative w-9 h-11 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden"
          title="Switch to Poem Mode"
        >
          {preferences.outputMode === 'P' && (
            <motion.div
              layoutId="desktopActiveModeBg"
              className="absolute inset-0 bg-emerald-500 z-0 rounded-xl"
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
            <FileText size={13} className={preferences.outputMode === 'P' ? 'text-slate-950' : 'text-emerald-400'} />
            <span className={`text-[10px] font-black leading-none ${
              preferences.outputMode === 'P' ? 'text-slate-950' : 'text-slate-300'
            }`}>
              P
            </span>
          </div>
        </button>
      </div>

      <div className="w-7 h-px bg-slate-800 my-0.5"></div>

      {/* 2. MIN FONT SIZE BUTTON (Paragraph Mode Only) */}
      {!isHeaderMode && (
        <div className="relative preview-toolbar-item">
          <button
            type="button"
            onClick={() => togglePopup('minSize')}
            className={`relative w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md border overflow-hidden ${
              activePopup === 'minSize'
                ? 'border-emerald-400 scale-105'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/80'
            }`}
            title="Min Paragraph Font Size"
          >
            <AnimatePresence>
              {activePopup === 'minSize' && (
                <motion.div
                  layoutId="desktopActivePreviewPopupBg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-emerald-500 z-0"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </AnimatePresence>
            <Type size={13} className={`relative z-10 transition-colors duration-150 ${activePopup === 'minSize' ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span className={`relative z-10 text-[9px] font-black transition-colors duration-150 leading-none mt-0.5 ${activePopup === 'minSize' ? 'text-slate-950' : 'text-slate-200'}`}>
              {minSizeBtnValue}
            </span>
          </button>
          {renderVerticalAdjuster('minSize', () => handleMinSizeChange(1), () => handleMinSizeChange(-1), `${minSizeBtnValue}px`)}
        </div>
      )}

      {/* 3. MAIN / MAX FONT SIZE BUTTON */}
      <div className="relative preview-toolbar-item">
        <button
          type="button"
          onClick={() => togglePopup('size')}
          className={`relative w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md border overflow-hidden ${
            activePopup === 'size'
              ? 'border-emerald-400 scale-105'
              : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/80'
          }`}
          title={isHeaderMode ? 'Header Font Size' : 'Max Paragraph Font Size'}
        >
          <AnimatePresence>
            {activePopup === 'size' && (
              <motion.div
                layoutId="desktopActivePreviewPopupBg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-500 z-0"
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              />
            )}
          </AnimatePresence>
          <Type size={16} className={`relative z-10 transition-colors duration-150 ${activePopup === 'size' ? 'text-slate-950' : 'text-emerald-400'}`} />
          <span className={`relative z-10 text-[9px] font-black transition-colors duration-150 leading-none mt-0.5 ${activePopup === 'size' ? 'text-slate-950' : 'text-slate-200'}`}>
            {sizeBtnValue}
          </span>
        </button>
        {renderVerticalAdjuster('size', () => handleSizeChange(1), () => handleSizeChange(-1), `${sizeBtnValue}px`)}
      </div>

      {/* 4. SPACING BUTTON */}
      <div className="relative preview-toolbar-item">
        <button
          type="button"
          onClick={() => togglePopup('spacing')}
          className={`relative w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md border overflow-hidden ${
            activePopup === 'spacing'
              ? 'border-emerald-400 scale-105'
              : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/80'
          }`}
          title="Spacing Settings"
        >
          <AnimatePresence>
            {activePopup === 'spacing' && (
              <motion.div
                layoutId="desktopActivePreviewPopupBg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-500 z-0"
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              />
            )}
          </AnimatePresence>
          <MoveVertical size={14} className={`relative z-10 transition-colors duration-150 ${activePopup === 'spacing' ? 'text-slate-950' : 'text-emerald-400'}`} />
          <span className={`relative z-10 text-[8px] font-black transition-colors duration-150 leading-none mt-0.5 truncate max-w-[38px] ${activePopup === 'spacing' ? 'text-slate-950' : 'text-slate-200'}`}>
            {spacingBtnValue}
          </span>
        </button>
        {renderVerticalAdjuster('spacing', () => handleSpacingChange(1), () => handleSpacingChange(-1), spacingBtnValue)}
      </div>

      {/* 5. ZOOM BUTTON */}
      <div className="relative preview-toolbar-item">
        <button
          type="button"
          onClick={() => togglePopup('zoom')}
          className={`relative w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md border overflow-hidden ${
            activePopup === 'zoom'
              ? 'border-emerald-400 scale-105'
              : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/80'
          }`}
          title="Zoom Level"
        >
          <AnimatePresence>
            {activePopup === 'zoom' && (
              <motion.div
                layoutId="desktopActivePreviewPopupBg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-500 z-0"
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              />
            )}
          </AnimatePresence>
          <ZoomIn size={14} className={`relative z-10 transition-colors duration-150 ${activePopup === 'zoom' ? 'text-slate-950' : 'text-emerald-400'}`} />
          <span className={`relative z-10 text-[9px] font-black transition-colors duration-150 leading-none mt-0.5 ${activePopup === 'zoom' ? 'text-slate-950' : 'text-slate-200'}`}>
            {zoomBtnValue}
          </span>
        </button>
        {renderVerticalAdjuster('zoom', () => handleZoomChange(1), () => handleZoomChange(-1), zoomBtnValue)}
      </div>

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
        <Download size={18} className="text-emerald-400" />
        <span className="text-[9px] font-bold tracking-tighter">Export</span>
      </button>

    </div>
  );
};
