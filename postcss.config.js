// Transform modern color functions (oklch/oklab/lab/color) to sRGB so tools like html2canvas can parse them
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
