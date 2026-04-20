'use client';

import { useTheme } from './ThemeProvider';
import type { Accent } from './ThemeProvider';

const ACCENTS: { key: Accent; color: string }[] = [
  { key: 'steel', color: 'oklch(0.72 0.16 62)' },
  { key: 'cobalt', color: 'oklch(0.58 0.18 258)' },
  { key: 'lime', color: 'oklch(0.76 0.18 128)' },
];

export function AccentSwitcher() {
  const { accent, setAccent } = useTheme();
  return (
    <div className="flex items-center gap-1">
      {ACCENTS.map(({ key, color }) => (
        <button
          key={key}
          type="button"
          onClick={() => setAccent(key)}
          aria-label={`Акцент: ${key}`}
          title={key}
          style={{ backgroundColor: color }}
          className={`h-3.5 w-3.5 rounded-full transition-shadow ${
            accent === key
              ? 'ring-1 ring-[var(--ink-muted)] ring-offset-1'
              : 'opacity-60 hover:opacity-100'
          }`}
        />
      ))}
    </div>
  );
}
