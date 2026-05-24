import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { io as ioClient } from "socket.io-client";
import { simAPI } from "../services/api";

const SimulationContext = createContext();
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const SimulationProvider = ({ children }) => {
  const { token } = useAuth();

  const savedSettings = JSON.parse(localStorage.getItem("simulationSettings")) || {
    plants: 100,
    herbivores: 50,
    carnivores: 20,
    speed: 1000,
  };

  const [settings, setSettings] = useState(savedSettings);
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState([]);
  const [logs, setLogs] = useState([]);

  const socketRef = useRef(null);

  const addLog = (entry) => setLogs((prev) => [entry, ...prev].slice(0, 200));

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = ioClient(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("alert", (alert) => {
      addLog({
        id: Date.now(),
        message: alert.message,
        severity: alert.type || "info",
        createdAt: new Date().toISOString(),
        step: alert.step,
      });
    });

    socket.on("tick:update", (payload) => {
      setData((prev) => [...prev, {
        step: payload.step,
        plants: payload.plants,
        herbivores: payload.herbivores,
        carnivores: payload.carnivores,
        createdAt: payload.timestamp,
      }]);
      setStep(payload.step);
    });

    socket.on("simulation-toggle", (payload) => {
      setIsRunning(payload.isRunning);
      addLog({
        id: Date.now(),
        message: payload.message || "Simulation toggled",
        severity: "info",
        createdAt: new Date().toISOString(),
        step,
      });
    });

    socket.on("simulation-reset", () => {
      setData([]);
      setStep(0);
      setIsRunning(false);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const startSimulation = async (opts = {}) => {
    if (!token) return;
    const body = {
      plant_count: (opts && opts.plant_count) ?? settings.plants,
      herbivore_count: (opts && opts.herbivore_count) ?? settings.herbivores,
      predator_count: (opts && opts.predator_count) ?? settings.carnivores,
      speed: (opts && opts.speed) ?? settings.speed,
    };
    const { data: result, error } = await simAPI.save(body);
    if (error) {
      addLog({ id: Date.now(), message: `Start failed: ${error}`, severity: "error", createdAt: new Date().toISOString(), step });
      return;
    }
    setIsRunning(true);
    setStep(1);
    setData([{
      step: 1,
      plants: body.plant_count,
      herbivores: body.herbivore_count,
      carnivores: body.predator_count,
      createdAt: new Date().toISOString(),
    }]);
  };

  const toggleSimulation = async () => {
    if (!token) return;
    const { data: result, error } = await simAPI.toggle();
    if (error) {
      addLog({ id: Date.now(), message: `Toggle failed: ${error}`, severity: "error", createdAt: new Date().toISOString(), step });
      return;
    }
  };

  const resetSimulation = async () => {
    if (!token) return;
    const { error } = await simAPI.reset();
    if (error) {
      addLog({ id: Date.now(), message: `Reset failed: ${error}`, severity: "error", createdAt: new Date().toISOString(), step });
      return;
    }
    setData([]);
    setStep(0);
    setIsRunning(false);
    setLogs([]);
  };

  const setSpeed = async (speed) => {
    if (!token) return;
    await simAPI.speed(speed);
    updateSettings({ speed });
  };

  const refreshHistory = async () => {
    if (!token) return;
    const { data: history, error } = await simAPI.history();
    if (error) return;
    if (Array.isArray(history) && history.length > 0) {
      setData(history);
      setStep(history[history.length - 1].step || 0);
    }
  };

  const loadHistory = refreshHistory;

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("simulationSettings", JSON.stringify(updated));
  };

  useEffect(() => {
    if (token) loadHistory();
  }, [token]);

  return (
    <SimulationContext.Provider
      value={{
        isRunning,
        step,
        data,
        logs,
        settings,
        startSimulation,
        pauseSimulation: toggleSimulation,
        toggleSimulation,
        resetSimulation,
        updateSettings,
        refreshHistory,
        setSpeed,
        addLog,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => useContext(SimulationContext);