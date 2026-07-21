/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F4FA",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#181A29",
          soft: "#666B85",
          faint: "#9498AC",
        },
        border: "#E6E4F2",
        panel: "#15131F",
        panelSoft: "#211E30",
        primary: {
          DEFAULT: "#7C5CFC",
          dark: "#6440E8",
          light: "#F1EDFF",
        },
        signal: {
          DEFAULT: "#F5A623",
          light: "#FEF3DE",
        },
        good: "#22B07D",
        warn: "#F59E0B",
        bad: "#E5484D",
        viz: {
          indigo: "#7C5CFC",
          teal: "#22B07D",
          amber: "#F5A623",
          pink: "#EC4899",
          slate: "#64748B",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,23,31,0.04), 0 8px 24px -12px rgba(20,23,31,0.10)",
        panel: "0 20px 60px -20px rgba(20,23,31,0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        pulseBar: {
          "0%, 100%": { transform: "scaleY(0.85)" },
          "50%": { transform: "scaleY(1)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        pulseBar: "pulseBar 2.4s ease-in-out infinite",
        fadeUp: "fadeUp 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
