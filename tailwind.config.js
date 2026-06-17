/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          card: 'rgb(var(--surface-card) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          border: 'rgb(var(--surface-border) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          secondary: 'rgb(var(--fg-secondary) / <alpha-value>)',
          muted: 'rgb(var(--fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--fg-subtle) / <alpha-value>)',
          disabled: 'rgb(var(--fg-disabled) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'accent-sm': 'var(--shadow-accent-sm)',
        'accent-md': 'var(--shadow-accent-md)',
        'accent-lg': 'var(--shadow-accent-lg)',
        'accent-xl': 'var(--shadow-accent-xl)',
        'accent-ring': 'var(--shadow-accent-ring)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.93)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '60%': { transform: 'scale(1.18) rotate(4deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'ring-out': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        'pulse-accent': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--accent) / 0)' },
          '50%': { boxShadow: '0 0 0 6px rgb(var(--accent) / 0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-up': 'fade-up 0.18s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'check-pop': 'check-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'ring-out': 'ring-out 0.65s ease-out forwards',
        'pulse-accent': 'pulse-accent 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
