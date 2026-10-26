import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B1220",
        surface: {
          DEFAULT: "#121A2B",
          card: "#121A2B",
          hover: "#1B2438",
          subtle: "#0e1524",
          border: "rgba(255, 255, 255, 0.08)",
        },
        brand: {
          blue: "#3B9CFF",
          "blue-hover": "#2582e6",
          amber: "#F0A83C",
          "amber-hover": "#d99026",
          success: "#35C48A",
          danger: "#F2555A",
        },
        text: {
          primary: "#E6EDF7",
          secondary: "#93A2BC",
          muted: "#60708f",
        },
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "20px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};

export default config;
