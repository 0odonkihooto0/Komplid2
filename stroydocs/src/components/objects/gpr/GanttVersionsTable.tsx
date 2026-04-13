'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateVersionDialog } from './CreateVersionDialog';
import { ImportFromEstimateDialog } from './ImportFromEstimateDialog';
import type { GanttVersionSummary, GanttStageItem } from './useGanttStructure';

interface Props {
  versions: GanttVersionSummary[];
  stages: GanttStageItem[];
  objectId: string;
  isLoading: boolean;
  onDelete: (versionId: string) => void;
  onCopy: (versionId: string) => void;
  onSetDirective: (versionId: string) => void;
  onCreate: (name: string, stageId?: string) => void;
  isCreating: boolean;
  selectedStageId: string | null;
}

export function GanttVersionsTable({
  versions,
  stages,
  objectId,
  isLoading,
  onDelete,
  onCopy,
  onSetDirective,
  onCreate,
  isCreating,
  selectedStageId,
}: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [importVersionId, setImportVersionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Создать ГПР
        </Button>
      </div>

      {versions.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Нет версий ГПР для выбранной стадии
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Стадия</TableHead>
              <TableHead>Начало плана</TableHead>
              <TableHead>Конец плана</TableHead>
              <TableHead className="text-right">Сумма, ₽</TableHead>
              <TableHead className="text-right">Выполнение</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.id}>
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
                  {v.stage?.name ?? '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {v.planStart
                    ? format(new Date(v.planStart), 'dd.MM.yyyy', { locale: ru })
                    : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {v.planEnd
                    ? format(new Date(v.planEnd), 'dd.MM.yyyy', { locale: ru })
                    : '—'}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {v.totalAmount > 0
                    ? new Intl.NumberFormat('ru-RU').format(Math.round(v.totalAmount))
                    : '—'}
                </TableCell>
                <TableCell className="text-right text-sm">{v.progress}%</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/objects/${objectId}/gpr/schedule?versionId=${v.id}`)
                        }
                      >
                        Открыть
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!v.isDirective && (
                        <DropdownMenuItem onClick={() => onSetDirective(v.id)}>
                          Сделать директивной
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setImportVersionId(v.id)}>
                        Заполнить из сметы...
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCopy(v.id)}>
                        Копировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(v.id)}
                      >
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateVersionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        objectId={objectId}
        stages={stages}
        selectedStageId={selectedStageId}
        isCreating={isCreating}
        onCreate={(name) => onCreate(name, selectedStageId ?? undefined)}
      />

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
