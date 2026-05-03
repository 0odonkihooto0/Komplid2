'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, Clock, CheckCircle2, AlertCircle, FileCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGuestSession } from '@/components/guest/useGuestSession';

interface GuestProject {
  id: string;
  name: string;
  address: string | null;
  status: string;
  objectType: string | null;
}

// Иконка и бейдж статуса объекта строительства
function ProjectStatus({ status }: { status: string }) {
  switch (status) {
    case 'ACTIVE':
      return (
        <>
          <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <Badge className="bg-green-100 text-green-700 border-green-200">Активный</Badge>
        </>
      );
    case 'COMPLETED':
      return (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          <Badge variant="outline" className="text-gray-500">Завершён</Badge>
        </>
      );
    case 'SUSPENDED':
      return (
        <>
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <Badge variant="destructive">Приостановлен</Badge>
        </>
      );
    default:
      return (
        <>
          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <Badge variant="outline">{status}</Badge>
        </>
      );
  }
}

/** Дашборд гостевого кабинета: приветствие, список объектов, количество подписей */
export function GuestDashboard() {
  const { workspaceName, isLoading: sessionLoading } = useGuestSession();

  // Список доступных объектов строительства
  const { data: projects, isLoading: projectsLoading } = useQuery<GuestProject[]>({
    queryKey: ['guest-projects'],
    queryFn: async () => {
      const res = await fetch('/api/guest/projects');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const isLoading = sessionLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Приветствие с названием рабочего пространства */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {workspaceName ? `Добро пожаловать — ${workspaceName}` : 'Гостевой кабинет'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Объекты строительства, к которым вам предоставлен доступ
        </p>
      </div>

      {/* Быстрая ссылка на историю подписей */}
      <div className="flex gap-3">
        <Link href="/guest/signatures">
          <div className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <FileCheck className="h-4 w-4" />
            История моих подписей
          </div>
        </Link>
      </div>

      {/* Сетка объектов строительства */}
      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">Доступных объектов пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/guest/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ProjectStatus status={project.status} />
                    </div>
                  </div>
                  <CardTitle className="text-base leading-tight line-clamp-2 mt-1">
                    {project.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {project.address && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.address}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
