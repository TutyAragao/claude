/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade visual River Club: preto + roxo
        ink: { DEFAULT: '#0A0A0A', soft: '#121212', card: '#1A1A1E' },
        purple: { DEFAULT: '#7B2FBF', light: '#9D4EDD' },
        felt: '#0c2a22',
      },
      fontFamily: {
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(157, 78, 221, 0.35)',
      },
    },
  },
  plugins: [],
};
