import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export const CursorSpotlight: React.FC = () => {
  const mouseX = useSpring(0, { stiffness: 80, damping: 20, mass: 0.5 });
  const mouseY = useSpring(0, { stiffness: 80, damping: 20, mass: 0.5 });
  const [isVisible, setIsVisible] = useState(false);

  const left = useTransform(mouseX, (x) => x - 350);
  const top  = useTransform(mouseY, (y) => y - 350);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };
    const onLeave = () => setIsVisible(false);
    const onEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, [isVisible, mouseX, mouseY]);

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full"
        style={{
          left,
          top,
          background: 'radial-gradient(circle at center, rgba(79,139,255,0.05) 0%, rgba(79,139,255,0.02) 35%, transparent 70%)',
        }}
      />
    </motion.div>
  );
};
