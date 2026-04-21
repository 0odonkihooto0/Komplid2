'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SubscriptionPlan } from '@prisma/client';

const FEATURE_LABELS: Record<string, string> = {
  estimates: 'Сметы',
  estimates_import: 'Импорт смет (XML, Excel)',
  estimates_compare_basic: 'Сравнение версий',
  estimates_compare_advanced: 'Расширенное сравнение',
  estimates_export_grand_smeta: 'Экспорт в Гранд-Смета',
  estimates_public_link: 'Публичные ссылки на сметы',
  estimates_history: 'История изменений смет',
  fgis_cs_prices: 'Цены ФГИС ЦС',
  execution_docs: 'Исполнительная документация',
  aosr_generation: 'Генерация АОСР',
  ozr_generation: 'Генерация ОЖР',
  ks2_ks3_generation: 'КС-2 / КС-3',
  avk_atg_generation: 'АВК / АТГ',
  journals_basic: 'Журналы (базовые)',
  journals_full: 'Журналы (полные)',
  mobile_pwa: 'Мобильное приложение',
  mobile_offline: 'Офлайн-режим',
  voice_input: 'Голосовой ввод',
  defects_lite: 'Учёт дефектов',
  defects_full: 'Полный модуль СК',
  photos_gps: 'Фото с GPS',
  photos_annotations: 'Аннотации на фото',
  geofencing: 'Геозоны',
  contracts_lite: 'Контракты (базовые)',
  templates_library: 'Библиотека шаблонов',
  normative_library: 'Нормативная база',
  approval_routes: 'Маршруты согласования',
  xml_minstroy_export: 'Экспорт для Минстроя',
};

interface Props {
  plan: SubscriptionPlan;
  isActive: boolean;
  billingPeriod: 'MONTHLY' | 'YEARLY';
}

export function PlanCard({ plan, isActive, billingPeriod }: Props) {
  const price = billingPeriod === 'MONTHLY' ? plan.priceMonthlyRub : plan.priceYearlyRub;
  // Цены хранятся в копейках — делим на 100 для отображения в рублях
  const priceLabel = (price / 100).toLocaleString('ru-RU');
  const perLabel = billingPeriod === 'MONTHLY' ? '/ мес' : '/ год';
  const isFree = plan.planType === 'FREE';

  return (
    <Card className={`flex flex-col ${isActive ? 'border-primary ring-1 ring-primary' : ''} ${plan.isFeatured ? 'shadow-lg' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <div className="flex gap-1 flex-shrink-0">
            {isActive && <Badge variant="default">Активный</Badge>}
            {plan.isFeatured && !isActive && <Badge variant="secondary">Популярный</Badge>}
          </div>
        </div>
        <div className="flex items-baseline gap-1 mt-2">
          {isFree ? (
            <span className="text-2xl font-bold">Бесплатно</span>
          ) : (
            <>
              <span className="text-2xl font-bold">{priceLabel} ₽</span>
              <span className="text-sm text-muted-foreground">{perLabel}</span>
            </>
          )}
        </div>
        {billingPeriod === 'YEARLY' && !isFree && (
          <p className="text-xs text-green-600">Скидка 20% по сравнению с месячной</p>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" aria-hidden />
              {FEATURE_LABELS[f] ?? f}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isActive ? (
          <Button variant="outline" className="w-full" disabled>
            Текущий тариф
          </Button>
        ) : isFree ? (
          <Button variant="ghost" className="w-full" disabled>
            Базовый доступ
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/settings/subscription/checkout/${plan.code}?period=${billingPeriod}`}>
              Выбрать
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
