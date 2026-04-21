'use client';

import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-6">
      <WifiOff className="h-16 w-16 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Нет подключения</h1>
        <p className="text-muted-foreground max-w-sm">
          Ваши данные сохранены и отправятся автоматически при восстановлении связи.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
      >
        Обновить страницу
      </button>
      <Link href="/mobile" className="text-sm text-muted-foreground hover:underline">
        Перейти в приложение
      </Link>
    </div>
  );
}
