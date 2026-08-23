import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Activity,
  Workflow,
  BrainCircuit,
  Network,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

/* ─── Stage definitions ────────────────────────────────────────────────────── */
const stages = [
  {
    icon:  Activity,
    label: 'Telemetry Ingestion',
    desc:  'Raw metrics, logs & traces from all services',
    accent: '#38BDF8',
  },
  {
    icon:  Workflow,
    label: 'Stream Processing',
    desc:  'Real-time normalisation & feature extraction',
    accent: '#38BDF8',
  },
  {
    icon:  BrainCircuit,
    label: 'AI Detection & Prediction',
    desc:  'Isolation Forest + LSTM anomaly detection',
    accent: '#818CF8',
  },
  {
    icon:  Network,
    label: 'Root Cause Analysis',
    desc:  'Causal graph analysis & root cause ranking',
    accent: '#38BDF8',
  },
  {
    icon:  Sparkles,
    label: 'Narrative & Recommendations',
    desc:  'Validated fixes applied, incidents auto-closed',
    accent: '#10B981',
  },
];

/* ─── Animated connector line with travelling pulse ────────────────────────── */
const PulseConnector: React.FC<{
  active: boolean;
  accent: string;
  delay: number;
}> = ({ active, accent, delay }) => {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: 56,
        height: 64, // Matches the height of the 64px icon box
        alignSelf: 'flex-start', // Aligns with the icon box at the top
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Static baseline */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 1,
          background: 'rgba(255,255,255,0.07)',
        }}
      />
      {/* Glowing track — brightens when pulse is travelling */}
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 1,
          background: accent,
          transformOrigin: 'left',
        }}
        animate={{ scaleX: active ? 1 : 0, opacity: active ? 0.6 : 0 }}
        transition={{ duration: 0.4, delay }}
      />
      {/* Travelling dot */}
      <motion.div
        style={{
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: accent,
          boxShadow: `0 0 10px 3px ${accent}80`,
          top: 'calc(50% - 3px)', // Perfectly centered vertically
        }}
        animate={active ? { left: ['0%', '100%'] } : { left: '0%' }}
        transition={{ duration: 0.45, delay, ease: 'easeIn' }}
      />
      {/* Arrow tip */}
      <ArrowRight
        style={{
          position: 'absolute',
          right: -4,
          color: 'rgba(255,255,255,0.18)',
          width: 12,
          height: 12,
          top: 'calc(50% - 6px)', // Perfectly centered vertically
        }}
      />
    </div>
  );
};

