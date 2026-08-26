import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Predictions = lazy(() => import('./pages/Predictions/Predictions'));
const Incidents = lazy(() => import('./pages/Incidents/Incidents'));
const ServiceMap = lazy(() => import('./pages/ServiceMap/ServiceMap'));
const AISimulator = lazy(() => import('./pages/AISimulator/AISimulator'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Signup = lazy(() => import('./pages/Auth/Signup'));
const AIInitialization = lazy(() => import('./pages/Auth/AIInitialization'));

import { ToastContainer } from './components/common/ToastContainer';
import { CommandPalette } from './components/common/CommandPalette';
import { CursorSpotlight } from './components/common/CursorSpotlight';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isInitialized) {
    return <Navigate to="/init" replace />;
  }

  return <>{children}</>;
};

const InitRoute: React.FC = () => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isInitialized) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AIInitialization />;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (isAuthenticated && isInitialized) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated && !isInitialized) {
    return <Navigate to="/init" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <>
      <CursorSpotlight />
      <ToastContainer />
      <CommandPalette />
      
      <Suspense fallback={<div className="min-h-screen grid place-items-center bg-background text-text-muted text-sm">Loading AutoOps Pro…</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Authentication */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <AuthRoute>
              <Signup />
            </AuthRoute>
          }
        />

        <Route path="/init" element={<InitRoute />} />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/service-map" element={<ServiceMap />} />
          <Route path="/ai-simulator" element={<AISimulator />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
