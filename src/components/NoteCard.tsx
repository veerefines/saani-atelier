'use client';

import { motion } from 'framer-motion';

export type Note = { greeting: string; lines: string[]; signoff: string };

export default function NoteCard({ note, onContinue }: { note: Note; onContinue: () => void }) {
  const lineDelay = (i: number) => 0.7 + i * 0.45;
  const end = lineDelay(note.lines.length) + 0.2;

  return (
    <motion.article
      className="note"
      initial={{ y: -70, opacity: 0, rotate: -3 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 90, damping: 14, delay: 0.25 }}
    >
      <img className="tape" src="/reveal/washi.webp" alt="" draggable={false} />
      <h2 className="hand note-greeting">{note.greeting}</h2>
      {note.lines.map((line, i) => (
        <motion.p
          key={i}
          className="whisper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: lineDelay(i) }}
        >
          {line}
        </motion.p>
      ))}
      <motion.p
        className="hand signoff"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: end }}
      >
        {note.signoff}
      </motion.p>
      <motion.div
        className="note-actions"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: end + 0.5 }}
      >
        <button type="button" className="cta" onClick={onContinue}>
          Follow the thread
        </button>
      </motion.div>
    </motion.article>
  );
}
