import { CheckCircle } from 'lucide-react';

interface PlanInfo {
  name: string;
  price: string;
  features: string[];
  badge?: string;
}

const PLAN_INFO: Record<string, PlanInfo> = {
  smetchik_studio: {
    name: 'Сметчик-Студио',
    price: '1 900 ₽/мес',
    features: ['AI-импорт из Excel/PDF', 'ГЭСН и ТЕР базы', 'Публикация сметы заказчику'],
    badge: 'Для сметчика',
  },
  id_master: {
    name: 'ИД-Мастер',
    price: '1 900 ₽/мес',
    features: ['Все виды ИД: АОСР, ОЖР, КС', 'AI-проверка соответствия ГОСТ', 'OCR-сканирование документов'],
    badge: 'Для ПТО',
  },
  prorab_journal: {
    name: 'Прораб-Журнал',
    price: '1 900 ₽/мес',
    features: ['ОЖР онлайн с мобильного', 'Фотофиксация с геометками', 'Контроль материалов'],
    badge: 'Для прораба',
  },
  team: {
    name: 'Team',
    price: 'от 4 900 ₽/мес',
    features: ['Неограниченное кол-во пользователей', 'Все профи-пакеты включены', 'Публичный дашборд'],
    badge: 'Для компании',
  },
  corporate: {
    name: 'Corporate',
    price: 'от 19 900 ₽/мес',
    features: ['Интеграция с ИСУП Минстроя', 'Безлимитный AI', 'Приоритетная поддержка'],
    badge: 'Энтерпрайз',
  },
};

interface PlanPreviewCardProps {
  planCode: string;
}

export function PlanPreviewCard({ planCode }: PlanPreviewCardProps) {
  const plan = PLAN_INFO[planCode];
  if (!plan) return null;

  return (
    <div className="rounded-xl border-2 border-blue-400/60 bg-white/10 p-4 backdrop-blur-sm">
      {plan.badge && (
        <span className="mb-2 inline-block rounded-full bg-blue-400/20 px-3 py-0.5 text-xs font-semibold text-blue-200">
          {plan.badge}
        </span>
      )}
      <p className="text-lg font-bold text-white">{plan.name}</p>
      <p className="mt-0.5 text-2xl font-extrabold text-blue-200">{plan.price}</p>
      <ul className="mt-3 space-y-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-white/90">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-300" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
