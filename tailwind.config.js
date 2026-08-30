/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'zipcart-yellow': '#FF9900',
        'zipcart-green': '#232F3E',
        'amazon-navy': '#131921',
        'amazon-navy-light': '#232F3E',
        'amazon-orange': '#FF9900',
        'amazon-orange-dark': '#E47911',
      }
    },
  },
  plugins: [],
}
