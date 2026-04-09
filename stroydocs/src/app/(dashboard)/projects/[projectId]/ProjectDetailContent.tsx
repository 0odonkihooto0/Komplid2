'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CalendarRange, AlertTriangle, BarChart3, Share2 } from 'lucide-react';
import { DefectsContent } from './defects/DefectsContent';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useProject } from '@/components/modules/projects/useProject';
import { PROJECT_STATUS_LABELS } from '@/utils/constants';
import { ProjectContractsTab } from './ProjectContractsTab';
import { ProjectGanttView } from '@/components/modules/gantt/ProjectGanttView';
import { ProjectStatisticsTab } from '@/components/modules/analytics/ProjectStatisticsTab';
import { ProjectDocumentsTab } from '@/components/modules/projects/ProjectDocumentsTab';
import { SharePortalDialog } from '@/components/modules/projects/SharePortalDialog';

interface Props {
  projectId: string;
}

export function ProjectDetailContent({ projectId }: Props) {
  const { project, isLoading } = useProject(projectId);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-muted-foreground">Проект не найден</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <PageHeader title={project.name} />
          <StatusBadge
            status={project.status}
            label={PROJECT_STATUS_LABELS[project.status]}
          />
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Поделиться с заказчиком
            </Button>
          </div>
        </div>
        {/* Мета-информация проекта в одну строку */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {project.address && (
            <span>{project.address}</span>
          )}
          {project.address && (project.generalContractor || project.customer) && (
            <span className="text-border">•</span>
          )}
          {project.generalContractor && (
            <span>Генподрядчик: <strong className="text-foreground">{project.generalContractor}</strong></span>
          )}
          {project.generalContractor && project.customer && (
            <span className="text-border">•</span>
          )}
          {project.customer && (
            <span>Заказчик: <strong className="text-foreground">{project.customer}</strong></span>
          )}
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">
            Договоры
            <Badge variant="secondary" className="ml-2">{project._count.contracts}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Статистика
          </TabsTrigger>
          <TabsTrigger value="defects">
            <AlertTriangle className="mr-1.5 h-4 w-4" />
            Дефекты
          </TabsTrigger>
          <TabsTrigger value="documents">Документы</TabsTrigger>
          <TabsTrigger value="gantt">
            <CalendarRange className="mr-1.5 h-4 w-4" />
            График
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="mt-4">
          <ProjectContractsTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <ProjectStatisticsTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="defects" className="mt-4">
          <DefectsContent projectId={projectId} embedded={true} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <ProjectDocumentsTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <ProjectGanttView projectId={projectId} />
        </TabsContent>
      </Tabs>

      <SharePortalDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}
