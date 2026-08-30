import React from 'react';
import { motion } from 'motion/react';

interface AppIconButtonProps {
  showLibrary: boolean;
  onOpenLibrary: () => void;
  onCloseLibrary: () => void;
  libraryIconGlow: 'none' | 'orange';
}

// The single, always-mounted "H" icon. Rendered once as a fixed overlay positioned identically
// over both the Editor header and the Library's top bar (which each reserve an equal-sized
// invisible spacer where this used to be two separate buttons), so its background color can be
// animated as one continuous value instead of swapping between two different elements.
export const AppIconButton: React.FC<AppIconButtonProps> = ({
  showLibrary,
  onOpenLibrary,
  onCloseLibrary,
  libraryIconGlow,
}) => {
  return (
    <div className="fixed top-0 left-0 h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] pl-2 sm:pl-6 flex items-center z-[75] pointer-events-none print:hidden">
      <motion.button
        onClick={showLibrary ? onCloseLibrary : onOpenLibrary}
        animate={{ backgroundColor: showLibrary ? '#f59e0b' : '#059669' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-base sm:text-lg text-white shrink-0 ring-1 select-none cursor-pointer transition-shadow duration-1000 ${
          showLibrary ? 'ring-amber-400/30' : 'ring-emerald-500/30'
        } ${
          libraryIconGlow === 'orange'
            ? 'shadow-[0_0_25px_8px_rgba(249,115,22,0.7)]'
            : showLibrary
            ? 'shadow-md shadow-amber-500/20'
            : 'shadow-md shadow-emerald-600/20'
        }`}
        title={showLibrary ? 'Back to editor' : 'Open Hussayni Library'}
      >
        H
      </motion.button>
    </div>
  );
};
