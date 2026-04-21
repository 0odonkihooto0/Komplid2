'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, FileText, Users, Clock, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CONTRACT_STATUS_LABELS } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import { DashboardWidgetsGrid } from '@/components/modules/dashboard/DashboardWidgetsGrid';
import { ActivityFeed } from '@/components/modules/dashboard/ActivityFeed';
import { DashboardFilterPanel, type DashboardFilters, type ProjectForFilter } from '@/components/dashboard/DashboardFilterPanel';
import { AosrStatsWidget } from '@/components/dashboard/widgets/AosrStatsWidget';
import type { ContractStatus } from '@prisma/client';

interface RecentContract {
  id: string;
  number: string;
  name: string;
  status: ContractStatus;
  updatedAt: string;
  buildingObject: { id: string; name: string };
}

interface DashboardStats {
  projectsCount: number;
  contractsCount: number;
  employeesCount: number;
  pendingInvitations: number;
  recentContracts: RecentContract[];
  documentsTotal: number;
  tasksTotal: number;
}

export function DashboardContent() {
  const { data: session } = useSession();

  const [panelOpen, setPanelOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    objectIds: [],
    statuses: [],
    regions: [],
    constructionTypes: [],
  });
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      return json.success
        ? json.data
        : { projectsCount: 0, contractsCount: 0, employeesCount: 0, pendingInvitations: 0, recentContracts: [], documentsTotal: 0, tasksTotal: 0 };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Загружаем список объектов для панели фильтров
  const { data: allProjects = [] } = useQuery<ProjectForFilter[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects?limit=200');
      const json = await res.json();
      return json.success ? json.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Вычисляем итоговый список ID объектов для передачи в виджеты
  // Пустой массив = фильтра нет, показываем все
  const activeObjectIds = useMemo(() => {
    const { objectIds, statuses, regions, constructionTypes } = filters;
    const effectiveStatuses = selectedStatus
      ? [...statuses, selectedStatus].filter((v, i, a) => a.indexOf(v) === i)
      : statuses;
    const hasFilter =
      objectIds.length + effectiveStatuses.length + regions.length + constructionTypes.length > 0;
    if (!hasFilter) return [];

    return allProjects
      .filter((p) => {
        if (objectIds.length > 0 && !objectIds.includes(p.id)) return false;
        if (effectiveStatuses.length > 0 && !effectiveStatuses.includes(p.status)) return false;
        if (regions.length > 0 && p.region && !regions.includes(p.region)) return false;
        if (constructionTypes.length > 0 && p.constructionType && !constructionTypes.includes(p.constructionType)) return false;
        return true;
      })
      .map((p) => p.id);
  }, [filters, allProjects, selectedStatus]);

  const kpiCards = [
    { title: 'Объекты', value: stats?.projectsCount ?? 0, icon: FolderOpen, href: '/objects' },
    { title: 'Договоры', value: stats?.contractsCount ?? 0, icon: FileText, href: '/objects' },
    { title: 'Сотрудники', value: stats?.employeesCount ?? 0, icon: Users, href: '/organizations' },
    { title: 'Приглашения', value: stats?.pendingInvitations ?? 0, icon: Clock, href: '/organizations' },
  ];

  return (
    <div className="flex gap-6 items-start">
      {/* Основной контент */}
      <div className="flex-1 min-w-0 space-y-6">
        <PageHeader
          title={`Добро пожаловать${session?.user ? `, ${session.user.firstName}` : ''}`}
          description="Обзор вашей организации"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanelOpen((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              {panelOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
            </Button>
          }
        />

        {/* KPI карточки */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            : kpiCards.map((card) => (
                <Link key={card.title} href={card.href}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <card.icon className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{card.value}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>

        {/* Виджет АОСР (ИД-Мастер, для PTO-пользователей) */}
        <AosrStatsWidget />

        {/* Виджеты аналитики */}
        <DashboardWidgetsGrid objectIds={activeObjectIds} onStatusFilter={setSelectedStatus} />

        {/* Лента событий */}
        <ActivityFeed />

        {/* Недавние договоры */}
        {(stats?.recentContracts ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Последние активные договоры
            </h2>
            <div className="space-y-2">
              {(stats?.recentContracts ?? []).map((contract) => (
                <Link
                  key={contract.id}
                  href={`/objects/${contract.buildingObject.id}/contracts/${contract.id}`}
                  className="block"
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium">{contract.number} — {contract.name}</p>
                          <p className="text-xs text-muted-foreground">{contract.buildingObject.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusBadge
                          status={contract.status}
                          label={CONTRACT_STATUS_LABELS[contract.status]}
                        />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(contract.updatedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Панель фильтров */}
      {panelOpen && (
        <DashboardFilterPanel
          projects={allProjects}
          onFiltersChange={setFilters}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
