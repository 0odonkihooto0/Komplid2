'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const SEGMENT_LABELS: Record<string, string> = {
  objects: 'Объекты',
  info: 'Информация',
  general: 'Общие сведения',
  participants: 'Участники',
  indicators: 'Показатели',
  funding: 'Финансирование',
  'limit-risks': 'Лимиты и риски',
  'land-and-tu': 'Земля и ТУ',
  correspondence: 'Переписка',
  questions: 'Вопросы',
  tasks: 'Задачи',
  photos: 'Фото',
  video: 'Видео',
  files: 'Файлы',
  chat: 'Чат',
  rfi: 'РФИ',
  passport: 'Паспорт',
  gpr: 'ГПР',
  pir: 'ПИР',
  id: 'ИД',
  sed: 'СЭД',
  journals: 'Журналы',
  estimates: 'Сметы',
  resources: 'Ресурсы',
  reports: 'Отчёты',
  contracts: 'Договоры',
  documents: 'Документы',
  templates: 'Шаблоны',
  organizations: 'Организация',
  profile: 'Профиль',
  archive: 'Документарий',
  'aosr-registry': 'Реестр АОСР',
  'id-registry': 'Реестр ИД',
};

function isDynamicId(segment: string): boolean {
  return /^[0-9a-f-]{20,}$|^c[a-z0-9]{15,}$/.test(segment) && !SEGMENT_LABELS[segment];
}

interface ObjectInfo { name: string; shortName?: string | null }

function useObjectLabel(objectId: string | null) {
  return useQuery<string>({
    queryKey: ['object-summary', objectId],
    queryFn: async () => {
      if (!objectId) return '';
      const res = await fetch(`/api/projects/${objectId}/summary`);
      const json = await res.json() as { success: boolean; data: { object: ObjectInfo } };
      if (!json.success) return objectId.slice(0, 8).toUpperCase();
      const obj = json.data.object;
      return (obj.shortName?.trim() || obj.name?.slice(0, 16)) ?? objectId.slice(0, 8).toUpperCase();
    },
    enabled: !!objectId,
    staleTime: 10 * 60 * 1000,
  });
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const objectsIdx = segments.indexOf('objects');
  const objectId = objectsIdx !== -1 && objectsIdx + 1 < segments.length
    ? segments[objectsIdx + 1]
    : null;

  return <BreadcrumbInner segments={segments} objectId={objectId} />;
}

function BreadcrumbInner({ segments, objectId }: { segments: string[]; objectId: string | null }) {
  const { data: objectLabel } = useObjectLabel(objectId);

  const crumbs: { label: string; href: string }[] = [];
  let currentPath = '';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    let label: string;
    if (isDynamicId(segment) && segment === objectId) {
      label = objectLabel ?? segment.slice(0, 8).toUpperCase();
    } else {
      label = SEGMENT_LABELS[segment] ?? segment;
    }
    crumbs.push({ label, href: currentPath });
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[180px]">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors truncate max-w-[140px]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
