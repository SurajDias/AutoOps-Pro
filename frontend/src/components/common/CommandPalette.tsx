import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, TrendingUp, AlertTriangle,
  Map, Cpu, Settings, LogOut, ArrowRight
} from 'lucide-react';
import { AutoOpsLogo } from '../ui/AutoOpsLogo';
import { useAuth } from '../../context/AuthContext';

interface CommandItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: string;
  hint: string;
}

interface CommandGroup {
  label: string;
  items: CommandItem[];
}

const groups: CommandGroup[] = [
  {
    label: 'Navigate',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', hint: 'Overview' },
      { name: 'Predictions', icon: TrendingUp, path: '/predictions', hint: 'Failure forecasts' },
      { name: 'Incidents', icon: AlertTriangle, path: '/incidents', hint: 'Active incidents' },
      { name: 'Service Map', icon: Map, path: '/service-map', hint: 'Topology graph' },
      { name: 'AI Simulator', icon: Cpu, path: '/ai-simulator', hint: 'Scenario simulation' },
      { name: 'Settings', icon: Settings, path: '/settings', hint: 'Platform config' },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Sign Out', icon: LogOut, action: 'logout', hint: 'Log out of AutoOps Pro' },
    ],
  },
];

const allItems: CommandItem[] = groups.flatMap((g) => g.items);

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const filtered = query
    ? allItems.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    const onCustom = () => setIsOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onCustom);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelected(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleSelect = (item: CommandItem) => {
    setIsOpen(false);
    if (item.path) {
      navigate(item.path);
    } else if (item.action === 'logout') {
      logout();
      navigate('/login');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected]) {
      handleSelect(filtered[selected]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-background/70 backdrop-blur-md z-[200]"
            onClick={() => setIsOpen(false)}
          />

          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-[18%] left-1/2 -translate-x-1/2 w-full max-w-[560px] z-[201] px-4"
          >
            <div className="bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search…"
                  className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted text-sm"
                />
                <kbd className="text-[10px] font-mono text-text-muted bg-elevated px-2 py-0.5 rounded border border-white/5">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-[340px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-elevated">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-sm">No results for "{query}"</div>
                ) : query ? (
                  filtered.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelected(i)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors group ${
                          selected === i ? 'bg-primary/10 text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${selected === i ? 'text-primary' : 'text-text-muted group-hover:text-primary'} transition-colors`} />
                        <span className="flex-1 text-sm font-medium">{item.name}</span>
                        {item.hint && <span className="text-xs text-text-muted">{item.hint}</span>}
                        {selected === i && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })
                ) : (
                  groups.map((group) => (
                    <div key={group.label} className="mb-2">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted tracking-widest uppercase">
                        {group.label}
                      </div>
                      {group.items.map((item) => {
                        const globalIdx = allItems.indexOf(item);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.name}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelected(globalIdx)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group ${
                              selected === globalIdx ? 'bg-primary/10 text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${selected === globalIdx ? 'text-primary' : 'text-text-muted group-hover:text-primary'} transition-colors`} />
                            <span className="flex-1 text-sm font-medium">{item.name}</span>
                            {item.hint && <span className="text-xs text-text-muted">{item.hint}</span>}
                            {selected === globalIdx && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/[0.06] flex items-center gap-4 text-[10px] text-text-muted">
                <span className="flex items-center gap-1"><AutoOpsLogo size={13} /> AutoOps Pro</span>
                <span className="ml-auto flex items-center gap-2">
                  <kbd className="bg-elevated px-1.5 py-0.5 rounded border border-white/5">↑↓</kbd> navigate
                  <kbd className="bg-elevated px-1.5 py-0.5 rounded border border-white/5">↵</kbd> open
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
