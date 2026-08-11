import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        smeta: {
          ink: "#211729",
          mauve: "#7d5d70",
          rose: "#b99aaa",
          blush: "#e8bbb3",
          clay: "#c9756f",
          paper: "#f7f1f2",
          soft: "#f1e8ea",
          line: "#ddc8d0"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
