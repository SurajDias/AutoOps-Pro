import React, { useRef, useState } from 'react';

interface BorderGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor1?: string;
  glowColor2?: string;
  glowSize?: number;
  glowOpacity?: number;
}

/**
 * BorderGlow — React Bits inspired interactive glow card.
 * Tracks pointer movement to project a dynamic radial gradient border
 * around the card's boundaries, intensifying on hover.
 */
export const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = '',
  glowColor1 = '#4F8BFF',
  glowColor2 = '#06B6D4',
  glowSize = 200,
  glowOpacity = 0.5
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: -9999, y: -9999 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCoords({ x: -9999, y: -9999 });
      }}
      className={`relative p-[1px] rounded-2xl overflow-hidden transition-all duration-350 bg-white/[0.08] ${className}`}
    >
      {/* Background Hover Radial Glow Mask */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-2xl"
        style={{
          background: `radial-gradient(circle ${glowSize}px at ${coords.x}px ${coords.y}px, ${glowColor1} 0%, ${glowColor2} 50%, transparent 100%)`,
          opacity: isHovered ? glowOpacity : 0,
        }}
      />

      {/* Inner content box to preserve original dark navy color palette */}
      <div className="relative z-10 w-full h-full rounded-[15px] bg-[#070F1C]/75 backdrop-blur-md overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]">
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;
