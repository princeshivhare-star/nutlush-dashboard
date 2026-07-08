/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: "#2E7D4F",
          deep: "#215C3A",
          soft: "#E4F3E8",
        },
        cream: "#F5FAF4",
        ink: "#233329",
        inksoft: "#71827A",
        line: "#DEEEE1",
        amber: "#8C6B1F",
        coral: "#B25B3E",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Quicksand", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        xl2: "18px",
      },
    },
  },
  plugins: [],
};
