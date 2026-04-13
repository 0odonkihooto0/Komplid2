'use client';

import { Layers } from 'lucide-react';

export function SupplierOrderTimTab() {
  return (
    <div className="pt-4 flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
      <Layers className="h-10 w-10 opacity-30" />
      <p className="text-sm font-medium">Элементы ТИМ (BIM)</p>
      <p className="text-xs max-w-xs">
        Связь с информационной моделью здания. Вкладка будет доступна
        после подключения BIM-модуля.
      </p>
    </div>
  );
}
