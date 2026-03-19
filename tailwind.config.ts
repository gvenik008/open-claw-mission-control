import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        linear: {
          bg: "#0a0a0a",
          surface: "#111111",
          card: "#1a1a1a",
          elevated: "#222222",
          border: "#222222",
          "border-subtle": "#2a2a2a",
          accent: "#5e6ad2",
          "accent-hover": "#6c78e0",
          "text-primary": "#f5f5f5",
          "text-secondary": "#888888",
          "text-muted": "#555555",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
