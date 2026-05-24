import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const { authFetch, token } = useAuth();
  const [stats, setStats] = useState({
    plants: 0,
    herbivores: 0,
    carnivores: 0,
    tick: 0,
  });
  const [trend, setTrend] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const data = await res.json();
      const payload = data.data || data;
      setStats(payload.stats || {});
      setTrend(payload.trend || []);
      setAlerts(payload.alerts || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (token) {
      fetchDashboard();
      const interval = setInterval(fetchDashboard, 5000);
      return () => clearInterval(interval);
    }
  }, [token, fetchDashboard]);

  return (
    <DashboardContext.Provider
      value={{
        stats,
        trend,
        alerts,
        loading,
        error,
        refreshDashboard: fetchDashboard,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
