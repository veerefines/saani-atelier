'use client';

import { motion } from 'framer-motion';

/**
 * Soft page turn between the dashboard and each corner of it. The filter and transform are cleared once it
 * lands: left on, they turn this wrapper into the containing block for every `position: fixed` sheet inside
 * (spend editor, pickers), which then sit off-screen on a long page.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none', transform: 'none' } }}
      transition={{ duration: 0.55, ease: [0.3, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
