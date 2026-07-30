import React from 'react';
import { 
  Type, 
  AlignJustify, 
  MessageSquare, 
  Undo2, 
  Redo2, 
  Trash2, 
  MoreHorizontal,
  Sparkles
} from 'lucide-react';

interface MobileBottomToolbarProps {
  onInsertTag: (prefix: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onOpenMore: () => void;
  isKeyboardActive?: boolean;
}

export const MobileBottomToolbar: React.FC<MobileBottomToolbarProps> = ({
  onInsertTag,
  onUndo,
  onRedo,
  onClear,
  onOpenMore,
  isKeyboardActive = false
}) => {
  const lastTouchTime = React.useRef(0);

  const handleInsert = (e: React.MouseEvent | React.TouchEvent, tag: string) => {
    if (e.type === 'touchstart') {
      lastTouchTime.current = Date.now();
    } else if (e.type === 'mousedown') {
      if (Date.now() - lastTouchTime.current < 800) {
        e.preventDefault();
        return;
      }
    }
    e.preventDefault();
    onInsertTag(tag);
  };

  const handleUndo = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchstart') {
      lastTouchTime.current = Date.now();
    } else if (e.type === 'mousedown') {
      if (Date.now() - lastTouchTime.current < 800) {
        e.preventDefault();
        return;
      }
    }
    e.preventDefault();
    onUndo();
  };

  const handleRedo = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchstart') {
      lastTouchTime.current = Date.now();
    } else if (e.type === 'mousedown') {
      if (Date.now() - lastTouchTime.current < 800) {
        e.preventDefault();
        return;
      }
    }
    e.preventDefault();
    onRedo();
  };

  return (
    <div 
      className={`${isKeyboardActive ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-100 px-2.5 py-2 flex items-center justify-between shadow-2xl select-none print:hidden ${
        isKeyboardActive 
          ? 'pb-2' 
          : 'pb-[calc(0.5rem+env(safe-area-inset-bottom))]'
      }`}
    >
      
      {/* Editor Tags Quick Insertion (H, B, F) */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => handleInsert(e, 'H')}
          onTouchStart={(e) => handleInsert(e, 'H')}
          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 border border-slate-700/80 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          title="Insert (H)"
        >
          H
        </button>
 
        <button
          type="button"
          onMouseDown={(e) => handleInsert(e, 'B')}
          onTouchStart={(e) => handleInsert(e, 'B')}
          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          title="Insert (B)"
        >
          B
        </button>
 
        <button
          type="button"
          onMouseDown={(e) => handleInsert(e, 'F')}
          onTouchStart={(e) => handleInsert(e, 'F')}
          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 border border-slate-700/80 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          title="Insert (F)"
        >
          F
        </button>
      </div>
 
      <div className="h-5 w-px bg-slate-800 mx-0.5"></div>
 
      {/* Undo, Redo, Clear */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onMouseDown={handleUndo}
          onTouchStart={handleUndo}
          className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl transition-all cursor-pointer"
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
 
        <button
          type="button"
          onMouseDown={handleRedo}
          onTouchStart={handleRedo}
          className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl transition-all cursor-pointer"
          title="Redo"
        >
          <Redo2 size={16} />
        </button>

        <button
          type="button"
          onClick={onClear}
          className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-rose-950 hover:text-rose-400 active:scale-95 text-slate-400 rounded-xl transition-all cursor-pointer"
          title="Clear Editor"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="h-5 w-px bg-slate-800 mx-0.5"></div>

      {/* More Button (Opens Footer & Settings Sheet - Icon Only) */}
      <button
        type="button"
        onClick={onOpenMore}
        className="w-8 h-8 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
        title="More settings and page footers"
      >
        <MoreHorizontal size={18} />
      </button>

    </div>
  );
};
