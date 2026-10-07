import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        discord: {
          blurple: "#5865F2",
          green: "#57F287",
          yellow: "#FEE75C",
          fuchsia: "#EB459E",
          red: "#ED4245",
          dark: "#1e1f22",
          darker: "#111214",
          light: "#2b2d31",
          border: "#35363c"
        }
      },
    },
  },
  plugins: [],
};
export default config;