/* ─── Individual pipeline node ─────────────────────────────────────────────── */
const PipelineNode: React.FC<{
  stage: (typeof stages)[number];
  index: number;
  active: boolean;
  appeared: boolean;
}> = ({ stage, index, active, appeared }) => {
  const Icon = stage.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={appeared ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="flex flex-col items-center text-center"
      style={{ width: 136 }}
    >
      {/* ── Node shell ── */}
      <motion.div
        animate={
          active
            ? {
                scale: 1.12,
                boxShadow: [
                  `0 0 0 1px ${stage.accent}40, 0 0 0 0 ${stage.accent}00`,
                  `0 0 0 1px ${stage.accent}80, 0 0 28px 6px ${stage.accent}30`,
                  `0 0 0 1px ${stage.accent}40, 0 0 12px 2px ${stage.accent}18`,
                ],
              }
            : { scale: 1, boxShadow: `0 0 0 1px rgba(56,189,248,0.12)` }
        }
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          /* Dark glassmorphism base */
          background: 'linear-gradient(145deg, rgba(11,18,32,0.92) 0%, rgba(15,23,42,0.88) 100%)',
          border: `1px solid ${active ? stage.accent + '55' : 'rgba(56,189,248,0.12)'}`,
          boxShadow: `0 0 0 1px rgba(56,189,248,0.12)`,
          backdropFilter: 'blur(12px)',
          transition: 'border-color 0.3s ease',
          cursor: 'default',
        }}
      >
        {/* Step badge */}
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#060E1E',
            border: `1px solid ${active ? stage.accent + '80' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
            color: active ? stage.accent : 'rgba(148,163,184,0.5)',
            fontFamily: 'Inter, sans-serif',
            transition: 'color 0.3s, border-color 0.3s',
          }}
        >
          {index + 1}
        </div>

        {/* Icon */}
        <motion.div
          animate={active ? { filter: `drop-shadow(0 0 8px ${stage.accent}cc)` } : { filter: 'none' }}
          transition={{ duration: 0.4 }}
        >
          <Icon
            style={{
              width: 26,
              height: 26,
              color: active ? stage.accent : 'rgba(148,163,184,0.65)',
              strokeWidth: 1.6,
              transition: 'color 0.35s ease',
            }}
          />
        </motion.div>
      </motion.div>

      {/* Label */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: active ? '#F1F5F9' : 'rgba(226,232,240,0.8)',
          fontFamily: 'Inter, sans-serif',
          marginBottom: 5,
          lineHeight: 1.3,
          transition: 'color 0.3s',
        }}
      >
        {stage.label}
      </p>
      <p
        style={{
          fontSize: 10,
          color: 'rgba(100,116,139,0.85)',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.5,
          maxWidth: 120,
        }}
      >
        {stage.desc}
      </p>
    </motion.div>
  );
};

/* ─── Main export ───────────────────────────────────────────────────────────── */
export const ArchitectureDiagram: React.FC = () => {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const inView      = useInView(sectionRef, { once: false, margin: '-120px' });
  const [appeared, setAppeared] = useState(false);

  // Which node index is currently "activated" by the travelling pulse
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stagger the node-appeared state slightly after in-view
  useEffect(() => {
    if (inView) setAppeared(true);
  }, [inView]);

  // Pulse cycle: activate each node in sequence, pause, then restart
  useEffect(() => {
    if (!appeared) return;

    let step = 0;
    const STEP_MS   = 900;   // time each node stays "active"
    const PAUSE_MS  = 2000;  // pause between full cycles

    const tick = () => {
      setActiveNode(step);
      step++;
      if (step < stages.length) {
        cycleRef.current = setTimeout(tick, STEP_MS);
      } else {
        // End of cycle — dim all, then restart
        cycleRef.current = setTimeout(() => {
          setActiveNode(null);
          step = 0;
          cycleRef.current = setTimeout(tick, 400);
        }, PAUSE_MS);
      }
    };

    // Small initial delay so user can see the static state first
    cycleRef.current = setTimeout(tick, 600);

    return () => {
      if (cycleRef.current) clearTimeout(cycleRef.current);
    };
  }, [appeared]);

  return (
    <div ref={sectionRef} className="w-full max-w-5xl mx-auto">
      {/* ── Pipeline row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          flexWrap: 'nowrap',
          gap: 0,
          overflowX: 'auto',
          overflowY: 'visible',
          paddingTop: 24, // Moves entire visual row (nodes and arrows) downward
          paddingBottom: 16,
        }}
      >
        {stages.map((stage, i) => (
          <React.Fragment key={stage.label}>
            <PipelineNode
              stage={stage}
              index={i}
              active={activeNode === i}
              appeared={appeared}
            />
            {i < stages.length - 1 && (
              <PulseConnector
                active={activeNode !== null && activeNode > i}
                accent={stage.accent}
                delay={0}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Metrics bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.55 }}
        style={{
          marginTop: 52,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          maxWidth: 560,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {[
          { label: 'Detection latency',  val: '< 200ms' },
          { label: 'False positive rate', val: '< 0.3%' },
          { label: 'Model accuracy',     val: '98.6%' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'linear-gradient(145deg, rgba(11,18,32,0.85) 0%, rgba(15,23,42,0.75) 100%)',
              border: '1px solid rgba(56,189,248,0.1)',
              borderRadius: 14,
              padding: '16px 14px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#38BDF8',
                fontFamily: 'Inter, sans-serif',
                marginBottom: 4,
                letterSpacing: '-0.02em',
              }}
            >
              {stat.val}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(100,116,139,0.9)', fontFamily: 'Inter, sans-serif' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
