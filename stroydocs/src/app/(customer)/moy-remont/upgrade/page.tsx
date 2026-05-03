export const dynamic = 'force-dynamic';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const PRO_FEATURES = [
  'Неограниченное количество проектов',
  'AI-юрист: консультации по строительному праву РФ (лимит 20 вопросов/день)',
  'Трекер оплат: контроль всех платежей подрядчику',
  'Трекер материалов: учёт стройматериалов',
  'Шаблоны претензий (7 видов)',
  'Чек-листы скрытых работ',
  'Хранилище документов 5 ГБ',
];

export default function UpgradePage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Мой Ремонт Pro</h1>
      <p className="text-muted-foreground mb-8">
        Полный контроль над вашим ремонтом — защитите себя от недобросовестных подрядчиков.
      </p>

      <Card className="mb-6 border-primary">
        <CardHeader>
          <CardTitle className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">1 490 ₽</span>
            <span className="text-muted-foreground font-normal">/месяц</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            или 11 900 ₽/год — 2 месяца в подарок. Пробный период 14 дней бесплатно.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {PRO_FEATURES.map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button className="w-full" size="lg" asChild>
          <Link href="/api/onboarding/start-trial" prefetch={false}>
            Начать бесплатный пробный период
          </Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/moy-remont">Вернуться к проектам</Link>
        </Button>
      </div>
    </div>
  );
}
