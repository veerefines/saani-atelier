'use client';

import { motion } from 'framer-motion';

/** Soft page turn between the dashboard and each corner of it. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.55, ease: [0.3, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
