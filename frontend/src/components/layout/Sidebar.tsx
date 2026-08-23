import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, AlertTriangle, Map,
  Cpu, Settings, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { name: 'Dashboard',    icon: LayoutDashboard, path: '/dashboard',   hint: 'System overview' },
  { name: 'Predictions',  icon: TrendingUp,       path: '/predictions',  hint: 'Failure forecasts' },
  { name: 'Incidents',    icon: AlertTriangle,    path: '/incidents',    hint: 'Active incidents' },
  { name: 'Service Map',  icon: Map,              path: '/service-map',  hint: 'Topology graph' },
  { name: 'AI Simulator', icon: Cpu,              path: '/ai-simulator', hint: 'Scenario engine' },
];

const bottomItems = [
  { name: 'Settings', icon: Settings, path: '/settings', hint: 'Platform config' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 228 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="hidden md:flex h-[calc(100vh-4rem)] bg-background border-r border-white/[0.06] flex-col justify-between shrink-0 z-30 relative overflow-hidden"
    >
      {/* Subtle inner gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

      {/* Top nav items */}
      <div className="py-5 px-2.5 flex flex-col gap-1 relative">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-primary/[0.12] text-white border border-primary/25 shadow-[0_0_20px_rgba(79,139,255,0.08)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04] border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? 'text-primary' : 'text-text-muted group-hover:text-primary'
                  }`}
                />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden font-body"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Bottom section */}
      <div className="pb-4 px-2.5 flex flex-col gap-1 border-t border-white/[0.06] pt-3 relative">
        {bottomItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 group border ${
                isActive
                  ? 'bg-primary/[0.12] text-white border-primary/25'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04] border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-primary'} transition-colors`} />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden font-body"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center px-3 py-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors mt-1"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.25 }}>
            <ChevronRight className="w-[18px] h-[18px]" />
          </motion.div>
        </button>
      </div>
    </motion.aside>
  );
}
