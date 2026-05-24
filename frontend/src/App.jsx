import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
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

const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
    <h3 className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">
      Ecosystem Simulator
    </h3>
    <p className="text-gray-500 dark:text-gray-400">{message}</p>
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
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
      <p className="text-gray-600 dark:text-gray-400">Loading page...</p>
    </div>
  </div>
);

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md text-center"
    >
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg bg-slate-800">
        <AlertTriangle className="h-9 w-9 text-cyan-300" />
      </div>
      <h1 className="mb-4 text-4xl font-bold text-gray-800 dark:text-gray-100">
        404 - Page Not Found
      </h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-600 px-6 py-3 text-white transition-colors hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
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
    <Layout>
      <AnimatePresence mode="wait">
        <Suspense fallback={<SuspenseFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <PageWrapper>
                    <Dashboard />
                  </PageWrapper>
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route
              path="/simulation"
              element={
                <ProtectedRoute>
                  <PageWrapper>
                    <Simulation />
                  </PageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <PageWrapper>
                    <Reports />
                  </PageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <PageWrapper>
                    <Settings />
                  </PageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/logbook"
              element={
                <ProtectedRoute>
                  <PageWrapper>
                    <Logbook />
                  </PageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/monitoring"
              element={
                <ProtectedRoute>
                  <PageWrapper>
                    <Monitoring />
                  </PageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <PageWrapper>
                    <Alerts />
                  </PageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/predictions"
              element={
                <ProtectedRoute>
                  <PageWrapper>
                    <Predictions />
                  </PageWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <PageWrapper>
                    <Login />
                  </PageWrapper>
                </PublicRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </Layout>
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-9 w-9 text-red-500" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-100">
              Something went wrong
            </h1>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              The application encountered an unexpected error. Please refresh the page or try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
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
      <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-gray-900">
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
