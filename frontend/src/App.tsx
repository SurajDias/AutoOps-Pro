import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Predictions from './pages/Predictions/Predictions';
import Incidents from './pages/Incidents/Incidents';
import ServiceMap from './pages/ServiceMap/ServiceMap';
import AISimulator from './pages/AISimulator/AISimulator';
// import Logs from './pages/Logs/Logs';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import AIInitialization from './pages/Auth/AIInitialization';

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
    <Routes>
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
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="service-map" element={<ServiceMap />} />
        <Route path="ai-simulator" element={<AISimulator />} />



        {/* Logs page removed because it does not exist */}
        {/* <Route path="logs" element={<Logs />} /> */}

      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
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