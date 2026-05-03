'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerDashboard } from './useCustomerDashboard';
import type { CustomerProject } from './useCustomerDashboard';

// Скелетон одной карточки проекта при загрузке
function ProjectCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </CardContent>
    </Card>
  );
}

// Карточка одного проекта ремонта
function ProjectCard({ project }: { project: CustomerProject }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold leading-snug">
          {project.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.address && (
          <p className="text-sm text-muted-foreground truncate">{project.address}</p>
        )}
        <div className="flex items-center justify-between">
          {/* Статус проекта */}
          <Badge variant="secondary" className="text-xs">
            {project.status}
          </Badge>
          <Link
            href={`/moy-remont/projects/${project.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Открыть →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Главный экран кабинета B2C-заказчика со списком проектов ремонта
export default function CustomerDashboard() {
  const { projects, isLoading, error } = useCustomerDashboard();

  return (
    <div className="space-y-6">
      {/* Заголовок страницы и кнопка добавления */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Мои проекты
        </h1>
        <Button asChild>
          <Link href="/moy-remont/new">Добавить проект</Link>
        </Button>
      </div>

      {/* Состояние загрузки */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Состояние ошибки */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось загрузить проекты. Попробуйте обновить страницу.
        </div>
      )}

      {/* Список проектов */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Пустое состояние — нет проектов */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 gap-4">
          <p className="text-muted-foreground text-sm">У вас пока нет проектов ремонта</p>
          <Button asChild>
            <Link href="/moy-remont/new">Создать первый проект</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
