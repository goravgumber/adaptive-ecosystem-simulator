import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/monitoring", label: "Monitoring" },
  { to: "/history", label: "History" },
  { to: "/simulation", label: "Simulation" },
  { to: "/predictions", label: "Predictions" },
  { to: "/alerts", label: "Alerts" },
  { to: "/reports", label: "Reports" },
  { to: "/logbook", label: "Logbook" },
  { to: "/settings", label: "Settings" },
];

export default function Sidebar() {
  return (
    <div className="h-full bg-surface border-r border-border-default p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-text-primary font-semibold text-sm font-mono">Ecosystem</h1>
        <p className="text-text-muted text-xs font-mono">Simulator v3</p>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm font-mono transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text-primary hover:bg-elevated"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
