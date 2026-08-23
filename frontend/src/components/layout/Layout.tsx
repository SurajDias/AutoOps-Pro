import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';
import { CursorSpotlight } from '../common/CursorSpotlight';
import { CommandPalette } from '../common/CommandPalette';
import { ToastContainer } from '../common/ToastContainer';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-text-primary font-body flex flex-col selection:bg-primary/30 selection:text-white">
      <CursorSpotlight />
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
