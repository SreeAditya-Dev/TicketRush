/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        theatre: {
          900: "#f4f6f9", // Deepest background - Cool Sleek Slate
          800: "#ffffff", // Surfaces - Crisp Pure White
          700: "#e2e8f0", // Borders - Clean Slate
          600: "#cbd5e1", // Hover border / secondary control
          500: "#64748b", // Muted interactive text
        },
        brand: {
          gold: "#d97706", // Refined Amber Gold
          purple: "#2563eb", // Sleek Cobalt Blue (replaces neon purple)
        }
      },
      boxShadow: {
        'glow': '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'glow-purple': '0 10px 25px -3px rgba(37, 99, 235, 0.25), 0 4px 10px -2px rgba(37, 99, 235, 0.12)',
        'screen': '0 -20px 40px -10px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  },
  plugins: []
};
