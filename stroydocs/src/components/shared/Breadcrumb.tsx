'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

/** Статическое отображение сегментов пути на русские названия */
const SEGMENT_LABELS: Record<string, string> = {
  projects: 'Проекты',
  contracts: 'Договоры',
  docs: 'Документ',
  ks2: 'КС-2',
  estimates: 'Сметы',
  organizations: 'Организация',
  documents: 'Документы',
  templates: 'Шаблоны',
  profile: 'Профиль',
  archive: 'Документарий',
  'aosr-registry': 'Реестр АОСР',
  'id-registry': 'Реестр ИД',
};

/** Является ли сегмент UUID (динамический параметр маршрута) */
function isUuid(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

/** Хлебные крошки на основе текущего пути — автоматическая генерация */
export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: { label: string; href: string }[] = [];
  let currentPath = '';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = SEGMENT_LABELS[segment] ?? (isUuid(segment) ? '...' : segment);
    crumbs.push({ label, href: currentPath });
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link href="/" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground transition-colors truncate max-w-[150px]">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
