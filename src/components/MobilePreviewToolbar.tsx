import React from 'react';
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
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences } from '../utils/documentModel';

export type ActivePopup = 'none' | 'minSize' | 'size' | 'spacing' | 'zoom';

interface MobilePreviewToolbarProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  activePopup: ActivePopup;
  setActivePopup: React.Dispatch<React.SetStateAction<ActivePopup>>;
}

export const MobilePreviewToolbar: React.FC<MobilePreviewToolbarProps> = ({
  preferences,
  setPreferences,
  activePopup,
  setActivePopup
}) => {
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
        const cur = p.paragraphSpacing || 1.0;
        const next = Math.min(2.5, Math.max(0.7, parseFloat((cur + delta * 0.1).toFixed(1))));
        return { ...p, paragraphSpacing: next };
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

  // Button display values
  const minSizeBtnValue = `${preferences.minFontSize || 16}`;
  const sizeBtnValue = isHeaderMode 
    ? `${preferences.headerFontSize || 145}` 
    : `${preferences.maxFontSize || 26}`;

  const spacingBtnValue = isHeaderMode
    ? `${(preferences.headerLineSpacing || 1.2).toFixed(1)}x`
    : `${(preferences.paragraphSpacing || 1.0).toFixed(1)}x`;

  const zoomBtnValue = `${currentZoom}%`;

  const currentTheme = preferences.theme || 'slate';
  const themeClasses = {
    slate: {
      bg: 'bg-slate-950 border-slate-800 text-white',
      btnBg: 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800/80',
      activeAccent: 'text-emerald-400',
      floatingBg: 'bg-slate-900 border-slate-700/80',
      pillBtn: 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700/80'
    },
    warm: {
      bg: 'bg-[#3e2723] border-[#4e342e] text-[#fbe9e7]',
      btnBg: 'bg-[#2d1f18] border-[#4e342e] text-amber-200 hover:bg-[#1d140f]',
      activeAccent: 'text-amber-400',
      floatingBg: 'bg-[#2d1f18] border-[#4e342e]',
      pillBtn: 'bg-[#3e2723] hover:bg-[#4e342e] text-[#fbe9e7] border-[#4e342e]'
    },
    dark: {
      bg: 'bg-[#030712] border-slate-900 text-white',
      btnBg: 'bg-[#0f172a] border-slate-800 text-slate-200 hover:bg-[#0f172a]/80',
      activeAccent: 'text-emerald-400',
      floatingBg: 'bg-[#0f172a] border-slate-800/80',
      pillBtn: 'bg-[#030712] hover:bg-[#0f172a] text-white border-slate-800/80'
    },
    classic: {
      bg: 'bg-neutral-900 border-neutral-800 text-white',
      btnBg: 'bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-750',
      activeAccent: 'text-white',
      floatingBg: 'bg-neutral-950 border-neutral-800',
      pillBtn: 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700'
    }
  }[currentTheme];

  return (
    <>
      {/* FLOATING PILL POPUP (MATCHING SWITCHER PILL POSITION & SIZING) */}
      <AnimatePresence>
        {activePopup !== 'none' && (
          <motion.div
            key="floating-pill"
            initial={{ opacity: 0, y: 15, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ 
              opacity: 0, 
              y: 12, 
              scale: 0.92,
              transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } 
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`fixed bottom-[calc(3.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 ${themeClasses.floatingBg} p-1 rounded-full flex items-center gap-1.5 shadow-2xl select-none print:hidden`}
          >
            <button
              type="button"
              onClick={() => {
                if (activePopup === 'minSize') handleMinSizeChange(-1);
                if (activePopup === 'size') handleSizeChange(-1);
                if (activePopup === 'spacing') handleSpacingChange(-1);
                if (activePopup === 'zoom') handleZoomChange(-1);
              }}
              className={`w-8 h-8 rounded-full ${themeClasses.pillBtn} active:scale-90 active:bg-emerald-500 active:text-slate-950 flex items-center justify-center transition-all cursor-pointer`}
              title="Decrease"
            >
              <Minus size={15} />
            </button>

            <div className="px-1 min-w-[64px] h-8 flex items-center justify-center text-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={activePopup}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="text-[14px] font-black text-emerald-400 tracking-tight leading-none block whitespace-nowrap"
                >
                  {activePopup === 'minSize' && `${minSizeBtnValue}px`}
                  {activePopup === 'size' && `${sizeBtnValue}px`}
                  {activePopup === 'spacing' && spacingBtnValue}
                  {activePopup === 'zoom' && zoomBtnValue}
                </motion.span>
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => {
                if (activePopup === 'minSize') handleMinSizeChange(1);
                if (activePopup === 'size') handleSizeChange(1);
                if (activePopup === 'spacing') handleSpacingChange(1);
                if (activePopup === 'zoom') handleZoomChange(1);
              }}
              className={`w-8 h-8 rounded-full ${themeClasses.pillBtn} active:scale-90 active:bg-emerald-500 active:text-slate-950 flex items-center justify-center transition-all cursor-pointer`}
              title="Increase"
            >
              <Plus size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM MOBILE PREVIEW TOOLBAR BAR */}
      <div className={`fixed bottom-0 -left-px -right-px -bottom-px z-40 ${themeClasses.bg} border-t px-2.5 py-2 flex items-center justify-between pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl select-none print:hidden`}>
        
        {/* LEFT GROUP: Min Font Size (P mode only) & Max Font Size */}
        <div className="flex items-center gap-1.5 z-50">
          
          {/* 1A. SMALL T BUTTON FOR MIN FONT SIZE (Paragraph Mode Only) */}
          {!isHeaderMode && (
            <button
              type="button"
              onClick={() => togglePopup('minSize')}
              className={`relative h-8 px-2.5 rounded-xl flex items-center justify-center gap-1 ${themeClasses.btnBg} transition-all cursor-pointer shadow-sm overflow-hidden`}
              title="Min Paragraph Text Size"
            >
              <AnimatePresence>
                {activePopup === 'minSize' && (
                  <motion.div
                    layoutId="activePreviewPopupBg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-emerald-500 z-0"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
              </AnimatePresence>
              <Type size={12} className={`relative z-10 transition-colors duration-150 ${activePopup === 'minSize' ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span className={`relative z-10 text-[13px] font-black transition-colors duration-150 ${activePopup === 'minSize' ? 'text-slate-950' : 'text-slate-200'}`}>
                {minSizeBtnValue}
              </span>
            </button>
          )}

          {/* 1B. MAIN / MAX TEXT SIZE BUTTON */}
          <button
            type="button"
            onClick={() => togglePopup('size')}
            className={`relative h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 ${themeClasses.btnBg} transition-all cursor-pointer shadow-sm overflow-hidden`}
            title="Max Text Size"
          >
            <AnimatePresence>
              {activePopup === 'size' && (
                <motion.div
                  layoutId="activePreviewPopupBg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-emerald-500 z-0"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </AnimatePresence>
            <Type size={14} className={`relative z-10 transition-colors duration-150 ${activePopup === 'size' ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span className={`relative z-10 text-[13px] font-black transition-colors duration-150 ${activePopup === 'size' ? 'text-slate-950' : 'text-slate-200'}`}>
              {sizeBtnValue}
            </span>
          </button>
        </div>

        {/* 2. SPACING BUTTON */}
        <div className="z-50">
          <button
            type="button"
            onClick={() => togglePopup('spacing')}
            className={`relative h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 ${themeClasses.btnBg} transition-all cursor-pointer shadow-sm overflow-hidden`}
            title="Line Spacing"
          >
            <AnimatePresence>
              {activePopup === 'spacing' && (
                <motion.div
                  layoutId="activePreviewPopupBg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-emerald-500 z-0"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </AnimatePresence>
            <MoveVertical size={13} className={`relative z-10 transition-colors duration-150 ${activePopup === 'spacing' ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span className={`relative z-10 text-[13px] font-black transition-colors duration-150 ${activePopup === 'spacing' ? 'text-slate-950' : 'text-slate-200'}`}>
              {spacingBtnValue}
            </span>
          </button>
        </div>

        {/* 3. ZOOM BUTTON */}
        <div className="z-50">
          <button
            type="button"
            onClick={() => togglePopup('zoom')}
            className={`relative h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 ${themeClasses.btnBg} transition-all cursor-pointer shadow-sm overflow-hidden`}
            title="Zoom"
          >
            <AnimatePresence>
              {activePopup === 'zoom' && (
                <motion.div
                  layoutId="activePreviewPopupBg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-emerald-500 z-0"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </AnimatePresence>
            <ZoomIn size={13} className={`relative z-10 transition-colors duration-150 ${activePopup === 'zoom' ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span className={`relative z-10 text-[13px] font-black transition-colors duration-150 ${activePopup === 'zoom' ? 'text-slate-950' : 'text-slate-200'}`}>
              {zoomBtnValue}
            </span>
          </button>
        </div>

        {/* RIGHT GROUP: Dark/Light Theme Button (Header Mode Only) & H/P Switcher */}
        <div className="flex items-center gap-1.5 z-50">
          
          {/* 4. LIGHT / DARK THEME TOGGLE BUTTON (Only rendered in Header Mode) */}
          {isHeaderMode && (
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`h-8 px-2.5 ${themeClasses.btnBg} active:scale-95 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm`}
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
            className={`h-8 px-2.5 ${themeClasses.btnBg} active:scale-95 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm`}
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
