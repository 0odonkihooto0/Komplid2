'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Check, MoreHorizontal, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  usePlannerVersions,
  useUpdatePlannerVersion,
  useDeletePlannerVersion,
  type PlannerVersion,
} from './usePlannerVersions';
import { AddPMVersionDialog } from './AddPMVersionDialog';

interface Props {
  projectId: string;
}

export function PMVersionsView({ projectId }: Props) {
  const { versions, isLoading } = usePlannerVersions(projectId);
  const updateMutation = useUpdatePlannerVersion(projectId);
  const deleteMutation = useDeletePlannerVersion(projectId);

  const [addOpen, setAddOpen]         = useState(false);
  const [editVersion, setEditVersion] = useState<PlannerVersion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlannerVersion | null>(null);

  function handleSetCurrent(version: PlannerVersion) {
    updateMutation.mutate({ versionId: version.id, isCurrent: true });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError:   () => setDeleteTarget(null),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead className="w-32 text-center">Актуальная</TableHead>
              <TableHead className="w-44">Дата создания</TableHead>
              <TableHead className="w-36 text-right">Количество задач</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">{version.name}</TableCell>
                    <TableCell className="text-center">
                      {version.isCurrent
                        ? <Check className="mx-auto h-4 w-4 text-green-600" />
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(version.createdAt), 'dd.MM.yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">{version._count.tasks}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!version.isCurrent && (
                            <DropdownMenuItem onClick={() => handleSetCurrent(version)}>
                              <Star className="mr-2 h-4 w-4" />
                              Сделать актуальной
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setEditVersion(version)}>
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            disabled={version.isCurrent}
                            onClick={() => !version.isCurrent && setDeleteTarget(version)}
                          >
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && versions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Версий УП ещё нет. Нажмите «Добавить», чтобы создать первую.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Диалог создания / редактирования */}
      <AddPMVersionDialog
        open={addOpen || editVersion !== null}
        onOpenChange={(v) => {
          if (!v) { setAddOpen(false); setEditVersion(null); }
        }}
        projectId={projectId}
        version={editVersion ?? undefined}
      />

      {/* Подтверждение удаления */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить версию?</AlertDialogTitle>
            <AlertDialogDescription>
              Версия <strong>«{deleteTarget?.name}»</strong> будет удалена.
              Задачи, привязанные к этой версии, останутся, но потеряют привязку к ней.
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
