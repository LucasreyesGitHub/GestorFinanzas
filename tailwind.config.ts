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
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        ink: {
          50:  '#f4f3f0',
          100: '#e8e6e0',
          200: '#ccc9be',
          400: '#9a9589',
          600: '#5c5850',
          800: '#2a2825',
          900: '#141311',
        },
        sage: {
          50:  '#f0f4f1',
          100: '#d8e4db',
          300: '#8faf97',
          400: '#6f9971',
          500: '#4a7d5a',
          700: '#2d5438',
          900: '#152419',
        },
        gold: {
          300: '#e8c97a',
          400: '#d4a843',
          500: '#b8891e',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
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
    },
  },
  plugins: [],
}
export default config
