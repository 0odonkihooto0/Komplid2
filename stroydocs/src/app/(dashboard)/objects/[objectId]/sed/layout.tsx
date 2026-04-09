import type { ReactNode } from 'react';

export default function SEDLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">СЭД</h1>
        <p className="text-sm text-muted-foreground">
          Система электронного документооборота
        </p>
      </div>
      {children}
    </div>
  );
}
