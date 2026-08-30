import React, { useState } from 'react';
import { X } from 'lucide-react';

interface RenamePoemDialogProps {
  docName: string;
  poetName: string;
  dateText: string;
  onClose: () => void;
  onSave: (newName: string, newPoet: string, newDate: string) => void;
}

// Lets a Library poem's metadata be fixed in place (rename, change poet/date)
// without opening it in the editor first. Unlike SaveToLibraryDialog, this
// edits a record that already exists in the library, so there's no
// missing-field gate - any of the three fields can be left blank.
export const RenamePoemDialog: React.FC<RenamePoemDialogProps> = ({
  docName,
  poetName,
  dateText,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(docName);
  const [poet, setPoet] = useState(poetName);
  const [date, setDate] = useState(dateText);

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 select-none print:hidden"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-white">Rename Poem</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">Poem name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              placeholder="Poem name"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">Date</label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              placeholder="Date"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">Poet name</label>
            <input
              value={poet}
              onChange={(e) => setPoet(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
              placeholder="Poet name"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-lg cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name, poet, date)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg cursor-pointer transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
