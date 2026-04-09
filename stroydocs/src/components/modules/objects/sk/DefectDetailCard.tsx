'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RejectDefectDialog } from './RejectDefectDialog';
import { ExtendDeadlineDialog } from './ExtendDeadlineDialog';
import { useDefectDetail, useDefectPhotos } from './useDefectDetail';
import { useAcceptDefect } from '@/components/modules/defects/useDefects';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION: 'Нарушение ОТ',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY: 'Пожарная безопасность',
  ECOLOGY: 'Экология',
  DOCUMENTATION: 'Документация',
  OTHER: 'Прочее',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Устранён',
  CONFIRMED: 'Подтверждён',
  REJECTED: 'Отклонён',
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-gray-100 text-gray-600',
};

const PRESCRIPTION_TYPE_LABELS: Record<string, string> = {
  DEFECT_ELIMINATION: 'Устранение недостатков (УН)',
  WORK_SUSPENSION: 'Приостановка работ (ПР)',
};

interface Props {
  objectId: string;
  defectId: string;
}

export function DefectDetailCard({ objectId, defectId }: Props) {
  const { data: defect, isLoading } = useDefectDetail(objectId, defectId);
  const { data: photos = [] } = useDefectPhotos(objectId, defectId);
  const accept = useAcceptDefect(objectId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Загрузка...</p>;
  if (!defect) return <p className="text-sm text-muted-foreground p-4">Недостаток не найден</p>;

  const canAcceptOrReject = defect.status === 'RESOLVED';
  const canExtend = defect.status !== 'CONFIRMED' && defect.status !== 'REJECTED';

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{defect.title}</h2>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[defect.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {STATUS_LABELS[defect.status] ?? defect.status}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canAcceptOrReject && (
            <>
              <Button size="sm" onClick={() => accept.mutate({ defectId })} disabled={accept.isPending}>
                ✓ Принять устранение
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)}>
                ↩ На доработку
              </Button>
            </>
          )}
          {canExtend && (
            <Button size="sm" variant="outline" onClick={() => setExtendOpen(true)}>
              Продлить срок
            </Button>
          )}
        </div>
      </div>

      {/* 8 вкладок */}
      <Tabs defaultValue="info">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="photos">Фото ({photos.length})</TabsTrigger>
          <TabsTrigger value="annotations">Аннотации</TabsTrigger>
          <TabsTrigger value="inspection">Проверка</TabsTrigger>
          <TabsTrigger value="prescription">Предписание</TabsTrigger>
          <TabsTrigger value="remediation">Устранение</TabsTrigger>
          <TabsTrigger value="history">
            История ({defect.comments?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="location">Геолокация</TabsTrigger>
        </TabsList>

        {/* 1. Информация */}
        <TabsContent value="info" className="space-y-3 pt-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Категория</dt>
              <dd>
                <Badge variant="outline">{CATEGORY_LABELS[defect.category] ?? defect.category}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ответственный</dt>
              <dd>
                {defect.assignee
                  ? `${defect.assignee.lastName} ${defect.assignee.firstName}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Автор</dt>
              <dd>{defect.author.lastName} {defect.author.firstName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Срок устранения</dt>
              <dd>
                {defect.deadline
                  ? new Date(defect.deadline).toLocaleDateString('ru-RU')
                  : '—'}
              </dd>
            </div>
            {defect.normativeRef && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Нормативный документ</dt>
                <dd>{defect.normativeRef}</dd>
              </div>
            )}
            {defect.description && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Описание</dt>
                <dd className="whitespace-pre-wrap">{defect.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Зафиксирован</dt>
              <dd>{new Date(defect.createdAt).toLocaleDateString('ru-RU')}</dd>
            </div>
            {defect.resolvedAt && (
              <div>
                <dt className="text-muted-foreground">Устранён</dt>
                <dd>{new Date(defect.resolvedAt).toLocaleDateString('ru-RU')}</dd>
              </div>
            )}
          </dl>
        </TabsContent>

        {/* 2. Фото */}
        <TabsContent value="photos" className="pt-4">
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Фото не прикреплены</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => (
                <Card key={photo.id}>
                  <CardContent className="p-2 text-xs text-muted-foreground">
                    {photo.fileName ?? photo.s3Key.split('/').pop()}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. Аннотации */}
        <TabsContent value="annotations" className="pt-4">
          <p className="text-sm text-muted-foreground">
            Аннотации доступны в мобильном приложении СК
          </p>
        </TabsContent>

        {/* 4. Проверка */}
        <TabsContent value="inspection" className="pt-4">
          {!defect.inspection ? (
            <p className="text-sm text-muted-foreground">Недостаток не привязан к проверке</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Номер проверки</dt>
                <dd>№ {defect.inspection.number}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Статус</dt>
                <dd>{defect.inspection.status === 'ACTIVE' ? 'Активна' : 'Завершена'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Начата</dt>
                <dd>{new Date(defect.inspection.startedAt).toLocaleDateString('ru-RU')}</dd>
              </div>
              {defect.inspection.completedAt && (
                <div>
                  <dt className="text-muted-foreground">Завершена</dt>
                  <dd>{new Date(defect.inspection.completedAt).toLocaleDateString('ru-RU')}</dd>
                </div>
              )}
            </dl>
          )}
        </TabsContent>

        {/* 5. Предписание */}
        <TabsContent value="prescription" className="pt-4">
          {!defect.prescription ? (
            <p className="text-sm text-muted-foreground">Предписание не создано</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Номер</dt>
                <dd>№ {defect.prescription.number}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Тип</dt>
                <dd>
                  <Badge variant="outline">
                    {PRESCRIPTION_TYPE_LABELS[defect.prescription.type] ?? defect.prescription.type}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Статус</dt>
                <dd>{defect.prescription.status === 'ACTIVE' ? 'Активно' : 'Закрыто'}</dd>
              </div>
              {defect.prescription.deadline && (
                <div>
                  <dt className="text-muted-foreground">Срок</dt>
                  <dd>{new Date(defect.prescription.deadline).toLocaleDateString('ru-RU')}</dd>
                </div>
              )}
            </dl>
          )}
        </TabsContent>

        {/* 6. Устранение */}
        <TabsContent value="remediation" className="pt-4">
          <p className="text-sm text-muted-foreground">
            Акты устранения недостатков — см. вкладку «Акты устранения» в разделе СК
          </p>
        </TabsContent>

        {/* 7. История */}
        <TabsContent value="history" className="pt-4">
          {!defect.comments || defect.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">История действий пуста</p>
          ) : (
            <div className="space-y-3">
              {defect.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-32 text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">
                      {comment.author.lastName} {comment.author.firstName.charAt(0)}.
                    </span>
                    {comment.statusChange && (
                      <span
                        className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[comment.statusChange] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_LABELS[comment.statusChange] ?? comment.statusChange}
                      </span>
                    )}
                    <p className="mt-0.5 text-muted-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 8. Геолокация */}
        <TabsContent value="location" className="pt-4">
          {defect.gpsLat && defect.gpsLng ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Широта</dt>
                <dd>{defect.gpsLat.toFixed(6)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Долгота</dt>
                <dd>{defect.gpsLng.toFixed(6)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">GPS-координаты не указаны</p>
          )}
        </TabsContent>
      </Tabs>

      <RejectDefectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        projectId={objectId}
        defectId={defectId}
      />
      <ExtendDeadlineDialog
        open={extendOpen}
        onOpenChange={setExtendOpen}
        projectId={objectId}
        defectId={defectId}
        currentDeadline={defect.deadline}
      />
    </div>
  );
}
