import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, MoreVertical, Eye, ExternalLink, Download, FileDown, Pencil, Trash2, RotateCcw, XCircle } from 'lucide-react';
import { RecentDocument, DeletedDocument } from '../utils/documentModel';

interface LibraryScreenProps {
  savedPoems: RecentDocument[];
  unsavedPoems: RecentDocument[];
  deletedPoems: DeletedDocument[];
  activeDocName: string;
  onOpenPreview: (doc: RecentDocument) => void;
  onOpenInEditor: (doc: RecentDocument) => void;
  onDelete: (doc: RecentDocument, list: 'saved' | 'unsaved') => void;
  onExportDocx: (doc: RecentDocument) => void;
  onExportPdf: (doc: RecentDocument) => void;
  onRename: (doc: RecentDocument, list: 'saved' | 'unsaved') => void;
  onRestore: (doc: DeletedDocument) => void;
  onPermanentDelete: (doc: DeletedDocument) => void;
}

type LibraryTab = 'saved' | 'unsaved' | 'deleted';

const DAYS_UNTIL_PURGE = 30;

const daysRemaining = (deletedAt: string): number => {
  const elapsedMs = Date.now() - new Date(deletedAt).getTime();
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  return Math.max(0, DAYS_UNTIL_PURGE - elapsedDays);
};

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  savedPoems,
  unsavedPoems,
  deletedPoems,
  activeDocName,
  onOpenPreview,
  onOpenInEditor,
  onDelete,
  onExportDocx,
  onExportPdf,
  onRename,
  onRestore,
  onPermanentDelete,
}) => {
  const [tab, setTab] = useState<LibraryTab>('saved');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const list: RecentDocument[] = tab === 'saved' ? savedPoems : tab === 'unsaved' ? unsavedPoems : deletedPoems;

  const emptyMessage = tab === 'saved'
    ? 'No poems saved to the Library yet.'
    : tab === 'unsaved'
    ? 'No unsaved drafts.'
    : 'No recently deleted poems.';

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950 flex flex-col print:hidden">
      {/* Top bar - height, padding, icon size/gap all matched exactly to the Editor header's
          (App.tsx) so the icon overlays its Editor counterpart pixel-for-pixel during the wipe. */}
      <div className="h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] shrink-0 flex items-center justify-between px-2 sm:px-6 border-b border-slate-800">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* Spacer - the actual icon is <AppIconButton>, a single persistent fixed-position
              element shared with the Editor header, positioned to overlay exactly here. */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" aria-hidden="true" />
          {/* Revealed left-to-right on enter (matching the Editor header's wipe-out), and wiped
              away right-to-left on exit (the reverse), so the two separate bars read as one
              continuous bar past the (stable) icon. Font size matched exactly to the Editor
              header's "Hussayni Editor" splash title. */}
          <motion.h1
            className="text-white font-extrabold text-sm sm:text-base leading-tight tracking-wide whitespace-nowrap"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            exit={{ clipPath: 'inset(0 100% 0 0)' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            Hussayni Library
          </motion.h1>
        </div>
      </div>

      {/* Tabs + List - this is the only part that animates; the top bar above
          appears/disappears instantly with the screen itself */}
      <motion.div
        className="flex flex-col flex-1 min-h-0"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 sm:px-6 pt-3 shrink-0">
        {(['saved', 'unsaved', 'deleted'] as LibraryTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setOpenMenuId(null); }}
            className={`px-3.5 py-2 rounded-t-lg text-xs font-bold cursor-pointer transition-colors ${
              tab === t ? 'bg-white text-emerald-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'saved' && `Saved (${savedPoems.length})`}
            {t === 'unsaved' && `Unsaved (${unsavedPoems.length})`}
            {t === 'deleted' && `Deleted (${deletedPoems.length})`}
          </button>
        ))}
      </div>

      {/* List - kept white/light regardless of the (dark) tab bar and screen background above */}
      <div className="flex-1 overflow-y-auto bg-white mx-2 sm:mx-6 mb-4 rounded-b-lg rounded-tr-lg border border-slate-200">
        {list.length === 0 ? (
          <p className="text-sm text-slate-500 text-center p-10">{emptyMessage}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((doc) => (
              <div
                key={doc.id}
                onClick={() => tab !== 'deleted' && onOpenPreview(doc)}
                className={`flex items-center justify-between gap-2 px-4 py-3 transition-colors ${
                  tab === 'deleted' ? '' : 'cursor-pointer hover:bg-slate-50'
                } ${doc.name === activeDocName ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={15} className="shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-bold text-slate-800 truncate">{doc.name}</p>
                    {tab === 'saved' && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {doc.rightFooter || '—'} · {doc.leftFooter || '—'}
                      </p>
                    )}
                    {tab === 'unsaved' && (
                      <p className="text-[11px] text-slate-500">
                        {new Date(doc.lastSaved).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                    {tab === 'deleted' && (
                      <p className="text-[11px] text-slate-500">
                        Auto-removes in {daysRemaining((doc as DeletedDocument).deletedAt)}d
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === doc.id ? null : doc.id);
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
                    title="More actions"
                  >
                    <MoreVertical size={15} />
                  </button>

                  {openMenuId === doc.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-2xl p-1 z-10 select-none"
                    >
                      {tab === 'deleted' ? (
                        <>
                          <button
                            onClick={() => { setOpenMenuId(null); onRestore(doc as DeletedDocument); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer text-slate-700"
                          >
                            <RotateCcw size={13} className="text-emerald-500" />
                            Restore
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onPermanentDelete(doc as DeletedDocument); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer text-rose-500"
                          >
                            <XCircle size={13} />
                            Delete Forever
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setOpenMenuId(null); onOpenPreview(doc); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer text-slate-700"
                          >
                            <Eye size={13} className="text-slate-500" />
                            View
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onOpenInEditor(doc); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer text-slate-700"
                          >
                            <ExternalLink size={13} className="text-blue-500" />
                            Open in Editor
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onRename(doc, tab as 'saved' | 'unsaved'); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer text-slate-700"
                          >
                            <Pencil size={13} className="text-amber-500" />
                            Rename
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onExportDocx(doc); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer text-slate-700"
                          >
                            <Download size={13} className="text-emerald-500" />
                            Export (.docx)
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onExportPdf(doc); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer text-slate-700"
                          >
                            <FileDown size={13} className="text-emerald-500" />
                            Export (PDF)
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onDelete(doc, tab as 'saved' | 'unsaved'); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer text-rose-500"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </motion.div>
    </div>
  );
};
