import { useId } from 'react';

interface AutoOpsLogoProps {
  /** Rendered SVG size (square). Default 28 */
  size?: number;
  className?: string;
}

/**
 * AutoOps Pro — geometric network mark.
 *
 * Three-node topology: apex hub at top, two base nodes at bottom,
 * all three connected through a central convergence node. The outer
 * silhouette reads as an abstract upward triangle / delta / "A".
 * Ghost outer legs at low opacity add depth without visual noise.
 *
 * No background square. Gradient: brand-blue (#4F8BFF) → cyan (#06B6D4).
 * Hover glow is added by the consumer via CSS group-hover / filter.
 */
export const AutoOpsLogo: React.FC<AutoOpsLogoProps> = ({
  size = 28,
  className = '',
}) => {
  // useId ensures gradient IDs are unique per React tree instance
  const uid  = useId().replace(/:/g, '');
  const gId  = `aop-lg-${uid}`;   // line gradient
  const gIdF = `aop-fg-${uid}`;   // node fill gradient

  /*
   * Geometry (24 × 24 viewBox):
   *
   *          ● (12, 3)        ← apex hub   r=2.0
   *         /|\
   *        / | \
   *       /  |  \            ← ghost outer legs (10% opacity)
   *      / ● | ● \           ← crossbar nodes (12, 11) r=1.25 –– but we merge to one center node
   *     /  ╲ | ╱  \
   *    /    ╲|╱    \
   *   ●──────●──────●        ← base-left (4,21) center (12,13) base-right (20,21) r=1.6 / 1.2 / 1.6
   *   (4,21)  (12,13)  (20,21)
   *
   * Primary lines (opacity 1):
   *   apex  → center
   *   center→ base-left
   *   center→ base-right
   *
   * Secondary lines (opacity 0.38):
   *   base-left ↔ base-right  (crossbar)
   *
   * Ghost lines (opacity 0.13):
   *   apex → base-left
   *   apex → base-right
   */

  const AX = 12, AY = 3.2;    // apex
  const CX = 12, CY = 12.8;   // central convergence node
  const LX = 4,  LY = 21;     // base-left
  const RX = 20, RY = 21;     // base-right

  const SW  = 1.15;   // primary stroke width
  const SW2 = 0.85;   // secondary stroke width

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="AutoOps Pro"
      className={className}
    >
      <defs>
        {/* Top-to-bottom gradient: blue → cyan */}
        <linearGradient id={gId} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#4F8BFF" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Same gradient for node fills — diagonal for more dynamism */}
        <linearGradient id={gIdF} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#4F8BFF" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* ── Ghost outer legs (depth layer) ── */}
      <line x1={AX} y1={AY} x2={LX} y2={LY}
        stroke={`url(#${gId})`} strokeWidth={SW2} strokeLinecap="butt" strokeOpacity="0.13" />
      <line x1={AX} y1={AY} x2={RX} y2={RY}
        stroke={`url(#${gId})`} strokeWidth={SW2} strokeLinecap="butt" strokeOpacity="0.13" />

      {/* ── Secondary crossbar ── */}
      <line x1={LX} y1={LY} x2={RX} y2={RY}
        stroke={`url(#${gId})`} strokeWidth={SW2} strokeLinecap="square" strokeOpacity="0.38" />

      {/* ── Primary structural lines ── */}
      <line x1={AX} y1={AY} x2={CX} y2={CY}
        stroke={`url(#${gId})`} strokeWidth={SW} strokeLinecap="square" />
      <line x1={CX} y1={CY} x2={LX} y2={LY}
        stroke={`url(#${gId})`} strokeWidth={SW} strokeLinecap="square" />
      <line x1={CX} y1={CY} x2={RX} y2={RY}
        stroke={`url(#${gId})`} strokeWidth={SW} strokeLinecap="square" />

      {/* ── Nodes ── */}

      {/* Apex hub — largest, with outer ring accent */}
      <circle cx={AX} cy={AY} r={2.0} fill={`url(#${gIdF})`} />
      <circle cx={AX} cy={AY} r={3.4}
        stroke={`url(#${gId})`} strokeWidth="0.5" strokeOpacity="0.28" fill="none" />

      {/* Central convergence */}
      <circle cx={CX} cy={CY} r={1.25} fill={`url(#${gIdF})`} fillOpacity="0.82" />

      {/* Base nodes */}
      <circle cx={LX} cy={LY} r={1.6} fill={`url(#${gIdF})`} />
      <circle cx={RX} cy={RY} r={1.6} fill={`url(#${gIdF})`} />
    </svg>
  );
};

export default AutoOpsLogo;
