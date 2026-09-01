import { motion } from 'framer-motion';
import React from 'react';

const variants = {
  initial: { opacity: 0, y: 10 },
  enter:   { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    variants={variants}
    initial="initial"
    animate="enter"
    exit="exit"
    transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
    className="min-h-full"
  >
    {children}
  </motion.div>
);

export default PageTransition;
