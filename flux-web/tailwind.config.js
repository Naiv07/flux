/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        flux: {
          bg:      "#0a0a0f",
          surface: "rgba(255,255,255,0.05)",
          border:  "rgba(255,255,255,0.08)",
          purple:  "#6c63ff",
          cyan:    "#00d4ff",
          green:   "#00ff88",
          text:    "#e8e8f0",
          muted:   "#6b7280",
        },
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [],
}