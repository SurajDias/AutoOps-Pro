import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Search, User, LogOut, ChevronDown } from 'lucide-react';
import { AutoOpsLogo } from '../ui/AutoOpsLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLive, setIsLive] = useState(() => localStorage.getItem('autoops_live_mode') === 'true');
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const syncMode = (event: Event) => setIsLive((event as CustomEvent<boolean>).detail);
    window.addEventListener('autoops-mode-synced', syncMode);
    return () => window.removeEventListener('autoops-mode-synced', syncMode);
  }, []);

  // Sync Live/Demo toggle — keeps existing localStorage + custom event logic
  const handleToggleMode = () => {
    const next = !isLive;
    setIsLive(next);
    localStorage.setItem('autoops_live_mode', String(next));
    window.dispatchEvent(new CustomEvent('autoops-mode-change', { detail: next }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) setShowDropdown(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showDropdown]);

  return (
    <nav
      className={`sticky top-0 z-40 w-full h-16 flex items-center justify-between px-6 transition-all duration-300 select-none border-b ${
        scrolled
          ? 'bg-background/80 backdrop-blur-2xl border-white/[0.08] shadow-[0_1px_0_rgba(255,255,255,0.04)]'
          : 'bg-background/60 backdrop-blur-xl border-white/[0.06]'
      }`}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 cursor-pointer group"
        onClick={() => navigate('/dashboard')}
      >
        <AutoOpsLogo
          size={28}
          className="transition-[filter] duration-300 ease-out group-hover:[filter:drop-shadow(0_0_5px_rgba(6,182,212,0.7))]"
        />
        <span className="font-heading font-bold text-base text-text-primary tracking-tight">
          AutoOps <span className="text-primary">Pro</span>
        </span>
      </div>

      {/* Nav links */}
      <div className="hidden lg:flex items-center gap-1">
        {[
          { name: 'Dashboard',    path: '/dashboard' },
          { name: 'Predictions',  path: '/predictions' },
          { name: 'Incidents',    path: '/incidents' },
          { name: 'Service Map',  path: '/service-map' },
          { name: 'AI Simulator', path: '/ai-simulator' },
        ].map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-text-primary bg-white/[0.06]'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">

        {/* Live / Demo toggle */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-elevated border border-white/[0.06]">
          <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${!isLive ? 'text-accent' : 'text-text-muted'}`}>
            Demo
          </span>
          <button
            onClick={handleToggleMode}
            className={`w-8 h-4.5 rounded-full relative transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              isLive ? 'bg-primary' : 'bg-white/10'
            }`}
            title="Toggle Live / Demo metrics mode"
          >
            <motion.div
              animate={{ x: isLive ? 14 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm"
            />
          </button>
          <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${isLive ? 'text-primary' : 'text-text-muted'}`}>
            Live
          </span>
          {isLive && (
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5"
            />
          )}
        </div>

        {/* Search */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated border border-white/[0.06] text-text-muted hover:text-text-primary hover:border-primary/25 transition-all text-xs"
          title="Command palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:block font-mono tracking-wide text-[10px]">⌘K</span>
        </button>

        {/* Bell */}
        <button className="relative w-9 h-9 rounded-lg bg-elevated border border-white/[0.06] flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary/25 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative" data-user-menu>
          <button
            data-user-menu
            onClick={() => setShowDropdown((s) => !s)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg bg-elevated border border-white/[0.06] hover:border-primary/25 transition-all"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="hidden sm:block text-xs font-medium text-text-muted max-w-[100px] truncate">
              {user?.email?.split('@')[0] || 'admin'}
            </span>
            <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                data-user-menu
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 bg-surface/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] p-1.5 z-50"
              >
                <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Signed in as</p>
                  <p className="text-sm font-semibold text-text-primary truncate mt-0.5">
                    {user?.email || 'admin@autoops.pro'}
                  </p>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
