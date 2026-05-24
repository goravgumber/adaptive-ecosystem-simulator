import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Alert from "../components/ui/Alert";

export default function Signup() {
  const { signup, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await signup(username.trim(), password);
      if (result.success) {
        navigate("/login", { state: { message: "Account created! Please log in." } });
        return;
      }
      setError(result.error || "Sign up failed.");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-base">
      <div className="m-auto w-full max-w-sm px-6">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-glow-md">
          <div className="mb-6 text-center">
            <div className="text-5xl mb-3">🌿</div>
            <h1 className="text-text-primary font-semibold text-lg">Ecosystem Simulator</h1>
            <p className="text-text-muted text-sm">v3</p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full bg-elevated border border-border rounded text-text-primary font-mono text-sm px-3 py-2 placeholder-text-muted focus:border-accent outline-none ring-1 ring-transparent focus:ring-accent/20"
                placeholder="Choose a username"
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full bg-elevated border border-border rounded text-text-primary font-mono text-sm px-3 py-2 placeholder-text-muted focus:border-accent outline-none ring-1 ring-transparent focus:ring-accent/20"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-text-secondary text-xs font-mono uppercase tracking-wider mb-1">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full bg-elevated border border-border rounded text-text-primary font-mono text-sm px-3 py-2 placeholder-text-muted focus:border-accent outline-none ring-1 ring-transparent focus:ring-accent/20"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim() || !confirmPassword.trim()}
              className="flex w-full items-center justify-center gap-2 rounded bg-accent hover:bg-accent-dim text-base text-sm font-semibold px-4 py-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-accent hover:text-accent-dim transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
