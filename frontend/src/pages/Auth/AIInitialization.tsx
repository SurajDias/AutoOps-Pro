import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const initMessages = [
  { text: 'Initializing AI Engine...', duration: 1200 },
  { text: 'Loading anomaly detection models...', duration: 1400 },
  { text: 'Building service dependency graph...', duration: 1300 },
  { text: 'Running predictive simulations...', duration: 1500 },
  { text: 'Calibrating failure thresholds...', duration: 1000 },
  { text: 'System ready', duration: 800 },
];

const sysLogs = [
  '[core] TensorFlow runtime v2.14 loaded',
  '[model] anomaly_detector_v3.bin → OK (94.2% accuracy)',
  '[model] failure_predictor_v2.bin → OK',
  '[graph] 6 services mapped, 8 edges resolved',
  '[sim] Monte Carlo engine initialized (10k iterations)',
  '[net] WebSocket channels established',
  '[auth] Session token validated',
  '[core] All subsystems operational',
];

const AIInitialization: React.FC = () => {
  const [currentMsg, setCurrentMsg] = useState(0);
  const [progress, setProgress] = useState(0);
  const [displayedLogs, setDisplayedLogs] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();
  const { setInitialized } = useAuth();

  // Progress through messages
  useEffect(() => {
    if (currentMsg >= initMessages.length) return;
    const timer = setTimeout(() => {
      setCurrentMsg(prev => prev + 1);
      setProgress(((currentMsg + 1) / initMessages.length) * 100);
    }, initMessages[currentMsg].duration);
    return () => clearTimeout(timer);
  }, [currentMsg]);

  // System logs appearing
  useEffect(() => {
    const logTimers = sysLogs.map((log, i) =>
      setTimeout(() => setDisplayedLogs(prev => [...prev, log]), 500 + i * 900)
    );
    return () => logTimers.forEach(clearTimeout);
  }, []);

  // Completion: flash + redirect
  useEffect(() => {
    if (currentMsg >= initMessages.length) {
      setTimeout(() => setFlash(true), 400);
      setTimeout(() => {
        setFlash(false);
        setExiting(true);
      }, 900);
      setTimeout(() => {
        setInitialized(true);
        navigate('/dashboard', { replace: true });
      }, 1600);
    }
  }, [currentMsg, navigate, setInitialized]);

  const isComplete = currentMsg >= initMessages.length;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      
      {/* Ambient glow */}
      <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Flash effect */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-accent/20 z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Exit zoom */}
      <motion.div
        animate={exiting ? { scale: 1.3, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-12 relative z-10"
      >
        {/* Rotating Rings */}
        <div className="relative w-52 h-52 flex items-center justify-center">
          {/* Outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-accent/20"
            style={{ boxShadow: '0 0 40px rgba(34,197,94,0.15), inset 0 0 40px rgba(34,197,94,0.05)' }}
          >
            {/* Orbit dots */}
            {[0, 90, 180, 270].map((deg) => (
              <div key={deg} className="absolute w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(34,197,94,0.8)]" style={{ top: '50%', left: '50%', transform: `rotate(${deg}deg) translateY(-104px) translate(-50%, -50%)` }} />
            ))}
          </motion.div>

          {/* Middle ring */}
          <motion.div
            animate={{ rotate: -360, scale: [1, 1.05, 1] }}
            transition={{ rotate: { repeat: Infinity, duration: 6, ease: 'linear' }, scale: { repeat: Infinity, duration: 2 } }}
            className="absolute inset-5 rounded-full border border-accent/30"
            style={{ boxShadow: '0 0 30px rgba(34,197,94,0.1)' }}
          >
            {[45, 135, 225, 315].map((deg) => (
              <div key={deg} className="absolute w-2 h-2 rounded-full bg-accent/60 shadow-[0_0_8px_rgba(34,197,94,0.6)]" style={{ top: '50%', left: '50%', transform: `rotate(${deg}deg) translateY(-78px) translate(-50%, -50%)` }} />
            ))}
          </motion.div>

          {/* Inner ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            className="absolute inset-12 rounded-full border border-accent/40"
          >
            {[0, 120, 240].map((deg) => (
              <div key={deg} className="absolute w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(34,197,94,0.9)]" style={{ top: '50%', left: '50%', transform: `rotate(${deg}deg) translateY(-48px) translate(-50%, -50%)` }} />
            ))}
          </motion.div>

          {/* Center core */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], boxShadow: ['0 0 20px rgba(34,197,94,0.3)', '0 0 50px rgba(34,197,94,0.6)', '0 0 20px rgba(34,197,94,0.3)'] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/50 flex items-center justify-center z-10"
          >
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-6 h-6 rounded-full bg-accent shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
          </motion.div>

          {/* Connection pulse lines */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <motion.div
              key={deg}
              animate={{ opacity: [0, 0.6, 0], scaleY: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, delay: deg / 360 * 2 }}
              className="absolute w-px h-16 bg-gradient-to-b from-transparent via-accent/40 to-transparent origin-bottom"
              style={{ top: '10%', left: '50%', transform: `rotate(${deg}deg)` }}
            />
          ))}
        </div>

        {/* Status Messages */}
        <div className="flex flex-col items-center gap-4 min-h-[80px]">
          <AnimatePresence mode="wait">
            {currentMsg < initMessages.length && (
              <motion.div
                key={currentMsg}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`text-lg font-semibold tracking-wide ${isComplete ? 'text-accent' : 'text-white'}`}
              >
                {initMessages[currentMsg].text}
              </motion.div>
            )}
            {isComplete && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xl font-bold text-accent flex items-center gap-2"
              >
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-3 h-3 rounded-full bg-accent shadow-[0_0_12px_rgba(34,197,94,0.8)]" />
                System Ready
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="w-80">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-accent rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-text-muted font-mono">{Math.round(progress)}%</span>
            <span className="text-[10px] text-text-muted font-mono">{currentMsg}/{initMessages.length} modules</span>
          </div>
        </div>

        {/* System Logs */}
        <div className="w-96 max-h-40 overflow-hidden bg-background/60 border border-white/5 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">System Log</span>
          </div>
          <div className="space-y-0.5 font-mono text-[10px] max-h-24 overflow-y-auto">
            {displayedLogs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-text-muted/70"
              >
                <span className="text-accent/60">&gt;</span> {log}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AIInitialization;
