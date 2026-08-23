import React, { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import './CardSwap.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CardSwapProps {
  /** Horizontal offset (px) between each stacked card. */
  cardDistance?: number;
  /** Vertical offset (px) each background card rises above the front card. */
  verticalDistance?: number;
  /** Auto-advance interval in ms. */
  delay?: number;
  /** Whether to pause the auto-advance when the user hovers the stack. */
  pauseOnHover?: boolean;
  /** Subtle skew applied to background cards for depth. */
  skewAmount?: number;
  /** GSAP easing preset. */
  easing?: 'elastic' | 'power3' | 'power4' | 'back';
  children: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getEase = (e: CardSwapProps['easing']): string => {
  switch (e) {
    case 'elastic': return 'elastic.out(1, 0.75)';
    case 'power4':  return 'power4.out';
    case 'back':    return 'back.out(1.7)';
    default:        return 'power3.out';
  }
};

// ─── CardSwap ─────────────────────────────────────────────────────────────────
/**
 * A GSAP-powered card-stack that continuously rotates the top card to the back.
 *
 * Slot 0  = front card  (bottom of stack,  no offset, highest z-index)
 * Slot N  = last card   (top of visual stack, maximum offset, lowest z-index)
 *
 * Each child is wrapped in a real <div> (card-swap-card) so GSAP can target
 * the DOM element directly via a ref — no querySelector / data-attribute hacks.
 */
const CardSwap: React.FC<CardSwapProps> = ({
  cardDistance   = 55,
  verticalDistance = 55,
  delay          = 5000,
  pauseOnHover   = true,
  skewAmount     = 4,
  easing         = 'elastic',
  children,
}) => {
  const childArray = React.Children.toArray(children);
  const total      = childArray.length;
  const ease       = getEase(easing);

  // Array of refs — one per card wrapper div
  const cardRefs   = useRef<(HTMLDivElement | null)[]>(Array(total).fill(null));
  // Current order: orderRef.current[0] = index of the card currently at the FRONT
  const orderRef   = useRef<number[]>(Array.from({ length: total }, (_, i) => i));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef  = useRef(false);

  // ── Position helpers ────────────────────────────────────────────────────────
  // slot 0 → front card (no offset), slot total-1 → furthest back
  const slotProps = useCallback(
    (slot: number) => ({
      x:      slot * cardDistance,
      y:      slot * -verticalDistance,     // negative = upward
      scale:  Math.max(0.82, 1 - slot * 0.045),
      zIndex: total - slot,
      skewY:  slot === 0 ? 0 : -skewAmount * 0.25,
    }),
    [cardDistance, verticalDistance, total, skewAmount],
  );

  // ── Set initial positions (instant, no animation) ───────────────────────────
  useEffect(() => {
    // Small delay to guarantee refs are populated after first paint
    const t = setTimeout(() => {
      orderRef.current.forEach((cardIdx, slot) => {
        const el = cardRefs.current[cardIdx];
        if (el) gsap.set(el, slotProps(slot));
      });
    }, 60);
    return () => clearTimeout(t);
  }, [slotProps]);

  // ── One swap cycle ───────────────────────────────────────────────────────────
  const doSwap = useCallback(() => {
    if (pausedRef.current) return;

    const order    = [...orderRef.current];
    const frontIdx = order[0];                        // card currently at front
    const newOrder = [...order.slice(1), frontIdx];   // move front to back
    orderRef.current = newOrder;

    // 1. Move every card that is NOT the departing front card to its new slot
    newOrder.forEach((cardIdx, slot) => {
      if (cardIdx === frontIdx) return;
      const el = cardRefs.current[cardIdx];
      if (!el) return;
      gsap.to(el, {
        ...slotProps(slot),
        duration: 0.7,
        ease,
        overwrite: true,
      });
    });

    // 2. Animate the departing front card:
    //    a) dip it down briefly (feels like it's being pulled under)
    //    b) snap it to its new back-of-stack position
    const frontEl  = cardRefs.current[frontIdx];
    const backSlot = newOrder.indexOf(frontIdx);
    const back     = slotProps(backSlot);

    if (frontEl) {
      gsap.killTweensOf(frontEl);
      gsap
        .timeline()
        .to(frontEl, {
          y:       60,
          scale:   0.86,
          opacity: 0.4,
          duration: 0.22,
          ease:    'power2.in',
        })
        .set(frontEl, { zIndex: back.zIndex })
        .to(frontEl, {
          x:       back.x,
          y:       back.y,
          scale:   back.scale,
          skewY:   back.skewY,
          opacity: 1,
          duration: 0.55,
          ease,
        });
    }
  }, [ease, slotProps]);

  // ── Auto-interval ────────────────────────────────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(doSwap, delay);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [doSwap, delay]);

  // ── Hover pause/resume ───────────────────────────────────────────────────────
  const onEnter = useCallback(() => { if (pauseOnHover) pausedRef.current = true;  }, [pauseOnHover]);
  const onLeave = useCallback(() => { if (pauseOnHover) pausedRef.current = false; }, [pauseOnHover]);

  return (
    <div
      className="card-swap-container"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {childArray.map((child, i) => (
        <div
          key={i}
          ref={(el) => { cardRefs.current[i] = el; }}
          className="card-swap-card"
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export default CardSwap;
