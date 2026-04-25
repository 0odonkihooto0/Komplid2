import { CheckCircle } from 'lucide-react';
import { PlanPreviewCard } from './PlanPreviewCard';
import { ReferralBonusBadge } from './ReferralBonusBadge';

interface HeroContent {
  h1: string;
  subtitle: string;
  features: string[];
}

const INTENT_CONTENT: Record<string, HeroContent> = {
  ESTIMATOR: {
    h1: 'Сметчик-Студио',
    subtitle: 'Профессиональные сметы за 15 минут',
    features: [
      'AI-импорт из Excel и PDF',
      'ГЭСН, ТЕР, ФЕР базы',
      'Публикация ссылкой заказчику',
      '7 дней бесплатного пробного периода',
    ],
  },
  PTO_ENGINEER: {
    h1: 'ИД-Мастер для ПТО',
    subtitle: 'Полный комплект исполнительной документации',
    features: [
      'АОСР, ОЖР, КС-2, КС-3 онлайн',
      'AI-проверка соответствия ГОСТ Р 70108-2025',
      'OCR-сканирование бумажных актов',
      'Электронная подпись',
    ],
  },
  CONTRACTOR_INDIVIDUAL: {
    h1: 'Прораб-Журнал',
    subtitle: 'Для прорабов и бригадиров',
    features: [
      'ОЖР с мобильного телефона',
      'Фото с геометками',
      'Учёт материалов и ресурсов',
      'Контроль работ',
    ],
  },
  CUSTOMER_PRIVATE: {
    h1: 'Контролируй свой ремонт',
    subtitle: 'Видь всё, что делает подрядчик',
    features: [
      'Фото и видео хода работ',
      'Акты выполненных работ',
      'Чат с прорабом',
      'Бесплатно для заказчика',
    ],
  },
};

const DEFAULT_CONTENT: HeroContent = {
  h1: 'StroyDocs — управление строительством',
  subtitle: 'От сметы до сдачи в эксплуатацию',
  features: [
    'Исполнительная документация',
    'Сметный модуль',
    'Финансовый контроль',
    'Работа команды',
  ],
};

interface SignupHeroProps {
  intent?: string;
  planCode?: string;
  referredByCode?: string;
}

export function SignupHero({ intent, planCode, referredByCode }: SignupHeroProps) {
  const content: HeroContent = intent ? (INTENT_CONTENT[intent] ?? DEFAULT_CONTENT) : DEFAULT_CONTENT;

  return (
    <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">StroyDocs</h1>
        <p className="mt-2 text-primary-foreground/80">Цифровое строительство в РФ</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{content.h1}</h2>
          <p className="mt-1 text-primary-foreground/70">{content.subtitle}</p>
        </div>
        <div className="space-y-3">
          {content.features.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-green-300" aria-hidden="true" />
              <span className="text-base">{feature}</span>
            </div>
          ))}
        </div>
        {planCode && <PlanPreviewCard planCode={planCode} />}
        {referredByCode && <ReferralBonusBadge code={referredByCode} />}
      </div>

      <p className="text-sm text-primary-foreground/50">
        © 2026 StroyDocs. Все данные хранятся в РФ (ФЗ-152).
      </p>
    </div>
  );
}
