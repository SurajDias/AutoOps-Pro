import React, { useEffect, useRef } from 'react';

interface Thread {
  yStart: number;
  yEnd: number;
  color: string;
  speed: number;
  phaseOffset: number;
  amplitude: number;
  thickness: number;
}

export const WebThreads: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const initCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const resizeObserver = new ResizeObserver(() => {
      initCanvas();
    });
    resizeObserver.observe(canvas.parentElement || canvas);
    initCanvas();

    // Define 6 flowing thread waves with slightly varying amplitudes and speeds
    const threads: Thread[] = [
      { yStart: 0.35, yEnd: 0.65, color: '#06B6D4', speed: 0.0006, phaseOffset: 0.0, amplitude: 55, thickness: 1.5 },
      { yStart: 0.40, yEnd: 0.60, color: '#38BDF8', speed: 0.0005, phaseOffset: 1.2, amplitude: 70, thickness: 1.2 },
      { yStart: 0.45, yEnd: 0.55, color: '#4F8BFF', speed: 0.0007, phaseOffset: 2.5, amplitude: 45, thickness: 1.8 },
      { yStart: 0.55, yEnd: 0.45, color: '#06B6D4', speed: 0.0004, phaseOffset: 3.8, amplitude: 60, thickness: 1.2 },
      { yStart: 0.60, yEnd: 0.40, color: '#38BDF8', speed: 0.0008, phaseOffset: 4.5, amplitude: 80, thickness: 1.0 },
      { yStart: 0.65, yEnd: 0.35, color: '#4F8BFF', speed: 0.0005, phaseOffset: 5.2, amplitude: 50, thickness: 1.6 },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const time = Date.now();
      const midX = width / 2;
      const midY = height / 2;

      // Slow drift of the central pinch point
      const pinchX = midX + Math.cos(time * 0.0003) * (width * 0.08);
      const pinchY = midY + Math.sin(time * 0.0004) * (height * 0.06);

      // Draw each thread line with glowing layers
      for (const t of threads) {
        const phase = time * t.speed + t.phaseOffset;
        const currentAmp = t.amplitude * (0.8 + 0.25 * Math.sin(phase * 1.5));

        const yS = t.yStart * height + Math.sin(phase) * 15;
        const yE = t.yEnd * height + Math.cos(phase * 0.8) * 15;

        // Calculate control points for cubic Bezier to the central pinch
        const cp1x = pinchX - (midX * 0.55);
        const cp1y = yS + Math.sin(phase * 1.2) * currentAmp;
        const cp2x = pinchX - (midX * 0.2);
        const cp2y = pinchY + Math.cos(phase * 0.9) * (currentAmp * 0.25);

        const cp3x = pinchX + (midX * 0.2);
        const cp3y = pinchY + Math.sin(phase * 0.9) * (currentAmp * 0.25);
        const cp4x = pinchX + (midX * 0.55);
        const cp4y = yE + Math.cos(phase * 1.2) * currentAmp;

        // Draw glowing layers
        
        // Layer 1: Wide ambient backdrop glow
        ctx.shadowBlur = 0;
        ctx.lineWidth = t.thickness * 13;
        ctx.strokeStyle = t.color;
        ctx.globalAlpha = 0.09;
        ctx.beginPath();
        ctx.moveTo(0, yS);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pinchX, pinchY);
        ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, width, yE);
        ctx.stroke();

        // Layer 2: Medium glowing envelope
        ctx.lineWidth = t.thickness * 6.0;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.moveTo(0, yS);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pinchX, pinchY);
        ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, width, yE);
        ctx.stroke();

        // Layer 3: Sharp core thread with active glow shadow bloom
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 14;
        ctx.lineWidth = t.thickness * 1.5;
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.moveTo(0, yS);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pinchX, pinchY);
        ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, width, yE);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0; // Reset shadow configurations for next loops
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ display: 'block' }}
    />
  );
};
