import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Leaf, Lock, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, signup, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = isSignup
        ? await signup(username.trim(), password)
        : await login(username.trim(), password);

      if (!result.success) {
        setError(result.error || "Authentication failed.");
        return;
      }

      if (isSignup) {
        setSuccess("Account created. You can sign in now.");
        setIsSignup(false);
        setPassword("");
      } else {
        setSuccess("Signed in successfully. Redirecting...");
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup((current) => !current);
    setError("");
    setSuccess("");
    setPassword("");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.22),transparent_28%),linear-gradient(135deg,#0f172a,#111827_48%,#020617)] p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/15 ring-1 ring-cyan-300/30">
              <Leaf className="h-5 w-5" />
            </div>
            Adaptive Ecosystem Simulator
          </div>

          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Distributed simulation platform
            </p>
            <h1 className="text-5xl font-bold leading-tight text-white">
              Production-grade ecosystem intelligence for simulation, monitoring, and prediction.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Secure access to real-time dashboards, ML predictions, operational alerts, and simulation reports.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm text-slate-300">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Realtime</p>
              <p className="mt-1">Socket.IO telemetry</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Secure</p>
              <p className="mt-1">JWT protected APIs</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">AI Ready</p>
              <p className="mt-1">Python ML service</p>
            </div>
          </div>
        </section>

        <main className="flex items-center justify-center px-6 py-12">
          <motion.div
            key={isSignup ? "signup" : "login"}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md"
          >
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold">Adaptive Ecosystem Simulator</span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/30">
              <div className="mb-8">
                <p className="text-sm font-medium text-cyan-300">
                  {isSignup ? "Create workspace access" : "Sign in to your workspace"}
                </p>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  {isSignup ? "Create account" : "Welcome back"}
                </h2>
              </div>

              {error && (
                <div className="mb-4 flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Username</span>
                  <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20">
                    <User className="h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Enter username"
                      className="w-full bg-transparent px-3 py-3 text-slate-100 outline-none placeholder:text-slate-500"
                      autoComplete="username"
                      disabled={loading}
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
                  <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20">
                    <Lock className="h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-transparent px-3 py-3 text-slate-100 outline-none placeholder:text-slate-500"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      disabled={loading}
                      minLength={8}
                      required
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading || !username.trim() || password.length < 8}
                  className="flex w-full items-center justify-center rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-800 pt-6 text-center text-sm text-slate-400">
                {isSignup ? "Already have an account?" : "Need an account?"}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="ml-2 font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  {isSignup ? "Sign in" : "Create one"}
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
