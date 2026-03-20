/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E30A17',
          'red-dark': '#B80813',
          'red-light': '#FEF2F2',
          gold: '#D4A843',
          'gold-light': '#FDF8EF',
        },
        slate: {
          850: '#1A1F2E',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)',
        'elevated': '0 20px 50px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.04)',
        'nav': '0 1px 0 rgba(0,0,0,0.05)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.8)',
      },
      animation: {
        'counter-pulse': 'counterPulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        counterPulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.85 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: 0, transform: 'translateX(-8px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
