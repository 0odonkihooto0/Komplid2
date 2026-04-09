'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/utils/format';
import { PROJECT_STATUS_LABELS } from '@/utils/constants';
import { usePassport } from './usePassport';
import { PassportEditDialog } from './PassportEditDialog';
import type { PassportUpdateData } from './usePassport';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">
        {value != null && value !== '' ? value : <span className="text-muted-foreground/50">—</span>}
      </p>
    </div>
  );
}

function TimelineProgress({ startDate, endDate }: { startDate: string; endDate: string }) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();

  if (end <= start) return null;

  const progress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Прогресс по срокам</span>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

interface PassportViewProps {
  projectId: string;
}

export function PassportView({ projectId }: PassportViewProps) {
  const { project, isLoading, updateMutation } = usePassport(projectId);
  const [editOpen, setEditOpen] = useState(false);

  function handleUpdate(data: PassportUpdateData) {
    updateMutation.mutate(data, {
      onSuccess: () => setEditOpen(false),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return <p className="text-muted-foreground">Объект не найден</p>;
  }

  const coords =
    project.latitude != null && project.longitude != null
      ? `${project.latitude}, ${project.longitude}`
      : null;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge
              status={project.status}
              label={PROJECT_STATUS_LABELS[project.status] ?? project.status}
            />
            {project.address && (
              <span className="text-sm text-muted-foreground">{project.address}</span>
            )}
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Редактировать
        </Button>
      </div>

      {/* Двухколоночный grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Левая колонка — 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Основные сведения</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <InfoRow label="Тип строительства" value={project.constructionType} />
              <InfoRow label="Регион" value={project.region} />
              <InfoRow label="Кадастровый номер" value={project.cadastralNumber} />
              <InfoRow label="Площадь" value={project.area != null ? `${project.area} м²` : null} />
              <InfoRow label="Этажность" value={project.floors} />
              <InfoRow label="Класс ответственности" value={project.responsibilityClass} />
              <InfoRow label="Стройка" value={project.stroyka} />
              <InfoRow label="Координаты (ш, д)" value={coords} />
              <InfoRow label="Описание" value={project.description} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Разрешение на строительство</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Номер разрешения" value={project.permitNumber} />
              <InfoRow
                label="Дата выдачи"
                value={project.permitDate ? formatDate(project.permitDate) : null}
              />
              <InfoRow label="Орган выдачи" value={project.permitAuthority} />
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка — 1/3 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Сроки строительства</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                label="Начало (план)"
                value={project.plannedStartDate ? formatDate(project.plannedStartDate) : null}
              />
              <InfoRow
                label="Окончание (план)"
                value={project.plannedEndDate ? formatDate(project.plannedEndDate) : null}
              />
              {project.plannedStartDate && project.plannedEndDate && (
                <TimelineProgress
                  startDate={project.plannedStartDate}
                  endDate={project.plannedEndDate}
                />
              )}
              <InfoRow
                label="Начало (факт)"
                value={project.actualStartDate ? formatDate(project.actualStartDate) : null}
              />
              <InfoRow
                label="Окончание (факт)"
                value={project.actualEndDate ? formatDate(project.actualEndDate) : null}
              />
              {project.fillDatesFromGpr && (
                <p className="text-xs text-muted-foreground">
                  Даты заполняются из актуальной версии ГПР
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Проектная документация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Проектная организация" value={project.designOrg} />
              <InfoRow label="ГИП" value={project.chiefEngineer} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Участники</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Заказчик" value={project.customer} />
              <InfoRow label="Генподрядчик" value={project.generalContractor} />
            </CardContent>
          </Card>
        </div>
      </div>

      <PassportEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        projectId={projectId}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}
