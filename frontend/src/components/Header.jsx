import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Sun, Moon, LogOut, LogIn, User, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, loading, isAuthenticated } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <header className="bg-surface border-b border-border p-4 flex justify-between items-center transition duration-300">
        <h1 className="text-xl font-bold text-text-primary">Adaptive Ecosystem Simulator</h1>
        <div className="flex items-center gap-4">
          <div className="animate-pulse bg-elevated h-8 w-24 rounded"></div>
        </div>
      </header>
    );
  }

  const getDisplayName = () => {
    if (!user) return "Guest";
    return user.username || user.name || user.email || "User";
  };

  const displayName = getDisplayName();
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-surface border-b border-border transition duration-300"
    >
      <div className="px-4 py-3 flex justify-between items-center max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-accent-muted rounded-lg flex items-center justify-center">
            <span className="text-accent text-lg">🌿</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Ecosystem Simulator</h1>
            <p className="text-xs text-text-muted -mt-1">Adaptive Environment</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-elevated transition-all duration-200 border border-border"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-warning" />
            ) : (
              <Moon className="w-5 h-5 text-text-secondary" />
            )}
          </motion.button>

          {isAuthenticated() ? (
            <>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-elevated rounded-xl px-4 py-2 border border-border"
              >
                <div className="relative">
                  <div className="w-9 h-9 bg-accent-muted rounded-full flex items-center justify-center text-accent font-bold">
                    {avatarLetter}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-surface"></div>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary truncate max-w-32">{displayName}</span>
                  <span className="text-xs text-text-muted">Online</span>
                </div>
              </motion.div>

              <div className="flex items-center gap-2">
                <Link
                  to="/settings"
                  className="p-2 rounded-lg hover:bg-elevated transition-all duration-200 border border-border"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-text-secondary" />
                </Link>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-danger-muted/30 transition-all duration-200 border border-danger/30 group"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 text-danger group-hover:text-danger" />
                </motion.button>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-2 text-text-muted">
                <User className="w-4 h-4" />
                <span className="text-sm">Guest Mode</span>
              </div>

              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-dim text-base font-medium transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                <span className="font-medium">Sign In</span>
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {isAuthenticated() && (
        <div className="px-4 py-1 bg-accent-muted/30 border-t border-accent/20">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-accent">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <span>Real-time simulation active</span>
            </div>
          </div>
        </div>
      )}
    </motion.header>
  );
}
