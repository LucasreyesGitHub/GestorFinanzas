import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        sage: {
          50:  '#f0f4f1',
          100: '#d8e4db',
          300: '#8faf97',
          400: '#6f9971',
          500: '#4a7d5a',
          700: '#2d5438',
          900: '#152419',
        },
        navy: {
          950: '#07080f',
          900: '#0c0e18',
          850: '#0f1120',
          800: '#11131f',
          750: '#14172a',
          700: '#171a28',
          600: '#1a1d2e',
          500: '#232840',
        },
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'shimmer':    'shimmer 2s infinite',
        'count-up':   'fadeIn 0.4s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      boxShadow: {
        'glass':    '0 4px 24px -4px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.05)',
        'glass-lg': '0 8px 40px -8px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        'inner-sm': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}
export default config
