import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SimulationProvider } from "./context/SimulationContext";
import { DashboardProvider } from "./context/DashboardContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Simulation = lazy(() => import("./pages/Simulation"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Logbook = lazy(() => import("./pages/LogBook"));
const Monitoring = lazy(() => import("./pages/Monitoring"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Predictions = lazy(() => import("./pages/Predictions"));
const History = lazy(() => import("./pages/History"));

const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-base">
    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
    <h3 className="mb-2 text-lg font-semibold text-text-primary">
      Ecosystem Simulator
    </h3>
    <p className="text-text-muted">{message}</p>
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Checking authentication..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Checking authentication..." />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

const SuspenseFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      <p className="text-text-muted">Loading page...</p>
    </div>
  </div>
);

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-base p-6">
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md text-center"
    >
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg bg-surface border border-border">
        <AlertTriangle className="h-9 w-9 text-warning" />
      </div>
      <h1 className="mb-4 text-4xl font-bold text-text-primary">
        404 - Page Not Found
      </h1>
      <p className="mb-8 text-text-secondary">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-dim px-6 py-3 text-base font-medium transition-colors"
        >
          <Home className="h-4 w-4" />
          Home
        </button>
      </div>
    </motion.div>
  </div>
);

function AppContent() {
  const location = useLocation();

  return (
    <>
      <AnimatePresence mode="wait">
        <Suspense fallback={<SuspenseFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <PageWrapper><Dashboard /></PageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route
                path="/simulation"
                element={
                  <ProtectedRoute>
                    <PageWrapper><Simulation /></PageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <PageWrapper><Reports /></PageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <PageWrapper><Settings /></PageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logbook"
                element={
                  <ProtectedRoute>
                    <PageWrapper><Logbook /></PageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/monitoring"
                element={
                  <ProtectedRoute>
                    <PageWrapper><Monitoring /></PageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <PageWrapper><Alerts /></PageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/predictions"
                element={
                  <ProtectedRoute>
                    <PageWrapper><Predictions /></PageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <PageWrapper><History /></PageWrapper>
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-base p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg bg-danger-muted border border-danger/30">
              <AlertTriangle className="h-9 w-9 text-danger" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-text-primary">
              Something went wrong
            </h1>
            <p className="mb-6 text-text-secondary">
              The application encountered an unexpected error. Please refresh the page or try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-dim px-6 py-3 text-base font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-base text-text-primary transition-colors duration-300">
        <AuthProvider>
          <SimulationProvider>
            <DashboardProvider>
              <AppContent />
            </DashboardProvider>
          </SimulationProvider>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}