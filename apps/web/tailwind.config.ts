import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        base: {
          0: "hsl(var(--base-0))",
          50: "hsl(var(--base-50))",
          100: "hsl(var(--base-100))",
          200: "hsl(var(--base-200))",
          300: "hsl(var(--base-300))",
          border: "hsl(var(--base-border))",
        },
        ink: {
          0: "hsl(var(--ink-0))",
          100: "hsl(var(--ink-100))",
          300: "hsl(var(--ink-300))",
          500: "hsl(var(--ink-500))",
        },
        jade: {
          400: "#4ADE94",
          500: "#22C08A",
          600: "#189670",
        },
        coral: {
          400: "#FF8177",
          500: "#F0554C",
          600: "#D6392F",
        },
        amber: {
          400: "#FBC66B",
          500: "#E8A23D",
        },
        violet: {
          400: "#9C93F5",
          500: "#7C6FF0",
          600: "#5F52D6",
        },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
