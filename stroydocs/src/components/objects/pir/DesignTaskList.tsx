'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useDesignTasks } from './useDesignTasks';
import { CreateDesignTaskDialog } from './CreateDesignTaskDialog';
import { TASK_STATUS_CONFIG, getStatusDotClass } from '@/lib/pir/task-state-machine';
import type { DesignTaskItem } from './useDesignTasks';

interface Props {
  objectId: string;
  projectId: string;
}

function StatusDot({ task }: { task: DesignTaskItem }) {
  const hasActive = task._count.comments > 0 && task.status === 'WITH_COMMENTS';
  const dotClass = getStatusDotClass(
    task.status as Parameters<typeof getStatusDotClass>[0],
    hasActive,
    false
  );
  return <span className={cn('inline-block h-2.5 w-2.5 rounded-full flex-shrink-0', dotClass)} />;
}

function TaskRowSkeleton() {
  return (
    <tr className="border-b">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

export function DesignTaskList({ objectId, projectId }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { tasks, isLoading } = useDesignTasks(projectId, 'DESIGN');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Задания на проектирование</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить задание
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-6 px-3 py-2.5" />
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Номер</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Дата</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Статус</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Утверждающий</th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Замечания</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => <TaskRowSkeleton key={i} />)}

            {!isLoading && tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Нет заданий на проектирование. Создайте первое.
                </td>
              </tr>
            )}

            {!isLoading &&
              tasks.map((task) => {
                const config = TASK_STATUS_CONFIG[task.status as keyof typeof TASK_STATUS_CONFIG];
                return (
                  <tr
                    key={task.id}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-0"
                    onClick={() =>
                      router.push(`/objects/${objectId}/pir/design-task/${task.id}`)
                    }
                  >
                    <td className="px-3 py-3">
                      <StatusDot task={task} />
                    </td>
                    <td className="px-3 py-3 font-medium">{task.number}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDate(task.docDate)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                          config?.badgeClass ?? 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {config?.label ?? task.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {task.approvedBy
                        ? `${task.approvedBy.lastName} ${task.approvedBy.firstName}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {task._count.comments > 0 ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          {task._count.comments}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <CreateDesignTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        taskType="DESIGN"
      />
    </div>
  );
}
