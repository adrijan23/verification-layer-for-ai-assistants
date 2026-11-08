import type { Config } from 'tailwindcss';

// FlyDemo Airlines: deep navy, signal red, cool sky neutrals.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#06122E', 900: '#0B1F4B', 800: '#13306B', 700: '#1D4290', 100: '#E3EAF7', 50: '#F2F6FC' },
        brand: { red: '#E0312B', redDark: '#B8231E' },
        sky: { 50: '#F4F8FD', 100: '#E8F0FB', 200: '#CFDDF2' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
