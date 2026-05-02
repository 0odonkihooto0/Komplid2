'use client';
// Фиксирует просмотр страницы портала заказчиком.
// Выполняется один раз при монтировании — без блокировки рендера.
import { useEffect } from 'react';

export function ViewTracker({ token }: { token: string }) {
  useEffect(() => {
    fetch(`/api/portal/${token}/view`, { method: 'POST' }).catch(() => {});
  }, [token]);
  return null;
}
