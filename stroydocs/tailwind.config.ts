import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Legacy HSL slots (shadcn/ui)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // New OKLch design tokens
        bg: 'var(--bg)',
        'bg-elev': 'var(--bg-elev)',
        'bg-inset': 'var(--bg-inset)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-muted': 'var(--ink-muted)',
        'border-token': 'var(--border-token)',
        'border-strong': 'var(--border-strong)',
        'accent-bg': 'var(--accent-bg)',
        'accent-ink': 'var(--accent-ink)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        err: 'var(--err)',
        info: 'var(--info)',
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-ink': 'var(--sidebar-ink)',
        'sidebar-hover': 'var(--sidebar-hover)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs2: ['10px', { lineHeight: '1.3', letterSpacing: '0.14em' }],
        xs: ['11px', { lineHeight: '1.4' }],
        sm: ['12px', { lineHeight: '1.45' }],
        base: ['13px', { lineHeight: '1.45' }],
        md: ['14px', { lineHeight: '1.5' }],
        lg: ['15px', { lineHeight: '1.5' }],
        xl: ['17px', { lineHeight: '1.4' }],
        'page-title': ['20px', { lineHeight: '1.3', letterSpacing: '-0.015em' }],
        kpi: ['26px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        panel: 'var(--r-3)',
        pill: 'var(--r-pill)',
      },
      boxShadow: {
        'panel-1': 'var(--shadow-1)',
        'panel-2': 'var(--shadow-2)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindAnimate],
};
export default config;
