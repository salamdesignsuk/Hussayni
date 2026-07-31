import React from 'react';
import { 
  Undo2, 
  Redo2, 
  Trash2, 
  MoreHorizontal
} from 'lucide-react';

interface DesktopEditorToolbarProps {
  onInsertTag: (prefix: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onOpenMore: () => void;
}

export const DesktopEditorToolbar: React.FC<DesktopEditorToolbarProps> = ({
  onInsertTag,
  onUndo,
  onRedo,
  onClear,
  onOpenMore
}) => {
  return (
    <div 
      className="hidden lg:flex w-[calc(100%+1px)] -mr-[1px] z-10 bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2 items-center justify-between shadow-md select-none print:hidden shrink-0"
    >
      {/* Editor Tags Quick Insertion (H, B, F) */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onInsertTag('H')}
          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 border border-slate-700/80 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          title="Insert (H)"
        >
          H
        </button>
 
        <button
          type="button"
          onClick={() => onInsertTag('B')}
          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          title="Insert (B)"
        >
          B
        </button>
 
        <button
          type="button"
          onClick={() => onInsertTag('F')}
          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 border border-slate-700/80 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          title="Insert (F)"
        >
          F
        </button>
      </div>
 
      <div className="h-5 w-px bg-slate-800 mx-1"></div>
 
      {/* Undo, Redo, Clear */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUndo}
          className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
          title="Undo"
        >
          <Undo2 size={15} />
        </button>
 
        <button
          type="button"
          onClick={onRedo}
          className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
          title="Redo"
        >
          <Redo2 size={15} />
        </button>
 
        <button
          type="button"
          onClick={onClear}
          className="w-8 h-8 flex items-center justify-center bg-slate-800/80 hover:bg-rose-950 hover:text-rose-400 active:scale-95 text-slate-400 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
          title="Clear Editor"
        >
          <Trash2 size={15} />
        </button>
      </div>
 
      <div className="h-5 w-px bg-slate-800 mx-1"></div>
 
      {/* More Button (Opens Footer & Settings Sheet - Icon Only) */}
      <button
        type="button"
        onClick={onOpenMore}
        className="w-8 h-8 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
        title="More settings and page footers"
      >
        <MoreHorizontal size={16} />
      </button>

    </div>
  );
};
