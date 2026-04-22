'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  currentFilters: { status?: string; type?: string; period?: string; page?: string };
}

/** Обновляет URL-параметры фильтрации, сбрасывая пагинацию на первую страницу */
function useFilterUpdater() {
  const searchParams = useSearchParams();
  const router = useRouter();

  return function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Сброс пагинации при изменении фильтров
    params.set('page', '1');
    router.push('?' + params.toString());
  };
}

export function PaymentsFilterBar(_props: Props) {
  // Читаем актуальные фильтры из URL (не из пропсов — они могут быть stale при клиентской навигации)
  const searchParams = useSearchParams();
  const updateFilter = useFilterUpdater();

  const period = searchParams.get('period') ?? 'ALL';
  const status = searchParams.get('status') ?? 'ALL';
  const type = searchParams.get('type') ?? 'ALL';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Фильтр по периоду */}
      <Select
        value={period}
        onValueChange={(v) => updateFilter('period', v === 'ALL' ? undefined : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Период" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Все периоды</SelectItem>
          <SelectItem value="30d">Последние 30 дней</SelectItem>
          <SelectItem value="3m">Последние 3 месяца</SelectItem>
          <SelectItem value="1y">Последний год</SelectItem>
        </SelectContent>
      </Select>

      {/* Фильтр по статусу платежа */}
      <Select
        value={status}
        onValueChange={(v) => updateFilter('status', v === 'ALL' ? undefined : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Все статусы</SelectItem>
          <SelectItem value="SUCCEEDED">Успешные</SelectItem>
          <SelectItem value="FAILED">Ошибка</SelectItem>
          <SelectItem value="REFUNDED">Возврат</SelectItem>
        </SelectContent>
      </Select>

      {/* Фильтр по типу платежа */}
      <Select
        value={type}
        onValueChange={(v) => updateFilter('type', v === 'ALL' ? undefined : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Тип" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Все типы</SelectItem>
          <SelectItem value="PLAN_PAYMENT">Оплата тарифа</SelectItem>
          <SelectItem value="PLAN_RENEWAL">Автопродление</SelectItem>
          <SelectItem value="PLAN_UPGRADE">Апгрейд</SelectItem>
          <SelectItem value="REFUND">Возврат</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
