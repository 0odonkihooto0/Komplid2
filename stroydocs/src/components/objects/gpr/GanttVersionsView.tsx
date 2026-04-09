'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useGanttStages,
  useGanttVersionsByProject,
  useCopyVersion,
  useSetDirective,
  useDeleteVersion,
} from './useGanttStructure';
import type { GanttVersionSummary } from './useGanttStructure';
import { ImportFromEstimateDialog } from './ImportFromEstimateDialog';

interface Props {
  objectId: string;
}

export function GanttVersionsView({ objectId }: Props) {
  const router = useRouter();
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState<GanttVersionSummary | null>(null);
  const [importVersionId, setImportVersionId] = useState<string | null>(null);

  const { stages } = useGanttStages(objectId);
  const { versions, isLoading } = useGanttVersionsByProject(objectId, selectedStageId);

  const copyMutation = useCopyVersion(objectId);
  const setDirectiveMutation = useSetDirective(objectId);
  const deleteMutation = useDeleteVersion(objectId);

  function handleStageChange(val: string) {
    setSelectedStageId(val === 'all' ? null : val);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'dd.MM.yyyy', { locale: ru });
  }

  return (
    <div className="space-y-4">
      {/* Фильтр по стадии */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Стадия:</span>
        <Select onValueChange={handleStageChange} defaultValue="all">
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все стадии</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Таблица версий */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : versions.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Нет версий ГПР
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Стадия</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Создана</TableHead>
              <TableHead className="text-right">Выполнение</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow
                key={v.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setDetailVersion(v)}
              >
                <TableCell className="text-sm text-muted-foreground">
                  {v.stage?.name ?? '—'}
                </TableCell>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>
                  {v.isDirective ? (
                    <Badge variant="outline" className="border-yellow-400 text-yellow-700">
                      📌 Директивная
                    </Badge>
                  ) : v.isActive ? (
                    <Badge variant="outline" className="border-green-400 text-green-700">
                      ✓ Актуальная
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Архив</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(v.createdAt), 'dd.MM.yyyy', { locale: ru })}
                </TableCell>
                <TableCell className="text-right text-sm">{v.progress}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Диалог с деталями версии */}
      <Dialog open={!!detailVersion} onOpenChange={(open) => { if (!open) setDetailVersion(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailVersion?.name}
              {detailVersion?.isDirective && (
                <Badge variant="outline" className="border-yellow-400 text-yellow-700">
                  📌 Директивная
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailVersion && (
            <div className="space-y-4">
              {detailVersion.description && (
                <p className="text-sm text-muted-foreground">{detailVersion.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Начало плана</span>
                  <p className="font-medium">{formatDate(detailVersion.planStart)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Конец плана</span>
                  <p className="font-medium">{formatDate(detailVersion.planEnd)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Сумма, ₽</span>
                  <p className="font-medium">
                    {detailVersion.totalAmount > 0
                      ? new Intl.NumberFormat('ru-RU').format(Math.round(detailVersion.totalAmount))
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Задач</span>
                  <p className="font-medium">{detailVersion.taskCount}</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Выполнение</span>
                  <span className="font-medium">{detailVersion.progress}%</span>
                </div>
                <Progress value={detailVersion.progress} className="h-2" />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    router.push(`/objects/${objectId}/gpr/schedule?versionId=${detailVersion.id}`);
                    setDetailVersion(null);
                  }}
                >
                  Перейти на Ганту
                </Button>
                {!detailVersion.isDirective && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDirectiveMutation.mutate(detailVersion.id);
                      setDetailVersion(null);
                    }}
                  >
                    Сделать директивной
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setImportVersionId(detailVersion.id);
                    setDetailVersion(null);
                  }}
                >
                  Заполнить из сметы
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    copyMutation.mutate(detailVersion.id);
                    setDetailVersion(null);
                  }}
                >
                  Копировать
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    deleteMutation.mutate(detailVersion.id);
                    setDetailVersion(null);
                  }}
                >
                  Удалить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог импорта из сметы */}
      {importVersionId && (
        <ImportFromEstimateDialog
          objectId={objectId}
          versionId={importVersionId}
          onClose={() => setImportVersionId(null)}
        />
      )}
    </div>
  );
}
