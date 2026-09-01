import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Zap, AlertTriangle, GitMerge, Bot, Settings } from 'lucide-react';

const modules = [
  { title: 'Unified Dashboard', desc: 'Centralized observability across your entire tech stack.', icon: LayoutDashboard },
  { title: 'Predictive Insights', desc: 'AI forecasts potential bottlenecks before they occur.', icon: Zap },
  { title: 'Incident Response', desc: 'Automated triage and blameless post-mortem generation.', icon: AlertTriangle },
  { title: 'Service Topologies', desc: 'Dynamic mapping of microservices and dependencies.', icon: GitMerge },
  { title: 'AI Simulator', desc: 'Test resilience by simulating failures and evaluating AI responses.', icon: Bot },
  { title: 'Custom Runbooks', desc: 'Configure automation workflows tailored to your infrastructure.', icon: Settings },
];

export const PlatformPreview: React.FC = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } }
  };

  return (
    <div className="w-full py-24 bg-[#050816]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#F5F7FA]">Comprehensive Toolset</h2>
          <p className="text-[#9FB0C7] mt-4">Everything you need to maintain 99.99% uptime.</p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={i}
                variants={item}
                whileHover={{ scale: 1.05 }}
                className="bg-[#0D1728]/80 backdrop-blur-sm border border-[#4F8BFF]/20 rounded-2xl p-6 flex flex-col group hover:border-[#4F8BFF]/60 hover:shadow-[0_8px_30px_rgba(79,139,255,0.15)] transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4F8BFF]/10 flex items-center justify-center mb-6 group-hover:bg-[#4F8BFF]/20 transition-colors">
                  <Icon className="text-[#4F8BFF]" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-[#F5F7FA] mb-3">{mod.title}</h3>
                <p className="text-[#9FB0C7] text-sm leading-relaxed flex-grow">{mod.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
