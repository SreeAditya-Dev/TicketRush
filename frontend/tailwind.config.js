/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        theatre: {
          900: "#0b0c15", // Deepest background
          800: "#151725", // Surfaces
          700: "#23263a", // Borders
          600: "#343a55", // Light Border/Hover
          500: "#4b5275", // Lighter Hover
        },
        brand: {
          gold: "#f5c518",
          purple: "#8b5cf6",
        }
      },
      boxShadow: {
        'glow': '0 0 15px rgba(245, 197, 24, 0.5)',
        'glow-purple': '0 0 15px rgba(139, 92, 246, 0.5)',
        'screen': '0 -20px 60px -10px rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  },
  plugins: []
};
