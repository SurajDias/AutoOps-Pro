import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InitialLoaderProps {
  onComplete: () => void;
  show?: boolean;
}

export const InitialLoader: React.FC<InitialLoaderProps> = ({ onComplete, show = true }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [onComplete, show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050816]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: [0, 1, 1, 0.8, 1],
              scale: [0.9, 1, 1, 1.05, 1],
            }}
            transition={{ 
              duration: 2,
              times: [0, 0.3, 0.7, 0.85, 1],
              ease: 'easeInOut'
            }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F8BFF] to-[#7ED7FF] flex items-center justify-center shadow-[0_0_30px_rgba(79,139,255,0.4)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#9FB0C7] tracking-wider">
              AUTOOPS PRO
            </h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
