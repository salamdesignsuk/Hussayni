import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface SaveToLibraryDialogProps {
  docName: string;
  onChangeName: (v: string) => void;
  poetName: string;
  onChangePoet: (v: string) => void;
  dateText: string;
  onChangeDate: (v: string) => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onSaveComplete: () => void;
}

export const SaveToLibraryDialog: React.FC<SaveToLibraryDialogProps> = ({
  docName,
  onChangeName,
  poetName,
  onChangePoet,
  dateText,
  onChangeDate,
  onClose,
  onSaveDraft,
  onSaveComplete,
}) => {
  const [error, setError] = useState('');

  const nameMissing = !docName.trim();
  const dateMissing = !dateText.trim();
  const poetMissing = !poetName.trim();

  const handleSaveClick = () => {
    if (nameMissing) { setError('Please add missing name'); return; }
    if (dateMissing) { setError('Please add missing date'); return; }
    if (poetMissing) { setError('Please add missing poet name'); return; }
    setError('');
    onSaveComplete();
  };

  const fieldClass = (missing: boolean) =>
    `w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors ${
      missing ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-emerald-500'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 select-none print:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-white">Save to Library</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
              Poem name{nameMissing && <span className="text-rose-400"> (missing)</span>}
            </label>
            <input
              value={docName}
              onChange={(e) => onChangeName(e.target.value)}
              className={fieldClass(nameMissing)}
              placeholder="Poem name"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
              Date{dateMissing && <span className="text-rose-400"> (missing)</span>}
            </label>
            <input
              value={dateText}
              onChange={(e) => onChangeDate(e.target.value)}
              className={fieldClass(dateMissing)}
              placeholder="Date"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
              Poet name{poetMissing && <span className="text-rose-400"> (missing)</span>}
            </label>
            <input
              value={poetName}
              onChange={(e) => onChangePoet(e.target.value)}
              className={fieldClass(poetMissing)}
              placeholder="Poet name"
            />
          </div>
        </div>

        {error && <p className="text-rose-400 text-xs font-semibold mt-3">{error}</p>}

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onSaveDraft}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-lg cursor-pointer transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={handleSaveClick}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg cursor-pointer transition-colors"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
