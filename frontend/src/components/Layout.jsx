import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Gauge, Activity, History, Cpu, Zap, Bell, FileText, BookOpen, Settings, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/simulation", label: "Simulation", icon: Cpu },
  { to: "/history", label: "History", icon: History },
  { to: "/monitoring", label: "Monitoring", icon: Activity },
  { to: "/predictions", label: "Predictions", icon: Zap },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/logbook", label: "Logbook", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const [connected, setConnected] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(navigator.onLine);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-base">
      <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-border flex flex-col">
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-text-primary font-semibold text-sm">🌿 Ecosystem</h1>
          <p className="text-text-muted text-xs font-mono">Simulator v3</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm rounded transition-all duration-200 ${
                  isActive
                    ? "bg-accent-muted text-accent border-l-2 border-accent rounded-l-none -ml-[2px]"
                    : "text-text-secondary hover:text-text-primary hover:bg-elevated border-l-2 border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <><Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} /><span>{label}</span></>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Connection status */}
        <div className="px-5 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2 w-2 ${connected ? "" : "opacity-40"}`}>
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? "animate-ping bg-accent" : ""}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-accent" : "bg-danger"}`} />
            </span>
            <span className={`text-xs font-mono ${connected ? "text-accent" : "text-danger"}`}>
              {connected ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        {/* User info & logout */}
        <div className="px-3 py-3 border-t border-border space-y-2">
          {user && (
            <div className="flex items-center gap-2 px-2">
              <div className="w-6 h-6 rounded-full bg-accent-muted flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-text-primary text-xs font-mono truncate">{user.username}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded text-danger hover:bg-danger/10 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
