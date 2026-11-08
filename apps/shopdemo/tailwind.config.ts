import type { Config } from 'tailwindcss';

// ShopDemo marketplace: midnight header, amber action color, warm paper neutrals.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: { 950: '#0C1424', 900: '#14213D', 800: '#1E2F52', 700: '#2A3F69' },
        amber: { 400: '#FFBF47', 500: '#F5A623', 600: '#D98B0B' },
        paper: { 50: '#FAF8F4', 100: '#F2EEE6', 200: '#E4DED2' },
        deal: '#C2410C',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
