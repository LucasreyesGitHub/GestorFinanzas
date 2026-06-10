import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#0a0f1e",
          1: "#111827",
          2: "#1a2235",
          3: "#1f2d42",
        },
        accent: {
          DEFAULT: "#10b981",
          dim:     "#064e3b",
          light:   "#34d399",
        },
        gold: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        glow:       "0 0 24px rgba(16,185,129,0.18)",
        "glow-lg":  "0 0 48px rgba(16,185,129,0.12)",
        card:       "0 1px 3px rgba(0,0,0,0.4)",
      },
      borderColor: {
        subtle: "rgba(255,255,255,0.07)",
      },
    },
  },
  plugins: [],
};
export default config;
