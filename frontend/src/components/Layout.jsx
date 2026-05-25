import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, Cpu, History, Activity, Zap, Bell,
  FileText, BookOpen, Settings, LogOut, User,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/simulation", label: "Simulation", icon: Cpu },
  { to: "/history", label: "History", icon: History },
  { to: "/monitoring", label: "Monitoring", icon: Activity },
  { to: "/predictions", label: "Predictions", icon: Zap },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/logbook", label: "Logbook", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
]

export default function Layout() {
  const [connected, setConnected] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(navigator.onLine)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen bg-bg-void">
      <aside className="w-[200px] shrink-0 bg-bg-base border-r border-line-subtle flex flex-col z-10">
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-ink-primary font-semibold text-xs font-mono tracking-wider">
            ECOSYSTEM
          </h1>
          <p className="text-ink-muted text-2xs font-mono mt-0.5">Simulator v3</p>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-green-ghost text-green-vivid"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-bg-raised"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-line-subtle space-y-3">
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2 w-2 ${connected ? "" : "opacity-40"}`}>
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? "animate-ping bg-green-vivid" : ""}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-green-vivid" : "bg-status-danger"}`} />
            </span>
            <span className={`text-2xs font-mono ${connected ? "text-ink-muted" : "text-status-danger"}`}>
              {connected ? "Connected" : "Offline"}
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-5 h-5 rounded-full bg-bg-overlay flex items-center justify-center">
                <User className="w-3 h-3 text-ink-muted" />
              </div>
              <span className="text-ink-secondary text-xs font-mono truncate">{user.username}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md text-ink-muted hover:text-status-danger hover:bg-danger-bg transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
