'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FEATURE_LABELS } from '@/utils/feature-labels';
import type { FeatureCode } from '@/lib/features/codes';

interface Props {
  feature: FeatureCode;
}

export function PaywallBanner({ feature }: Props) {
  const label = FEATURE_LABELS[feature] ?? String(feature);

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
          <Link href="/pricing">Посмотреть тарифы</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
