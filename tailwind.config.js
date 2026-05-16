import colors from 'tailwindcss/colors'

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blue: colors.violet,
        emerald: colors.violet,
        purple: colors.violet
      }
    }
  },
  plugins: [],
};
