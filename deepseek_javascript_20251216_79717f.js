/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-fast': 'pulse 0.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.7)',
        'glow-red': '0 0 30px rgba(239, 68, 68, 0.7)',
      }
    },
  },
  plugins: [],
}