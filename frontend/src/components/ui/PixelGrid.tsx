import React, { useEffect, useRef } from 'react';

interface Pixel {
  x: number;
  y: number;
  color: string;
  maxOpacity: number;
  phase: number;
  speed: number;
  size: number;
}

interface Cluster {
  cx: number; // center x ratio (0..1)
  cy: number; // center y ratio (0..1)
  radius: number; // radius in px
  strength: number; // density multiplier
  angle: number; // for slow movement
  angleSpeed: number;
  moveRadius: number; // movement offset limit
}

export const PixelGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let pixels: Pixel[] = [];

    // Organic clusters positioned strategically across the page.
    // Includes a high-density cluster directly in the center (behind the laptop animation).
    const clusters: Cluster[] = [
      { cx: 0.5,  cy: 0.38, radius: 360, strength: 0.85, angle: 0,   angleSpeed: 0.0004, moveRadius: 30 }, // Direct center background
      { cx: 0.15, cy: 0.3,  radius: 260, strength: 0.65, angle: 0.8, angleSpeed: 0.0003, moveRadius: 40 }, // Left flank
      { cx: 0.85, cy: 0.25, radius: 280, strength: 0.70, angle: 1.5, angleSpeed: -0.0002, moveRadius: 50 }, // Right flank
      { cx: 0.3,  cy: 0.75, radius: 240, strength: 0.60, angle: 3.1, angleSpeed: 0.0005, moveRadius: 35 }, // Bottom-left
      { cx: 0.7,  cy: 0.8,  radius: 290, strength: 0.65, angle: 4.5, angleSpeed: -0.0004, moveRadius: 45 }, // Bottom-right
    ];

    const colors = [
      'rgba(6, 182, 212, ',   // Vibrant Cyan
      'rgba(56, 189, 248, ',  // Bright blue-sky
      'rgba(79, 139, 255, ',  // Theme brand blue
      'rgba(167, 139, 250, ', // Subtle electric purple
    ];

    const initGrid = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      pixels = [];
      const gridSize = 10; // Slightly tighter grid spacing for higher density

      // Generate grid points
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          // Check proximity to all clusters
          let maxProb = 0;
          for (const c of clusters) {
            const ccx = c.cx * width;
            const ccy = c.cy * height;
            const dx = x - ccx;
            const dy = y - ccy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < c.radius) {
              const factor = 1 - dist / c.radius;
              // Higher density probability curve
              const prob = factor * factor * c.strength;
              if (prob > maxProb) maxProb = prob;
            }
          }

          // Spawn pixel if random roll is under cluster probability threshold
          if (Math.random() < maxProb) {
            const colorTemplate = colors[Math.floor(Math.random() * colors.length)];
            pixels.push({
              x,
              y,
              color: colorTemplate,
              maxOpacity: 0.22 + Math.random() * 0.42, // Significantly brighter and clearly visible
              phase: Math.random() * Math.PI * 2,
              speed: 0.02 + Math.random() * 0.035, // Live flickering pulse speed
              size: Math.random() > 0.8 ? 3.5 : 2.5, // Crisp visible pixel size
            });
          }
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      initGrid();
    });
    resizeObserver.observe(canvas.parentElement || canvas);
    initGrid();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const time = Date.now();

      // Update cluster centers very slowly to create a shifting wave effect
      for (const c of clusters) {
        c.angle += c.angleSpeed;
      }

      // Draw all pixels
      for (const p of pixels) {
        let finalX = p.x;
        let finalY = p.y;

        // Apply a gentle sway based on active cluster positioning
        for (const c of clusters) {
          const ccx = c.cx * width;
          const ccy = c.cy * height;
          const dx = p.x - ccx;
          const dy = p.y - ccy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < c.radius) {
            const pull = (1 - dist / c.radius) * 8; // gentle sway limit
            finalX += Math.cos(c.angle) * pull;
            finalY += Math.sin(c.angle) * pull;
          }
        }

        // Calculate opacity modulation
        const currentOpacity = p.maxOpacity * (0.3 + 0.7 * Math.sin(time * p.speed + p.phase));

        ctx.fillStyle = `${p.color}${currentOpacity.toFixed(3)})`;
        ctx.fillRect(finalX, finalY, p.size, p.size);
      }

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
      style={{ display: 'block', opacity: 1.0 }}
    />
  );
};
