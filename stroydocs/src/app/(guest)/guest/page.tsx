'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface GuestMe {
  workspaceName: string;
  user: { firstName: string; lastName: string; email: string };
}

interface GuestProject {
  id: string;
  name: string;
  address: string | null;
  status: string;
  objectType: string | null;
}

/** Метка статуса объекта строительства */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Активный</Badge>;
    case 'COMPLETED':
      return <Badge variant="outline" className="text-gray-500">Завершён</Badge>;
    case 'SUSPENDED':
      return <Badge variant="destructive">Приостановлен</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/** Иконка статуса объекта */
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'ACTIVE':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'COMPLETED':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'SUSPENDED':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Building2 className="h-5 w-5 text-gray-400" />;
  }
}

export default function GuestDashboardPage() {
  // Данные о текущем госте и рабочем пространстве
  const { data: me, isLoading: meLoading } = useQuery<GuestMe>({
    queryKey: ['guest-me'],
    queryFn: async () => {
      const res = await fetch('/api/guest/me');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Список доступных гостю объектов строительства
  const { data: projects, isLoading: projectsLoading } = useQuery<GuestProject[]>({
    queryKey: ['guest-projects'],
    queryFn: async () => {
      const res = await fetch('/api/guest/projects');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const isLoading = meLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {me?.workspaceName
            ? `Добро пожаловать — ${me.workspaceName}`
            : 'Гостевой кабинет'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Объекты строительства, к которым вам предоставлен доступ
        </p>
      </div>

      {/* Список объектов */}
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
                      <StatusIcon status={project.status} />
                      <CardTitle className="text-base leading-tight line-clamp-2">
                        {project.name}
                      </CardTitle>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {project.address && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.address}
                    </p>
                  )}
                  {project.objectType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.objectType}
                    </p>
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
