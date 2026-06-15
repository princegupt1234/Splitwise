/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#8196f8',
          500: '#6574f3',
          600: '#4f56e8',
          700: '#4144d0',
          800: '#3538a8',
          900: '#303485',
        },
        surface: {
          DEFAULT: '#0f1117',
          50:  '#1a1d27',
          100: '#141720',
          200: '#0f1117',
          300: '#0b0d13',
        },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      boxShadow: {
        'glow-green': '0 0 20px rgba(16,185,129,0.15)',
        'glow-red':   '0 0 20px rgba(239,68,68,0.15)',
        'glow-blue':  '0 0 20px rgba(99,116,243,0.15)',
        'card':       '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'grad-green': 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
        'grad-red':   'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
        'grad-blue':  'linear-gradient(135deg, #4144d0 0%, #6574f3 100%)',
        'grad-card':  'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
    },
  },
  plugins: [],
};
