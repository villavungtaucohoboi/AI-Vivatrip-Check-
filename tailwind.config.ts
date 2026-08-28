import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F6F2",
        "paper-dim": "#EFEDE6",
        ink: "#1B211F",
        "ink-muted": "#5B655F",
        teal: {
          DEFAULT: "#0E6B5A",
          dark: "#0A5347",
          light: "#E4F0EC",
        },
        sand: {
          DEFAULT: "#C9A15A",
          light: "#F3E9D3",
          dark: "#7A5F2B",
        },
        border: "#E2DFD5",
        danger: {
          DEFAULT: "#B3402A",
          light: "#F5E4DF",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
        card: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(27, 33, 31, 0.04), 0 1px 8px -2px rgba(27, 33, 31, 0.06)",
        float: "0 8px 24px -6px rgba(27, 33, 31, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
