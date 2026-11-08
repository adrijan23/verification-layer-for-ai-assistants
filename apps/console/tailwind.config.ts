import type { Config } from 'tailwindcss';

// Console identity: a calm "security operations" look. Graphite neutrals with a
// slight blue bias, one signal accent (verified teal), semantic decision colors.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B0F17',
          900: '#111722',
          850: '#161D2B',
          800: '#1C2433',
          700: '#2A3446',
          600: '#3B475D',
          500: '#5B6880',
          400: '#8592A8',
          300: '#AEB8C9',
          200: '#D3DAE5',
          100: '#E9EDF3',
          50: '#F5F7FA',
        },
        signal: { DEFAULT: '#19C3A6', dim: '#0F8F7A', soft: '#19C3A61A' },
        allow: '#22C55E',
        confirm: '#F5A524',
        deny: '#F2555A',
        throttle: '#94A3B8',
        connect: '#4C8DFF',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        rowin: { '0%': { opacity: '0', transform: 'translateY(-6px)' }, '100%': { opacity: '1', transform: 'none' } },
        flash: { '0%': { backgroundColor: 'rgba(25,195,166,0.18)' }, '100%': { backgroundColor: 'transparent' } },
        slidein: { '0%': { opacity: '0', transform: 'translateY(-14px) scale(0.98)' }, '100%': { opacity: '1', transform: 'none' } },
        buzz: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-3px) rotate(-0.4deg)' },
          '40%': { transform: 'translateX(3px) rotate(0.4deg)' },
          '60%': { transform: 'translateX(-2px)' },
          '80%': { transform: 'translateX(2px)' },
        },
      },
      animation: {
        rowin: 'rowin 260ms ease-out, flash 1600ms ease-out',
        slidein: 'slidein 320ms cubic-bezier(.2,.8,.2,1)',
        buzz: 'buzz 420ms ease-in-out 2',
      },
    },
  },
  plugins: [],
};
export default config;
