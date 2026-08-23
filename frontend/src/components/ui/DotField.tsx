import { useEffect, useRef } from 'react';

interface DotFieldProps {
  dotRadius?: number;
  dotSpacing?: number;
  dotColor?: string;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  glowColor?: string;
  sparkle?: boolean;
  waveAmplitude?: number;
  waveFrequency?: number;
  waveSpeed?: number;
  opacity?: number;
  className?: string;
}

/**
 * DotField — ReactBits-style "Ice" dot grid background.
 *
 * A Canvas rendering of a uniform dot grid where:
 *  - Mouse proximity bulges dots outward (cursorForce / bulgeStrength)
 *  - A soft radial glow zone illuminates dots near the cursor (glowRadius)
 *  - A slow sinusoidal wave gently displaces the grid (waveAmplitude)
 *  - Dots outside the glow zone render at low opacity (base layer)
 *
 * Tuned to the "Ice" preset from the reference screenshot.
 */
export const DotField: React.FC<DotFieldProps> = ({
  dotRadius      = 1.5,
  dotSpacing     = 14,
  dotColor       = '#4F8BFF',
  cursorRadius   = 750,
  cursorForce    = 0.08,
  bulgeOnly      = true,
  bulgeStrength  = 35,
  glowRadius     = 340,
  glowColor      = '#06B6D4',
  sparkle        = false,
  waveAmplitude  = 7,
  waveFrequency  = 0.012,
  waveSpeed      = 0.0004,
  opacity        = 1,
  className      = '',
}) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const mouseRef   = useRef({ x: -9999, y: -9999 });
  const frameRef   = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    const resize = () => {
      const p = canvas.parentElement!;
      W = p.offsetWidth;
      H = p.offsetHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    resize();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    window.addEventListener('mousemove', onMouseMove);
    canvas.parentElement!.addEventListener('mouseleave', onMouseLeave);

    let t = 0;

    // Parse dotColor and glowColor to RGB for alpha compositing
    const parseHex = (hex: string): [number, number, number] => {
      const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [79, 139, 255];
    };
    const [dr, dg, db] = parseHex(dotColor);
    const [gr, gg, gb] = parseHex(glowColor);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += waveSpeed;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // compute grid extents with one extra cell on each side to avoid edge gaps
      const cols = Math.ceil(W / dotSpacing) + 2;
      const rows = Math.ceil(H / dotSpacing) + 2;
      const offX = (W % dotSpacing) / 2;
      const offY = (H % dotSpacing) / 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const baseX = offX + col * dotSpacing;
          const baseY = offY + row * dotSpacing;

          // Wave displacement — gentle diagonal sine
          const waveX = Math.sin(baseY * waveFrequency + t) * waveAmplitude;
          const waveY = Math.cos(baseX * waveFrequency + t * 0.7) * waveAmplitude * 0.6;

          let x = baseX + waveX;
          let y = baseY + waveY;

          // Mouse bulge
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let bulge = 0;
          let glowFactor = 0;

          if (dist < cursorRadius) {
            const norm = 1 - dist / cursorRadius;
            bulge = norm * norm * bulgeStrength * cursorForce;
            if (dist > 0) {
              x += (dx / dist) * bulge;
              y += (dy / dist) * bulge;
            }
          }

          // Glow factor — how bright the dot is relative to cursor
          if (dist < glowRadius) {
            glowFactor = 1 - dist / glowRadius;
            glowFactor = glowFactor * glowFactor; // quadratic falloff
          }

          // Dot radius scales with bulge slightly
          const r = dotRadius + bulge * 0.04;

          // Interpolate color from base dotColor → glowColor based on glowFactor
          const rr = Math.round(dr + (gr - dr) * glowFactor);
          const rg = Math.round(dg + (gg - dg) * glowFactor);
          const rb = Math.round(db + (gb - db) * glowFactor);
          const alpha = (0.18 + glowFactor * 0.72) * opacity;

          ctx.beginPath();
          ctx.arc(x, y, Math.max(r, 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rr},${rg},${rb},${alpha.toFixed(3)})`;
          ctx.fill();

          // Optional sparkle: small bright burst on fully-glowing dots
          if (sparkle && glowFactor > 0.85) {
            ctx.beginPath();
            ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${gr},${gg},${gb},${(glowFactor * 0.12).toFixed(3)})`;
            ctx.fill();
          }
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [
    dotRadius, dotSpacing, dotColor, cursorRadius, cursorForce,
    bulgeOnly, bulgeStrength, glowRadius, glowColor, sparkle,
    waveAmplitude, waveFrequency, waveSpeed, opacity,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ display: 'block' }}
    />
  );
};

export default DotField;
