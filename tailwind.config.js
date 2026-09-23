/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0614',
          900: '#12081f',
          800: '#1b0f2e',
          700: '#2a1748',
        },
        neon: {
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#7c3aed',
          700: '#6d28d9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Montserrat', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(168, 85, 247, 0.25)',
        card: '0 10px 40px rgba(8, 2, 20, 0.45)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(168,85,247,0.18) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
