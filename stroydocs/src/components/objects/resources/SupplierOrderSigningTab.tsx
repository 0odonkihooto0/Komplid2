'use client';

import { PenLine } from 'lucide-react';

export function SupplierOrderSigningTab() {
  return (
    <div className="pt-4 flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
      <PenLine className="h-10 w-10 opacity-30" />
      <p className="text-sm font-medium">Подписание (ЭЦП)</p>
      <p className="text-xs max-w-xs">
        Вкладка будет доступна после подключения КриптоПро CSP.
        Здесь будет отображаться информация об электронных подписях сторон.
      </p>
    </div>
  );
}
