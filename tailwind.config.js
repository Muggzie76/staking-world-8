/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/frontend/public/**/*.{js,jsx,ts,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#3B82F6',
        'secondary': '#6B7280',
        'accent': '#8B5CF6',
      },
    },
  },
  plugins: [],
}