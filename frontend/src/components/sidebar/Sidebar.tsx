import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiGrid, FiMap, FiMessageSquare, FiTrendingUp, FiFileText, FiLogOut } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const menuItems = [
    { icon: FiGrid, label: 'Dashboard', path: '/dashboard' },
    { icon: FiTrendingUp, label: 'Predictions', path: '/predictions' },
    { icon: FiAlertTriangle, label: 'Incidents', path: '/incidents' },
    { icon: FiMap, label: 'Service Map', path: '/service-map' },
    { icon: FiMessageSquare, label: 'AI Simulator', path: '/ai-simulator' },
    { icon: FiFileText, label: 'Logs', path: '/logs' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-64 border-r border-white/5 bg-card/30 flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-neon">
            <FiActivity className="text-background" size={20} />
          </div>
          <span className="font-bold text-lg text-white tracking-wide">AutoOps Pro</span>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2">
          Main Menu
        </div>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                isActive 
                  ? 'text-accent bg-accent/10' 
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
                <item.icon size={18} className={isActive ? 'text-accent' : 'group-hover:text-white transition-colors'} />
                <span className="font-medium text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      <div className="p-4 border-t border-white/5 space-y-3">
        <div className="bg-gradient-to-br from-card to-background p-4 rounded-xl border border-white/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-accent/20 rounded-full blur-xl"></div>
          <h4 className="text-sm text-white font-medium mb-1 relative z-10">AI Agent Active</h4>
          <p className="text-xs text-text-muted relative z-10 mb-3">Monitoring system health</p>
          <div className="flex items-center gap-2 relative z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-xs text-accent">Real-time analysis</span>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-400/5 transition-all text-sm font-medium">
          <FiLogOut size={16} />
          {user ? <span>Logout ({user.email.split('@')[0]})</span> : <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
