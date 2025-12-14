/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#233dff',
          accent: '#7f5af0',
        },
      },
    },
  },
  plugins: [],
}
