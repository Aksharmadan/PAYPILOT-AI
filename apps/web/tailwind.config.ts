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
      fontSize: {
        "2xs": ["0.71875rem", { lineHeight: "1.1rem" }],   /* 11.5px — labels, badges, captions */
        xs: ["0.8125rem", { lineHeight: "1.25rem" }],       /* 13px */
        sm: ["0.875rem",  { lineHeight: "1.375rem" }],      /* 14px */
        base: ["1rem",    { lineHeight: "1.5rem" }],        /* 16px */
        lg: ["1.125rem",  { lineHeight: "1.625rem" }],      /* 18px */
        xl: ["1.25rem",   { lineHeight: "1.75rem" }],       /* 20px */
        "2xl": ["1.5rem",   { lineHeight: "1.75rem",  letterSpacing: "-0.02em" }],
        "3xl": ["1.875rem", { lineHeight: "1.2",      letterSpacing: "-0.025em" }],
        "4xl": ["2.25rem",  { lineHeight: "1.1",      letterSpacing: "-0.03em" }],
        "5xl": ["3rem",     { lineHeight: "1.05",     letterSpacing: "-0.035em" }],
        "6xl": ["3.75rem",  { lineHeight: "1.0",      letterSpacing: "-0.04em" }],
        "7xl": ["4.5rem",   { lineHeight: "0.97",     letterSpacing: "-0.045em" }],
        "8xl": ["6rem",     { lineHeight: "0.95",     letterSpacing: "-0.05em" }],
        "9xl": ["8rem",     { lineHeight: "0.93",     letterSpacing: "-0.055em" }],
        "10xl": ["10rem",   { lineHeight: "0.92",     letterSpacing: "-0.06em" }],
      },
      colors: {
        base: {
          0:      "hsl(var(--base-0))",
          50:     "hsl(var(--base-50))",
          100:    "hsl(var(--base-100))",
          200:    "hsl(var(--base-200))",
          300:    "hsl(var(--base-300))",
          border: "hsl(var(--base-border))",
        },
        ink: {
          0:   "hsl(var(--ink-0))",
          100: "hsl(var(--ink-100))",
          300: "hsl(var(--ink-300))",
          500: "hsl(var(--ink-500))",
        },
        jade: {
          200: "#7EFFD6",
          300: "#34E8A0",
          400: "#26D48D",
          500: "#22C08A",
          600: "#189670",
          700: "#0F6B50",
          900: "#052E22",
        },
        coral: {
          200: "#FFCBC6",
          300: "#FF9B8D",
          400: "#FF8177",
          500: "#F0554C",
          600: "#D6392F",
          700: "#B02820",
          900: "#3D0A07",
          950: "#1A0605",
        },
        amber: {
          200: "#FDE6B4",
          300: "#FDD08A",
          400: "#FBC66B",
          500: "#E8A23D",
          600: "#C97E1A",
          700: "#9B5E0D",
        },
        violet: {
          200: "#DDD8FF",
          300: "#BDB5FF",
          400: "#9C93F5",
          500: "#7C6FF0",
          600: "#5F52D6",
          700: "#4440B8",
          900: "#1A1862",
        },
        emerald: {
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        cyan: {
          300: "#67E8F9",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
        },
        indigo: {
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "36px",
      },
      boxShadow: {
        card:    "0 1px 3px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.035)",
        modal:   "0 32px 80px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.4)",
        glow:    "0 0 24px rgba(124,111,240,0.35), 0 0 60px rgba(124,111,240,0.1)",
        "glow-jade": "0 0 24px rgba(34,232,160,0.35), 0 0 60px rgba(34,232,160,0.1)",
        "glow-coral": "0 0 24px rgba(240,85,76,0.35), 0 0 60px rgba(240,85,76,0.1)",
      },
      transitionTimingFunction: {
        spring:    "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
      transitionDuration: {
        "80":  "80ms",
        "160": "160ms",
        "240": "240ms",
        "400": "400ms",
        "540": "540ms",
        "700": "700ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "counting": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.22s ease-out",
        "accordion-up":   "accordion-up 0.18s ease-out",
        "counting":       "counting 0.36s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
        "38": "9.5rem",
        "88": "22rem",
        "96": "24rem",
        "112": "28rem",
        "128": "32rem",
      },
      maxWidth: {
        "8xl": "88rem",
        "9xl": "96rem",
      },
    },
  },
  plugins: [],
};

export default config;
