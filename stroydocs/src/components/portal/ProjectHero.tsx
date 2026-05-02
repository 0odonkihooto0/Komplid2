// Главный баннер публичной страницы объекта строительства
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ProjectHeroProps {
  name: string;
  address?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  signedDocCount: number;
  totalDocCount: number;
  openDefectsCount: number;
}

// Форматирование даты в русской локали
const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

// Метки и цвета статусов объекта
const STATUS_LABEL: Record<ProjectHeroProps['status'], string> = {
  ACTIVE: 'В работе',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив',
};

const STATUS_CLASS: Record<ProjectHeroProps['status'], string> = {
  ACTIVE: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  ARCHIVED: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function ProjectHero({
  name,
  address,
  status,
  plannedStartDate,
  plannedEndDate,
  signedDocCount,
  totalDocCount,
  openDefectsCount,
}: ProjectHeroProps) {
  const start = fmt(plannedStartDate);
  const end = fmt(plannedEndDate);

  return (
    <section className="space-y-4">
      {/* Заголовок и статус */}
      <div className="flex flex-wrap items-start gap-3">
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{name}</h1>
        <Badge className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</Badge>
      </div>

      {/* Адрес объекта */}
      {address && (
        <p className="flex items-center gap-1.5 text-gray-500 text-sm">
          <MapPin size={14} aria-label="Адрес" />
          {address}
        </p>
      )}

      {/* Период строительства */}
      {(start || end) && (
        <p className="text-sm text-gray-600">
          <span className="font-medium">Период работ:</span>{' '}
          {start && end ? `${start} — ${end}` : start ?? end}
        </p>
      )}

      {/* Три метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {signedDocCount}
            <span className="text-base font-normal text-gray-400">/{totalDocCount}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Подписано актов</p>
        </Card>

        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{openDefectsCount}</p>
          <p className="text-xs text-gray-500 mt-1">Открытых замечаний</p>
        </Card>

        <Card className="p-4 flex items-center justify-center">
          <a
            href="#documents"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            Посмотреть документы
          </a>
        </Card>
      </div>
    </section>
  );
}
