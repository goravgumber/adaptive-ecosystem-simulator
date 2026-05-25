/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Base backgrounds — dark navy-charcoal
        "void":    "#070711",    // deepest background — body
        "base":    "#0C0C18",    // main content
        "panel":   "#11111F",    // cards and panels
        "raised":  "#181828",    // inputs, hover states
        "overlay": "#1F1F35",    // dropdowns, tooltips

        // Borders
        "edge":       "#1E2040",  // default borders
        "edge-mid":   "#2A2D52",  // slightly visible
        "edge-bright":"#373A6A",  // focused, active

        // Text — high contrast
        "hi":   "#F0F2FF",       // primary text — near white with blue tint
        "mid":  "#8B90C4",       // secondary text
        "lo":   "#4A4F7A",       // muted labels, placeholders
        "dim":  "#2C3060",       // very muted — disabled states

        // Accent — electric cyan
        "cyan":      "#00C8E8",   // primary interactive
        "cyan-soft": "#0099B8",   // hover
        "cyan-dim":  "#00263A",   // subtle cyan backgrounds
        "cyan-glow": "rgba(0,200,232,0.1)",

        // Species — these are the ONLY colors that identify species, use consistently
        "plant": "#10D98C",      // emerald green — only for plants
        "herb":  "#818CF8",      // indigo — only for herbivores
        "carn":  "#F87171",      // coral red — only for carnivores

        // Status
        "ok":      "#10D98C",
        "warn":    "#F59E0B",
        "danger":  "#EF4444",
        "info":    "#00C8E8",

        // Status surfaces
        "ok-bg":     "#071A12",
        "warn-bg":   "#1A1200",
        "danger-bg": "#1A0808",
        "info-bg":   "#001A22",

        // Status borders
        "ok-edge":     "#0D4A2A",
        "warn-edge":   "#4A3000",
        "danger-edge": "#4A1010",
        "info-edge":   "#00405A",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px", letterSpacing: "0.06em" }],
        xs:   ["11px", { lineHeight: "16px" }],
        sm:   ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "22px" }],
        lg:   ["16px", { lineHeight: "24px" }],
        xl:   ["18px", { lineHeight: "28px" }],
        "2xl":["22px", { lineHeight: "32px" }],
        "3xl":["28px", { lineHeight: "36px" }],
      },
    },
  },
  plugins: [],
};
