/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '500px',
      sm: '688px',
      md: '1005px',
      lg: '1265px',
    },
    extend: {
      colors: {
        x: {
          bg: '#000000',
          surface: '#16181C',
          border: '#2F3336',
          'text-primary': '#E7E9EA',
          'text-secondary': '#71767B',
          accent: '#1D9BF0',
          'accent-hover': '#1A8CD8',
          like: '#F91880',
          retweet: '#00BA7C',
          warning: '#FFD400',
        },
        campaign: {
          red: '#E30A17',
          'red-dark': '#B80813',
          gold: '#D4A843',
        },
        // Keep old brand/dark aliases during migration so pages don't break
        brand: {
          red: '#E30A17',
          'red-dark': '#B80813',
          'red-light': '#1D9BF0',
          gold: '#D4A843',
          'gold-light': '#FDF8EF',
        },
        dark: {
          bg: '#000000',
          card: '#16181C',
          border: '#2F3336',
          hover: '#1C1C28',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
