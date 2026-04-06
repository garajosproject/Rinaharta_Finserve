/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF2F2',
          100: '#FECACA',
          200: '#FCA5A5',
          500: '#d91b24',
          600: '#c21720',
          700: '#991016',
          800: '#7A0D12',
          900: '#5C0B10',
        },
        surface: '#F5F5F5',
        ink: '#171717',
        muted: '#555555',
        subtle: '#888888',
        outline: '#E0E0E0',
        line: '#D0D0D0',
        primary: '#d91b24',
      },
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slideIn 0.18s ease-out',
        'fade-in':  'fadeIn 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
