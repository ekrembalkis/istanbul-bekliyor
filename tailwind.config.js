/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
          bg: '#EBEBEB',
          surface: '#FFFFFF',
          border: '#0A0A0A',
          'text-primary': '#0A0A0A',
          'text-secondary': 'rgba(10,10,10,0.45)',
          accent: '#E30A17',
          'accent-hover': '#B80813',
          like: '#E30A17',
          retweet: '#0A0A0A',
          warning: '#E30A17',
        },
        campaign: {
          red: '#E30A17',
          'red-dark': '#B80813',
          gold: '#D4A843',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Archivo Black"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      borderWidth: {
        '3': '3px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
