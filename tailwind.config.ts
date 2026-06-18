import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gundam: {
          red: "#C41E3A",
          blue: "#003087",
          white: "#F5F5F5",
          gray: "#2D2D2D",
          gold: "#C9A84C",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-kr)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
