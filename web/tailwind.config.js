/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens dirigidos por variáveis CSS (ver index.css). Trocar o
        // data-theme no <html> re-tematiza todo o app.
        ink: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          soft: 'rgb(var(--surface) / <alpha-value>)',
          card: 'rgb(var(--surface-2) / <alpha-value>)',
        },
        purple: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
        },
        zinc: {
          100: 'rgb(var(--t-100) / <alpha-value>)',
          200: 'rgb(var(--t-200) / <alpha-value>)',
          300: 'rgb(var(--t-300) / <alpha-value>)',
          400: 'rgb(var(--t-400) / <alpha-value>)',
          500: 'rgb(var(--t-500) / <alpha-value>)',
          600: 'rgb(var(--t-600) / <alpha-value>)',
        },
        felt: '#0c2a22',
      },
      fontFamily: {
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgb(var(--glow) / 0.35)',
      },
    },
  },
  plugins: [],
};
