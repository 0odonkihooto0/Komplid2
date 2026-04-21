'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FeatureKey } from '@/lib/subscriptions/features';

const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  estimates: 'Сметы',
  estimates_import: 'Импорт смет',
  estimates_compare_advanced: 'Сравнение смет',
  estimates_export_grand_smeta: 'Экспорт в Гранд-Смета',
  estimates_public_link: 'Публичная ссылка на смету',
  execution_docs: 'Исполнительная документация',
  aosr_generation: 'Генерация АОСР',
  ks2_ks3_generation: 'Генерация КС-2/КС-3',
  journals_basic: 'Журналы',
  journals_full: 'Расширенные журналы',
  mobile_pwa: 'Мобильное приложение',
  mobile_offline: 'Офлайн-режим',
  defects_lite: 'Учёт дефектов',
  defects_full: 'Полный модуль СК',
  photos_gps: 'Фотофиксация с GPS',
  approval_routes: 'Маршруты согласования',
};

interface Props {
  feature: FeatureKey;
}

export function PaywallBanner({ feature }: Props) {
  const label = FEATURE_LABELS[feature] ?? feature;

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30 bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
          <Lock className="h-4 w-4" aria-label="Функция заблокирована" />
          Функция недоступна в вашем тарифе
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground">
          <strong>{label}</strong> доступна в платных тарифах StroyDocs.
          Обновите тариф, чтобы разблокировать эту функцию.
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild size="sm">
          <Link href="/settings/subscription">Посмотреть тарифы</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
