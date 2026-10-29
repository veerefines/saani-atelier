'use client';

import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

/** A bottom sheet over the page (a centred card on a big screen). */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // rendered on <body>: inside the page it is stuck under the radio chip and Jelly, which float above the page
  return createPortal(
    <motion.div className="soldi-sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="soldi-sheet" role="dialog" aria-label={title} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <button type="button" className="soldi-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
