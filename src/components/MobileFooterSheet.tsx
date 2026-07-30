import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Feather,
  Trash2,
  X,
  Minus,
  Plus,
  Hash,
  Type
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { UserPreferences } from '../utils/documentModel';

interface MobileFooterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  leftFooterText: string;
  setLeftFooterText: (val: string) => void;
  rightFooterText: string;
  setRightFooterText: (val: string) => void;
  preferences?: UserPreferences;
  setPreferences?: React.Dispatch<React.SetStateAction<UserPreferences>>;
}

export const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة'
];

// Grid order for 3 columns RTL (Right col: 1-4, Center col: 5-8, Left col: 9-12)
export const HIJRI_MONTHS_GRID_RTL = [
  'محرم',         'جمادى الأولى',  'رمضان',
  'صفر',         'جمادى الآخرة',  'شوال',
  'ربيع الأول',   'رجب',           'ذو القعدة',
  'ربيع الثاني',  'شعبان',         'ذو الحجة'
];

export const HIJRI_YEARS = [
  '1444',
  '1445',
  '1446',
  '1447',
  '1448',
  '1449',
  '1450',
  '1451',
  '1452'
];

export const MobileFooterSheet: React.FC<MobileFooterSheetProps> = ({
  isOpen,
  onClose,
  leftFooterText,
  setLeftFooterText,
  rightFooterText,
  setRightFooterText,
  preferences,
  setPreferences
}) => {
  const [leftEnabled, setLeftEnabled] = useState<boolean>(leftFooterText.trim() !== '');
  const [rightEnabled, setRightEnabled] = useState<boolean>(rightFooterText.trim() !== '');

  // Extract month and year from leftFooterText if present
  const [selectedMonth, setSelectedMonth] = useState<string>('محرم');
  const [selectedYear, setSelectedYear] = useState<string>('1447');
  const [customLeftText, setCustomLeftText] = useState<string>(leftFooterText);

  useEffect(() => {
    if (leftFooterText) {
      setLeftEnabled(true);
      const parts = leftFooterText.trim().split(' ');
      const yearPart = parts.find(p => /^\d{4}$/.test(p));
      const monthPart = HIJRI_MONTHS.find(m => leftFooterText.includes(m));
      if (monthPart) setSelectedMonth(monthPart);
      if (yearPart) setSelectedYear(yearPart);
      setCustomLeftText(leftFooterText);
    } else {
      setLeftEnabled(false);
    }
  }, [leftFooterText]);

  useEffect(() => {
    if (rightFooterText) {
      setRightEnabled(true);
    } else {
      setRightEnabled(false);
    }
  }, [rightFooterText]);

  const handleApplyPresetMonthYear = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    const assembled = `${month} ${year}`;
    setCustomLeftText(assembled);
    if (leftEnabled) {
      setLeftFooterText(assembled);
    }
  };

  const toggleLeftFooter = (enabled: boolean) => {
    setLeftEnabled(enabled);
    if (enabled) {
      const textToSet = customLeftText || `${selectedMonth} ${selectedYear}`;
      setLeftFooterText(textToSet);
    } else {
      setLeftFooterText('');
    }
  };

  const toggleRightFooter = (enabled: boolean) => {
    setRightEnabled(enabled);
    if (!enabled) {
      setRightFooterText('');
    }
  };

  const handleClearAllFooters = () => {
    setLeftFooterText('');
    setRightFooterText('');
    setLeftEnabled(false);
    setRightEnabled(false);
    setCustomLeftText('');
  };

  const dragControls = useDragControls();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 print:hidden select-none"
        >
          {/* Click outside backdrop */}
          <div className="absolute inset-0 select-none" onClick={onClose} />

          {/* Mobile-friendly Pop-Up Modal Card */}
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(event, info) => {
              if (info.offset.y > 120 || info.velocity.y > 350) {
                onClose();
              }
            }}
            className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden text-slate-100 pb-[calc(1rem+env(safe-area-inset-bottom))] select-none"
            dir="ltr"
          >
            {/* iPhone Horizontal Pull/Close Line (Top Handle) */}
            <div 
              onPointerDown={(e) => {
                dragControls.start(e);
              }}
              className="flex justify-center pt-4 pb-3 select-none shrink-0 cursor-grab active:cursor-grabbing touch-none"
            >
              <div 
                className="w-12 h-1.5 bg-slate-700/80 hover:bg-slate-500 rounded-full select-none"
                title="Slide down to close"
              />
            </div>

            {/* Modal Body - 2-Column Side-By-Side Layout for Left & Right Footers */}
            <div className="px-3.5 sm:px-5 pb-4 overflow-y-auto font-sans text-xs select-none">
              <div className="grid grid-cols-2 gap-2.5 items-start">
                
                {/* LEFT COLUMN: Date (left footer) */}
                <div className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 select-none transition-all duration-200 ${leftEnabled ? 'h-auto' : 'h-[56px] flex items-center justify-between'}`}>
                  {leftEnabled ? (
                    <div className="space-y-2.5 w-full">
                      <div className="flex items-center justify-between gap-1 select-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Calendar size={14} className="text-emerald-400 shrink-0" />
                          <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">Date (left)</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox"
                            checked={leftEnabled}
                            onChange={(e) => toggleLeftFooter(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-7 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-700/40 select-none">
                        {/* Hijri Year Controls (- Year +) */}
                        <div className="flex items-center justify-between gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1 select-none">
                          <button
                            type="button"
                            onClick={() => {
                              const numericYear = parseInt(selectedYear) || 1447;
                              const newYear = Math.max(1300, numericYear - 1);
                              handleApplyPresetMonthYear(selectedMonth, newYear.toString());
                            }}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 active:scale-95 text-slate-200 flex items-center justify-center transition-all cursor-pointer border border-slate-700/80 shrink-0"
                            title="Previous Year"
                          >
                            <Minus size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyPresetMonthYear(selectedMonth, '1447')}
                            className="text-[11px] sm:text-xs font-extrabold text-emerald-400 hover:text-emerald-300 active:scale-95 text-center flex-1 truncate transition-all cursor-pointer"
                            title="Reset to current year (1447 AH)"
                          >
                            {selectedYear} AH
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const numericYear = parseInt(selectedYear) || 1447;
                              const newYear = Math.min(1600, numericYear + 1);
                              handleApplyPresetMonthYear(selectedMonth, newYear.toString());
                            }}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 active:scale-95 text-slate-200 flex items-center justify-center transition-all cursor-pointer border border-slate-700/80 shrink-0"
                            title="Next Year"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* All 12 Months as Pills */}
                        <div className="grid grid-cols-3 gap-1 select-none" dir="rtl">
                          {HIJRI_MONTHS_GRID_RTL.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleApplyPresetMonthYear(m, selectedYear)}
                              className={`px-1 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all text-center cursor-pointer select-none truncate ${
                                selectedMonth === m
                                  ? 'bg-emerald-500 text-slate-950 font-black'
                                  : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                              }`}
                              title={m}
                            >
                              {m}
                            </button>
                          ))}
                        </div>

                        {/* Custom Text Input */}
                        <div className="relative">
                          <input 
                            type="text"
                            value={customLeftText}
                            onChange={(e) => {
                              setCustomLeftText(e.target.value);
                              setLeftFooterText(e.target.value);
                            }}
                            placeholder="Custom date"
                            dir={preferences?.editorRtl ? "rtl" : "ltr"}
                            className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-all select-text ${preferences?.editorRtl ? 'text-right' : 'text-left'}`}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">Date (left)</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox"
                          checked={leftEnabled}
                          onChange={(e) => toggleLeftFooter(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </>
                  )}
                </div>

                {/* RIGHT COLUMN: Poet name (right footer) */}
                <div className={`bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 select-none transition-all duration-200 ${rightEnabled ? 'h-auto' : 'h-[56px] flex items-center justify-between'}`}>
                  {rightEnabled ? (
                    <div className="space-y-2.5 w-full">
                      <div className="flex items-center justify-between gap-1 select-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Feather size={14} className="text-emerald-400 shrink-0" />
                          <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">Poet (right)</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox"
                            checked={rightEnabled}
                            onChange={(e) => toggleRightFooter(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-7 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <div className="pt-2 border-t border-slate-700/40 space-y-2 select-none">
                        <div className="relative">
                          <input 
                            type="text"
                            value={rightFooterText}
                            onChange={(e) => setRightFooterText(e.target.value)}
                            placeholder="Poet name"
                            dir={preferences?.editorRtl ? "rtl" : "ltr"}
                            className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-white outline-none focus:border-emerald-500 transition-all select-text ${preferences?.editorRtl ? 'text-right' : 'text-left'}`}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Feather size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">Poet (right)</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox"
                          checked={rightEnabled}
                          onChange={(e) => toggleRightFooter(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </>
                  )}
                </div>

                {/* COLUMN 1 (ROW 2): Display Page Numbers */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 select-none col-span-1 h-[56px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Hash size={14} className="text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">Page Numbers</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox"
                      checked={preferences?.showPageNumber !== false}
                      onChange={(e) => {
                        if (setPreferences) {
                          setPreferences(p => ({ ...p, showPageNumber: e.target.checked }));
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* COLUMN 2 (ROW 2): Footer Font Size */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 select-none col-span-1 h-[56px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Type size={14} className="text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">Size</span>
                  </div>
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg h-7 overflow-hidden select-none shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (setPreferences) {
                          setPreferences(p => ({ ...p, footerFontSize: Math.max(10, (p.footerFontSize || 14) - 1) }));
                        }
                      }}
                      className="h-full w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 active:scale-95 text-slate-200 transition-all cursor-pointer shrink-0 border-r border-slate-700/60"
                      title="Decrease Footer Size"
                    >
                      <Minus size={11} />
                    </button>

                    <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-400 text-center px-1.5 min-w-[28px] select-none">
                      {preferences?.footerFontSize || 14}px
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (setPreferences) {
                          setPreferences(p => ({ ...p, footerFontSize: Math.min(20, (p.footerFontSize || 14) + 1) }));
                        }
                      }}
                      className="h-full w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 active:scale-95 text-slate-200 transition-all cursor-pointer shrink-0 border-l border-slate-700/60"
                      title="Increase Footer Size"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
