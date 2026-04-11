'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useDesignTaskDetail } from '@/components/objects/pir/useDesignTaskDetail';
import { DesignTaskParams } from '@/components/objects/pir/DesignTaskParams';
import { DesignTaskComments } from '@/components/objects/pir/DesignTaskComments';
import { PIRApprovalWidget } from '@/components/modules/approval/PIRApprovalWidget';
import { TASK_STATUS_CONFIG, ALLOWED_ACTIONS } from '@/lib/pir/task-state-machine';

export const dynamic = 'force-dynamic';

export default function PIRSurveyTaskDetailPage({
  params,
}: {
  params: { objectId: string; taskId: string };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('params');

  // objectId === projectId: BuildingObject.id используется как projectId во всех API
  const { task, isLoading, conductMutation, cancelMutation, printMutation } = useDesignTaskDetail(
    params.objectId,
    params.taskId
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Задание не найдено</p>
        <Button
          variant="link"
          className="mt-2"
          onClick={() => router.push(`/objects/${params.objectId}/pir/survey-task`)}
        >
          Вернуться к списку
        </Button>
      </div>
    );
  }

  const statusKey = task.status as keyof typeof TASK_STATUS_CONFIG;
  const statusConfig = TASK_STATUS_CONFIG[statusKey];
  const allowedActions = ALLOWED_ACTIONS[statusKey] ?? [];
  const isEditable = !['APPROVED', 'CANCELLED'].includes(task.status);

  return (
    <div className="space-y-4">
      {/* Навигация назад */}
      <button
        onClick={() => router.push(`/objects/${params.objectId}/pir/survey-task`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Задания на изыскания
      </button>

      {/* Шапка карточки */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Задание на изыскания №{task.number}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>от {formatDate(task.docDate)}</span>
            {task.approvedBy && (
              <span>· Утверждает: {task.approvedBy.lastName} {task.approvedBy.firstName}</span>
            )}
            {task.customerOrg && (
              <span>· Заказчик: {task.customerOrg.name}</span>
            )}
            {task.customerPerson && (
              <span>· Представитель: {task.customerPerson.lastName} {task.customerPerson.firstName}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Статус Badge */}
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium',
              statusConfig?.badgeClass ?? 'bg-gray-100 text-gray-700'
            )}
          >
            {statusConfig?.label ?? task.status}
          </span>

          {/* Кнопки действий */}
          {allowedActions.includes('conduct') && (
            <Button
              size="sm"
              onClick={() => conductMutation.mutate()}
              disabled={conductMutation.isPending}
            >
              Провести
            </Button>
          )}
          {allowedActions.includes('cancel') && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              Аннулировать
            </Button>
          )}
          {/* Печать PDF */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => printMutation.mutate()}
            disabled={printMutation.isPending}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            {printMutation.isPending ? 'Формирование...' : 'Печать'}
          </Button>
        </div>
      </div>

      {/* Вкладки карточки */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList>
          <TabsTrigger value="params">
            Параметры ({task._count.parameters})
          </TabsTrigger>
          <TabsTrigger value="comments">
            Замечания
            {task._count.comments > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                {task._count.comments}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="files">Файлы</TabsTrigger>
          <TabsTrigger value="approval">Согласование</TabsTrigger>
        </TabsList>

        {/* Параметры */}
        <TabsContent value="params" className="mt-4">
          <DesignTaskParams
            projectId={params.objectId}
            taskId={params.taskId}
            params={task.parameters}
            isEditable={isEditable}
          />
        </TabsContent>

        {/* Замечания */}
        <TabsContent value="comments" className="mt-4">
          <DesignTaskComments
            projectId={params.objectId}
            taskId={params.taskId}
            sessionUserId={task.author.id}
          />
        </TabsContent>

        {/* Файлы */}
        <TabsContent value="files" className="mt-4">
          {task.s3Keys.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Файлы не прикреплены
            </p>
          ) : (
            <div className="space-y-2">
              {task.s3Keys.map((key, idx) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">{key.split('/').pop() ?? `Файл ${idx + 1}`}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Согласование */}
        <TabsContent value="approval" className="mt-4">
          <PIRApprovalWidget
            entityType="DESIGN_TASK_SURVEY"
            entityId={params.taskId}
            objectId={params.objectId}
            approvalRoute={task.approvalRoute}
            entityStatus={task.status}
            isTerminalStatus={['APPROVED', 'CANCELLED'].includes(task.status)}
            canStartApproval={!['APPROVED', 'CANCELLED', 'IN_APPROVAL'].includes(task.status)}
            queryKey={['design-task', params.taskId]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
