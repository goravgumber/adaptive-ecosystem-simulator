/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base:       "#030D03",
        surface:    "#080F08",
        elevated:   "#0D1A0D",
        border:     "#1C2E1C",
        "border-bright": "#2D4A2D",
        accent:     "#22C55E",
        "accent-dim": "#16A34A",
        "accent-muted": "#14532D",
        "accent-glow": "rgba(34,197,94,0.15)",
        "text-primary": "#E8F5E8",
        "text-secondary": "#A3C4A3",
        "text-muted":    "#4D7A4D",
        danger:   "#EF4444",
        "danger-muted": "#450A0A",
        warning:  "#F59E0B",
        "warning-muted": "#451A03",
        info:     "#3B82F6",
        "info-muted": "#0C1A3F",
        success:  "#22C55E",
        plants:     "#4ADE80",
        herbivores: "#60A5FA",
        carnivores: "#F87171",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "glow-sm":  "0 0 8px rgba(34,197,94,0.2)",
        "glow-md":  "0 0 16px rgba(34,197,94,0.25)",
        "glow-lg":  "0 0 32px rgba(34,197,94,0.15)",
        "card":     "0 1px 3px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(28,46,28,1)",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};
