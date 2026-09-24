import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          darkest: "#070a10",
          bg: "#0a0e17",
          card: "#111827",
          cardHover: "#161f33",
          border: "#1f293d",
          borderLight: "#2e3b52",
          subtle: "#374151",
          muted: "#94a3b8",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "brand-gradient": "linear-gradient(135deg, #ec4899 0%, #ef4444 100%)",
        "brand-gradient-hover": "linear-gradient(135deg, #f472b6 0%, #f87171 100%)",
        "brand-gradient-purple": "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
