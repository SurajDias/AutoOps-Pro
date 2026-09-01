import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Code, Radar, Bug, Cpu, Wrench } from 'lucide-react';

const steps = [
  { id: 'collect', title: 'Data Collection', desc: 'Ingesting logs, metrics, traces.', icon: Activity },
  { id: 'features', title: 'Feature Engineering', desc: 'Extracting valuable signals.', icon: Code },
  { id: 'detect', title: 'Anomaly Detection', desc: 'Identifying deviations.', icon: Radar },
  { id: 'rca', title: 'Root Cause Analysis', desc: 'Pinpointing the origin.', icon: Bug },
  { id: 'decision', title: 'Decision Engine', desc: 'Selecting best resolution.', icon: Cpu },
  { id: 'fix', title: 'Auto-Remediation', desc: 'Applying fixes automatically.', icon: Wrench },
];

export const AIWorkflow: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="w-full py-24 bg-[#050816]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#F5F7FA]">Intelligent AI Pipeline</h2>
          <p className="text-[#9FB0C7] mt-4">Transparent and explainable machine learning workflow.</p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Steps List */}
          <div className="w-full lg:w-1/2 space-y-4">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  className={`p-4 rounded-xl cursor-pointer border transition-all duration-300 flex items-center space-x-4 ${isActive ? 'bg-[#0D1728] border-[#4F8BFF] shadow-[0_0_20px_rgba(79,139,255,0.15)]' : 'bg-transparent border-transparent hover:bg-[#0D1728]/50'}`}
                  onClick={() => setActiveStep(index)}
                  whileHover={{ x: 5 }}
                >
                  <div className={`p-3 rounded-lg ${isActive ? 'bg-[#4F8BFF]/20 text-[#4F8BFF]' : 'bg-[#050816] text-[#9FB0C7]'}`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${isActive ? 'text-[#F5F7FA]' : 'text-[#9FB0C7]'}`}>{step.title}</h4>
                    <p className={`text-sm ${isActive ? 'text-[#7ED7FF]' : 'text-gray-500'}`}>{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Visualization area */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
             <motion.div
               key={activeStep}
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ type: 'spring', stiffness: 200, damping: 20 }}
               className="w-full max-w-md aspect-square bg-[#0D1728] rounded-3xl border border-[#4F8BFF]/30 flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-2xl"
             >
                <div className="absolute inset-0 bg-gradient-to-br from-[#4F8BFF]/10 to-transparent" />

                <div className="w-32 h-32 mb-8 rounded-full bg-[#050816] flex items-center justify-center border-4 border-[#4F8BFF]/50 relative z-10">
                  {React.createElement(steps[activeStep].icon, { size: 64, className: 'text-[#4F8BFF]' })}
                </div>

                <h3 className="text-2xl font-bold text-[#F5F7FA] mb-4 text-center relative z-10">{steps[activeStep].title}</h3>
                <p className="text-[#9FB0C7] text-center relative z-10">{steps[activeStep].desc}</p>

                {/* Decorative background grid */}
                <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#7ED7FF 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
             </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
