import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: 'var(--tg-bg)',
          text: 'var(--tg-text)',
          hint: 'var(--tg-hint)',
          muted: 'var(--tg-muted)',
          card: 'var(--tg-card)',
          cardStrong: 'var(--tg-card-strong)',
          border: 'var(--tg-border)',
          primary: 'var(--tg-primary)',
          primaryText: 'var(--tg-primary-text)',
          success: 'var(--tg-success)',
          warning: 'var(--tg-warning)',
          danger: 'var(--tg-danger)',
        },
      },
      boxShadow: {
        card: '0 10px 32px rgba(18, 34, 58, 0.08)',
        soft: '0 6px 20px rgba(18, 34, 58, 0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
