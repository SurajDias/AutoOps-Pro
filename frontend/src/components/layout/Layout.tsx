import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../navbar/Navbar';
import Sidebar from '../sidebar/Sidebar';
import PageTransition from './PageTransition';

const Layout: React.FC = () => {
  return (
    <div className="flex bg-background min-h-screen text-text-primary font-sans selection:bg-accent/30 selection:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-x-hidden p-6 relative">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
};

export default Layout;
