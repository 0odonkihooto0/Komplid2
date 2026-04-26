'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQ_ITEMS = [
  {
    q: 'Что такое Профи-пакет?',
    a: 'Профи-пакеты — персональные тарифы для специалистов: Сметчик-Студио (для сметчиков), ИД-Мастер (для ПТО), Прораб-Журнал (для прорабов). Они включают специализированный инструментарий без лишних модулей.',
  },
  {
    q: 'Можно ли перейти с одного тарифа на другой?',
    a: 'Да. Вы можете перейти на более высокий тариф в любой момент — стоимость пересчитывается пропорционально оставшемуся времени. Переход на более низкий тариф возможен по окончании текущего периода.',
  },
  {
    q: 'Как работает пробный период 7 дней?',
    a: 'При первой активации платного тарифа вы получаете 7 дней бесплатного пробного доступа. Списание происходит только после окончания пробного периода. Отменить подписку можно в любой момент в настройках.',
  },
  {
    q: 'Что происходит после окончания подписки?',
    a: 'Ваши данные сохраняются в полном объёме. Доступ переходит на бесплатный тариф с ограниченным функционалом. Платные функции блокируются до возобновления подписки.',
  },
  {
    q: 'Есть ли скидка при оплате за год?',
    a: 'Да — годовая подписка на 20% дешевле ежемесячной. Сумма списывается единовременно за весь год.',
  },
  {
    q: 'Как отменить подписку?',
    a: 'Перейдите в Настройки → Подписка и нажмите «Отменить подписку». Доступ к платным функциям сохраняется до конца оплаченного периода.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown
          className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-center text-xl font-semibold">Часто задаваемые вопросы</h2>
      <div className="rounded-lg border bg-card px-6">
        {FAQ_ITEMS.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </section>
  );
}
