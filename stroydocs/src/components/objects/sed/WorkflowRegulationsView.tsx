'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWorkflowRegulations, useDeleteRegulation } from '@/hooks/useWorkflowRegulations';
import { CreateRegulationDialog } from './CreateRegulationDialog';

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Проектировщик',
  CONTRACTOR: 'Подрядчик',
  SUPERVISION: 'Строительный контроль',
  SUBCONTRACTOR: 'Субподрядчик',
};

export function WorkflowRegulationsView() {
  const { data: session } = useSession();
  const orgId = session?.user?.organizationId;
  const isAdmin = session?.user?.role === 'ADMIN';

  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useWorkflowRegulations(orgId);
  const deleteRegulation = useDeleteRegulation(orgId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить регламенты. Попробуйте обновить страницу.
      </p>
    );
  }

  const regulations = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Регламенты определяют маршрут согласования при создании карточки ДО
        </p>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать регламент
          </Button>
        )}
      </div>

      {regulations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <ListChecks className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">Регламентов пока нет</p>
          {isAdmin && (
            <p className="mt-1 text-xs">
              Нажмите «Создать регламент» чтобы добавить первый маршрут согласования
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Наименование</th>
                <th className="px-4 py-2 text-left font-medium">Описание</th>
                <th className="px-4 py-2 text-center font-medium">Шаги</th>
                <th className="px-4 py-2 text-left font-medium">Дата создания</th>
                {isAdmin && <th className="px-4 py-2 text-center font-medium">Действия</th>}
              </tr>
            </thead>
            <tbody>
              {regulations.map((reg) => (
                <tr key={reg.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{reg.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {reg.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {reg.stepsTemplate.map((step, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {ROLE_LABELS[step.role] ?? step.role}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(reg.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить регламент?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Регламент «{reg.name}» будет удалён. Действие нельзя отменить.
                              Регламент нельзя удалить если по нему есть активные карточки ДО.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() =>
                                deleteRegulation.mutate(reg.id, {
                                  onError: (err) => alert(err.message),
                                })
                              }
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orgId && (
        <CreateRegulationDialog
          orgId={orgId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
    </div>
  );
}
