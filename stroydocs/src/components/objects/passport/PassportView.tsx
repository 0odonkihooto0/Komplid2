'use client';

import { useState } from 'react';
import { Download, History, Pencil, MapPin, Map } from 'lucide-react';
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
  const smrPercent = widgetsData?.smr?.completionPercent ?? null;

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
          style={{ background: 'linear-gradient(135deg, #F5F0E8 0%, #EDE8DC 100%)' }}
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
        <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <HeroFact label="Стадия"       value={stageText} tone="accent" />
          <HeroFact label="Площадь"      value={project.area != null ? `${project.area} м²` : '—'} />
          <HeroFact label="Ввод (план)"  value={project.plannedEndDate ? formatDate(project.plannedEndDate) : '—'} />
          <HeroFact label="Готовность СМР" value={smrPercent != null ? `${smrPercent}%` : '—'} tone={smrPercent != null && smrPercent > 0 ? 'ok' : 'neutral'} />
        </CardContent>
      </Card>

      {/* Название объекта + кнопки (под hero) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold leading-tight">{project.name}</h2>
          {project.address && (
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{project.address}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={() => {
            const el = document.getElementById('coordinates-map');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <Map className="mr-1.5 h-4 w-4" />
            На карту
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Открыть паспорт
          </Button>
        </div>
      </div>

      {/* Двухколоночный grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Левая колонка — 2/3 */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Общие сведения</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-0">
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

          <Card className="rounded-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Разрешение на строительство</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
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
        <div className="space-y-4">
          <Card className="rounded-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Сроки строительства</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
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
                <p className="text-xs text-[var(--ink-muted)]">
                  Даты заполняются из актуальной версии ГПР
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Проектная документация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <InfoRow label="Проектная организация" value={project.designOrg} />
              <InfoRow label="ГИП" value={project.chiefEngineer} />
            </CardContent>
          </Card>

          <Card className="rounded-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Участники</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <InfoRow label="Заказчик" value={project.customer} />
              <InfoRow label="Генподрядчик" value={project.generalContractor} />
            </CardContent>
          </Card>
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

function HeroFact({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'accent' | 'ok';
}) {
  const valueColor =
    tone === 'accent'
      ? 'text-[var(--accent-bg)]'
      : tone === 'ok'
        ? 'text-[var(--ok)]'
        : 'text-[var(--ink)]';
  return (
    <div>
      <div className="font-mono text-xs2 uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}
