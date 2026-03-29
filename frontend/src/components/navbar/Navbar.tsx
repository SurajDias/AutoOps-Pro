import React from 'react';
import { FiBell, FiSearch, FiSettings, FiUser } from 'react-icons/fi';

const Navbar: React.FC = () => {
  return (
    <nav className="h-16 border-b border-white/5 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative w-full max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search resources, metrics, logs..." 
            className="w-full bg-card/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-muted"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 text-text-secondary hover:text-accent transition-colors relative">
          <FiBell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse flex"></span>
        </button>
        <button className="p-2 text-text-secondary hover:text-accent transition-colors">
          <FiSettings size={20} />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-accent to-accent-dark flex items-center justify-center text-white cursor-pointer hover:shadow-neon transition-shadow shadow-sm">
          <FiUser size={16} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
