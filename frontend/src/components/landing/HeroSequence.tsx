import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

// Eagerly load every image file inside the src/assets/hero directory using Vite's glob import
const heroFrames = import.meta.glob('../../assets/hero/*', { eager: true });

// Extract keys and sort them numerically based on the index suffix (e.g. _000 to _079)
const sortedFrameKeys = Object.keys(heroFrames)
  .filter((key) => /\.(jpg|png|jpeg)$/i.test(key))
  .sort((a, b) => {
    const numA = parseInt(a.match(/_(\d+)\.(jpg|png|jpeg)$/i)?.[1] || '0', 10);
    const numB = parseInt(b.match(/_(\d+)\.(jpg|png|jpeg)$/i)?.[1] || '0', 10);
    return numA - numB;
  });

// Map keys to resolved URLs (handling both standard and asset-compiler modules)
const resolvedUrls = sortedFrameKeys.map((key) => {
  const module = heroFrames[key];
  if (!module) return '';
  return typeof module === 'string' ? module : (module as any).default || '';
}).filter(Boolean);

// Resolve URLs for the first and last frame immediately
const firstFrameUrl = resolvedUrls[0] || '';
const finalFrameUrl = resolvedUrls[resolvedUrls.length - 1] || '';

export const HeroSequence: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const framesRef = useRef<HTMLImageElement[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const currentFrameObj = { frame: 0 };

  useEffect(() => {
    // Verify that import.meta.glob found the frames correctly
    if (resolvedUrls.length === 0) {
      console.error("Vite import.meta.glob failed to retrieve frames from src/assets/hero/.");
      return;
    }

    const preLoadAllFrames = async () => {
      let loadedCount = 0;

      const promises = resolvedUrls.map((url, i) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = () => {
            framesRef.current[i] = img;
            loadedCount++;
            resolve();
          };
          img.onerror = () => {
            console.error(`Frame failed to load: ${url}`);
            resolve(); // Resolve to let the process complete, but logging the failure
          };
        });
      });

      await Promise.all(promises);

      // Mark as loaded when frames have finished pre-loading
      setIsLoaded(true);
      setShowCanvas(true);
    };

    preLoadAllFrames();
  }, []);

  const renderFrame = (index: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const frameIndex = Math.min(resolvedUrls.length - 1, Math.max(0, Math.floor(index)));
    const img = framesRef.current[frameIndex];

    if (ctx && img && img.complete) {
      canvas.width = canvas.clientWidth || 1024;
      canvas.height = canvas.clientHeight || 576;

      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width / 2) - (img.width / 2) * scale;
      const y = (canvas.height / 2) - (img.height / 2) * scale;

      ctx.fillStyle = '#050816';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }
  };

  const startAnimation = () => {
    if (!canvasRef.current || !isLoaded || resolvedUrls.length === 0) return;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline();
    renderFrame(0);

    // Initial 3D state on canvas
    gsap.set(canvasRef.current, {
      opacity: 0,
      scale: 0.85,
      rotationX: 16,
      rotationY: -10,
      rotationZ: -2,
      transformPerspective: 1400
    });

    currentFrameObj.frame = 0;

    tl.to(canvasRef.current, {
      opacity: 1,
      scale: 1,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    // Run animation frames at exactly 30fps (duration = frames / 30)
    const animDuration = resolvedUrls.length / 30;

    tl.to(currentFrameObj, {
      frame: resolvedUrls.length - 1,
      duration: animDuration,
      ease: 'none',
      onUpdate: () => renderFrame(currentFrameObj.frame)
    }, 0);

    timelineRef.current = tl;
  };

  // Play animation once when preloading completes
  useEffect(() => {
    if (isLoaded) {
      startAnimation();
    }

    const onResize = () => {
      if (isLoaded) {
        renderFrame(currentFrameObj.frame);
      }
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [isLoaded]);

  return (
    <div
      ref={containerRef}
      onClick={startAnimation}
      className="relative w-full max-w-6xl aspect-[16/9] mx-auto overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050816] shadow-glass cursor-pointer"
    >
      {/* Fallback & Initial Loader Image: displays first frame instantly, fades to final frame when loaded */}
      <img
        src={isLoaded ? finalFrameUrl : firstFrameUrl}
        alt="Laptop Preview"
        className="absolute inset-0 w-full h-full object-cover rounded-2xl select-none pointer-events-none"
        style={{
          opacity: showCanvas ? 0.25 : 1,
          transition: 'opacity 0.6s ease-in-out'
        }}
      />

      {/* Ambient background glow behind the sequence */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-x-1/4 inset-y-1/4 bg-primary/10 rounded-full blur-[80px]" />
      </div>

      {/* Canvas Layer for playing the frame animations */}
      {showCanvas && (
        <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
      )}
    </div>
  );
};
