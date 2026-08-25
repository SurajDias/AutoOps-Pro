import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Radar from '../../components/ui/Radar';

const STEPS = [
  'Preparing your local workspace...',
  'Loading the operations interface...',
  'Ready to connect to AutoOps telemetry...'
];

export default function AIInitialization() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { setInitialized } = useAuth();

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < STEPS.length) {
        setCurrentStep(step);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setInitialized(true); // Preserving original auth logic
          navigate('/dashboard');
        }, 1000);
      }
    }, 1200); // 1.2s per step
    return () => clearInterval(interval);
  }, [navigate, setInitialized]);

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* React Bits Radar background effect */}
      <div className="absolute inset-0 z-0 opacity-70">
        <Radar
          speed={0.8}
          scale={0.95}
          ringCount={9}
          spokeCount={8}
          ringThickness={0.015}
          spokeThickness={0.003}
          sweepSpeed={0.8}
          sweepWidth={2.5}
          sweepLobes={1}
          color="#38BDF8" // Electric blue / cyan
          backgroundColor="#030712"
          falloff={1.6}
          brightness={0.9}
          enableMouseInteraction={false}
        />
      </div>

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#030712_90%)] pointer-events-none z-1" />

      {/* Centered Content */}
      <div className="relative z-10 text-center space-y-6 max-w-sm px-6">
        
        {/* Step cycling text */}
        <div className="h-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentStep}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="text-base font-semibold font-mono tracking-wide text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]"
            >
              {STEPS[currentStep]}
            </motion.h2>
          </AnimatePresence>
        </div>

        {/* Subtle progress loading indicator */}
        <div className="w-48 h-[3px] bg-white/[0.06] rounded-full mx-auto overflow-hidden relative">
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>
      </div>

    </div>
  );
}
