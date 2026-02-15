
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8D48B',
          dark: '#A08535',
          muted: 'rgba(201, 168, 76, 0.15)',
        },
        dark: {
          DEFAULT: '#0A0A0F',
          card: '#12121A',
          elevated: '#1A1A2E',
          border: '#2A2A3A',
          hover: '#22223A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
