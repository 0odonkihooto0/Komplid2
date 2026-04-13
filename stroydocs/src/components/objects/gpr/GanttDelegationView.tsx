'use client';

import { Loader2, ArrowRightLeft } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useGanttDelegationView, type DelegatedTaskItem } from './useGanttDelegationView';

interface Props {
  objectId: string;
  versionId: string;
}

export function GanttDelegationView({ objectId, versionId }: Props) {
  const { tasks, isLoading, syncDelegation, isSyncing } = useGanttDelegationView(
    objectId,
    versionId,
  );

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {tasks.length > 0 ? `${tasks.length} делегированных задач` : 'Нет делегированных задач'}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={syncDelegation}
          disabled={isSyncing || tasks.length === 0}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRightLeft className="h-3.5 w-3.5" />
          )}
          Перенести данные готовности
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">Делегированные задачи отсутствуют</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="min-w-48">Наименование</TableHead>
                <TableHead className="w-40">Делегировано (версия)</TableHead>
                {/* TODO: delegatedFromOrg не возвращается API /delegated-tasks */}
                <TableHead className="w-32">Делегировано от</TableHead>
                <TableHead className="w-32">Делегировано кому</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task: DelegatedTaskItem) => (
                <TableRow key={task.id} className="text-xs">
                  <TableCell
                    className="max-w-48 truncate"
                    style={{ paddingLeft: `${task.level * 16 + 8}px` }}
                  >
                    {task.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.delegatedToVersionName ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.delegatedFromOrg ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.delegatedToOrg ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
