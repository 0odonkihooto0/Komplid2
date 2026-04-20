'use client';

import { useState } from 'react';
import { Download, History, Pencil, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/format';
import { PROJECT_STATUS_LABELS } from '@/utils/constants';
import { toast } from '@/hooks/useToast';
import { usePassport } from './usePassport';
import { usePassportWidgets } from './usePassportWidgets';
import { PirWidget } from './PirWidget';
import { SmrWidget } from './SmrWidget';
import { PassportEditDialog } from './PassportEditDialog';
import { CoordinatesMap } from './CoordinatesMap';
import { ImplementationTimeline } from './ImplementationTimeline';
import { HistoryDrawer } from './HistoryDrawer';
import { ObjectMetrics } from './ObjectMetrics';
import { PassportSideblocks } from './PassportSideblocks';
import { MilestonesTimeline } from './MilestonesTimeline';
import type { PassportUpdateData } from './usePassport';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="font-mono text-xs2 uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">
        {value != null && value !== '' ? value : <span className="text-[var(--ink-muted)]">—</span>}
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
      <div className="flex justify-between text-xs text-[var(--ink-muted)]">
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
  const { data: widgetsData, isLoading: widgetsLoading } = usePassportWidgets(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  function handleUpdate(data: PassportUpdateData) {
    updateMutation.mutate(data, {
      onSuccess: () => setEditOpen(false),
    });
  }

  async function handleDownloadPassport() {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/info-report/generate-pdf`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Не удалось сформировать PDF');
      // Бэкенд возвращает pre-signed URL (TTL: 1 час) — открываем в новой вкладке
      window.open(json.data.downloadUrl, '_blank', 'noopener,noreferrer');
      toast({ title: 'Паспорт сформирован', description: 'Файл открывается в новой вкладке' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Не удалось сформировать паспорт',
      });
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-40 w-full rounded-panel" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return <p className="text-[var(--ink-muted)]">Объект не найден</p>;
  }

  const coords =
    project.latitude != null && project.longitude != null
      ? `${project.latitude}, ${project.longitude}`
      : null;
  const stageText = PROJECT_STATUS_LABELS[project.status] ?? project.status;

  return (
    <div className="space-y-6">
      {/* Заголовок страницы + действия (Скачать паспорт, История, Редактировать) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title font-semibold">Информация об объекте</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Паспорт объекта, участники, показатели и документы
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPassport}
            disabled={isDownloading}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {isDownloading ? 'Формируется…' : 'Скачать паспорт'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="mr-1.5 h-4 w-4" />
            История изменений
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Редактировать
          </Button>
        </div>
      </div>

      {/* Hero-карточка объекта (светлый beige/cream градиент) */}
      <Card className="overflow-hidden rounded-panel">
        <div
          className="relative h-40"
          style={{ background: 'linear-gradient(135deg, #FAF6F0 0%, #F0EBE3 100%)' }}
        >
          <div className="flex h-full flex-col justify-between p-5">
            <div />
            <div className="flex items-end justify-between">
              {project.latitude != null && project.longitude != null ? (
                <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)]">
                  <MapPin className="h-3 w-3" />
                  ЛАТ {project.latitude.toFixed(4)} · ЛОН {project.longitude.toFixed(4)}
                </span>
              ) : <span />}
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                {project.id.slice(0, 8).toUpperCase()} · {stageText.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <ObjectMetrics stage={project.stage} gprProgress={project.gprProgress} />
      </Card>

      {/* Двухколоночный grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Левая колонка — 2/3 */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-panel">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">ДОКУМЕНТАЦИЯ</p>
                <CardTitle className="text-base">Паспорт объекта</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Редактировать
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-x-6">
                <InfoRow label="Регион" value={project.region} />
                <InfoRow label="Кадастровый номер" value={project.cadastralNumber} />
                <InfoRow label="Стройка" value={project.stroyka} />
                <InfoRow label="Координаты (ш, д)" value={coords} />
                <InfoRow label="Заказчик" value={project.customer} />
                <InfoRow label="Генподрядчик" value={project.generalContractor} />
                <InfoRow label="Проектная организация" value={project.designOrg} />
                <InfoRow label="ГИП" value={project.chiefEngineer} />
              </div>

              <div className="mt-4 border-t pt-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">РАЗРЕШЕНИЕ НА СТРОИТЕЛЬСТВО</p>
                <div className="grid grid-cols-2 gap-x-6">
                  <InfoRow label="Номер разрешения" value={project.permitNumber} />
                  <InfoRow label="Орган выдачи" value={project.permitAuthority} />
                  <InfoRow label="Дата выдачи" value={project.permitDate ? formatDate(project.permitDate) : null} />
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">СРОКИ</p>
                <div className="grid grid-cols-2 gap-x-6">
                  <InfoRow label="Начало (план)" value={project.plannedStartDate ? formatDate(project.plannedStartDate) : null} />
                  <InfoRow label="Окончание (план)" value={project.plannedEndDate ? formatDate(project.plannedEndDate) : null} />
                  <InfoRow label="Начало (факт)" value={project.actualStartDate ? formatDate(project.actualStartDate) : null} />
                  <InfoRow label="Окончание (факт)" value={project.actualEndDate ? formatDate(project.actualEndDate) : null} />
                </div>
                {project.plannedStartDate && project.plannedEndDate && (
                  <div className="mt-2">
                    <TimelineProgress startDate={project.plannedStartDate} endDate={project.plannedEndDate} />
                  </div>
                )}
                {project.fillDatesFromGpr && (
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">Даты заполняются из актуальной версии ГПР</p>
                )}
              </div>

              {project.description && (
                <div className="mt-4 border-t pt-4">
                  <InfoRow label="Описание" value={project.description} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка — 1/3 */}
        <div className="space-y-4">
          <PassportSideblocks
            projectId={projectId}
            objectId={projectId}
            area={project.area}
            floors={project.floors}
            constructionType={project.constructionType}
            responsibilityClass={project.responsibilityClass}
          />
        </div>
      </div>

      {/* Виджеты ПИР / СМР */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {widgetsLoading ? (
          <>
            <Skeleton className="h-44 w-full rounded-panel" />
            <Skeleton className="h-44 w-full rounded-panel" />
          </>
        ) : widgetsData ? (
          <>
            <PirWidget data={widgetsData.pir} />
            <SmrWidget data={widgetsData.smr} />
          </>
        ) : null}
      </div>

      {/* Карта и координаты */}
      <div id="coordinates-map">
        <CoordinatesMap projectId={projectId} address={project.address} />
      </div>

      {/* Ключевые вехи */}
      <MilestonesTimeline projectId={projectId} />

      {/* График реализации */}
      <ImplementationTimeline project={project} />

      <PassportEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        projectId={projectId}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
      />

      <HistoryDrawer
        projectId={projectId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}

